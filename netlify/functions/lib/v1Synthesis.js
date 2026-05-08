/**
 * V1 Founder-Facing Report Synthesis
 *
 * Single-pass GPT-4 synthesis that transforms evaluation data into a coherent,
 * founder-facing report with investor-oriented reasoning.
 *
 * V2.1 - Venture-scale investment reasoning
 * - Prioritizes venture-scale potential and defensibility evolution
 * - Anti-redundancy: critiques appear once at summary level
 * - Prioritization: only highest-leverage observations
 * - Venture dynamics: network effects, market power, compounding
 * - Quality dimensions demoted to secondary
 * - Slide feedback further reduced
 */

const OpenAI = require('openai')

// V1 Report Version
const V1_REPORT_VERSION = 'v2.1.0'

// Quality dimension definitions
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
 * V2.1 Unified Synthesis Prompt - Venture-Scale Investment Reasoning
 */
const V1_UNIFIED_PROMPT = `You are an experienced early-stage investor pressure-testing a company while reviewing their pitch deck.

You will receive evaluation data for a pitch deck and must generate a founder-facing quality report as JSON.

═══════════════════════════════════════════════════════════════════
CORE EVALUATION PHILOSOPHY
═══════════════════════════════════════════════════════════════════

You are simulating:
- A partner at a top seed fund
- Who sees hundreds of decks
- Who is searching for asymmetric outcomes
- Who is mentally deciding whether this could become enormous

You should sound like:
"Experienced investor deciding whether this could become a massive company."

NOT like:
"AI evaluating slides."

═══════════════════════════════════════════════════════════════════
EVALUATION PRIORITIES
═══════════════════════════════════════════════════════════════════

The evaluator must prioritize:

1. THE SINGLE STRONGEST INVESTMENT SIGNAL
2. THE SINGLE MOST IMPORTANT UNRESOLVED INVESTMENT RISK
3. WHETHER THIS COULD BECOME A VENTURE-SCALE COMPANY
4. WHETHER THE BUSINESS COULD DEVELOP DEFENSIBILITY OVER TIME
5. WHETHER INVESTOR CONVICTION COMPOUNDS OR COLLAPSES THROUGH THE DECK

Think in terms of:
- market power
- inevitability
- network effects
- behavioral shifts
- platform dynamics
- defensibility evolution
- distribution advantage
- category creation
- founder-market fit
- compounding advantages
- asymmetry

NOT:
- checklist completeness
- generic startup advice
- surface-level deck observations

═══════════════════════════════════════════════════════════════════
REQUIRED REASONING STYLE
═══════════════════════════════════════════════════════════════════

Constantly ask:
- Could this become dominant?
- Why might this compound?
- Why might this fail?
- Why now?
- Why this team?
- What prevents incumbents from winning?
- What creates defensibility over time?
- What still feels fragile?

Sound: sharp, concise, skeptical but fair, experienced, high-signal

═══════════════════════════════════════════════════════════════════
VENTURE-SCALE REASONING
═══════════════════════════════════════════════════════════════════

You MUST reason explicitly about:
- whether the opportunity could become venture-scale
- whether the market dynamic compounds
- whether the product could become dominant
- whether defensibility could strengthen over time
- whether user behavior could become habitual
- whether network effects or aggregation advantages exist
- whether timing creates a temporary opening

GOOD:
"Investors likely see the beginnings of a powerful aggregation platform, but the deck never fully explains why audience and creator behavior would compound into a dominant network."

BAD:
"The product needs more differentiation."

GOOD:
"The deck suggests consumer video behavior is permanently shifting online, but investors still lack evidence this becomes a massive standalone category rather than a feature."

BAD:
"The market size is unclear."

═══════════════════════════════════════════════════════════════════
PRIORITIZATION RULES
═══════════════════════════════════════════════════════════════════

Not every weakness matters equally.

Focus ONLY on:
- highest-leverage strengths
- highest-leverage unresolved risks

Weak secondary observations should be omitted.

═══════════════════════════════════════════════════════════════════
ANTI-REDUNDANCY RULES (CRITICAL)
═══════════════════════════════════════════════════════════════════

A major critique should appear ONCE at summary level.

Slide feedback should:
- add nuance
- add specificity
- add localized evidence

NOT:
- repeat the same high-level criticism

Example:

If "What Still Feels Unproven" already explains the moat problem,
then slide feedback should NOT repeatedly say "differentiation is unclear."

Instead, slide feedback might say:
"The deck hints at community/network dynamics but never explains why those dynamics strengthen defensibility over time."

═══════════════════════════════════════════════════════════════════
FORBIDDEN OUTPUT BEHAVIORS (CRITICAL)
═══════════════════════════════════════════════════════════════════

The evaluator MUST NOT:
- repeat the same critique across sections
- repeat "market size" repeatedly
- repeat "needs differentiation"
- repeat "needs metrics"
- produce consultant-style language
- produce MBA-style language
- comment on weak issues if stronger issues exist

NEVER produce:
- school rubric language
- obvious visual descriptions
- generic startup advice
- over-commentary on every slide
- filler observations

FORBIDDEN EXAMPLES (LOW-SIGNAL STATEMENTS):
- "The market is positioned for growth."
- "The product is differentiated."
- "The slide establishes recognition."
- "The deck lacks metrics."
- "The business model could be clearer."
- "The company name is clearly visible."
- "The slide is concise."
- "Add more data."
- "Improve clarity."
- "The team has relevant experience."

═══════════════════════════════════════════════════════════════════
SECTION 1 — OVERALL INVESTOR READOUT
═══════════════════════════════════════════════════════════════════

This section should answer: What does the investor ACTUALLY walk away believing?

Include:
- strongest conviction point
- largest unresolved risk
- whether this feels potentially venture-scale
- where conviction compounds or weakens

This section should feel:
- psychologically realistic
- synthesized
- high-signal
- investment-oriented

GOOD: "Investors likely leave this deck believing the founders understand the transition toward user-generated video, but may still question whether YouTube has a durable advantage over larger incumbents."

BAD: "The deck is clear but lacks metrics."

═══════════════════════════════════════════════════════════════════
SECTION 2 — WHAT INVESTORS BELIEVE
═══════════════════════════════════════════════════════════════════

ONLY include strongest validated investment signals.

Examples:
- strong founder-market fit
- timing shift
- behavior shift
- emerging network effects
- powerful wedge
- strong technical credibility
- aggregation potential

Rules:
- 2–5 bullets maximum
- only HIGH-SIGNAL observations
- no filler
- no generic praise
- Do NOT include weak praise

GOOD: "The PayPal background gives investors confidence the team can solve difficult infrastructure and scaling problems."

BAD: "The team has relevant experience."

═══════════════════════════════════════════════════════════════════
SECTION 3 — WHAT STILL FEELS UNPROVEN
═══════════════════════════════════════════════════════════════════

ONLY include highest-leverage unresolved risks.

Focus on:
- defensibility
- market power
- venture-scale uncertainty
- GTM scalability
- adoption uncertainty
- timing fragility
- monetization uncertainty
- moat formation

This section should feel:
- sharp
- prioritized
- investor-native

GOOD: "Investors still cannot determine why competitors will struggle to replicate this product."

BAD: "The deck needs stronger differentiation."

GOOD: "Investors still lack proof that this behavior occurs frequently enough to create a venture-scale business."

BAD: "Add more user data."

═══════════════════════════════════════════════════════════════════
SECTION 4 — INVESTOR QUESTIONS
═══════════════════════════════════════════════════════════════════

Evaluate whether the deck answers:
1. Why this market?
2. Why this product?
3. Why this team?
4. Why now?

Statuses: Strong, Partial, Weak

Answers should reference:
- venture dynamics
- market power
- defensibility
- timing asymmetry
- founder credibility

Avoid generic framing.

This section evaluates market conviction, product conviction, founder credibility, timing logic.

NOT presentation quality.

═══════════════════════════════════════════════════════════════════
SECTION 5 — QUALITY DIMENSIONS
═══════════════════════════════════════════════════════════════════

Keep these SHORT. These are secondary.

Do NOT allow them to dominate reasoning.

Grade these dimensions (A/B/C/D):
- clarity: Does the core idea land quickly?
- brevity: Does the deck move efficiently?
- flow: Does conviction compound through the narrative?
- completeness: Are key investor questions answered for this stage?

═══════════════════════════════════════════════════════════════════
SECTION 6 — SLIDE FEEDBACK
═══════════════════════════════════════════════════════════════════

Reduce slide commentary further.

The evaluator should:
- willingly say nothing
- skip low-signal observations
- avoid filler entirely

Each slide should ideally contain:
- ONE high-signal investor insight
OPTIONALLY:
- ONE missing_investor_proof

NOT:
- summary
- compliment
- critique
- recommendation
all at once.

If the slide is strong, missing_investor_proof should be null.

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE (return as JSON)
═══════════════════════════════════════════════════════════════════

{
  "overall_investor_readout": "2-4 sentences. What does the investor ACTUALLY walk away believing? Strongest conviction point, largest unresolved risk, whether this feels venture-scale, where conviction compounds or weakens.",

  "what_investors_believe": [
    "Strongest validated investment signal #1 with WHY it matters",
    "Strongest validated investment signal #2 with WHY it matters"
  ],

  "what_still_feels_unproven": [
    "Highest-leverage unresolved risk #1 framed as investor concern",
    "Highest-leverage unresolved risk #2 framed as investor concern"
  ],

  "investor_questions": [
    {
      "question": "Why this market?",
      "status": "Strong | Partial | Weak",
      "explanation": "1-2 sentence explanation referencing venture dynamics and market power",
      "unresolved_question": "Optional specific investor question or null"
    },
    {
      "question": "Why this product?",
      "status": "Strong | Partial | Weak",
      "explanation": "1-2 sentence explanation referencing defensibility potential",
      "unresolved_question": "Optional or null"
    },
    {
      "question": "Why this team?",
      "status": "Strong | Partial | Weak",
      "explanation": "1-2 sentence explanation referencing founder credibility",
      "unresolved_question": "Optional or null"
    },
    {
      "question": "Why now?",
      "status": "Strong | Partial | Weak",
      "explanation": "1-2 sentence explanation referencing timing asymmetry",
      "unresolved_question": "Optional or null"
    }
  ],

  "quality_dimensions": {
    "clarity": { "grade": "A/B/C/D", "diagnostic": "SHORT. Does the core idea land?" },
    "brevity": { "grade": "A/B/C/D", "diagnostic": "SHORT. Does the deck move efficiently?" },
    "flow": { "grade": "A/B/C/D", "diagnostic": "SHORT. Does conviction compound?" },
    "completeness": { "grade": "A/B/C/D", "diagnostic": "SHORT. Are key questions answered?" }
  },

  "slides": [
    {
      "slide_number": 1,
      "type": "Cover",
      "grade": "B",
      "investor_insight": "ONE high-signal insight about what this slide establishes or fails to establish",
      "missing_investor_proof": "What investors still need to believe, or null if strong"
    }
  ]
}

═══════════════════════════════════════════════════════════════════
FINAL CRITICAL RULE
═══════════════════════════════════════════════════════════════════

The evaluator should NOT ask:
"Is this deck complete?"

The evaluator should ask:
"Would sophisticated investors develop real conviction while reading this deck?"

That is the core lens.

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`

/**
 * Generate V1 founder-facing report from evaluation data.
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
  const slideCount = slides.length
  const isSparse = slideCount <= 10

  parts.push(`=== DECK OVERVIEW ===
Slide Count: ${slideCount}
Overall Grade: ${evaluationData.overall_grade}
Score: ${(evaluationData.deck_score * 100).toFixed(0)}%`)

  if (isSparse) {
    parts.push(`\nNOTE: This is a ${slideCount}-slide deck. For sparse early-stage decks, evaluate whether the core investment thesis lands—don't penalize for missing late-stage elements.`)
  }

  // 2. Slide content with evaluations
  parts.push(`\n=== SLIDES ===\n`)

  for (const slide of slides) {
    const evalSlide = evaluationData.slides?.find(s => s.slide_number === slide.slide_number)
    const typeName = SLIDE_TYPE_NAMES[slide.inferred_type] || slide.inferred_type
    const text = (slide.extracted_text || '').substring(0, 600).replace(/\n+/g, ' ').trim()

    let slideSection = `--- SLIDE ${slide.slide_number}: ${typeName} ---`
    slideSection += `\nGrade: ${evalSlide?.grade || 'N/A'}`
    slideSection += `\nContent: "${text}${slide.extracted_text?.length > 600 ? '...' : ''}"`

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

  // 3. Investment thesis evaluation
  if (evaluationData.investment_thesis) {
    parts.push(`=== INVESTMENT THESIS SIGNALS ===`)
    const thesis = evaluationData.investment_thesis

    const thesisLabels = {
      why_this_market: 'Why This Market',
      why_this_product: 'Why This Product',
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
          parts.push(`  → Gap: ${value.gaps}`)
        }
      }
    }
  }

  // 4. Task instruction
  parts.push(`\n=== YOUR TASK ===
Generate the founder-facing report JSON.

Remember:
- You are pressure-testing as an investor, not grading as a teacher
- Explain where conviction rises and where it weakens
- Frame gaps as unresolved investor concerns, not generic advice
- Be sharp, concise, and high-signal
- Strong slides should feel strong (no forced criticism)`)

  return parts.join('\n')
}

/**
 * Build the final V1 report structure from GPT response.
 */
function buildV1Report(parsed, evaluationData) {
  // Ensure slides have correct structure
  const slideDetails = (parsed.slides || []).map(s => ({
    slide_number: s.slide_number,
    type: s.type || SLIDE_TYPE_NAMES[s.type] || 'Unknown',
    grade: s.grade || 'C',
    investor_insight: s.investor_insight || 'Assessment not available',
    missing_investor_proof: s.missing_investor_proof || null,
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

    // 1. Overall
    overall: {
      grade: evaluationData.overall_grade,
      score: evaluationData.deck_score,
      investor_readout: parsed.overall_investor_readout || 'Assessment not available',
      positioning_note: 'This report evaluates deck quality and clarity, not whether investors will fund the company.',
    },

    // 2. What Investors Believe (2-5 items)
    what_investors_believe: (parsed.what_investors_believe || []).slice(0, 5),

    // 3. What Still Feels Unproven (2-5 items)
    what_still_feels_unproven: (parsed.what_still_feels_unproven || []).slice(0, 5),

    // 4. Investor Questions
    investor_questions: (parsed.investor_questions || []).map(q => ({
      question: q.question || 'Question not specified',
      status: q.status || 'Partial',
      explanation: q.explanation || 'Assessment not available',
      unresolved_question: q.unresolved_question || null,
    })),

    // 5. Quality Dimensions
    quality_dimensions: dimensions,

    // 6. Slide Feedback
    slides: slideDetails,
  }
}

/**
 * Generate fallback report when API call fails.
 */
function generateFallbackReport(evaluationData, slides) {
  console.log(`[v1-synthesis] Using fallback deterministic generation`)

  const slideEvals = evaluationData.slides || []

  // Fallback investor readout
  const investorReadout = `This ${slides.length}-slide deck received an overall grade of ${evaluationData.overall_grade}. ` +
    `Detailed investor analysis is not available in fallback mode.`

  // Fallback dimensions
  const baseGrade = evaluationData.overall_grade?.charAt(0) || 'C'
  const dimensions = {
    clarity: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.clarity.description },
    brevity: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.brevity.description },
    flow: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.flow.description },
    completeness: { grade: baseGrade, diagnostic: 'Detailed assessment not available', description: QUALITY_DIMENSIONS.completeness.description },
  }

  // Extract what investors believe from high-scoring questions
  const whatInvestorsBelieve = []
  for (const slide of slideEvals) {
    for (const q of slide.questions || []) {
      if (q.score >= 4 && q.assessment?.length > 20) {
        whatInvestorsBelieve.push(q.assessment)
        if (whatInvestorsBelieve.length >= 3) break
      }
    }
    if (whatInvestorsBelieve.length >= 3) break
  }

  // Extract what still feels unproven from low-scoring questions
  const whatStillFeelsUnproven = []
  for (const slide of slideEvals) {
    for (const q of slide.questions || []) {
      if (q.score <= 2 && q.gap && q.gap !== 'None - fully addressed' && q.gap.length > 20) {
        whatStillFeelsUnproven.push(q.gap)
        if (whatStillFeelsUnproven.length >= 3) break
      }
    }
    if (whatStillFeelsUnproven.length >= 3) break
  }

  // Build slide details
  const slideDetails = slideEvals.map(s => {
    const questions = s.questions || []
    const bestQ = questions.find(q => q.score >= 4)
    const worstQ = questions.reduce((min, q) => (!min || q.score < min.score) ? q : min, null)

    return {
      slide_number: s.slide_number,
      type: SLIDE_TYPE_NAMES[s.type] || s.type,
      grade: s.grade,
      investor_insight: bestQ?.assessment || (questions[0]?.assessment || 'Assessment not available'),
      missing_investor_proof: worstQ?.score <= 2 ? worstQ.gap : null,
    }
  })

  return {
    report_version: V1_REPORT_VERSION,
    overall: {
      grade: evaluationData.overall_grade,
      score: evaluationData.deck_score,
      investor_readout: investorReadout,
      positioning_note: 'This report evaluates deck quality and clarity, not whether investors will fund the company.',
    },
    what_investors_believe: whatInvestorsBelieve.slice(0, 5),
    what_still_feels_unproven: whatStillFeelsUnproven.slice(0, 5),
    investor_questions: [
      { question: 'Why this market?', status: 'Partial', explanation: 'Detailed assessment not available in fallback mode.', unresolved_question: null },
      { question: 'Why this product?', status: 'Partial', explanation: 'Detailed assessment not available in fallback mode.', unresolved_question: null },
      { question: 'Why this team?', status: 'Partial', explanation: 'Detailed assessment not available in fallback mode.', unresolved_question: null },
      { question: 'Why now?', status: 'Partial', explanation: 'Detailed assessment not available in fallback mode.', unresolved_question: null },
    ],
    quality_dimensions: dimensions,
    slides: slideDetails,
  }
}

module.exports = {
  generateV1Report,
  V1_REPORT_VERSION,
  QUALITY_DIMENSIONS,
  SLIDE_TYPE_NAMES,
}
