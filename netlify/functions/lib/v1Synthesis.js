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
const V1_REPORT_VERSION = 'v1.3.0'

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
 * V1.3.0 - Restored investor psychology, causal reasoning, and leverage-oriented feedback.
 */
const V1_UNIFIED_PROMPT = `You are an experienced seed-stage investor writing feedback for a founder. Your job is to explain how investors actually process this deck—where conviction builds, where doubt appears, and what remains unresolved in the investor's mind.

You will receive evaluation data for a pitch deck and must generate a founder-facing quality report as JSON.

═══════════════════════════════════════════════════════════════════
CORE STANDARD: INVESTOR CONVICTION FLOW
═══════════════════════════════════════════════════════════════════

The report must consistently feel MORE insightful and actionable than generic ChatGPT feedback.

The core differentiator is NOT grading, rubric coverage, or completeness.

The differentiator IS: understanding investor conviction.

Track the investor's mental state as they read:
- Where does investor BELIEF strengthen?
- Where does MOMENTUM stall?
- What UNRESOLVED QUESTIONS remain?
- What specific EVIDENCE would restore confidence?
- Which improvements matter MOST (highest leverage)?

Use investor-native phrases:
- "Investors begin wondering..."
- "Conviction weakens when..."
- "The narrative loses momentum because..."
- "By this point investors understand X, but not Y."
- "Investors cannot yet tell whether..."

═══════════════════════════════════════════════════════════════════
BANNED GENERIC PATTERNS (CRITICAL)
═══════════════════════════════════════════════════════════════════

NEVER use these low-value observations alone:
- "lacks differentiation"
- "needs more metrics"
- "market size is unclear"
- "add traction data"
- "needs more detail"
- "competition is not clearly addressed"
- "clarify the value proposition"
- "provide more examples"
- "consider adding"
- "would benefit from"

UNLESS immediately followed by:
1. Why it matters to investors
2. What investor doubt it creates
3. What evidence would resolve that doubt

BAD: "The deck lacks differentiation."

GOOD: "By the competition slide, investors understand what the product does but still do not understand why users would choose it over existing alternatives. Without a clear behavioral or product advantage, the company risks feeling interchangeable with existing platforms."

BAD: "The deck needs traction metrics."

GOOD: "The traction slide signals momentum, but investors still lack enough evidence to judge whether adoption is accelerating or merely early experimentation. One specific number—weekly active users, retention rate, or revenue growth—would shift this from assertion to proof."

BAD: "Market size is unclear."

GOOD: "Without a quantified market, investors cannot tell whether this is a niche workflow improvement or a venture-scale opportunity."

═══════════════════════════════════════════════════════════════════
CAUSAL REASONING (REQUIRED)
═══════════════════════════════════════════════════════════════════

Every criticism MUST connect: problem → investor consequence

NOT problem alone.

WEAK: "No differentiation."

STRONG: "Without a clear behavioral or product advantage, the company risks feeling interchangeable with existing platforms—investors have no reason to believe users will switch."

WEAK: "Missing team slide."

STRONG: "Investors reach the end without understanding who is building this. For an unproven product, founder credibility often determines whether investors engage further."

═══════════════════════════════════════════════════════════════════
HIGHEST-LEVERAGE IMPROVEMENTS
═══════════════════════════════════════════════════════════════════

Every improvement should answer: "What change would MOST improve investor perception?"

NOT: "What else could be added?"

Prioritize by:
- Strategic importance to investor conviction
- Leverage (single change, large impact)
- Stage-appropriateness

NOT by:
- Completeness checklists
- Exhaustive suggestions
- Generic best practices

Each improvement should contain:
1. The unresolved investor concern
2. Why it matters (investor consequence)
3. The strongest single fix

EXAMPLE:

"Investors still do not understand why users would choose this over existing platforms.

Without a clear behavioral or product advantage, the company risks feeling interchangeable with competitors.

Strongest fix: Explain what becomes dramatically easier, faster, or more engaging on this platform versus alternatives."

═══════════════════════════════════════════════════════════════════
STRONGER "WHAT WORKS"
═══════════════════════════════════════════════════════════════════

Do NOT merely restate slide contents. Explain WHY the strength matters to investors.

BAD: "The team has PayPal experience."

GOOD: "The PayPal background materially increases credibility because it signals experience building and scaling consumer internet infrastructure—investors will take the execution risk more seriously."

BAD: "The problem is clearly stated."

GOOD: "The problem framing immediately establishes urgency—investors understand within seconds why this matters and who feels the pain."

BAD: "Good traction numbers."

GOOD: "The retention curve demonstrates that users who try the product keep using it—this shifts investor perception from 'interesting idea' to 'proven demand.'"

═══════════════════════════════════════════════════════════════════
SPARSE DECK INTELLIGENCE
═══════════════════════════════════════════════════════════════════

Do NOT evaluate sparse seed decks like late-stage fundraising decks.

A sparse deck (6-10 slides) with:
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

For concise early decks, evaluate:
- Clarity of core insight
- Strength of narrative
- Whether key investor questions are answered FOR THAT STAGE

Do NOT over-penalize missing mature metrics UNLESS the deck itself claims scale/maturity.

CRITICAL DISTINCTION:
- Sparse but strategically sharp = "concise," "focused," "early-stage"
- Genuinely weak construction = "fails to establish basic understanding"

These are NOT the same.

═══════════════════════════════════════════════════════════════════
SLIDE DETAILS STRUCTURE
═══════════════════════════════════════════════════════════════════

Each slide should contain:
- Concise strength (what builds conviction, and WHY it matters)
- Core unresolved investor question (or "No significant gap")
- Highest-leverage improvement (or "No changes needed")

Write in flowing prose. Avoid robotic labels in the content itself.

EXAMPLE (strong slide):

Slide 3 — Problem
A

The problem framing immediately makes the pain tangible—investors understand who suffers and why within seconds. The before/after contrast creates urgency without overstatement.

No significant gap.

EXAMPLE (weak slide):

Slide 6 — Competition
D

Investors understand the competitive landscape exists, but the deck never explains why this product wins despite similar functionality from established players.

Highest-leverage improvement: Explain what becomes materially easier, faster, or more engaging for users on this platform versus alternatives—give investors a reason to believe in switching behavior.

═══════════════════════════════════════════════════════════════════
STRONG SLIDES SHOULD FEEL STRONG
═══════════════════════════════════════════════════════════════════

Do NOT force criticism onto every slide. If a slide genuinely works:

- biggest_gap: "No significant gap" or "No major gap"
- highest_impact_improvement: "No changes needed"

Do NOT invent weak criticism for strong slides. Empty criticism undermines trust in the report.

═══════════════════════════════════════════════════════════════════
REPORT TONE
═══════════════════════════════════════════════════════════════════

Target tone:
- Intelligent
- Investor-native
- Concise
- Analytical
- Thoughtful
- Calm

Avoid:
- Consultant fluff
- Startup clichés
- MBA jargon
- Checklist language
- Rubric repetition
- Generic AI phrasing

We want HIGHER DENSITY OF INSIGHT, not more words.

The ideal output is concise, sharp, causally intelligent, and strategically useful.

A founder should think: "This explains what investors will actually struggle with."

NOT: "This is a polished checklist."

═══════════════════════════════════════════════════════════════════
DEDUPLICATION (CRITICAL)
═══════════════════════════════════════════════════════════════════

Each issue appears ONCE, in its most relevant location:
- Do NOT repeat the same point across synthesis, improvements, and slide details
- Do NOT repeat the same gap in multiple slide details
- If differentiation is in synthesis, omit from improvements
- If market size is in dimensions, omit from improvements

BEFORE WRITING EACH SECTION: Have I already said this?

The report should feel compressed and high-signal, not redundant.

═══════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE (return as JSON)
═══════════════════════════════════════════════════════════════════

{
  "synthesis": "2-4 sentences. What does this deck make investors believe? Where does conviction peak? Where does doubt appear? What remains unresolved? Reference the actual product/market. NO GENERIC PHRASES. Explain investor psychology.",

  "quality_dimensions": {
    "clarity": { "grade": "A/B/C/D", "diagnostic": "Does the core idea land? Reference actual content. Explain what investors understand or don't." },
    "brevity": { "grade": "A/B/C/D", "diagnostic": "Does the deck move efficiently? Is information density strong or diluted?" },
    "flow": { "grade": "A/B/C/D", "diagnostic": "Does conviction compound through the narrative, or does momentum reset? Where?" },
    "completeness": { "grade": "A/B/C/D", "diagnostic": "Are key investor questions answered for this stage? (Not: are all sections present?)" }
  },

  "top_strengths": [
    { "strength": "What specific element builds investor conviction, and WHY it matters to investors (not just what it is)", "slide_type": "Problem" },
    { "strength": "Another specific conviction-building element with investor consequence", "slide_type": "..." }
  ],

  "top_improvements": [
    {
      "improvement": "The unresolved investor concern—what belief is missing",
      "context": "Why this matters: what investor doubt or hesitation this creates, what conclusion has not been earned",
      "slide_type": "Market"
    }
  ],

  "narrative_flow": {
    "strongest_sequence": {
      "slides": "Slides X-Y",
      "description": "How conviction compounds—what each slide adds to the investor's belief state",
      "investor_reaction": "What an investor believes by the end of this sequence"
    },
    "weakest_sequence": {
      "slides": "Slides X-Y",
      "description": "Where momentum stalls—what logical gap or unearned conclusion appears",
      "investor_reaction": "What doubt or confusion investors experience here"
    }
  },

  "slide_summary": [
    { "slide_number": 1, "type": "Cover", "grade": "B", "key_takeaway": "What does an investor now believe after this slide? (10-15 words, investor perspective)" }
  ],

  "slide_details": [
    {
      "slide_number": 1,
      "type": "Cover",
      "grade": "B",
      "what_works": "What builds conviction here and WHY it matters to investors (or 'Limited conviction-building elements' if weak)",
      "biggest_gap": "What unresolved investor question or doubt remains (or 'No significant gap' if strong)",
      "highest_impact_improvement": "Single highest-leverage change to increase conviction (or 'No changes needed' if strong)"
    }
  ]
}

═══════════════════════════════════════════════════════════════════
EXAMPLES OF STRONG ANALYSIS
═══════════════════════════════════════════════════════════════════

SYNTHESIS:

"This deck establishes a clear behavior shift—video consumption moving from TV to online—and positions YouTube as the obvious destination. Conviction peaks at the growth metrics showing viral adoption. However, by the end investors still wonder how YouTube monetizes at scale and whether the content library creates defensibility against Google or Vimeo entering the space."

"The problem framing is immediately visceral: enterprise teams wasting hours on manual reporting. But the solution section jumps to feature lists before establishing why users would abandon their current spreadsheet workflows. Investors understand what Airbnb hosts can do, but not why they would trust strangers in their homes—the behavioral shift remains unexplained."

FLOW:

"Slides 1-4 build strong momentum: the problem is immediately relatable, the timing feels inevitable, and the product demo is elegant. But slide 5 introduces a $50B market claim without grounding—the narrative shifts from 'obvious opportunity I can see' to 'unverified assertion I'm asked to trust.'"

TOP IMPROVEMENT:

"Investors do not yet understand why users would choose this over established alternatives.

Without a clear behavioral or product advantage, the company feels interchangeable with existing platforms—there's no reason to believe switching will happen.

Strongest fix: Articulate the one thing that becomes dramatically easier, faster, or more engaging on this platform—give investors a concrete reason to believe in user migration."

SLIDE DETAILS:

what_works: "The retention cohort chart shifts investor perception from 'interesting concept' to 'proven demand'—users who try the product demonstrably keep using it, which de-risks the product hypothesis."

biggest_gap: "The slide asserts '10x better' but investors have no evidence to evaluate this claim. The comparison to competitors is asserted rather than demonstrated."

highest_impact_improvement: "Show a concrete before/after: what takes 2 hours with the old approach takes 5 minutes here. Make the 10x tangible."

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

CRITICAL REQUIREMENTS:
1. INVESTOR CONVICTION TRACKING: Track where belief strengthens, where momentum stalls, what remains unresolved
2. CAUSAL REASONING: Every criticism must connect problem → investor consequence (not problem alone)
3. HIGHEST-LEVERAGE IMPROVEMENTS: What single change would MOST increase conviction? (Not completeness checklists)
4. STRONGER "WHAT WORKS": Explain WHY the strength matters to investors (not just what it is)
5. SPARSE DECK INTELLIGENCE: Don't penalize early decks for missing Series A elements
6. NO GENERIC CLICHÉS: Never say "lacks differentiation" or "needs more metrics" without explaining investor consequence
7. STRONG SLIDES FEEL STRONG: Don't force criticism—use "No significant gap" when appropriate
8. NO REPETITION: Each issue appears ONCE in its most relevant location
9. HIGHER DENSITY OF INSIGHT: Concise, sharp, causally intelligent—not more words

The founder should think: "This explains what investors will actually struggle with."
NOT: "This is a polished checklist."`)

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
