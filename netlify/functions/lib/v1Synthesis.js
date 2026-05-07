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
const V1_REPORT_VERSION = 'v1.2.0'

// Quality dimension definitions (for fallback and UI display)
const QUALITY_DIMENSIONS = {
  clarity: {
    name: 'Clarity',
    description: 'Does the investor understand what this company does and why it matters within 30 seconds?',
  },
  brevity: {
    name: 'Brevity',
    description: 'Does the deck move efficiently with strong information density, or does it drag?',
  },
  flow: {
    name: 'Flow',
    description: 'Does conviction build naturally through the narrative, or does momentum reset?',
  },
  completeness: {
    name: 'Completeness',
    description: 'Does the deck answer the key investor questions needed at this stage?',
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
 * V1.2.0 - Upgraded for investor-native reasoning and conviction flow analysis.
 */
const V1_UNIFIED_PROMPT = `You are a sharp seed-stage investor reviewing a pitch deck. Your job is to help founders understand how investors actually process their deck—where conviction builds, where doubt appears, and what the deck makes investors believe.

You will receive evaluation data for a pitch deck and must generate a founder-facing quality report as JSON.

═══════════════════════════════════════════════════════════════════
CORE MINDSET: INVESTOR CONVICTION FLOW
═══════════════════════════════════════════════════════════════════

Your analysis should track the INVESTOR'S MENTAL STATE as they read the deck:
- What does an investor BELIEVE after each section?
- Where does CONVICTION increase?
- Where does MOMENTUM weaken?
- Where do DOUBTS appear?
- What ASSUMPTIONS remain unsupported?
- What parts of the story feel INEVITABLE vs FRAGILE?

Think: "What conclusion does an investor naturally reach after this slide?"

NOT: "What rubric items are missing?"

═══════════════════════════════════════════════════════════════════
SPARSE DECK INTELLIGENCE
═══════════════════════════════════════════════════════════════════

Do NOT treat sparse early-stage decks as failed modern Series A decks simply because they lack detailed metrics, CAC analysis, retention charts, or extensive GTM detail.

Iconic sparse seed decks (6-10 slides) should NOT be penalized for missing modern Series A elements.

A sparse deck with:
- Clear problem
- Obvious behavior shift or timing
- Elegant product concept
- Credible founders

Can be EXCELLENT even without:
- CAC/LTV metrics
- Detailed cohort analysis
- TAM/SAM/SOM spreadsheet
- Retention curves
- GTM playbook

When a deck is strategically sharp but intentionally sparse, describe it as "concise," "focused," or "early-stage" rather than "incomplete."

Evaluate sparse decks by: Does the core story LAND? Does conviction BUILD?
Not: Are all sections present?

CRITICAL DISTINCTION:
- Unresolved investor QUESTIONS = "The deck leaves some questions open, but the core story is clear"
- Genuinely WEAK deck construction = "The deck fails to establish basic understanding"

These are NOT the same. A sparse deck can leave questions unresolved while still being a strong deck.

═══════════════════════════════════════════════════════════════════
LANGUAGE PRINCIPLES
═══════════════════════════════════════════════════════════════════

FORBIDDEN PHRASES (never use):
- "needs more detail"
- "add metrics"
- "lacks differentiation"
- "clarify the value proposition"
- "provide more examples"
- "missing X" (as the full diagnosis)
- "consider adding"
- "would benefit from"
- "not fully explained"
- "incomplete" (for sparse decks that tell a clear story)

AVOID REPETITION:
Do NOT repeatedly frame the same issue as "missing metrics" across multiple sections.
If market size is mentioned in synthesis, do not mention it again in improvements and slide details.
Each issue should appear ONCE in the report, in its most relevant location.

INSTEAD, explain the INVESTOR CONSEQUENCE:

BAD: "The deck lacks differentiation."
GOOD: "The deck establishes the product direction, but investors still do not understand why this wins against alternatives."

BAD: "Add more traction metrics."
GOOD: "The traction claim sounds important, but without evidence investors can't trust the conclusion."

BAD: "Needs more detail on the market."
GOOD: "The infrastructure shift is compelling, but investors still lack a concrete sense of how large this opportunity becomes."

BAD: "Missing market size."
GOOD: "The opportunity feels real, but investors cannot yet size the prize."

BAD: "The flow needs improvement."
GOOD: "The narrative builds momentum through the problem and solution, but loses some conviction once competition and traction are introduced."

BAD: "Flow loses coherence."
GOOD: "The narrative builds momentum through the problem and solution, but loses some conviction once competition and traction are introduced."

Every piece of feedback should answer: "What does the investor now believe, and why is that a problem?"

═══════════════════════════════════════════════════════════════════
QUALITY DIMENSION DEFINITIONS
═══════════════════════════════════════════════════════════════════

CLARITY (Is the core idea landing?)
- Does the investor understand what this company does within 30 seconds?
- Are the key concepts intuitive or confusing?
- Do claims follow logically from evidence?
- Can an investor explain this to a partner?

BREVITY (Is the deck efficient?)
- Does the deck move at the right pace, or drag?
- Is information density strong, or diluted with filler?
- Does the deck over-explain obvious points?
- Is it concise without becoming vague?

FLOW (Does conviction compound?)
- Does each slide earn the next?
- Does momentum build naturally, or reset?
- Are there logical jumps that break the narrative?
- Does the story feel inevitable, or disjointed?

COMPLETENESS (Are key investor questions answered?)
- Does the deck address what investors NEED to know at this stage?
- NOT: Does the deck have every possible section?
- Sparse seed decks answering core questions = complete
- Detailed decks missing core logic = incomplete

═══════════════════════════════════════════════════════════════════
STRONG SLIDES SHOULD FEEL STRONG
═══════════════════════════════════════════════════════════════════

Do NOT force criticism onto every slide. If a slide genuinely works:

Use phrases like:
- "No major gap."
- "This slide does its job effectively."
- "Investors likely understand the value quickly here."
- "The slide builds conviction efficiently."
- "The core point lands clearly."

For strong slides:
- biggest_gap: "No major gap" or "No significant gap"
- highest_impact_improvement: "No changes needed" or specific minor polish only

Do NOT invent weak criticism for strong slides. Empty criticism is worse than honest acknowledgment.

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE (return as JSON)
═══════════════════════════════════════════════════════════════════

{
  "synthesis": "2-3 sentences. What does this deck make investors believe? Where does conviction peak? Where does doubt appear? Reference the actual product/market. NO GENERIC PHRASES.",

  "quality_dimensions": {
    "clarity": { "grade": "A/B/C/D", "diagnostic": "One sentence about whether the core idea lands, referencing actual content" },
    "brevity": { "grade": "A/B/C/D", "diagnostic": "One sentence about pacing and information density" },
    "flow": { "grade": "A/B/C/D", "diagnostic": "One sentence about how conviction builds or breaks through the narrative" },
    "completeness": { "grade": "A/B/C/D", "diagnostic": "One sentence about whether key investor questions get answered (stage-appropriate)" }
  },

  "top_strengths": [
    { "strength": "What specific element builds investor conviction, and why", "slide_type": "Problem" },
    { "strength": "Another specific conviction-building element", "slide_type": "..." }
  ],

  "top_improvements": [
    {
      "improvement": "What specific change would most increase conviction",
      "context": "What investor doubt or hesitation this creates—what belief is missing, what conclusion has not yet been earned",
      "slide_type": "Market"
    }
  ],

  "narrative_flow": {
    "strongest_sequence": {
      "slides": "Slides X-Y",
      "description": "How conviction compounds through this sequence—what each slide adds to the investor's mental model",
      "investor_reaction": "What an investor believes/feels by the end of this sequence"
    },
    "weakest_sequence": {
      "slides": "Slides X-Y",
      "description": "Where the narrative loses momentum—what logical gap or question appears",
      "investor_reaction": "What doubt or confusion an investor experiences here"
    }
  },

  "slide_summary": [
    { "slide_number": 1, "type": "Cover", "grade": "B", "key_takeaway": "What does an investor now believe after this slide? (10-15 words)" }
  ],

  "slide_details": [
    {
      "slide_number": 1,
      "type": "Cover",
      "grade": "B",
      "what_works": "What builds conviction here (be specific, or 'Limited conviction-building elements' if weak)",
      "biggest_gap": "What investor doubt or unanswered question remains (or 'No significant gap' if strong)",
      "highest_impact_improvement": "What change would most increase conviction (or 'No changes needed' if strong)"
    }
  ]
}

═══════════════════════════════════════════════════════════════════
DEDUPLICATION RULE (CRITICAL)
═══════════════════════════════════════════════════════════════════

The same issue should NOT appear in multiple places:
- synthesis AND improvements AND slide details
- quality dimensions AND improvements
- multiple slide details

BEFORE WRITING EACH SECTION, check: Have I already said this?

If differentiation is mentioned in synthesis → do NOT repeat in improvements or dimensions
If market size is mentioned in dimensions → do NOT repeat in improvements
If a gap appears in slide 3 details → do NOT repeat the same gap in slide 7 details

The report should feel COMPRESSED AND HIGH-SIGNAL, not redundant.
Each piece of feedback appears ONCE, in its most relevant location.

═══════════════════════════════════════════════════════════════════
EXAMPLES OF GOOD ANALYSIS
═══════════════════════════════════════════════════════════════════

SYNTHESIS EXAMPLES:
- "This deck establishes a clear behavior shift (video consumption moving online) and positions the product as the obvious destination. Conviction peaks at the timing slide. However, the competitive landscape remains unaddressed—investors don't know why YouTube wins against Vimeo or Google Video."

- "The problem is immediately relatable, but the solution section jumps to product features before establishing why users would switch from spreadsheets. Investors understand WHAT this does but not WHY it wins."

FLOW EXAMPLES:
- "Slides 1-4 build strong momentum: the problem is visceral, the timing is undeniable, the product demo is elegant. But slide 5 introduces market size claims without grounding—the narrative shifts from 'obvious opportunity' to 'unverified assertion.'"

SLIDE DETAIL EXAMPLES:
- what_works: "The before/after comparison makes the problem tangible—investors immediately understand the pain."
- biggest_gap: "The slide asserts 'massive demand' but investors have no evidence to trust this claim."
- highest_impact_improvement: "One concrete user quote or usage number would transform this from assertion to proof."

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

  // 1. Deck metadata with investor-relevant framing
  const slideCount = slides.length
  const isSparse = slideCount <= 10
  const deckStage = isSparse ? 'EARLY-STAGE/SEED' : 'LATER-STAGE'

  parts.push(`=== DECK OVERVIEW ===
Slide Count: ${slideCount} (${deckStage} deck)
Overall Grade: ${evaluationData.overall_grade}
Score: ${(evaluationData.deck_score * 100).toFixed(0)}%`)

  // Add detected context if available (from v3 debug)
  if (options.deckContext) {
    const ctx = options.deckContext
    if (ctx.is_sparse) {
      parts.push(`\nNOTE: This is a SPARSE deck. Evaluate by whether the core story lands and conviction builds—NOT by checklist completeness.`)
    }
    if (ctx.inferred_contexts?.length > 0) {
      parts.push(`Business Type: ${ctx.inferred_contexts.join(', ')}`)
    }
  } else if (isSparse) {
    parts.push(`\nNOTE: This is a ${slideCount}-slide deck. For sparse early-stage decks, evaluate whether the core story lands—don't penalize for missing Series A elements.`)
  }

  // 2. Slide content with evaluations - framed for conviction flow analysis
  parts.push(`\n=== SLIDES (in order investor sees them) ===`)
  parts.push(`Analyze how conviction builds or breaks as an investor reads through:\n`)

  for (const slide of slides) {
    const evalSlide = evaluationData.slides?.find(s => s.slide_number === slide.slide_number)
    const typeName = SLIDE_TYPE_NAMES[slide.inferred_type] || slide.inferred_type
    const text = (slide.extracted_text || '').substring(0, 600).replace(/\n+/g, ' ').trim()

    let slideSection = `--- SLIDE ${slide.slide_number}: ${typeName} ---`
    slideSection += `\nGrade: ${evalSlide?.grade || 'N/A'}`
    slideSection += `\nContent: "${text}${slide.extracted_text?.length > 600 ? '...' : ''}"`

    // Add evaluation insights (condensed)
    if (evalSlide?.questions?.length > 0) {
      const strongPoints = evalSlide.questions.filter(q => q.score >= 4).map(q => q.assessment).filter(Boolean)
      const gaps = evalSlide.questions.filter(q => q.score <= 2 && q.gap && q.gap !== 'None - fully addressed').map(q => q.gap)

      if (strongPoints.length > 0) {
        slideSection += `\nStrong: ${strongPoints[0]}`
      }
      if (gaps.length > 0) {
        slideSection += `\nGap: ${gaps[0]}`
      }
    }

    parts.push(slideSection + '\n')
  }

  // 3. Investment thesis evaluation - framed as investor belief state
  if (evaluationData.investment_thesis) {
    parts.push(`=== INVESTOR BELIEF STATE (after full deck) ===`)
    const thesis = evaluationData.investment_thesis

    const thesisLabels = {
      why_this_market: 'Why This Market',
      why_this_product: 'Why This Product Wins',
      why_this_team: 'Why This Team',
      why_now: 'Why Now',
    }

    for (const [key, value] of Object.entries(thesis)) {
      if (value && typeof value === 'object' && thesisLabels[key]) {
        const score = value.score || 0
        const conviction = score >= 4 ? 'HIGH' : score >= 3 ? 'MODERATE' : 'LOW'
        parts.push(`\n${thesisLabels[key]}: ${conviction} conviction (${score}/5)`)
        if (value.assessment) parts.push(`  → ${value.assessment}`)
        if (value.gaps && value.gaps !== 'None - thesis is well-supported') {
          parts.push(`  → Doubt: ${value.gaps}`)
        }
      }
    }
  }

  // 4. Instructions - reinforcing investor-native analysis
  parts.push(`\n=== YOUR TASK ===
Generate the V1 founder-facing report JSON.

REMEMBER:
- Track INVESTOR CONVICTION FLOW, not rubric completion
- Explain what investors BELIEVE after each section
- Identify where MOMENTUM builds and where DOUBT appears
- For sparse decks: Does the core story land? Don't punish missing Series A elements.
- NO GENERIC LANGUAGE: "needs more detail", "add metrics", "lacks differentiation"
- Every gap should explain the INVESTOR CONSEQUENCE
- Strong slides should feel STRONG—don't force criticism
- NO REPETITION between synthesis, improvements, and slide details`)

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
