/**
 * V1 Founder-Facing Report Synthesis
 *
 * Single-pass GPT-4 synthesis that transforms evaluation data into a coherent,
 * founder-facing report. This replaces the previous 3-call + mechanical extraction
 * approach with one unified call that generates all V1 content together.
 *
 * Key principles:
 * - Deck quality focus (not fundability prediction)
 * - Stage-calibrated recommendations (seed sparse ≠ Series A SaaS)
 * - Prioritized, non-repetitive feedback
 * - Honest criticism for weak decks
 * - Explains where investor understanding builds or breaks
 */

const OpenAI = require('openai')

// V1 Report Version
const V1_REPORT_VERSION = 'v1.1.0'

// Quality dimension definitions (for fallback and UI display)
const QUALITY_DIMENSIONS = {
  clarity: {
    name: 'Clarity',
    description: 'How clearly the deck communicates what the company does and why it matters',
  },
  brevity: {
    name: 'Brevity',
    description: 'Whether the deck is appropriately concise without unnecessary content',
  },
  flow: {
    name: 'Flow',
    description: 'How logically the narrative builds from problem to solution to ask',
  },
  completeness: {
    name: 'Completeness',
    description: 'Whether the deck addresses the key questions investors need answered',
  },
}

// Slide type display names
const SLIDE_TYPE_NAMES = {
  cover: 'Cover',
  problem: 'Problem',
  solution: 'Solution',
  product: 'Product',
  market: 'Market',
  business_model: 'Business Model',
  traction: 'Traction',
  competition: 'Competition',
  team: 'Team',
  financials: 'Financials',
  ask: 'Ask',
  go_to_market: 'Go-to-Market',
  why_now: 'Why Now',
  vision: 'Vision',
  contact: 'Contact',
  appendix: 'Appendix',
  other: 'Other',
}

/**
 * Unified V1 Synthesis Prompt
 *
 * Generates the complete founder-facing report in one coherent pass.
 */
const V1_UNIFIED_PROMPT = `You are a sharp, experienced pitch deck reviewer helping founders improve their decks before investor meetings.

You will receive detailed evaluation data for a pitch deck and must generate a complete founder-facing quality report as JSON.

CRITICAL PRINCIPLES:

1. DECK QUALITY, NOT FUNDABILITY
   - You are evaluating how well the deck communicates, not whether the company will succeed
   - A deck can be high-quality for a weak business, or low-quality for a great business
   - Never predict fundraising outcomes

2. STAGE-CALIBRATED FEEDBACK
   - Sparse 6-8 slide seed decks should NOT be penalized like 20-slide Series A decks
   - Pre-seed decks often lack metrics—that's expected. Focus on clarity of vision and problem.
   - Series A decks SHOULD have detailed traction, unit economics, and competitive positioning.
   - Adapt your expectations to the apparent stage.

3. PRIORITIZED, NON-REPETITIVE FEEDBACK
   - Do NOT give checklist-style "add X, add Y, add Z" recommendations
   - Do NOT repeat "add metrics" across multiple sections
   - Identify the 2-3 things that would MOST improve investor understanding
   - Each strength and improvement should be distinct and deck-specific

4. HONEST CRITICISM
   - Weak decks should be criticized honestly
   - Do not soften feedback with excessive hedging
   - Be direct about fundamental problems (unclear product, missing differentiation, etc.)

5. INVESTOR UNDERSTANDING FOCUS
   - Explain WHERE in the deck investor conviction builds or breaks
   - Connect feedback to what investors are actually thinking
   - "At slide 5, an investor would wonder..." is useful framing

OUTPUT STRUCTURE (return as JSON):

{
  "synthesis": "1-2 paragraph deck-specific summary. Reference actual product/market. Identify strongest signals and biggest gaps. NO generic phrases.",

  "quality_dimensions": {
    "clarity": { "grade": "A-D", "diagnostic": "1 sentence referencing actual deck content" },
    "brevity": { "grade": "A-D", "diagnostic": "..." },
    "flow": { "grade": "A-D", "diagnostic": "..." },
    "completeness": { "grade": "A-D", "diagnostic": "..." }
  },

  "top_strengths": [
    { "strength": "Deck-specific strength with concrete reference", "slide_type": "Problem" },
    { "strength": "...", "slide_type": "..." }
  ],

  "top_improvements": [
    { "improvement": "Specific, actionable improvement", "context": "Why this matters to investors", "slide_type": "Market" },
    { "improvement": "...", "context": "...", "slide_type": "..." }
  ],

  "narrative_flow": {
    "strongest_sequence": {
      "slides": "Slides X-Y",
      "description": "Why this sequence builds conviction",
      "investor_reaction": "What investors think/feel at this point"
    },
    "weakest_sequence": {
      "slides": "Slides X-Y",
      "description": "Why this sequence loses momentum",
      "investor_reaction": "What questions or doubts arise"
    }
  },

  "slide_summary": [
    { "slide_number": 1, "type": "Cover", "grade": "B", "key_takeaway": "10-15 word summary of main issue or strength" }
  ],

  "slide_details": [
    {
      "slide_number": 1,
      "type": "Cover",
      "grade": "B",
      "what_works": "Specific positive (or 'Limited strong elements' if weak)",
      "biggest_gap": "Most important missing piece (or 'No significant gaps' if strong)",
      "highest_impact_improvement": "One concrete fix (or 'No changes needed' if strong)"
    }
  ]
}

ANTI-PATTERNS TO AVOID:
- "The deck would benefit from more metrics" (too generic)
- "Consider adding traction data" (repeated across sections)
- "The flow is logical" (empty praise)
- "Needs more detail" (vague)
- "Well-structured deck" (template language)
- Starting every strength with "The deck..."
- Identical or near-identical recommendations across slides

GOOD PATTERNS:
- "The problem slide's restaurant scenario makes the pain point immediately relatable"
- "Investors lose conviction at slide 6 when market size claims lack sourcing"
- "The cover slide's tagline 'Share video online' communicates the core value in 3 words"
- "Adding monthly active users would transform the traction slide from assertion to proof"
- "The competition matrix is missing—investors will wonder why Vimeo isn't addressed"

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`

/**
 * Generate V1 founder-facing report from evaluation data.
 *
 * @param {Object} evaluationData - Full evaluation results from existing pipeline (fullReport)
 * @param {Array} slides - Slide data with extracted text
 * @param {Object} options - Generation options (may include debugInfo for context)
 * @returns {Object} V1 report structure
 */
async function generateV1Report(evaluationData, slides, options = {}) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const openai = new OpenAI({ apiKey: openaiKey })

  // Build comprehensive context for the unified synthesis
  const synthesisContext = buildSynthesisContext(evaluationData, slides, options)

  console.log(`[v1-synthesis] Starting unified V1 generation for ${slides.length} slides...`)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: V1_UNIFIED_PROMPT },
        { role: 'user', content: synthesisContext },
      ],
      temperature: 0.6,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    const parsed = JSON.parse(content)

    console.log(`[v1-synthesis] Unified generation complete`)

    // Validate and structure the response
    return buildV1Report(parsed, evaluationData)
  } catch (err) {
    console.error(`[v1-synthesis] Unified generation failed:`, err.message)
    // Fall back to deterministic generation
    return generateFallbackReport(evaluationData, slides)
  }
}

/**
 * Build comprehensive context string for the unified synthesis prompt.
 */
function buildSynthesisContext(evaluationData, slides, options = {}) {
  const parts = []

  // 1. Deck metadata
  parts.push(`=== DECK METADATA ===
Overall Grade: ${evaluationData.overall_grade}
Deck Score: ${(evaluationData.deck_score * 100).toFixed(0)}%
Slide Count: ${slides.length}
Architecture: ${evaluationData.architecture?.architecture_version || 'v2'}`)

  // Add detected context if available (from v3 debug)
  if (options.deckContext) {
    const ctx = options.deckContext
    if (ctx.is_sparse) {
      parts.push(`Deck Type: SPARSE (likely early-stage seed deck)`)
    }
    if (ctx.inferred_contexts?.length > 0) {
      parts.push(`Detected Categories: ${ctx.inferred_contexts.join(', ')}`)
    }
  }

  // 2. Slide content with evaluations
  parts.push(`\n=== SLIDES WITH EVALUATIONS ===`)

  for (const slide of slides) {
    const evalSlide = evaluationData.slides?.find(s => s.slide_number === slide.slide_number)
    const typeName = SLIDE_TYPE_NAMES[slide.inferred_type] || slide.inferred_type
    const text = (slide.extracted_text || '').substring(0, 500).replace(/\n+/g, ' ').trim()

    let slideSection = `\n--- Slide ${slide.slide_number}: ${typeName} (Grade: ${evalSlide?.grade || 'N/A'}) ---`
    slideSection += `\nContent: ${text}${slide.extracted_text?.length > 500 ? '...' : ''}`

    // Add evaluation details if available
    if (evalSlide?.questions?.length > 0) {
      slideSection += `\n\nEvaluation:`
      for (const q of evalSlide.questions) {
        slideSection += `\n- ${q.question} (${q.score}/5)`
        if (q.assessment) slideSection += `\n  Assessment: ${q.assessment}`
        if (q.gap && q.gap !== 'None - fully addressed') slideSection += `\n  Gap: ${q.gap}`
        if (q.fix && q.fix !== 'None needed') slideSection += `\n  Fix: ${q.fix}`
      }
    }

    parts.push(slideSection)
  }

  // 3. Investment thesis evaluation (if available)
  if (evaluationData.investment_thesis) {
    parts.push(`\n=== INVESTMENT THESIS EVALUATION ===`)
    const thesis = evaluationData.investment_thesis

    for (const [key, value] of Object.entries(thesis)) {
      if (value && typeof value === 'object') {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        parts.push(`\n${label}: ${value.score}/5`)
        if (value.assessment) parts.push(`  Assessment: ${value.assessment}`)
        if (value.gaps && value.gaps !== 'None - thesis is well-supported') {
          parts.push(`  Gaps: ${value.gaps}`)
        }
      }
    }
  }

  // 4. Instructions
  parts.push(`\n=== INSTRUCTIONS ===
Generate the complete V1 founder-facing report JSON based on the above evaluation data.
Remember:
- This is deck QUALITY review, not fundability prediction
- Calibrate expectations to apparent stage (sparse seed vs detailed Series A)
- Prioritize 2-3 highest-impact improvements, don't create a checklist
- Reference actual deck content in all feedback
- Be honest about fundamental problems`)

  return parts.join('\n')
}

/**
 * Build the final V1 report structure from GPT response.
 */
function buildV1Report(parsed, evaluationData) {
  // Ensure slide_summary and slide_details have correct structure
  const slideSummary = (parsed.slide_summary || []).map(s => ({
    slide_number: s.slide_number,
    type: s.type || SLIDE_TYPE_NAMES[s.type] || 'Unknown',
    grade: s.grade || 'C',
    key_takeaway: s.key_takeaway || 'No summary available',
  }))

  const slideDetails = (parsed.slide_details || []).map(s => ({
    slide_number: s.slide_number,
    type: s.type || SLIDE_TYPE_NAMES[s.type] || 'Unknown',
    grade: s.grade || 'C',
    what_works: s.what_works || 'Assessment not available',
    biggest_gap: s.biggest_gap || 'No significant gaps identified',
    highest_impact_improvement: s.highest_impact_improvement || 'No changes needed',
  }))

  // Ensure quality dimensions have required structure
  const dimensions = {
    clarity: {
      grade: parsed.quality_dimensions?.clarity?.grade || 'C',
      diagnostic: parsed.quality_dimensions?.clarity?.diagnostic || 'Assessment not available',
      description: QUALITY_DIMENSIONS.clarity.description,
    },
    brevity: {
      grade: parsed.quality_dimensions?.brevity?.grade || 'C',
      diagnostic: parsed.quality_dimensions?.brevity?.diagnostic || 'Assessment not available',
      description: QUALITY_DIMENSIONS.brevity.description,
    },
    flow: {
      grade: parsed.quality_dimensions?.flow?.grade || 'C',
      diagnostic: parsed.quality_dimensions?.flow?.diagnostic || 'Assessment not available',
      description: QUALITY_DIMENSIONS.flow.description,
    },
    completeness: {
      grade: parsed.quality_dimensions?.completeness?.grade || 'C',
      diagnostic: parsed.quality_dimensions?.completeness?.diagnostic || 'Assessment not available',
      description: QUALITY_DIMENSIONS.completeness.description,
    },
  }

  return {
    report_version: V1_REPORT_VERSION,

    // 1. Overall Deck Quality
    overall: {
      grade: evaluationData.overall_grade,
      score: evaluationData.deck_score,
      synthesis: parsed.synthesis || 'Synthesis not available',
      positioning_note: 'This score reflects deck quality and clarity—not a prediction of fundraising success.',
    },

    // 2. Quality Dimensions
    quality_dimensions: dimensions,

    // 3. Top Strengths (limit to 4)
    top_strengths: (parsed.top_strengths || []).slice(0, 4).map(s => ({
      strength: s.strength || 'Strength not specified',
      slide_type: s.slide_type || 'General',
    })),

    // 4. Top Improvement Priorities (limit to 3)
    top_improvements: (parsed.top_improvements || []).slice(0, 3).map(imp => ({
      improvement: imp.improvement || 'Improvement not specified',
      context: imp.context || '',
      slide_type: imp.slide_type || 'General',
    })),

    // 5. Narrative Flow
    narrative_flow: parsed.narrative_flow || {
      strongest_sequence: {
        slides: 'Not identified',
        description: 'Unable to assess narrative flow',
        investor_reaction: 'N/A',
      },
      weakest_sequence: {
        slides: 'Not identified',
        description: 'Unable to assess narrative flow',
        investor_reaction: 'N/A',
      },
    },

    // 6. Slide Summary Table
    slide_summary: slideSummary,

    // 7. Slide Details
    slides: slideDetails,
  }
}

/**
 * Generate fallback report when API call fails.
 * Uses deterministic extraction from evaluation data.
 */
function generateFallbackReport(evaluationData, slides) {
  console.log(`[v1-synthesis] Using fallback deterministic generation`)

  const slideEvals = evaluationData.slides || []

  // Fallback synthesis
  const strongestSlide = [...slideEvals].sort((a, b) => (b.normalized_score || 0) - (a.normalized_score || 0))[0]
  const weakestSlide = [...slideEvals].sort((a, b) => (a.normalized_score || 0) - (b.normalized_score || 0))[0]

  const synthesis = `This ${slides.length}-slide deck received an overall grade of ${evaluationData.overall_grade}. ` +
    (strongestSlide ? `The strongest content appears in the ${SLIDE_TYPE_NAMES[strongestSlide.type] || strongestSlide.type} section. ` : '') +
    (weakestSlide ? `The ${SLIDE_TYPE_NAMES[weakestSlide.type] || weakestSlide.type} section has the most room for improvement.` : '')

  // Fallback dimensions based on overall grade
  const baseGrade = evaluationData.overall_grade?.charAt(0) || 'C'
  const dimensions = {
    clarity: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.clarity.description },
    brevity: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.brevity.description },
    flow: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.flow.description },
    completeness: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.completeness.description },
  }

  // Extract strengths from high-scoring questions
  const strengths = []
  for (const slide of slideEvals) {
    for (const q of slide.questions || []) {
      if (q.score >= 4 && q.assessment?.length > 20) {
        strengths.push({ strength: q.assessment, slide_type: SLIDE_TYPE_NAMES[slide.type] || slide.type })
      }
    }
  }

  // Extract improvements from low-scoring questions
  const improvements = []
  const typeImportance = { traction: 5, market: 4, team: 4, problem: 3, solution: 3 }
  for (const slide of slideEvals) {
    for (const q of slide.questions || []) {
      if (q.score <= 2 && q.fix && q.fix !== 'None needed' && q.fix.length > 20) {
        improvements.push({
          improvement: q.fix,
          context: q.gap || '',
          slide_type: SLIDE_TYPE_NAMES[slide.type] || slide.type,
          importance: typeImportance[slide.type] || 1,
        })
      }
    }
  }
  improvements.sort((a, b) => b.importance - a.importance)

  // Build slide summary
  const slideSummary = slideEvals.map(s => {
    const bestQ = s.questions?.find(q => q.score >= 4)
    const worstQ = s.questions?.reduce((min, q) => (!min || q.score < min.score) ? q : min, null)
    const takeaway = s.grade?.startsWith('A') || s.grade?.startsWith('B')
      ? (bestQ?.assessment?.substring(0, 80) || 'Solid slide')
      : (worstQ?.gap?.substring(0, 80) || 'Needs improvement')
    return {
      slide_number: s.slide_number,
      type: SLIDE_TYPE_NAMES[s.type] || s.type,
      grade: s.grade,
      key_takeaway: takeaway,
    }
  })

  // Build slide details
  const slideDetails = slideEvals.map(s => {
    const questions = s.questions || []
    const bestQ = questions.find(q => q.score >= 4)
    const worstQ = questions.reduce((min, q) => (!min || q.score < min.score) ? q : min, null)
    const fixQ = questions.filter(q => q.score <= 3 && q.fix && q.fix !== 'None needed').sort((a, b) => a.score - b.score)[0]

    return {
      slide_number: s.slide_number,
      type: SLIDE_TYPE_NAMES[s.type] || s.type,
      grade: s.grade,
      what_works: bestQ?.assessment || (questions[0]?.score >= 3 ? questions[0].assessment : 'Limited strong elements'),
      biggest_gap: worstQ?.score <= 3 ? worstQ.gap : 'No significant gaps',
      highest_impact_improvement: fixQ?.fix || 'No specific changes needed',
    }
  })

  return {
    report_version: V1_REPORT_VERSION,
    overall: {
      grade: evaluationData.overall_grade,
      score: evaluationData.deck_score,
      synthesis,
      positioning_note: 'This score reflects deck quality and clarity—not a prediction of fundraising success.',
    },
    quality_dimensions: dimensions,
    top_strengths: strengths.slice(0, 4),
    top_improvements: improvements.slice(0, 3).map(i => ({
      improvement: i.improvement,
      context: i.context,
      slide_type: i.slide_type,
    })),
    narrative_flow: {
      strongest_sequence: {
        slides: strongestSlide ? `Slide ${strongestSlide.slide_number}` : 'Not identified',
        description: strongestSlide ? `The ${SLIDE_TYPE_NAMES[strongestSlide.type] || strongestSlide.type} section shows the strongest content.` : 'Unable to identify',
        investor_reaction: 'This section builds the most conviction.',
      },
      weakest_sequence: {
        slides: weakestSlide ? `Slide ${weakestSlide.slide_number}` : 'Not identified',
        description: weakestSlide ? `The ${SLIDE_TYPE_NAMES[weakestSlide.type] || weakestSlide.type} section needs the most work.` : 'Unable to identify',
        investor_reaction: 'This section may raise questions.',
      },
    },
    slide_summary: slideSummary,
    slides: slideDetails,
  }
}

module.exports = {
  generateV1Report,
  V1_REPORT_VERSION,
  QUALITY_DIMENSIONS,
  SLIDE_TYPE_NAMES,
}
