const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')
const {
  RUBRIC_VERSION,
  RUBRICS,
  computeSlideScore,
  generateFallbackAnswers,
  extractStrengths,
  extractIssues,
} = require('./rubrics')

// Slide weights for weighted deck scoring
// Higher weight = more impact on overall grade
// 0 weight = excluded from scoring (non-impact slides)
const SLIDE_WEIGHTS = {
  problem: 1.3,
  solution: 1.3,
  market: 1.3,
  traction: 1.5,
  team: 1.3,
  business_model: 1.2,
  financials: 1.2,
  ask: 1.2,

  product: 1.0,
  competition: 1.0,
  go_to_market: 1.0,
  roadmap: 0.8,
  investment_highlights: 0.6,

  cover: 0.0,
  contact: 0.0,
  other: 0.5,
}

// Grade to numeric score mapping for deck-level scoring
const GRADE_TO_SCORE = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
}

// Numeric score to grade mapping for deck-level
const scoreToGrade = (score) => {
  if (score >= 4.5) return 'A'
  if (score >= 3.5) return 'B'
  if (score >= 2.5) return 'C'
  if (score >= 1.5) return 'D'
  return 'E'
}

/**
 * Build the rubric evaluation prompt for a single slide.
 * @param {object} slide - Slide data with slide_number, inferred_type, extracted_text
 * @param {Array} rubric - Array of rubric questions
 * @returns {string} System prompt for rubric evaluation
 */
function buildRubricPrompt(slide, rubric) {
  const questionsJson = JSON.stringify(
    rubric.map((q) => ({ question_id: q.id, question: q.question })),
    null,
    2
  )

  return `You are an experienced early-stage startup investor evaluating a single pitch deck slide.

Your task is to evaluate the slide against a specific rubric of investor questions.

SLIDE TYPE: ${slide.inferred_type}
SLIDE NUMBER: ${slide.slide_number}

RUBRIC QUESTIONS:
${questionsJson}

CRITICAL RULES:
1. Base your evaluation ONLY on the extracted text provided below.
2. Do NOT hallucinate, invent, or assume information not present in the text.
3. If information is missing, answer "no" with score 0.
4. If information is present but weak/partial, answer "partial" with score 1.
5. If information is clearly present and strong, answer "yes" with score 2.
6. Quote or paraphrase actual text as evidence when available.
7. If extracted_text is empty or very sparse, most answers should be "no".

SCORING:
- "yes" = 2 points (clear, strong evidence present)
- "partial" = 1 point (some evidence but incomplete or weak)
- "no" = 0 points (missing or not addressed)

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "answers": [
    {
      "question_id": "example_01",
      "answer": "yes|partial|no",
      "score": 0|1|2,
      "evidence": "quote or paraphrase from slide text",
      "reasoning": "brief explanation of scoring"
    }
  ]
}

REQUIREMENTS:
- You MUST include an answer for EVERY question in the rubric (${rubric.length} total).
- Each answer MUST have all 5 fields: question_id, answer, score, evidence, reasoning.
- Do NOT add extra questions or skip any.`
}

/**
 * Evaluate a single slide against its rubric using OpenAI.
 * @param {object} openai - OpenAI client
 * @param {object} slide - Slide data
 * @param {Array} rubric - Rubric questions for this slide type
 * @returns {Promise<{success: boolean, answers?: Array, error?: string}>}
 */
async function evaluateSlideWithRubric(openai, slide, rubric) {
  const systemPrompt = buildRubricPrompt(slide, rubric)

  const userMessage = `EXTRACTED TEXT FROM SLIDE ${slide.slide_number}:
---
${slide.extracted_text || '(No text extracted)'}
---

Evaluate this slide against all ${rubric.length} rubric questions and return your evaluation as JSON.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)

    // Validate answers array
    if (!Array.isArray(result.answers)) {
      throw new Error('Response missing answers array')
    }

    // Validate each answer has required fields
    for (const answer of result.answers) {
      if (!answer.question_id || answer.answer === undefined || answer.score === undefined) {
        throw new Error('Answer missing required fields')
      }
      // Normalize answer and score
      answer.answer = String(answer.answer).toLowerCase()
      answer.score = Number(answer.score)
      if (!['yes', 'partial', 'no'].includes(answer.answer)) {
        answer.answer = 'no'
        answer.score = 0
      }
      if (![0, 1, 2].includes(answer.score)) {
        // Derive score from answer
        answer.score = answer.answer === 'yes' ? 2 : answer.answer === 'partial' ? 1 : 0
      }
    }

    // Ensure all rubric questions are answered
    const answeredIds = new Set(result.answers.map((a) => a.question_id))
    for (const q of rubric) {
      if (!answeredIds.has(q.id)) {
        result.answers.push({
          question_id: q.id,
          answer: 'no',
          score: 0,
          evidence: 'Question not evaluated by model',
          reasoning: 'Fallback - question was not addressed',
        })
      }
    }

    return { success: true, answers: result.answers }
  } catch (err) {
    console.error(`Rubric evaluation failed for slide ${slide.slide_number}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Generate a summary for a slide based on its rubric evaluation.
 * @param {object} openai - OpenAI client
 * @param {object} slide - Slide data
 * @param {Array} answers - Rubric answers
 * @param {string} grade - Computed grade
 * @returns {Promise<string>} Summary text
 */
async function generateSlideSummary(openai, slide, answers, grade) {
  const answersContext = answers
    .map((a) => `- ${a.question_id}: ${a.answer} (${a.reasoning})`)
    .join('\n')

  const prompt = `Based on this slide evaluation, write a 1-2 sentence investor-grade summary.

SLIDE TYPE: ${slide.inferred_type}
GRADE: ${grade}
EVALUATION:
${answersContext}

Write a concise, direct summary focusing on the most important finding. No fluff or generic statements.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    })

    return response.choices[0]?.message?.content?.trim() || 'Unable to generate summary.'
  } catch {
    return 'Unable to generate summary due to evaluation error.'
  }
}

/**
 * Compute weighted deck score from slide evaluations.
 * @param {Array} slideEvaluations - Array of slide evaluation objects with type and grade
 * @returns {{deckScore: number, totalWeight: number, slideCountUsed: number, overallGrade: string}}
 */
function computeWeightedDeckScore(slideEvaluations) {
  let totalWeightedScore = 0
  let totalWeight = 0
  let slideCountUsed = 0

  for (const evaluation of slideEvaluations) {
    const type = evaluation.type || 'other'
    const weight = SLIDE_WEIGHTS[type] ?? 0.5
    const grade = evaluation.grade

    // Skip slides with zero weight (cover, contact)
    if (weight === 0) {
      continue
    }

    const score = GRADE_TO_SCORE[grade]
    if (score === undefined) {
      console.warn(`Invalid grade "${grade}" for slide ${evaluation.slide_number}, skipping`)
      continue
    }

    totalWeightedScore += score * weight
    totalWeight += weight
    slideCountUsed++
  }

  // Avoid division by zero
  if (totalWeight === 0) {
    return {
      deckScore: 3.0,
      totalWeight: 0,
      slideCountUsed: 0,
      overallGrade: 'C',
    }
  }

  const deckScore = totalWeightedScore / totalWeight
  const overallGrade = scoreToGrade(deckScore)

  return {
    deckScore: Math.round(deckScore * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
    slideCountUsed,
    overallGrade,
  }
}

/**
 * Generate deck-level summary from all slide evaluations.
 * @param {object} openai - OpenAI client
 * @param {Array} slideEvaluations - All slide evaluations
 * @param {string} overallGrade - Computed overall grade
 * @returns {Promise<string>} Deck summary
 */
async function generateDeckSummary(openai, slideEvaluations, overallGrade) {
  const slideOverview = slideEvaluations
    .filter((s) => SLIDE_WEIGHTS[s.type] > 0) // Only include scored slides
    .map((s) => `- ${s.type} (slide ${s.slide_number}): ${s.grade}`)
    .join('\n')

  const prompt = `Based on these slide grades, write a 2-4 sentence investor-readiness summary.

OVERALL GRADE: ${overallGrade}

SLIDE GRADES:
${slideOverview}

Write a balanced summary that:
1. Identifies the strongest signal in the deck
2. Identifies the main friction point or gap
3. Provides an honest assessment of investor-readiness

Be direct and specific. No generic praise.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    })

    return response.choices[0]?.message?.content?.trim() || 'Unable to generate deck summary.'
  } catch {
    return 'Unable to generate deck summary due to evaluation error.'
  }
}

/**
 * Aggregate top strengths across all slides.
 * @param {Array} slideEvaluations - All slide evaluations
 * @param {number} count - Number of strengths to return
 * @returns {Array} Top strengths
 */
function aggregateDeckStrengths(slideEvaluations, count = 3) {
  const allStrengths = []

  for (const evaluation of slideEvaluations) {
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      for (const strength of evaluation.strengths) {
        allStrengths.push({
          slide_number: evaluation.slide_number,
          slide_type: evaluation.type,
          slide_grade: evaluation.grade,
          ...strength,
        })
      }
    }
  }

  // Sort by slide grade (A > B > C...) and slide weight
  allStrengths.sort((a, b) => {
    const gradeOrder = { A: 5, B: 4, C: 3, D: 2, E: 1 }
    const gradeDiff = (gradeOrder[b.slide_grade] || 0) - (gradeOrder[a.slide_grade] || 0)
    if (gradeDiff !== 0) return gradeDiff

    const weightA = SLIDE_WEIGHTS[a.slide_type] || 0.5
    const weightB = SLIDE_WEIGHTS[b.slide_type] || 0.5
    return weightB - weightA
  })

  return allStrengths.slice(0, count).map((s) => ({
    title: `${s.slide_type.charAt(0).toUpperCase() + s.slide_type.slice(1)}: ${s.question}`,
    detail: s.evidence || s.reasoning,
    slide_number: s.slide_number,
  }))
}

/**
 * Aggregate top issues across all slides.
 * @param {Array} slideEvaluations - All slide evaluations
 * @param {number} count - Number of issues to return
 * @returns {Array} Top issues
 */
function aggregateDeckIssues(slideEvaluations, count = 3) {
  const allIssues = []

  for (const evaluation of slideEvaluations) {
    if (evaluation.issues && evaluation.issues.length > 0) {
      for (const issue of evaluation.issues) {
        allIssues.push({
          slide_number: evaluation.slide_number,
          slide_type: evaluation.type,
          slide_grade: evaluation.grade,
          slide_weight: SLIDE_WEIGHTS[evaluation.type] || 0.5,
          ...issue,
        })
      }
    }
  }

  // Sort by slide weight (highest impact first), then by answer score (lowest first)
  allIssues.sort((a, b) => {
    // Higher weight slides are more important
    const weightDiff = b.slide_weight - a.slide_weight
    if (Math.abs(weightDiff) > 0.1) return weightDiff

    // Lower scoring issues are more critical
    const scoreA = a.answer === 'no' ? 0 : 1
    const scoreB = b.answer === 'no' ? 0 : 1
    return scoreA - scoreB
  })

  return allIssues.slice(0, count).map((issue) => ({
    title: `${issue.slide_type.charAt(0).toUpperCase() + issue.slide_type.slice(1)}: ${issue.question}`,
    detail: issue.reasoning,
    fix: issue.fix,
    priority: issue.slide_weight >= 1.2 ? 'high' : issue.slide_weight >= 0.8 ? 'medium' : 'low',
    slide_number: issue.slide_number,
  }))
}

/**
 * Generate a paid investor-readiness report with rubric-based evaluation.
 * @param {object} supabase - Supabase client
 * @param {string} deckId - Deck ID
 * @returns {Promise<{success: boolean, reportId?: string, overallGrade?: string, error?: string}>}
 */
async function generatePaidReport(supabase, deckId) {
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

  // Update deck status to generating_paid
  await setDeckStatus(supabase, deckId, 'generating_paid', null)

  // Create or update report row with status = generating
  const { data: existingReport } = await supabase
    .from('reports')
    .select('id')
    .eq('deck_id', deckId)
    .eq('report_type', 'paid')
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
        report_type: 'paid',
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

  console.log(`Generating paid report for deck ${deckId}, report ${reportId}`)
  console.log(`Using rubric version: ${RUBRIC_VERSION}`)

  try {
    const openai = new OpenAI.default({ apiKey: openaiKey })

    // Evaluate each slide with its rubric
    const slideEvaluations = []

    for (const slide of slides) {
      const slideType = slide.inferred_type || 'other'
      const rubric = RUBRICS[slideType] || RUBRICS.other

      console.log(`Evaluating slide ${slide.slide_number} (${slideType}) with ${rubric.length} questions`)

      // Evaluate slide against rubric
      const evalResult = await evaluateSlideWithRubric(openai, slide, rubric)

      let answers
      if (evalResult.success) {
        answers = evalResult.answers
      } else {
        // Fallback: generate default failing answers
        console.warn(`Using fallback answers for slide ${slide.slide_number}`)
        answers = generateFallbackAnswers(rubric)
      }

      // Compute slide score deterministically
      const slideScore = computeSlideScore(answers, rubric)

      // Extract strengths and issues
      const strengths = extractStrengths(answers, rubric, 2)
      const issues = extractIssues(answers, rubric, 2)

      // Generate slide summary
      const summary = await generateSlideSummary(openai, slide, answers, slideScore.grade)

      slideEvaluations.push({
        slide_number: slide.slide_number,
        type: slideType,
        grade: slideScore.grade,
        score: slideScore.normalized,
        answers,
        strengths,
        issues,
        summary,
      })
    }

    // Compute deck-level score
    const deckScoring = computeWeightedDeckScore(slideEvaluations)
    console.log(
      `Deck scoring: grade=${deckScoring.overallGrade}, score=${deckScoring.deckScore}, slides_used=${deckScoring.slideCountUsed}`
    )

    // Generate deck-level summary
    const deckSummary = await generateDeckSummary(openai, slideEvaluations, deckScoring.overallGrade)

    // Aggregate top strengths and issues
    const deckStrengths = aggregateDeckStrengths(slideEvaluations, 3)
    const deckIssues = aggregateDeckIssues(slideEvaluations, 3)

    // Build final report
    const report = {
      rubric_version: RUBRIC_VERSION,
      overall_grade: deckScoring.overallGrade,
      summary: deckSummary,
      strengths: deckStrengths,
      biggest_issues: deckIssues,
      slide_notes: slideEvaluations,
      scoring: {
        deck_score: deckScoring.deckScore,
        total_weight: deckScoring.totalWeight,
        slide_count_used: deckScoring.slideCountUsed,
      },
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

    console.log(`Paid report generated successfully: grade ${report.overall_grade}`)

    return {
      success: true,
      reportId,
      overallGrade: report.overall_grade,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during report generation'
    console.error('Paid report generation failed:', errorMessage)

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
  generatePaidReport,
  computeWeightedDeckScore,
  evaluateSlideWithRubric,
  buildRubricPrompt,
  SLIDE_WEIGHTS,
  GRADE_TO_SCORE,
  scoreToGrade,
}
