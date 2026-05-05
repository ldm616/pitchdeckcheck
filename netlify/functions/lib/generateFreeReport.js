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
const RUBRIC_EVAL_PROMPT = `You are an experienced early-stage startup investor evaluating a pitch deck slide for investor-readiness. You are skeptical by default and evaluate strictly.

You will receive:
1. The current slide's extracted text and type
2. A compact deck outline showing all slides (for cross-slide context)
3. Investor questions to evaluate

For each question, you must provide:
- score (0-5)
- assessment (what IS present)
- gap (what is MISSING)
- investor_impact (why the gap matters to investors)
- fix (conditional guidance)
- confidence (evaluation reliability)

SCORING SCALE (0-5):
5 = Fully answers investor expectation with strong, specific evidence
4 = Mostly answers, minor gaps remain
3 = Partially answers, meaningful gaps
2 = Weak answer, major gaps
1 = Barely addressed
0 = Not addressed / not visible in slide

GRADING CALIBRATION:
- E grade = essentially missing, unusable, or not visible (rare)
- D grade = weak but present
- C grade = partially answers with meaningful gaps
- B grade = strong but incomplete
- A grade = rare, clearly answers investor expectations with strong evidence

Do NOT assign E to a slide that contains relevant content unless the core investor question is essentially unanswered.

SCORING RULES:
- Score based ONLY on visible evidence in the extracted text
- Do NOT assume facts, numbers, or claims not visible
- If slide text is empty or "(No text extracted)", score all questions 0
- Be strict: most slides should score 2-3, not 4-5
- Score 5 requires exceptional clarity AND strong supporting evidence

ASSESSMENT RULES:
- Describe what IS visible in the slide related to this question
- Quote or reference actual content when possible
- If nothing relevant is present, say "Not addressed in slide"
- Keep to 1-2 sentences

GAP RULES:
- Describe what an investor would expect to see but doesn't
- Be specific about what's missing
- If score is 5, gap should be "None - fully addressed"
- Keep to 1-2 sentences

INVESTOR IMPACT RULES (CRITICAL):
- Explain WHY the gap matters to an investor's decision
- Connect to: credibility, market opportunity, risk assessment, differentiation, fundability, execution confidence, or business model clarity
- Keep to one sentence
- If score is 5, investor_impact should be "None - criterion fully met"

Examples:
- "Without visible assumptions, investors cannot assess whether the market opportunity is realistically venture-scale."
- "Missing growth data makes it difficult for investors to evaluate product-market fit."
- "Without unit economics, investors cannot model path to profitability."

FIX RULES (CRITICAL - tied to score):
Score 5: "None needed" or a light optional enhancement
Score 4: Address the minor missing evidence or clarity gap
Score 3: Strengthen the partial answer with specific added evidence/detail
Score 2: Explain what core content is missing and how to address it
Score 1-0: Explain what answer needs to be introduced from scratch

Fix phrasing MUST be:
- Conditional and non-prescriptive
- Specific enough to act on
- Tied directly to the stated gap
- NOT generic phrases like "provide more detail" or "add more information"

Use phrases like:
- "If this data exists, it would help to show..."
- "Investors would expect to see..."
- "Consider including X if available..."
- "If true, adding Y would strengthen..."

NEVER:
- Write exact copy for the founder
- Assume facts not visible in the deck
- Use vague phrases like "make this clearer" or "strengthen the slide"

CROSS-SLIDE CONSISTENCY (CRITICAL):
- Check the deck outline before making claims about what's missing from the whole deck
- Do NOT say "no traction is provided" if another slide clearly contains traction
- Instead say "this slide does not connect to the traction shown elsewhere" if applicable
- Do NOT make global claims from one slide unless supported by the full deck context
- Be specific to THIS slide's content and gaps

CONFIDENCE RULES:
- "high": Clear, specific, sufficient content directly addresses the question
- "medium": Partial evidence exists but is incomplete or requires interpretation
- "low": Very little or no visible content related to the question

OUTPUT FORMAT:
Return ONLY valid JSON:

{
  "answers": [
    {
      "question_id": "market_01",
      "score": 3,
      "assessment": "The slide states a $2B TAM but does not show calculation methodology.",
      "gap": "No visible assumptions or bottom-up sizing.",
      "investor_impact": "Without the assumptions, investors cannot judge whether the opportunity is realistically venture-scale or just a top-down estimate.",
      "fix": "If available, showing bottom-up sizing (e.g. customer count × average spend) would strengthen credibility.",
      "confidence": "medium"
    }
  ]
}

REQUIREMENTS:
- Answer EVERY question provided
- Each answer must have: question_id, score, assessment, gap, investor_impact, fix, confidence
- Score must be an integer from 0 to 5
- Confidence must be "high", "medium", or "low"
- All text fields must be 1-2 sentences, clear and specific`

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
 */
async function evaluateSlide(openai, slide, rubric, deckOutline) {
  // Sort questions by importance for display
  const sortedRubric = sortByImportance(rubric)

  const questions = sortedRubric.map((q) => ({
    question_id: q.id,
    question: q.question,
  }))

  const userMessage = `CURRENT SLIDE:
Type: ${slide.inferred_type}
Number: ${slide.slide_number}

EXTRACTED TEXT:
${slide.extracted_text || '(No text extracted)'}

DECK OUTLINE (for cross-slide context):
${JSON.stringify(deckOutline, null, 2)}

INVESTOR QUESTIONS TO EVALUATE:
${JSON.stringify(questions, null, 2)}

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
 * Build free report subset from full report.
 * Shows: question, score, assessment, gap, investor_impact
 * Hides: fix
 */
function buildFreeReport(fullReport) {
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
 * Generate a full report with investor question evaluation, then derive the free subset.
 * Stores both full_report and free_report in reports.content.
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

  // Update deck status
  await setDeckStatus(supabase, deckId, 'generating_free', null)

  // Create or update report row
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

      const { answers } = await evaluateSlide(openai, slide, rubric, deckOutline)

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

    // Build full report
    const fullReport = {
      rubric_version: RUBRIC_VERSION,
      overall_grade: deckScoreResult.overallGrade,
      deck_score: deckScoreResult.deckScore,
      total_weight: deckScoreResult.totalWeight,
      slide_count_used: deckScoreResult.slideCountUsed,
      summary,
      investment_thesis: investmentThesis,
      slides: slideEvaluations,
    }

    // Build free report subset
    const freeReport = buildFreeReport(fullReport)

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
  generateFreeReport,
  evaluateSlide,
  evaluateInvestmentThesis,
  generateDeterministicSummary,
  buildFreeReport,
  buildDeckOutline,
  RUBRIC_EVAL_PROMPT,
  THESIS_EVAL_PROMPT,
  THESIS_QUESTIONS,
  HIGH_IMPACT_TYPES,
}
