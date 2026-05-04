const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')

const REPORT_PROMPT = `You are an experienced early-stage startup investor reviewing a pitch deck for investor-readiness.

You will receive the extracted text and inferred type for each slide in a pitch deck. Your job is to evaluate the deck and produce a structured JSON report.

EVALUATION CRITERIA:
- Clarity: Is each slide easy to understand?
- Narrative flow: Does the deck tell a coherent story?
- Completeness: Are the essential slides present (problem, solution, market, traction, team, ask)?
- Investor relevance: Does each slide answer an obvious investor question?
- Conciseness: Is the deck focused without unnecessary slides?

GRADING SCALE:
- A: Excellent, investor-ready
- B: Good, minor improvements needed
- C: Acceptable, notable gaps or issues
- D: Weak, significant improvements required
- E: Poor, major overhaul needed

IMPORTANT RULES:
- Base your feedback ONLY on the visible extracted text and slide types provided
- Do NOT invent or assume traction numbers, revenue, team credentials, or business claims not in the text
- Do NOT reward vague claims unless supported by visible text
- If a slide has empty or missing text, note that text extraction was incomplete
- Keep language direct, plain-English, and investor-focused
- Do not over-score based on visual polish alone

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:

{
  "overall_grade": "A|B|C|D|E",
  "summary": "One short paragraph (2-4 sentences) explaining the overall investor-readiness of the deck.",
  "strengths": [
    {
      "title": "Short strength title",
      "detail": "1-2 sentence explanation"
    },
    {
      "title": "Short strength title",
      "detail": "1-2 sentence explanation"
    },
    {
      "title": "Short strength title",
      "detail": "1-2 sentence explanation"
    }
  ],
  "biggest_issues": [
    {
      "title": "Short issue title",
      "detail": "1-2 sentence explanation",
      "priority": "high|medium|low"
    },
    {
      "title": "Short issue title",
      "detail": "1-2 sentence explanation",
      "priority": "high|medium|low"
    },
    {
      "title": "Short issue title",
      "detail": "1-2 sentence explanation",
      "priority": "high|medium|low"
    }
  ],
  "slide_notes": [
    {
      "slide_number": 1,
      "inferred_type": "cover",
      "grade": "A|B|C|D|E",
      "note": "1-2 sentence slide-specific note"
    }
  ],
  "upgrade_teaser": {
    "title": "What the full report adds",
    "bullets": [
      "Slide-by-slide scoring against investor questions",
      "Specific rewrite recommendations",
      "Prioritized fixes based on likely investor impact"
    ]
  }
}

REQUIREMENTS:
- strengths: EXACTLY 3 items
- biggest_issues: EXACTLY 3 items
- slide_notes: ONE item per slide provided
- All grades must be single letters: A, B, C, D, or E (no plus/minus)
- upgrade_teaser should always have exactly the 3 bullets shown above`

/**
 * Generate a free investor-readiness report for a deck.
 * @param {object} supabase - Supabase client
 * @param {string} deckId - Deck ID
 * @returns {Promise<{success: boolean, reportId?: string, overallGrade?: string, error?: string}>}
 */
async function generateFreeReport(supabase, deckId) {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY environment variable')
    return { success: false, error: 'Server configuration error' }
  }

  // Fetch deck
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, slide_count')
    .eq('id', deckId)
    .single()

  if (deckError || !deck) {
    console.error('Deck lookup error:', deckError)
    return { success: false, error: 'Deck not found' }
  }

  // Fetch slides
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('slide_number, extracted_text, inferred_type')
    .eq('deck_id', deckId)
    .order('slide_number', { ascending: true })

  if (slidesError) {
    console.error('Slides lookup error:', slidesError)
    return { success: false, error: 'Failed to fetch slides' }
  }

  if (!slides || slides.length === 0) {
    return { success: false, error: 'No slides found for this deck' }
  }

  // Update deck status to generating_free
  await setDeckStatus(supabase, deckId, 'generating_free', null)

  // Create or update report row with status = generating
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('deck_id', deckId)
    .eq('report_type', 'free')
    .single()

  let reportId
  if (existingReport) {
    reportId = existingReport.id
    await supabase
      .from('reports')
      .update({
        status: 'generating',
        overall_grade: null,
        content: null,
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
  } else {
    const { data: newReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        deck_id: deckId,
        report_type: 'free',
        status: 'generating',
      })
      .select('id')
      .single()

    if (insertError || !newReport) {
      console.error('Failed to create report row:', insertError)
      return { success: false, error: 'Failed to create report' }
    }
    reportId = newReport.id
  }

  console.log(`Generating free report for deck ${deckId}, report ${reportId}`)

  try {
    const openai = new OpenAI.default({ apiKey: openaiKey })

    // Prepare slide data for the prompt
    const slideData = slides.map((slide) => ({
      slide_number: slide.slide_number,
      inferred_type: slide.inferred_type || 'other',
      extracted_text: slide.extracted_text || '(No text extracted)',
    }))

    const userMessage = `Here is the pitch deck to evaluate:

DECK OVERVIEW:
- Total slides: ${slides.length}

SLIDE DATA:
${JSON.stringify(slideData, null, 2)}

Please evaluate this deck and return your report as JSON.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: REPORT_PROMPT,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const report = JSON.parse(content)

    // Validate required fields
    if (!report.overall_grade || !['A', 'B', 'C', 'D', 'E'].includes(report.overall_grade)) {
      throw new Error('Invalid overall_grade in report')
    }

    if (!report.summary || typeof report.summary !== 'string') {
      throw new Error('Invalid summary in report')
    }

    if (!Array.isArray(report.strengths) || report.strengths.length !== 3) {
      throw new Error('Report must have exactly 3 strengths')
    }

    if (!Array.isArray(report.biggest_issues) || report.biggest_issues.length !== 3) {
      throw new Error('Report must have exactly 3 biggest_issues')
    }

    if (!Array.isArray(report.slide_notes)) {
      throw new Error('Report must have slide_notes array')
    }

    // Update report row with results
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'ready',
        overall_grade: report.overall_grade,
        content: report,
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw new Error('Failed to save report')
    }

    console.log(`Free report generated successfully: grade ${report.overall_grade}`)

    return {
      success: true,
      reportId,
      overallGrade: report.overall_grade,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during report generation'
    console.error('Report generation failed:', errorMessage)

    // Update report row with failure
    await supabase
      .from('reports')
      .update({
        status: 'failed',
        generation_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    return { success: false, error: errorMessage }
  }
}

module.exports = {
  generateFreeReport,
  REPORT_PROMPT,
}
