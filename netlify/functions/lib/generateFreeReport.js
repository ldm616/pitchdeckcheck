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

/**
 * Prompt for investor question evaluation with 0-5 scoring.
 * Each question gets: score, assessment, gap, fix, confidence.
 */
const RUBRIC_EVAL_PROMPT = `You are an experienced early-stage startup investor evaluating a pitch deck slide for investor-readiness. You are skeptical by default and evaluate strictly.

You will receive a slide's extracted text and a set of investor questions to evaluate. For each question, you must provide:
- A score from 0-5
- An assessment (what IS present)
- A gap (what is MISSING)
- A fix (conditional guidance on how to address the gap)
- A confidence level (how reliable is this evaluation)

SCORING SCALE (0-5):
5 = Fully answers investor expectation with strong, specific evidence
4 = Mostly answers, minor gaps remain
3 = Partially answers, meaningful gaps
2 = Weak answer, major gaps
1 = Barely addressed
0 = Not addressed / not visible in slide

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
- Connect to investor decision-making: "Investors need X to assess Y"
- If score is 5, gap can be "None - fully addressed"
- Keep to 1-2 sentences

FIX RULES (CRITICAL - tone matters):
- Fixes are GUIDANCE, not instructions
- Use CONDITIONAL, NON-PRESCRIPTIVE phrasing:
  - "If this data exists, showing it would strengthen credibility"
  - "Investors typically expect to see X here"
  - "It would help to include Y if available"
- NEVER assume the founder has data they haven't shown
- NEVER write exact copy for the founder
- NEVER fabricate specific numbers or claims
- Connect to investor credibility or decision-making
- If score is 5, fix can be "None needed"
- Keep to 1-2 sentences

CONFIDENCE RULES (IMPORTANT):
Confidence indicates how reliable this evaluation is based on available slide content.

- "high": Clear, specific, sufficient content directly answers or addresses the question. You can evaluate with certainty.
- "medium": Partial evidence exists but is incomplete, somewhat vague, or requires minor interpretation.
- "low": Very little or no visible content related to the question. Assessment required significant inference or assumption.

Additional confidence rules:
- If extracted_text is sparse, unclear, or mostly empty, default to "low" confidence
- If you had to infer or assume information not explicitly stated, use "medium" or "low"
- Do NOT claim "high" confidence when evidence is weak or absent
- A score of 0 should typically have "low" confidence (nothing to evaluate)
- A score of 5 should typically have "high" confidence (strong evidence present)

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:

{
  "answers": [
    {
      "question_id": "market_01",
      "score": 3,
      "assessment": "The slide states a $2B TAM but does not show calculation methodology.",
      "gap": "No visible assumptions or bottom-up sizing. Investors need to see how this number was derived.",
      "fix": "If available, showing bottom-up sizing (e.g. customer count × average spend) would strengthen credibility.",
      "confidence": "medium"
    }
  ]
}

REQUIREMENTS:
- Answer EVERY question provided
- Each answer must have question_id, score, assessment, gap, fix, and confidence
- Score must be an integer from 0 to 5
- Confidence must be "high", "medium", or "low"
- All text fields must be 1-2 sentences, clear and specific`

/**
 * Prompt for generating the deck summary after all slides are evaluated.
 */
const SUMMARY_PROMPT = `You are an experienced early-stage startup investor. You have just evaluated a pitch deck slide-by-slide. Now summarize the overall findings.

RULES:
- Be balanced and honest. Include both strengths and weaknesses.
- The summary should be 2-4 sentences covering: the strongest positive signal, the main investor friction, and overall investor-readiness.
- Do NOT invent facts not in the evaluation data.
- Sound like an experienced investor coach, not generic AI.

OUTPUT FORMAT:
Return ONLY valid JSON:

{
  "summary": "2-4 sentence summary of the deck's investor-readiness."
}`

/**
 * Evaluate a single slide against its investor questions.
 */
async function evaluateSlide(openai, slide, rubric) {
  // Sort questions by importance for display
  const sortedRubric = sortByImportance(rubric)

  const questions = sortedRubric.map((q) => ({
    question_id: q.id,
    question: q.question,
  }))

  const userMessage = `SLIDE TYPE: ${slide.inferred_type}
SLIDE NUMBER: ${slide.slide_number}

EXTRACTED TEXT:
${slide.extracted_text || '(No text extracted)'}

INVESTOR QUESTIONS TO EVALUATE:
${JSON.stringify(questions, null, 2)}

Evaluate each question using the 0-5 scale. Provide assessment, gap, and fix for each.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RUBRIC_EVAL_PROMPT },
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

    if (!Array.isArray(result.answers)) {
      throw new Error('Invalid answers array in response')
    }

    // Validate and normalize answers
    const validatedAnswers = result.answers.map((a) => {
      const score = Math.min(5, Math.max(0, Math.round(a.score) || 0))
      // Validate confidence - default based on score if invalid
      let confidence = a.confidence
      if (!['high', 'medium', 'low'].includes(confidence)) {
        // Default: score 0 = low, score 4-5 = high, else medium
        confidence = score === 0 ? 'low' : score >= 4 ? 'high' : 'medium'
      }
      return {
        question_id: a.question_id,
        score,
        assessment: a.assessment || 'Unable to assess.',
        gap: a.gap || 'Unable to determine gap.',
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
 * Generate deck summary from slide evaluations.
 */
async function generateDeckSummary(openai, slideEvaluations, overallGrade, deckScore) {
  const slideOverview = slideEvaluations.map((s) => ({
    slide_number: s.slide_number,
    type: s.type,
    grade: s.grade,
    normalized_score: s.normalized_score,
  }))

  const userMessage = `DECK EVALUATION RESULTS:
Overall Grade: ${overallGrade}
Deck Score: ${deckScore.toFixed(2)} / 5.0

SLIDE GRADES:
${JSON.stringify(slideOverview, null, 2)}

Generate a summary of this deck's investor-readiness.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)
    return result.summary || 'Unable to generate summary.'
  } catch (err) {
    console.error('Summary generation error:', err.message)
    return `This deck received an overall grade of ${overallGrade}. Review the slide-by-slide feedback for details.`
  }
}

/**
 * Build free report subset from full report.
 * Shows: question, score, assessment
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

  // Slide notes: question/score/assessment only (no fix)
  const slideNotes = fullReport.slides.map((slide) => {
    // Get the most important low-scoring question for the note
    const lowScoring = slide.questions.filter((q) => q.score <= 2)
    const topGap = lowScoring[0] // Already sorted by importance

    let note
    if (slide.grade === 'A') {
      note = 'Strong slide. Meets investor expectations.'
    } else if (slide.grade === 'B') {
      note = 'Good foundation. Minor gaps remain.'
    } else if (topGap) {
      note = topGap.gap
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

    // Evaluate each slide
    const slideEvaluations = []

    for (const slide of slides) {
      const slideType = slide.inferred_type || 'other'
      const rubric = RUBRICS[slideType] || RUBRICS.other

      console.log(`Evaluating slide ${slide.slide_number} (${slideType})...`)

      const { answers } = await evaluateSlide(openai, slide, rubric)

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

    // Generate summary
    const summary = await generateDeckSummary(
      openai,
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
  generateDeckSummary,
  buildFreeReport,
  RUBRIC_EVAL_PROMPT,
  SUMMARY_PROMPT,
}
