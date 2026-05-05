/**
 * Report Generator
 *
 * ARCHITECTURE:
 * - generateFullReport() is the main generator that creates the full source-of-truth report
 * - deriveFreeReport() derives a limited free version from the full report
 *
 * The full report is the source of truth for all analysis.
 * The free report is a derived subset used for product packaging/monetization.
 *
 * Current optimization focus: full_report quality
 * - Detailed, insightful, actionable investor-grade feedback
 * - What is missing vs investor expectations
 * - Why each gap matters
 * - How to close each gap
 * - Investor reasoning patterns where relevant
 */

const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')
const {
  RUBRIC_VERSION,
  RUBRICS,
  SLIDE_WEIGHTS,
  computeSlideScore,
  computeDeckScore,
  generateFallbackAnswers,
  sortByImportance,
  sortAnswersByImportance,
} = require('./rubrics')

// Report version for evaluation tracking (update when report structure/logic changes)
const REPORT_VERSION = 'report_v2.4'

// High-impact slide types for summary generation (ignore cover/contact)
const HIGH_IMPACT_TYPES = ['traction', 'market', 'team', 'problem', 'solution', 'business_model', 'financials', 'ask', 'go_to_market', 'product', 'competition']

/**
 * Deck-level investment thesis questions.
 * These evaluate the entire deck against core investor questions.
 */
const THESIS_QUESTIONS = {
  why_this_market: {
    question: 'Why is this the right market to pursue?',
    criteria: [
      'Is the market large enough for venture-scale outcomes?',
      'Is the market growing?',
      'Are there strong tailwinds or drivers?',
      'Is the pain urgent or economically meaningful?',
      'Is there evidence the opportunity is real and timely?',
    ],
    relevant_slides: ['market', 'problem', 'traction'],
  },
  why_this_product: {
    question: 'Why is this product likely to win?',
    criteria: [
      'Is the product significantly better than current alternatives?',
      'Is the value proposition clear and compelling?',
      'Are there current advantages competitors will find hard to copy?',
      'Are there future advantages or compounding moats?',
      'Is differentiation specific rather than generic?',
    ],
    relevant_slides: ['solution', 'product', 'competition'],
  },
  why_this_team: {
    question: 'Why is this the right team to build this?',
    criteria: [
      'Does the team have relevant domain expertise?',
      'Does the team have relevant product/technical expertise?',
      'Does the team have GTM or sales experience?',
      'Is there evidence of past success or credibility?',
      'Does team composition match what the business needs?',
    ],
    relevant_slides: ['team'],
  },
  why_now: {
    question: 'Why is now the right time for this?',
    criteria: [
      'Are there market or technology shifts creating this opportunity?',
      'Is there urgency or a window closing?',
      'Is there early traction validating timing?',
      'Are incumbents unable or unwilling to address this now?',
      'Is the market ready for this solution?',
    ],
    relevant_slides: ['problem', 'market', 'traction', 'solution'],
  },
}

/**
 * Prompt for deck-level investment thesis evaluation.
 */
const THESIS_EVAL_PROMPT = `You are an experienced early-stage startup investor evaluating a pitch deck at the thesis level. You are evaluating whether the FULL DECK answers the core investor questions that determine fundability.

This is NOT about individual slides. This is about whether the complete deck builds a convincing case for each thesis question.

For each thesis question, you must provide:
- score (0-5): How well the FULL DECK answers this question
- assessment: What evidence exists across the deck (be specific, cite slides)
- gaps: What is missing or unconvincing
- verdict: One-sentence investor takeaway

SCORING SCALE (0-5):
5 = Compelling answer with strong, specific evidence across the deck
4 = Good answer, minor gaps or areas that could be stronger
3 = Partial answer, meaningful gaps in the argument
2 = Weak answer, major gaps undermine the thesis
1 = Barely addressed across the deck
0 = Not addressed / no evidence found

SCORING DISCIPLINE:
- Most decks score 2-3 on thesis questions
- Score 5 is rare - requires exceptional evidence and clarity
- Evaluate the CUMULATIVE case across all slides, not individual slides
- A strong market slide with no traction is still a weak "why this market" answer

ASSESSMENT RULES:
- Reference specific slides and content
- Quote or paraphrase actual evidence when possible
- Be specific about what contributes to the thesis
- If evidence is scattered, note which slides contribute

GAP RULES:
- Identify what would make the thesis answer stronger
- Be specific about missing evidence or weak arguments
- If score is 5, gaps should be "None - thesis is well-supported"

VERDICT RULES:
- One sentence summary of how an investor would view this thesis element
- Be direct and honest
- Examples:
  - "The market opportunity is clear but timing justification is missing."
  - "Strong domain expertise but no evidence of GTM capability."
  - "Differentiation claims lack specificity - could apply to any competitor."

OUTPUT FORMAT:
Return ONLY valid JSON:

{
  "why_this_market": {
    "score": 3,
    "assessment": "The market slide (slide 4) shows a $2B TAM with growth projections. The problem slide (slide 2) establishes pain around manual processes. However, no bottom-up sizing or assumptions are visible.",
    "gaps": "Market size lacks supporting assumptions. No evidence of market timing or why this opportunity exists now vs. 5 years ago.",
    "verdict": "Market size is claimed but not defended - investors will question the methodology."
  },
  "why_this_product": {...},
  "why_this_team": {...},
  "why_now": {...}
}

REQUIREMENTS:
- Evaluate ALL four thesis questions
- Each must have: score, assessment, gaps, verdict
- Score must be integer 0-5
- Assessment must reference specific slides/content
- Be strict - most thesis elements score 2-3`

/**
 * Prompt for investor question evaluation with 0-5 scoring.
 * Each question gets: score, assessment, gap, investor_impact, fix, confidence.
 */
const RUBRIC_EVAL_PROMPT = `You are an expert venture investor evaluating a startup pitch deck.

Your job is to produce high-signal, non-generic, investor-grade analysis grounded in how real investors assess opportunities.

You are evaluating one slide, but you are also given broader deck context. Use both.

You are given:
- current slide number
- current slide type
- current slide extracted text
- full deck outline
- relevant rubric questions
- relevant investor reasoning patterns, if available

Investor reasoning patterns are internal calibration context derived from real investment memos. Use them to sharpen reasoning. Do not mention them, cite them, name them, or expose them.

---

## Core evaluation principle

Evaluate each rubric question in two layers:

1. Does the deck answer the investor question anywhere?
2. Does this specific slide appropriately contribute to answering it?

Do not penalize a slide as if it must contain every detail if the detail is clearly handled elsewhere in the deck.

---

## Gap classification rule

Before writing any gap, classify it internally as one of:

1. \`slide_missing_but_present_elsewhere\`
   - The information is missing from this slide but clearly appears elsewhere in the deck.
   - Treat this as a clarity or placement issue, not a major investor risk.

2. \`weakly_supported_in_deck\`
   - The idea appears somewhere in the deck, but support is incomplete, vague, unsubstantiated, or not credible enough.
   - Treat this as a moderate issue.

3. \`truly_missing\`
   - The information is not visible anywhere in the deck.
   - Treat this as a real investor risk.

Do not output the classification label unless the existing JSON schema requires it. Reflect the classification in the tone and severity of the gap.

If information appears elsewhere, explicitly reference that it is addressed elsewhere rather than claiming it is missing.

---

## Pattern usage rule

Use investor reasoning patterns only when they naturally fit:
- the company type
- the business model
- the slide content
- the rubric question

Do not force a pattern.

Examples:
- Do not suggest APIs, integrations, or developer ecosystems for a local services marketplace unless the deck shows a platform, ecosystem, partner, developer, or integration strategy.
- Do not force SaaS, PaaS, or developer-market logic onto non-developer businesses.
- Do not force network-effect logic unless the deck shows a real supply/demand, user/content, marketplace, or ecosystem loop.

Patterns should sharpen reasoning, not distort relevance.

---

## Investor impact rule

Every investor impact must answer:

"What investment decision does this weaken or block?"

Anchor the answer in one or more of:
- growth potential
- defensibility
- capital efficiency
- retention or engagement
- scalability
- market credibility
- execution confidence
- business model quality

Avoid vague phrases like:
- "investors may question"
- "this creates uncertainty"
- "this could be improved"

Instead, be specific about what investors cannot evaluate.

Example:
Bad:
"Investors may question the market size."

Good:
"Without support for the key market-sizing inputs, investors cannot judge whether the opportunity is realistically venture-scale or simply a top-down estimate."

---

## Fix rule

Every fix must directly close the stated gap.

Fixes must be:
- conditional
- specific
- tied to investor decision-making
- grounded in visible deck context

Use language like:
- "If available, showing…"
- "If true, clarifying…"
- "If already tracked, including…"
- "Investors typically expect to see…"

Do not:
- invent data
- assume the company has information not visible in the deck
- write exact copy for the founder
- use generic advice

Avoid vague fixes like:
- "add more detail"
- "include examples"
- "highlight differentiation"
- "provide more information"

Better examples:
- "If available, showing repeat booking behavior or retention would help investors assess whether growth reflects durable customer pull rather than one-time acquisition."
- "If Gleamr has a quality-control mechanism, such as vetted providers, ratings thresholds, or service guarantees, making that explicit would clarify why users would trust the marketplace."
- "If available, showing the source or logic behind the 180M annual details estimate would make the bottom-up market calculation more credible."

---

## Deduplication rule

Do not repeat the same gap across multiple questions or slides unless the repeated issue appears in a materially different way.

If a gap is already clearly identified elsewhere:
- reduce severity
- reference the broader issue
- avoid repeating the same fix

For example:
If CAC is missing from the GTM slide and also relevant to traction, do not repeatedly say "add CAC." Instead:
- identify it once as a core growth-efficiency gap
- elsewhere say how the absence affects that specific question

---

## Competition analysis rule

When evaluating competition, go beyond whether competitors are listed.

Assess:
- Are competitors meaningfully identified?
- Are differentiators specific?
- Are advantages sustainable or easy to copy?
- What happens if competitors copy the visible features?
- Is there evidence of switching costs, network effects, distribution advantage, proprietary data, operational advantage, brand, or other defensibility?

Do not treat "first mover," "better ratings," or "more coverage" as a durable moat unless the deck explains why those advantages are hard to replicate.

---

## Investment highlights rule

If the slide type is \`investment_highlights\`:
- Do not evaluate it as a source-of-truth slide.
- Do not penalize it for omitting details that are handled elsewhere.
- Treat it as a summary/synthesis slide only.
- It should not drive the deck score.
- Detailed feedback should come from the underlying source slides, not the summary slide.

---

## Scoring scale

Use a 0–5 score for each rubric question.

5 = fully answers the investor expectation with strong visible support
4 = mostly answers the question, with minor gaps
3 = partially answers the question, with meaningful gaps
2 = weakly answers the question, with major gaps
1 = barely addresses the question
0 = not addressed or not visible

Important:
- Do not assign 0 unless there is no visible answer.
- Do not assign 1 unless the content is barely present.
- If content is present but weak, use 2.
- If content is present and partially useful, use 3.
- A slide with relevant content should rarely be scored as 0 or 1.

---

## Evidence discipline

Base the evaluation only on visible extracted text and provided deck context.

Do not:
- invent metrics
- infer facts not shown
- assume market data
- assume team experience
- assume product capabilities
- assume competitors
- assume traction quality beyond visible data

If something is implied but not explicit, say it is implied or partially supported.

---

## Confidence rule

Set confidence based on evidence quality:

high = the slide/deck text clearly supports the assessment
medium = evidence is present but incomplete or somewhat inferred
low = sparse evidence; assessment requires significant inference

Do not assign high confidence when the extracted text is thin or ambiguous.

---

## Output format

Return strict JSON only.

For each rubric question, return:

{
  "question_id": "...",
  "score": 0,
  "assessment": "...",
  "gap": "...",
  "investor_impact": "...",
  "fix": "...",
  "confidence": "low"
}

Rules:
- Include every rubric question.
- Do not include markdown.
- Do not include commentary outside JSON.
- Do not include pattern names or source names.
- Keep each field concise but specific.
- Use plain English.

---

## Final self-check before returning

Before returning JSON, verify:

- Did I check whether the deck answers the question elsewhere?
- Did I avoid claiming something is missing if it appears elsewhere?
- Did I avoid forcing irrelevant investor patterns?
- Did every gap explain the specific investor concern?
- Did every fix directly close the gap?
- Did I avoid generic advice?
- Did I avoid repeated gaps?
- Did I avoid hallucinating facts?

If any answer sounds like generic pitch deck advice, rewrite it to be more specific to the deck evidence.`

/**
 * Fetch patterns relevant to a specific rubric question.
 * Returns array of pattern objects with name and description.
 */
async function getPatternsForQuestion(supabase, questionKey) {
  try {
    const { data, error } = await supabase
      .from('pattern_rubric_map')
      .select(`
        strength,
        patterns (
          id,
          pattern_key,
          name,
          description,
          category
        )
      `)
      .eq('question_key', questionKey)
      .order('strength', { ascending: false })

    if (error || !data) {
      return []
    }

    // Extract patterns and filter out nulls
    return data
      .map((d) => d.patterns)
      .filter(Boolean)
      .map((p) => ({
        name: p.name,
        description: p.description,
      }))
  } catch (err) {
    console.error(`Error fetching patterns for ${questionKey}:`, err.message)
    return []
  }
}

/**
 * Batch fetch patterns for multiple questions.
 * Returns a map of question_key -> patterns array.
 */
async function getPatternsForQuestions(supabase, questionKeys) {
  try {
    const { data, error } = await supabase
      .from('pattern_rubric_map')
      .select(`
        question_key,
        strength,
        patterns (
          id,
          pattern_key,
          name,
          description,
          category
        )
      `)
      .in('question_key', questionKeys)
      .order('strength', { ascending: false })

    if (error || !data) {
      return {}
    }

    // Group patterns by question_key
    const patternMap = {}
    for (const row of data) {
      if (!row.patterns) continue
      if (!patternMap[row.question_key]) {
        patternMap[row.question_key] = []
      }
      patternMap[row.question_key].push({
        name: row.patterns.name,
        description: row.patterns.description,
      })
    }

    return patternMap
  } catch (err) {
    console.error('Error fetching patterns batch:', err.message)
    return {}
  }
}

/**
 * Build compact deck outline for cross-slide context.
 * Keeps token usage low while providing enough context to avoid contradictions.
 */
function buildDeckOutline(slides) {
  return slides.map((s) => {
    // Truncate text to first 150 chars for context
    const textPreview = s.extracted_text
      ? s.extracted_text.slice(0, 150).replace(/\n/g, ' ').trim() + (s.extracted_text.length > 150 ? '...' : '')
      : '(empty)'
    return {
      slide: s.slide_number,
      type: s.inferred_type || 'other',
      preview: textPreview,
    }
  })
}

/**
 * Evaluate a single slide against its investor questions with deck context.
 * Fetches relevant patterns to enhance gap/fix reasoning.
 */
async function evaluateSlide(openai, supabase, slide, rubric, deckOutline) {
  // Sort questions by importance for display
  const sortedRubric = sortByImportance(rubric)

  // Fetch patterns for all questions in this rubric
  const questionKeys = sortedRubric.map((q) => q.id)
  const patternMap = await getPatternsForQuestions(supabase, questionKeys)

  // Build questions array with patterns
  const questions = sortedRubric.map((q) => {
    const patterns = patternMap[q.id] || []
    return {
      question_id: q.id,
      question: q.question,
      patterns: patterns.length > 0 ? patterns : undefined,
    }
  })

  // Build pattern context section if any patterns exist
  const hasPatterns = questions.some((q) => q.patterns && q.patterns.length > 0)
  let patternContext = ''
  if (hasPatterns) {
    patternContext = `

INVESTOR REASONING PATTERNS (use to improve gap/fix quality):
${questions
  .filter((q) => q.patterns && q.patterns.length > 0)
  .map((q) => {
    const patternList = q.patterns
      .map((p) => `  - ${p.name}: ${p.description}`)
      .join('\n')
    return `For "${q.question}":\n${patternList}`
  })
  .join('\n\n')}

Use these patterns to explain WHY gaps matter and HOW to address them. Do NOT mention pattern names in output.`
  }

  const userMessage = `CURRENT SLIDE:
Type: ${slide.inferred_type}
Number: ${slide.slide_number}

EXTRACTED TEXT:
${slide.extracted_text || '(No text extracted)'}

DECK OUTLINE (for cross-slide context):
${JSON.stringify(deckOutline, null, 2)}

INVESTOR QUESTIONS TO EVALUATE:
${JSON.stringify(
  questions.map((q) => ({ question_id: q.question_id, question: q.question })),
  null,
  2
)}${patternContext}

Evaluate each question. Include assessment, gap, investor_impact, fix, and confidence for each.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RUBRIC_EVAL_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)

    if (!Array.isArray(result.answers)) {
      throw new Error('Invalid answers array in response')
    }

    // Validate and normalize answers
    const validatedAnswers = result.answers.map((a) => {
      const score = Math.min(5, Math.max(0, Math.round(a.score) || 0))
      // Validate confidence - default based on score if invalid
      let confidence = a.confidence
      if (!['high', 'medium', 'low'].includes(confidence)) {
        confidence = score === 0 ? 'low' : score >= 4 ? 'high' : 'medium'
      }
      return {
        question_id: a.question_id,
        score,
        assessment: a.assessment || 'Unable to assess.',
        gap: a.gap || 'Unable to determine gap.',
        investor_impact: a.investor_impact || 'Unable to determine investor impact.',
        fix: a.fix || 'Unable to provide guidance.',
        confidence,
      }
    })

    // Sort by importance
    const sortedAnswers = sortAnswersByImportance(validatedAnswers, rubric)

    return { success: true, answers: sortedAnswers }
  } catch (err) {
    console.error(`Slide ${slide.slide_number} evaluation error:`, err.message)
    return { success: false, answers: generateFallbackAnswers(rubric) }
  }
}

/**
 * Evaluate deck-level investment thesis questions.
 * Synthesizes evidence from all slides to answer core investor questions.
 */
async function evaluateInvestmentThesis(openai, slides, slideEvaluations) {
  // Build comprehensive deck content for thesis evaluation
  const deckContent = slides.map((slide) => {
    const evaluation = slideEvaluations.find((e) => e.slide_number === slide.slide_number)
    return {
      slide_number: slide.slide_number,
      type: slide.inferred_type || 'other',
      extracted_text: slide.extracted_text || '(empty)',
      grade: evaluation?.grade || 'N/A',
    }
  })

  // Build thesis questions context
  const thesisContext = Object.entries(THESIS_QUESTIONS).map(([key, config]) => ({
    key,
    question: config.question,
    criteria: config.criteria,
    relevant_slides: config.relevant_slides,
  }))

  const userMessage = `FULL DECK CONTENT:
${deckContent.map((s) => `--- Slide ${s.slide_number} (${s.type}, Grade: ${s.grade}) ---
${s.extracted_text}
`).join('\n')}

THESIS QUESTIONS TO EVALUATE:
${JSON.stringify(thesisContext, null, 2)}

For each thesis question, evaluate how well the COMPLETE DECK answers it. Look across ALL relevant slides and synthesize the evidence.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: THESIS_EVAL_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)

    // Validate and normalize each thesis answer
    const thesis = {}
    for (const key of Object.keys(THESIS_QUESTIONS)) {
      const answer = result[key] || {}
      thesis[key] = {
        question: THESIS_QUESTIONS[key].question,
        score: Math.min(5, Math.max(0, Math.round(answer.score) || 0)),
        assessment: answer.assessment || 'Unable to evaluate thesis element.',
        gaps: answer.gaps || 'Unable to determine gaps.',
        verdict: answer.verdict || 'Unable to provide verdict.',
      }
    }

    return { success: true, thesis }
  } catch (err) {
    console.error('Investment thesis evaluation error:', err.message)

    // Return fallback thesis
    const fallbackThesis = {}
    for (const key of Object.keys(THESIS_QUESTIONS)) {
      fallbackThesis[key] = {
        question: THESIS_QUESTIONS[key].question,
        score: 0,
        assessment: 'Evaluation failed due to processing error.',
        gaps: 'Unable to evaluate - please regenerate report.',
        verdict: 'Unable to assess this thesis element.',
      }
    }

    return { success: false, thesis: fallbackThesis }
  }
}

/**
 * Generate recommended investment highlights based on deck strengths.
 * Returns 4-6 bullet points highlighting the strongest signals from the deck.
 *
 * Focus on high-impact slides (traction, market, team, problem, solution) where
 * the deck shows genuine strength (score >= 4 on important questions).
 */
function generateRecommendedInvestmentHighlights(slideEvaluations, investmentThesis) {
  const highlights = []

  // Priority order for investment highlights
  const priorityOrder = ['traction', 'market', 'team', 'problem', 'solution', 'business_model', 'product', 'competition']

  // Collect strong signals from slides
  for (const slideType of priorityOrder) {
    const slide = slideEvaluations.find((s) => s.type === slideType)
    if (!slide) continue

    // Find high-scoring questions (score >= 4) for this slide
    const strongQuestions = slide.questions.filter((q) => q.score >= 4 && q.confidence !== 'low')

    for (const q of strongQuestions) {
      // Extract key insight from assessment
      if (q.assessment && q.assessment !== 'Not addressed in slide') {
        highlights.push({
          category: slideType,
          signal: q.assessment,
          score: q.score,
          source: 'slide',
        })
      }
    }
  }

  // Add strong thesis elements (score >= 4)
  if (investmentThesis) {
    for (const [key, thesis] of Object.entries(investmentThesis)) {
      if (thesis.score >= 4) {
        highlights.push({
          category: key.replace('why_', '').replace('_', ' '),
          signal: thesis.verdict,
          score: thesis.score,
          source: 'thesis',
        })
      }
    }
  }

  // Sort by score descending, then by priority order
  highlights.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const aPriority = priorityOrder.indexOf(a.category)
    const bPriority = priorityOrder.indexOf(b.category)
    return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority)
  })

  // Take top 4-6 highlights
  const topHighlights = highlights.slice(0, 6)

  // If we have fewer than 4 highlights, we don't have enough strong signals
  if (topHighlights.length < 4) {
    return {
      bullets: [],
      note: 'The deck does not have enough strong signals to generate recommended investment highlights. Focus on strengthening traction, market, team, and problem/solution slides first.',
    }
  }

  // Format as bullets with category labels
  const bullets = topHighlights.map((h) => ({
    category: h.category,
    text: h.signal,
  }))

  return {
    bullets,
    note: 'These highlights are based on the strongest signals found in the deck. Use them as a starting point for your investment highlights slide.',
  }
}

/**
 * Generate deterministic summary based on weighted slide scores.
 * Ignores cover/contact slides. Identifies strongest signal and main friction
 * from high-impact slides only.
 */
function generateDeterministicSummary(slideEvaluations, overallGrade, deckScore) {
  // Filter to high-impact slides only
  const impactSlides = slideEvaluations.filter(
    (s) => HIGH_IMPACT_TYPES.includes(s.type) && SLIDE_WEIGHTS[s.type] > 0
  )

  if (impactSlides.length === 0) {
    return `This deck received an overall grade of ${overallGrade}. The deck lacks standard investor slides (problem, solution, market, traction, team, etc.), making it difficult to assess investor-readiness.`
  }

  // Find strongest slide (highest normalized score among high-weight slides)
  const sortedByStrength = [...impactSlides].sort((a, b) => {
    const weightA = SLIDE_WEIGHTS[a.type] ?? 0.5
    const weightB = SLIDE_WEIGHTS[b.type] ?? 0.5
    // Sort by normalized score first, then by weight
    if (b.normalized_score !== a.normalized_score) {
      return b.normalized_score - a.normalized_score
    }
    return weightB - weightA
  })

  // Find weakest slide (lowest normalized score among high-weight slides)
  const sortedByWeakness = [...impactSlides].sort((a, b) => {
    const weightA = SLIDE_WEIGHTS[a.type] ?? 0.5
    const weightB = SLIDE_WEIGHTS[b.type] ?? 0.5
    // Sort by normalized score first (ascending), then by weight (descending for higher impact)
    if (a.normalized_score !== b.normalized_score) {
      return a.normalized_score - b.normalized_score
    }
    return weightB - weightA
  })

  const strongestSlide = sortedByStrength[0]
  const weakestSlide = sortedByWeakness[0]

  // Get the top-scoring question from strongest slide
  const strongQuestions = strongestSlide.questions.filter((q) => q.score >= 4)
  const strongSignal = strongQuestions.length > 0
    ? strongQuestions[0].assessment
    : `The ${strongestSlide.type} slide is relatively well-presented`

  // Get the lowest-scoring question from weakest slide
  const weakQuestions = weakestSlide.questions.filter((q) => q.score <= 2)
  const weakSignal = weakQuestions.length > 0
    ? weakQuestions[0].gap
    : `The ${weakestSlide.type} slide has gaps that need addressing`

  // Grade interpretation
  let gradeInterpretation
  if (overallGrade === 'A') {
    gradeInterpretation = 'investor-ready with strong fundamentals'
  } else if (overallGrade === 'B') {
    gradeInterpretation = 'solid but has specific gaps to address'
  } else if (overallGrade === 'C') {
    gradeInterpretation = 'partially developed with meaningful gaps'
  } else if (overallGrade === 'D') {
    gradeInterpretation = 'weak and needs significant work'
  } else {
    gradeInterpretation = 'incomplete and not ready for investor review'
  }

  // Build summary following the required format
  const summary = `The strongest positive signal is the ${strongestSlide.type} content: ${strongSignal}. The biggest investor friction is in the ${weakestSlide.type} slide: ${weakSignal}. Overall, the deck is ${gradeInterpretation} (${overallGrade}, ${deckScore.toFixed(2)}/5.0).`

  return summary
}

/**
 * Derive free report from the full report.
 *
 * The free report is a LIMITED SUBSET of the full report for product packaging.
 * It does NOT call OpenAI, rescore, or create independent feedback.
 *
 * Shows: question, score, assessment, gap, investor_impact
 * Hides: fix (reserved for paid report)
 *
 * @param {Object} fullReport - The complete full_report object
 * @returns {Object} - The derived free_report subset
 */
function deriveFreeReport(fullReport) {
  // Collect biggest issues (lowest scoring questions from high-weight slides)
  const allIssues = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue

    for (const q of slide.questions) {
      if (q.score <= 2) {
        allIssues.push({
          question: q.question,
          score: q.score,
          assessment: q.assessment,
          gap: q.gap,
          investor_impact: q.investor_impact,
          slide_type: slide.type,
          slide_number: slide.slide_number,
          slide_weight: weight,
        })
      }
    }
  }

  // Sort by slide weight (higher first), then by score (lower first)
  allIssues.sort((a, b) => {
    if (b.slide_weight !== a.slide_weight) return b.slide_weight - a.slide_weight
    return a.score - b.score
  })

  // Top 3 biggest issues
  const topIssues = allIssues.slice(0, 3).map((issue) => ({
    question: issue.question,
    score: issue.score,
    assessment: issue.assessment,
    gap: issue.gap,
    investor_impact: issue.investor_impact,
    slide_type: issue.slide_type,
    priority: issue.slide_weight >= 1.2 ? 'high' : issue.slide_weight >= 0.8 ? 'medium' : 'low',
  }))

  // Collect strengths (highest scoring questions from high-weight slides)
  const allStrengths = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue

    for (const q of slide.questions) {
      if (q.score >= 4) {
        allStrengths.push({
          question: q.question,
          score: q.score,
          assessment: q.assessment,
          slide_type: slide.type,
          slide_weight: weight,
        })
      }
    }
  }

  allStrengths.sort((a, b) => {
    if (b.slide_weight !== a.slide_weight) return b.slide_weight - a.slide_weight
    return b.score - a.score
  })

  const topStrengths = allStrengths.slice(0, 3).map((s) => ({
    question: s.question,
    score: s.score,
    assessment: s.assessment,
    slide_type: s.slide_type,
  }))

  // Slide notes: show investor_impact for low-scoring slides
  const slideNotes = fullReport.slides.map((slide) => {
    const lowScoring = slide.questions.filter((q) => q.score <= 2)
    const topGap = lowScoring[0]

    let note
    if (slide.grade === 'A') {
      note = 'Strong slide. Meets investor expectations.'
    } else if (slide.grade === 'B') {
      note = 'Good foundation. Minor gaps remain.'
    } else if (topGap) {
      // Include investor impact in the note for context
      note = topGap.investor_impact || topGap.gap
    } else {
      note = 'Needs improvement to meet investor expectations.'
    }

    return {
      slide_number: slide.slide_number,
      inferred_type: slide.type,
      grade: slide.grade,
      normalized_score: slide.normalized_score,
      note,
    }
  })

  return {
    overall_grade: fullReport.overall_grade,
    deck_score: fullReport.deck_score,
    summary: fullReport.summary,
    strengths: topStrengths,
    biggest_issues: topIssues,
    slide_notes: slideNotes,
    upgrade_teaser: {
      title: 'Unlock the full report',
      bullets: [
        'Specific fixes for every gap identified',
        'Full question-by-question scoring breakdown',
        'Prioritized action items by investor impact',
        'Detailed assessment and evidence for each criterion',
      ],
    },
  }
}

/**
 * Generate the full investor-grade report, then derive the free subset.
 *
 * This is the main report generator. It:
 * 1. Fetches deck and slides
 * 2. Evaluates each slide against investor questions (with pattern context)
 * 3. Computes deterministic scores
 * 4. Evaluates deck-level investment thesis
 * 5. Builds the full_report (source of truth)
 * 6. Derives the free_report (limited subset)
 * 7. Stores both in reports.content
 *
 * The full report optimizes for detailed, insightful, actionable investor-grade feedback.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} deckId - Deck UUID
 * @returns {Object} - { success, reportId, overallGrade } or { success: false, error }
 */
async function generateFullReport(supabase, deckId) {
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

  // Update deck status
  await setDeckStatus(supabase, deckId, 'generating_free', null)

  // Delete all existing reports for this deck
  const { error: deleteError } = await supabase
    .from('reports')
    .delete()
    .eq('deck_id', deckId)

  if (deleteError) {
    console.error('Failed to delete existing reports:', deleteError)
    // Continue anyway - not fatal
  }

  // Create new report row
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
  const reportId = newReport.id

  console.log(`Generating report for deck ${deckId}, report ${reportId}`)

  try {
    const openai = new OpenAI.default({ apiKey: openaiKey })

    // Build deck outline for cross-slide context
    const deckOutline = buildDeckOutline(slides)

    // Evaluate each slide
    const slideEvaluations = []

    for (const slide of slides) {
      const slideType = slide.inferred_type || 'other'
      const rubric = RUBRICS[slideType] || RUBRICS.other

      console.log(`Evaluating slide ${slide.slide_number} (${slideType})...`)

      let answers

      // Skip detailed evaluation for investment_highlights - it's a summary slide
      // that shouldn't be scored against rubric questions
      if (slideType === 'investment_highlights') {
        console.log(`  Skipping detailed evaluation for investment_highlights slide`)
        answers = rubric.map((q) => ({
          question_id: q.id,
          score: 0,
          assessment: 'Investment highlights slides are not evaluated against individual rubric questions.',
          gap: 'N/A - see recommended_investment_highlights in report for guidance.',
          investor_impact: 'N/A - investment highlights are a summary, not a primary evaluation target.',
          fix: 'N/A - this slide type is excluded from scoring.',
          confidence: 'high',
        }))
      } else {
        const result = await evaluateSlide(openai, supabase, slide, rubric, deckOutline)
        answers = result.answers
      }

      // Compute deterministic slide score (0-5 scale)
      const slideScoreResult = computeSlideScore(answers, rubric)

      // Build question array with full details
      const questionMap = {}
      for (const q of rubric) {
        questionMap[q.id] = q.question
      }

      const questions = answers.map((a) => ({
        question: questionMap[a.question_id] || a.question_id,
        score: a.score,
        assessment: a.assessment,
        gap: a.gap,
        investor_impact: a.investor_impact,
        fix: a.fix,
        confidence: a.confidence,
      }))

      slideEvaluations.push({
        slide_number: slide.slide_number,
        type: slideType,
        grade: slideScoreResult.grade,
        normalized_score: slideScoreResult.normalized,
        weighted_score: slideScoreResult.weightedScore,
        max_score: slideScoreResult.maxScore,
        questions,
      })
    }

    // Compute deck-level score
    const deckScoreResult = computeDeckScore(slideEvaluations)

    console.log(
      `Deck scoring: grade=${deckScoreResult.overallGrade}, ` +
        `score=${deckScoreResult.deckScore}, slides_used=${deckScoreResult.slideCountUsed}`
    )

    // Evaluate deck-level investment thesis
    console.log('Evaluating investment thesis...')
    const { thesis: investmentThesis } = await evaluateInvestmentThesis(openai, slides, slideEvaluations)

    // Log thesis scores
    const thesisScores = Object.entries(investmentThesis)
      .map(([k, v]) => `${k}=${v.score}`)
      .join(', ')
    console.log(`Thesis scores: ${thesisScores}`)

    // Generate deterministic summary (no model call)
    const summary = generateDeterministicSummary(
      slideEvaluations,
      deckScoreResult.overallGrade,
      deckScoreResult.deckScore
    )

    // Generate recommended investment highlights based on deck strengths
    const recommendedHighlights = generateRecommendedInvestmentHighlights(
      slideEvaluations,
      investmentThesis
    )
    console.log(`Generated ${recommendedHighlights.bullets?.length || 0} recommended investment highlights`)

    // Build full report
    const fullReport = {
      report_version: REPORT_VERSION,
      rubric_version: RUBRIC_VERSION,
      overall_grade: deckScoreResult.overallGrade,
      deck_score: deckScoreResult.deckScore,
      total_weight: deckScoreResult.totalWeight,
      slide_count_used: deckScoreResult.slideCountUsed,
      summary,
      investment_thesis: investmentThesis,
      recommended_investment_highlights: recommendedHighlights,
      slides: slideEvaluations,
    }

    // Derive free report subset from full report
    const freeReport = deriveFreeReport(fullReport)

    // Store both in content
    const reportContent = {
      full_report: fullReport,
      free_report: freeReport,
    }

    // Update report row
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'ready',
        overall_grade: fullReport.overall_grade,
        content: reportContent,
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw new Error('Failed to save report')
    }

    console.log(`Report generated successfully: grade ${fullReport.overall_grade}`)

    return {
      success: true,
      reportId,
      overallGrade: fullReport.overall_grade,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during report generation'
    console.error('Report generation failed:', errorMessage)

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
  // Main generator - creates full report, derives free report, stores both
  generateFullReport,

  // Version for tracking report structure changes
  REPORT_VERSION,

  // Future: deriveFreeReport will use configurable filters to create
  // limited subsets from full_report for product packaging.
  // For now, it's called internally by generateFullReport.
}
