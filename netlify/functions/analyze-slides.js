const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')

const SLIDE_TYPES = [
  'cover',
  'problem',
  'solution',
  'product',
  'market',
  'business_model',
  'competition',
  'traction',
  'team',
  'financials',
  'ask',
  'other',
]

const SYSTEM_PROMPT = `You are an expert at analyzing pitch deck slides. For each slide image, you will:

1. Extract ALL visible text from the slide, preserving the structure and hierarchy.
2. Infer the slide type based on its content.

Slide types:
- cover: Title slide with company name/logo
- problem: Describes the problem being solved
- solution: Describes the solution offered
- product: Shows the product, features, or demo
- market: Market size, TAM/SAM/SOM, market analysis
- business_model: Revenue model, pricing, unit economics
- competition: Competitive landscape, differentiation
- traction: Metrics, growth, milestones, customers
- team: Team members, advisors, backgrounds
- financials: Financial projections, runway, use of funds
- ask: Investment ask, terms, contact info
- other: Anything that doesn't fit the above categories

Respond with valid JSON in this exact format:
{
  "extracted_text": "All visible text from the slide, preserving structure with newlines",
  "inferred_type": "one of the slide types listed above"
}`

async function setDeckStatus(supabase, deckId, status, error = null, slideCount = null) {
  const update = {
    processing_status: status,
    processing_error: error,
  }
  if (slideCount !== null) {
    update.slide_count = slideCount
  }
  await supabase.from('decks').update(update).eq('id', deckId)
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY environment variable')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const { deck_id, access_token } = body

  if (!deck_id || !access_token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'deck_id and access_token are required' }),
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const openai = new OpenAI.default({ apiKey: openaiKey })

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, access_token')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    console.error('Deck lookup error:', deckError)
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck not found' }),
    }
  }

  if (deck.access_token !== access_token) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid access token' }),
    }
  }

  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('id, slide_number, image_path')
    .eq('deck_id', deck_id)
    .order('slide_number', { ascending: true })

  if (slidesError) {
    console.error('Slides lookup error:', slidesError)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch slides' }),
    }
  }

  if (!slides || slides.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No slides found for this deck' }),
    }
  }

  await setDeckStatus(supabase, deck_id, 'analyzing', null)

  const results = []

  try {
    for (const slide of slides) {
      console.log(`Analyzing slide ${slide.slide_number}/${slides.length}`)

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('slide-images')
        .createSignedUrl(slide.image_path, 300)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error(`Failed to create signed URL for slide ${slide.slide_number}:`, signedUrlError)
        await setDeckStatus(supabase, deck_id, 'failed', `Failed to access slide ${slide.slide_number}`)
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Failed to access slide ${slide.slide_number}` }),
        }
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: signedUrlData.signedUrl,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Analyze this pitch deck slide. Extract all visible text and infer the slide type.',
              },
            ],
          },
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        console.error(`Empty response for slide ${slide.slide_number}`)
        continue
      }

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (parseError) {
        console.error(`Failed to parse response for slide ${slide.slide_number}:`, parseError)
        continue
      }

      const extractedText = parsed.extracted_text || ''
      let inferredType = parsed.inferred_type || 'other'

      if (!SLIDE_TYPES.includes(inferredType)) {
        inferredType = 'other'
      }

      const { error: updateError } = await supabase
        .from('slides')
        .update({
          extracted_text: extractedText,
          inferred_type: inferredType,
        })
        .eq('id', slide.id)

      if (updateError) {
        console.error(`Failed to update slide ${slide.slide_number}:`, updateError)
      }

      results.push({
        slide_number: slide.slide_number,
        inferred_type: inferredType,
        text_length: extractedText.length,
      })
    }

    await setDeckStatus(supabase, deck_id, 'analyzed', null)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deck_id,
        analyzed_count: results.length,
        slides: results,
      }),
    }
  } catch (err) {
    console.error('Analysis error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during analysis'
    await setDeckStatus(supabase, deck_id, 'failed', errorMessage)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to analyze slides' }),
    }
  }
}
