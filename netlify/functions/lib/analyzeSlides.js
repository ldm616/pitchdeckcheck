const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')

const SLIDE_TYPES = [
  'cover',
  'investment_highlights',
  'problem',
  'solution',
  'product',
  'market',
  'competition',
  'business_model',
  'traction',
  'team',
  'financials',
  'ask',
  'go_to_market',
  'roadmap',
  'contact',
  'other',
]

const SYSTEM_PROMPT = `You are an expert at analyzing pitch deck slides for investor presentations. For each slide image, you will:

1. Extract ALL visible text from the slide, preserving the structure and hierarchy.
2. Infer the slide type based on its content and role in the investor narrative.

CLASSIFICATION RULES:
- Classify based primarily on the slide's CONTENT and PURPOSE, not just the title.
- The title is a supporting hint only.

SLIDE TYPES (in order of priority for ambiguous cases):

- cover: Title slide with company name/logo, tagline, or opening branding.

- investment_highlights: Summary slide combining multiple investment reasons across market, product, team, traction, financials, and/or raise. Often titled "Why Invest", "Investment Highlights", "Key Highlights", or similar.

- problem: Describes the problem being solved, pain points, or market gaps.

- solution: Describes the solution offered, value proposition, or how the product solves the problem.

- product: Shows the product itself, features, screenshots, demo, or how it works technically.

- market: Market size, TAM/SAM/SOM, market analysis, industry trends, or addressable opportunity.

- competition: Competitive landscape, differentiation, competitor comparison, or positioning matrix.

- business_model: Revenue model, pricing, unit economics, monetization strategy, or how the company makes money.

- traction: Metrics, growth data, milestones achieved, customer logos, user numbers, revenue figures, or proof of progress.

- team: Team members, founders, advisors, backgrounds, or organizational structure.

- financials: Financial projections, P&L, runway, burn rate, or detailed financial forecasts.

- ask: The fundraise itself - amount being raised, SAFE/equity terms, valuation cap, discount, use of funds breakdown, or committed capital. This is specifically about the investment ask, NOT a general contact slide.

- go_to_market: Customer acquisition strategy, sales channels, launch strategy, growth strategy, distribution, partnerships, marketing approach, or how the company will reach users/customers. Often titled "Growth Strategy", "GTM", "Go-to-Market", "Distribution", or "Customer Acquisition".

- roadmap: Future product/company milestones, rollout plans, timelines, future releases, planned expansion, what's next, or sequencing of future activities. Often titled "Roadmap", "Timeline", "What's Next", or "Milestones".

- contact: Final slide that is primarily a thank-you, closing, contact information, "Let's talk", "I'd love to tell you more", email, phone, website, social links, or call-to-action to connect. NOT an investment ask slide.

- other: Use only if the slide clearly doesn't fit any of the above categories.

DISAMBIGUATION:
- If a slide has "Growth Strategy" content about reaching customers → go_to_market (not solution)
- If a slide has "Roadmap" content about future plans → roadmap (not product)
- If a slide is a final "Thank You" or "Contact" slide → contact (not ask)
- If a slide asks for money/investment with terms → ask
- If a slide summarizes why to invest across multiple dimensions → investment_highlights

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
                text: 'Analyze this pitch deck slide. Extract all visible text and infer the slide type based on the content and its role in the investor narrative.',
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
