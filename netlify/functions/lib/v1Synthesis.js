/**
 * V1 Founder-Facing Report Synthesis
 *
 * This module transforms detailed evaluation data into a clean, concise,
 * founder-facing report optimized for usefulness over technical completeness.
 *
 * Report Structure:
 * 1. Overall Deck Quality (grade + deck-specific synthesis)
 * 2. Quality Dimensions (Clarity, Brevity, Flow, Completeness)
 * 3. Top Strengths (3-4 deck-specific strengths)
 * 4. Top Improvement Priorities (3 highest-impact improvements)
 * 5. Narrative Flow Analysis
 * 6. Slide Summary Table
 * 7. Slide Details (concise: What Works, Biggest Gap, Highest-Impact Fix)
 */

const OpenAI = require('openai')

// V1 Report Version
const V1_REPORT_VERSION = 'v1.0.0'

// Quality dimension definitions
const QUALITY_DIMENSIONS = {
  clarity: {
    name: 'Clarity',
    description: 'How clearly the deck communicates what the company does and why it matters',
    key_questions: [
      'Can someone understand the product in 30 seconds?',
      'Is the value proposition obvious?',
      'Are technical concepts explained simply?',
    ],
  },
  brevity: {
    name: 'Brevity',
    description: 'Whether the deck is appropriately concise without unnecessary content',
    key_questions: [
      'Is each slide focused on one key point?',
      'Are there redundant or filler slides?',
      'Does text density feel appropriate?',
    ],
  },
  flow: {
    name: 'Flow',
    description: 'How logically the narrative builds from problem to solution to ask',
    key_questions: [
      'Does the story build logically?',
      'Are transitions between sections smooth?',
      'Does momentum build toward the ask?',
    ],
  },
  completeness: {
    name: 'Completeness',
    description: 'Whether the deck addresses the key questions investors need answered',
    key_questions: [
      'Are core investor questions addressed?',
      'Are there obvious missing sections?',
      'Is enough evidence provided?',
    ],
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
}

/**
 * Prompt for generating deck-specific synthesis.
 * This produces the 1-2 paragraph summary that feels human and specific.
 */
const V1_SYNTHESIS_PROMPT = `You are a sharp, experienced pitch deck reviewer helping founders improve their decks.

Your job is to write a 1-2 paragraph synthesis of this deck that:
- Summarizes the actual narrative (what the company does, who it serves, what problem it solves)
- Identifies the strongest investor signals in this specific deck
- Identifies the biggest missing pieces or gaps
- Feels specific to THIS deck, not template-generated
- Uses concrete references to actual content

DO NOT:
- Use generic phrases like "the deck is well-structured" or "needs more detail"
- Mention the scoring system or rubrics
- Use academic or evaluator language
- Repeat the same point twice

DO:
- Reference the actual product, market, or company
- Be direct and specific about what works and what doesn't
- Sound like a helpful human reviewer, not an AI
- Keep it concise (2-4 sentences per paragraph)

EXAMPLE GOOD SYNTHESIS:
"This is a sparse but high-signal seed deck that clearly communicates a painful consumer problem around video sharing friction, strong timing around broadband adoption, and a simple product vision. The presentation lacks quantified evidence and detailed financials, but the core narrative is easy to understand and logically structured. The biggest gap is competitive positioning—investors will want to understand why YouTube wins against existing video platforms."

Return ONLY the synthesis text, no JSON or formatting.`

/**
 * Prompt for generating quality dimension assessments.
 */
const V1_DIMENSIONS_PROMPT = `You are evaluating a pitch deck across 4 quality dimensions. For each dimension, provide:
- A grade (A, B, C, D)
- A 1-sentence deck-specific diagnostic

DIMENSIONS:
1. CLARITY - How clearly the deck communicates what the company does
2. BREVITY - Whether the deck is appropriately concise
3. FLOW - How logically the narrative builds
4. COMPLETENESS - Whether key investor questions are addressed

CRITICAL RULES:
- Each diagnostic MUST reference actual deck content
- Do NOT use generic phrases like "the deck is clear" or "flow is logical"
- DO reference specific slides, product features, or narrative elements

BAD: "The deck is easy to understand."
GOOD: "The deck clearly communicates that YouTube solves the friction of uploading, hosting, and sharing video online."

BAD: "The flow is logical."
GOOD: "The narrative builds from video-sharing pain points → enabling technology shift → simple product solution → early traction evidence."

Return JSON:
{
  "clarity": { "grade": "B", "diagnostic": "..." },
  "brevity": { "grade": "B", "diagnostic": "..." },
  "flow": { "grade": "B", "diagnostic": "..." },
  "completeness": { "grade": "C", "diagnostic": "..." }
}`

/**
 * Prompt for generating narrative flow analysis.
 */
const V1_NARRATIVE_FLOW_PROMPT = `Analyze the narrative flow of this pitch deck.

Identify:
1. The strongest sequence of slides (where investor conviction builds)
2. The weakest sequence (where narrative momentum weakens or gaps appear)

For each, explain:
- Which slides form the sequence
- Why it works or doesn't work
- What an investor would think at that point

Be specific about slide content and narrative logic.

Return JSON:
{
  "strongest_sequence": {
    "slides": "Slides 2-4",
    "description": "The problem → solution → product sequence builds clear conviction around the core value proposition.",
    "investor_reaction": "By slide 4, investors understand the pain point and see a simple, elegant solution."
  },
  "weakest_sequence": {
    "slides": "Slides 6-7",
    "description": "The market → competition transition loses momentum with generic claims.",
    "investor_reaction": "Investors start questioning whether the market size is real and how this wins against alternatives."
  }
}`

/**
 * Generate V1 founder-facing report from evaluation data.
 *
 * @param {Object} evaluationData - Full evaluation results from existing pipeline
 * @param {Array} slides - Slide data with extracted text
 * @param {Object} options - Generation options
 * @returns {Object} V1 report structure
 */
async function generateV1Report(evaluationData, slides, options = {}) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const openai = new OpenAI({ apiKey: openaiKey })

  // Build deck context for synthesis
  const deckContext = buildDeckContext(slides, evaluationData)

  // Generate all synthesis components in parallel
  const [synthesis, dimensions, narrativeFlow] = await Promise.all([
    generateSynthesis(openai, deckContext, evaluationData),
    generateDimensions(openai, deckContext, evaluationData),
    generateNarrativeFlow(openai, deckContext, evaluationData),
  ])

  // Generate strengths and improvements from evaluation data (no API call)
  const topStrengths = extractTopStrengths(evaluationData, deckContext)
  const topImprovements = extractTopImprovements(evaluationData, deckContext)

  // Generate slide summary table (no API call)
  const slideSummaryTable = generateSlideSummaryTable(evaluationData)

  // Generate concise slide details (no API call)
  const slideDetails = generateSlideDetails(evaluationData)

  return {
    report_version: V1_REPORT_VERSION,

    // 1. Overall Deck Quality
    overall: {
      grade: evaluationData.overall_grade,
      score: evaluationData.deck_score,
      synthesis,
      positioning_note: 'This score reflects deck quality and completeness—not whether investors would ultimately fund the company.',
    },

    // 2. Quality Dimensions
    quality_dimensions: dimensions,

    // 3. Top Strengths
    top_strengths: topStrengths,

    // 4. Top Improvement Priorities
    top_improvements: topImprovements,

    // 5. Narrative Flow
    narrative_flow: narrativeFlow,

    // 6. Slide Summary Table
    slide_summary: slideSummaryTable,

    // 7. Slide Details
    slides: slideDetails,
  }
}

/**
 * Build deck context string for synthesis prompts.
 */
function buildDeckContext(slides, evaluationData) {
  const slideOutlines = slides.map((s) => {
    const typeName = SLIDE_TYPE_NAMES[s.inferred_type] || s.inferred_type
    const text = s.extracted_text || ''
    const preview = text.substring(0, 300).replace(/\n+/g, ' ').trim()
    return `Slide ${s.slide_number} (${typeName}): ${preview}${text.length > 300 ? '...' : ''}`
  }).join('\n\n')

  // Include evaluation grades for context
  const gradeContext = evaluationData.slides.map((s) => {
    const typeName = SLIDE_TYPE_NAMES[s.type] || s.type
    return `Slide ${s.slide_number} (${typeName}): Grade ${s.grade}`
  }).join('\n')

  return `DECK CONTENT:\n${slideOutlines}\n\nEVALUATION GRADES:\n${gradeContext}\n\nOVERALL GRADE: ${evaluationData.overall_grade}`
}

/**
 * Generate deck-specific synthesis using GPT-4.
 */
async function generateSynthesis(openai, deckContext, evaluationData) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: V1_SYNTHESIS_PROMPT },
        { role: 'user', content: deckContext },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.choices[0]?.message?.content?.trim() || generateFallbackSynthesis(evaluationData)
  } catch (err) {
    console.error('[v1-synthesis] Synthesis generation error:', err.message)
    return generateFallbackSynthesis(evaluationData)
  }
}

/**
 * Generate quality dimension assessments using GPT-4.
 */
async function generateDimensions(openai, deckContext, evaluationData) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: V1_DIMENSIONS_PROMPT },
        { role: 'user', content: deckContext },
      ],
      temperature: 0.5,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    const parsed = JSON.parse(content)

    // Validate and enrich with metadata
    return {
      clarity: {
        grade: parsed.clarity?.grade || 'C',
        diagnostic: parsed.clarity?.diagnostic || 'Unable to assess clarity.',
        description: QUALITY_DIMENSIONS.clarity.description,
      },
      brevity: {
        grade: parsed.brevity?.grade || 'C',
        diagnostic: parsed.brevity?.diagnostic || 'Unable to assess brevity.',
        description: QUALITY_DIMENSIONS.brevity.description,
      },
      flow: {
        grade: parsed.flow?.grade || 'C',
        diagnostic: parsed.flow?.diagnostic || 'Unable to assess flow.',
        description: QUALITY_DIMENSIONS.flow.description,
      },
      completeness: {
        grade: parsed.completeness?.grade || 'C',
        diagnostic: parsed.completeness?.diagnostic || 'Unable to assess completeness.',
        description: QUALITY_DIMENSIONS.completeness.description,
      },
    }
  } catch (err) {
    console.error('[v1-synthesis] Dimensions generation error:', err.message)
    return generateFallbackDimensions(evaluationData)
  }
}

/**
 * Generate narrative flow analysis using GPT-4.
 */
async function generateNarrativeFlow(openai, deckContext, evaluationData) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: V1_NARRATIVE_FLOW_PROMPT },
        { role: 'user', content: deckContext },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    return JSON.parse(content)
  } catch (err) {
    console.error('[v1-synthesis] Narrative flow generation error:', err.message)
    return generateFallbackNarrativeFlow(evaluationData)
  }
}

/**
 * Extract top 3-4 strengths from evaluation data.
 * Prioritizes deck-specific, insightful observations.
 */
function extractTopStrengths(evaluationData, deckContext) {
  const strengths = []

  // Collect high-scoring questions with good assessments
  for (const slide of evaluationData.slides) {
    for (const q of slide.questions || []) {
      if (q.score >= 4 && q.assessment && q.assessment.length > 20) {
        strengths.push({
          text: q.assessment,
          slide_type: slide.type,
          score: q.score,
        })
      }
    }
  }

  // Sort by score, then by length (longer = more specific)
  strengths.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.text.length - a.text.length
  })

  // Take top 4, deduplicate by content similarity
  const unique = []
  for (const s of strengths) {
    const isDuplicate = unique.some((u) =>
      u.text.toLowerCase().includes(s.text.toLowerCase().substring(0, 30)) ||
      s.text.toLowerCase().includes(u.text.toLowerCase().substring(0, 30))
    )
    if (!isDuplicate) {
      unique.push(s)
    }
    if (unique.length >= 4) break
  }

  return unique.map((s) => ({
    strength: s.text,
    slide_type: SLIDE_TYPE_NAMES[s.slide_type] || s.slide_type,
  }))
}

/**
 * Extract top 3 highest-impact improvements from evaluation data.
 * Focuses on leverage, not checklist items.
 */
function extractTopImprovements(evaluationData, deckContext) {
  const improvements = []

  // Slide type importance for prioritization
  const typeImportance = {
    traction: 5,
    market: 4,
    team: 4,
    problem: 3,
    solution: 3,
    business_model: 3,
    competition: 2,
    product: 2,
    ask: 2,
  }

  // Collect low-scoring questions with specific fixes
  for (const slide of evaluationData.slides) {
    const importance = typeImportance[slide.type] || 1

    for (const q of slide.questions || []) {
      if (q.score <= 2 && q.fix && q.fix !== 'None needed' && q.fix.length > 20) {
        improvements.push({
          text: q.fix,
          gap: q.gap,
          slide_type: slide.type,
          score: q.score,
          importance,
        })
      }
    }
  }

  // Sort by importance, then by score (lower = more critical)
  improvements.sort((a, b) => {
    if (b.importance !== a.importance) return b.importance - a.importance
    return a.score - b.score
  })

  // Take top 3, clean up the fix text
  return improvements.slice(0, 3).map((imp) => ({
    improvement: cleanFixText(imp.text),
    context: imp.gap,
    slide_type: SLIDE_TYPE_NAMES[imp.slide_type] || imp.slide_type,
  }))
}

/**
 * Clean up fix text to be more founder-friendly.
 */
function cleanFixText(text) {
  // Remove conditional phrasing that's too hedging
  let cleaned = text
    .replace(/^If available[,:]?\s*/i, '')
    .replace(/^If true[,:]?\s*/i, '')
    .replace(/^If already tracked[,:]?\s*/i, '')
    .trim()

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned
}

/**
 * Generate slide summary table.
 */
function generateSlideSummaryTable(evaluationData) {
  return evaluationData.slides.map((slide) => {
    // Find the most important takeaway
    let keyTakeaway

    if (slide.grade === 'A' || slide.grade === 'A-') {
      // For strong slides, highlight the best assessment
      const best = slide.questions?.find((q) => q.score >= 4)
      keyTakeaway = best?.assessment?.substring(0, 100) || 'Strong slide meeting investor expectations.'
    } else if (slide.grade.startsWith('B')) {
      // For good slides, note the minor gap
      const gap = slide.questions?.find((q) => q.score <= 3)
      keyTakeaway = gap?.gap?.substring(0, 100) || 'Good foundation with minor gaps.'
    } else {
      // For weaker slides, highlight the biggest gap
      const weakest = slide.questions?.reduce((min, q) =>
        (!min || q.score < min.score) ? q : min, null)
      keyTakeaway = weakest?.gap?.substring(0, 100) || 'Needs improvement.'
    }

    return {
      slide_number: slide.slide_number,
      type: SLIDE_TYPE_NAMES[slide.type] || slide.type,
      grade: slide.grade,
      key_takeaway: keyTakeaway,
    }
  })
}

/**
 * Generate concise slide details.
 * Each slide gets: What Works, Biggest Gap, Highest-Impact Improvement
 */
function generateSlideDetails(evaluationData) {
  return evaluationData.slides.map((slide) => {
    const questions = slide.questions || []

    // What Works: best assessment from high-scoring questions
    const strengths = questions.filter((q) => q.score >= 4)
    const whatWorks = strengths.length > 0
      ? strengths[0].assessment
      : questions.length > 0 && questions[0].score >= 3
        ? questions[0].assessment
        : 'This slide has limited strong elements.'

    // Biggest Gap: from lowest-scoring question
    const weakest = questions.reduce((min, q) =>
      (!min || q.score < min.score) ? q : min, null)
    const biggestGap = weakest && weakest.score <= 3
      ? weakest.gap
      : 'No significant gaps identified.'

    // Highest-Impact Improvement: from lowest-scoring with good fix
    const needsFix = questions
      .filter((q) => q.score <= 3 && q.fix && q.fix !== 'None needed')
      .sort((a, b) => a.score - b.score)[0]
    const improvement = needsFix
      ? cleanFixText(needsFix.fix)
      : 'No specific improvements needed.'

    return {
      slide_number: slide.slide_number,
      type: SLIDE_TYPE_NAMES[slide.type] || slide.type,
      grade: slide.grade,
      what_works: whatWorks,
      biggest_gap: biggestGap,
      highest_impact_improvement: improvement,
    }
  })
}

/**
 * Fallback synthesis when API call fails.
 */
function generateFallbackSynthesis(evaluationData) {
  const grade = evaluationData.overall_grade
  const slideCount = evaluationData.slides?.length || 0

  // Find strongest and weakest slides
  const sorted = [...(evaluationData.slides || [])].sort((a, b) =>
    b.normalized_score - a.normalized_score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  if (!strongest || !weakest) {
    return `This ${slideCount}-slide deck received an overall grade of ${grade}. The deck requires further analysis to provide specific feedback.`
  }

  return `This ${slideCount}-slide deck received an overall grade of ${grade}. The strongest content is in the ${SLIDE_TYPE_NAMES[strongest.type] || strongest.type} section. The biggest opportunity for improvement is the ${SLIDE_TYPE_NAMES[weakest.type] || weakest.type} section, which needs more specific evidence or clarity.`
}

/**
 * Fallback dimensions when API call fails.
 */
function generateFallbackDimensions(evaluationData) {
  const grade = evaluationData.overall_grade
  const baseGrade = grade.charAt(0)

  return {
    clarity: {
      grade: baseGrade,
      diagnostic: 'Assessment requires further analysis.',
      description: QUALITY_DIMENSIONS.clarity.description,
    },
    brevity: {
      grade: baseGrade,
      diagnostic: 'Assessment requires further analysis.',
      description: QUALITY_DIMENSIONS.brevity.description,
    },
    flow: {
      grade: baseGrade,
      diagnostic: 'Assessment requires further analysis.',
      description: QUALITY_DIMENSIONS.flow.description,
    },
    completeness: {
      grade: baseGrade,
      diagnostic: 'Assessment requires further analysis.',
      description: QUALITY_DIMENSIONS.completeness.description,
    },
  }
}

/**
 * Fallback narrative flow when API call fails.
 */
function generateFallbackNarrativeFlow(evaluationData) {
  const slides = evaluationData.slides || []
  const sorted = [...slides].sort((a, b) => b.normalized_score - a.normalized_score)

  const strongest = sorted.slice(0, 2)
  const weakest = sorted.slice(-2)

  return {
    strongest_sequence: {
      slides: strongest.map((s) => `Slide ${s.slide_number}`).join(', '),
      description: 'These slides present the strongest content in the deck.',
      investor_reaction: 'Investors find these sections most compelling.',
    },
    weakest_sequence: {
      slides: weakest.map((s) => `Slide ${s.slide_number}`).join(', '),
      description: 'These slides have the most room for improvement.',
      investor_reaction: 'Investors may have questions after these sections.',
    },
  }
}

module.exports = {
  generateV1Report,
  V1_REPORT_VERSION,
  QUALITY_DIMENSIONS,
  SLIDE_TYPE_NAMES,
}
