const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')

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
  'investment_highlights',
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
- investment_highlights: Summary of key reasons to invest, combining market opportunity, team strength, traction, product differentiation, and raise details
- other: Anything that doesn't fit the above categories

Respond with valid JSON in this exact format:
{
  "extracted_text": "All visible text from the slide, preserving structure with newlines",
  "inferred_type": "one of the slide types listed above"
}`

/**
 * Analyze slides using OpenAI vision.
 * @param {object} supabase - Supabase client
 * @param {string} deckId - Deck ID
 * @returns {Promise<{success: boolean, analyzedCount?: number, slides?: Array, error?: string}>}
 */
async function analyzeSlides(supabase, deckId) {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY environment variable')
    await setDeckStatus(supabase, deckId, 'failed', 'Server configuration error')
    return { success: false, error: 'Server configuration error' }
  }

  const openai = new OpenAI.default({ apiKey: openaiKey })

  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('id, slide_number, image_path')
    .eq('deck_id', deckId)
    .order('slide_number', { ascending: true })

  if (slidesError) {
    console.error('Slides lookup error:', slidesError)
    await setDeckStatus(supabase, deckId, 'failed', 'Failed to fetch slides')
    return { success: false, error: 'Failed to fetch slides' }
  }

  if (!slides || slides.length === 0) {
    await setDeckStatus(supabase, deckId, 'failed', 'No slides found for this deck')
    return { success: false, error: 'No slides found for this deck' }
  }

  await setDeckStatus(supabase, deckId, 'analyzing', null)

  const results = []

  try {
    for (const slide of slides) {
      console.log(`Analyzing slide ${slide.slide_number}/${slides.length}`)

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('slide-images')
        .createSignedUrl(slide.image_path, 300)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error(`Failed to create signed URL for slide ${slide.slide_number}:`, signedUrlError)
        await setDeckStatus(supabase, deckId, 'failed', `Failed to access slide ${slide.slide_number}`)
        return { success: false, error: `Failed to access slide ${slide.slide_number}` }
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

    await setDeckStatus(supabase, deckId, 'analyzed', null)

    return {
      success: true,
      analyzedCount: results.length,
      slides: results,
    }
  } catch (err) {
    console.error('Analysis error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during analysis'
    await setDeckStatus(supabase, deckId, 'failed', errorMessage)
    return { success: false, error: errorMessage }
  }
}

module.exports = {
  analyzeSlides,
  SLIDE_TYPES,
  SYSTEM_PROMPT,
}
