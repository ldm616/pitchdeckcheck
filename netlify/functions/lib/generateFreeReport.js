const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')
const {
  RUBRIC_VERSION,
  RUBRICS,
  SLIDE_WEIGHTS,
  computeSlideScore,
  computeDeckScore,
  generateFallbackAnswers,
} = require('./rubrics')

/**
 * Prompt for rubric-based slide evaluation with actionable feedback.
 * Model answers each rubric question and provides missing/fixes/examples.
 */
const RUBRIC_EVAL_PROMPT = `You are an experienced early-stage startup investor evaluating a pitch deck slide for investor-readiness. You are skeptical by default and evaluate strictly.

You will receive a slide's extracted text and its inferred type. Your job is to:
1. Answer each rubric question with yes/partial/no
2. Identify what's MISSING vs investor expectations
3. Provide specific FIXES (actionable improvements)
4. Give EXAMPLES of patterns from strong decks

SCORING RULES:
- "yes" (score 2): The criterion is clearly met with specific, visible evidence in the extracted text.
- "partial" (score 1): The criterion is partially met or implied but lacks specificity, clarity, or strong evidence.
- "no" (score 0): The criterion is not met or no relevant evidence is visible in the extracted text.

ANTI-HALLUCINATION RULES (critical):
- Base your evaluation ONLY on the extracted slide text provided.
- Do NOT invent or assume facts, numbers, names, or claims not visible in the text.
- If the slide text is empty or "(No text extracted)", score all questions as "no" and note limited confidence.
- If something is implied but not explicitly stated, score as "partial" at best.
- Do NOT reward claims that lack visible supporting evidence.

MISSING ITEMS RULES:
- Derive missing items ONLY from rubric questions scored "no" or "partial"
- Each missing item should describe what an investor would expect to see but doesn't
- Be specific: "No bottom-up market sizing" not "Market needs work"
- Do NOT invent problems unrelated to the rubric questions

FIXES RULES:
- Each fix must be concrete and actionable
- Start with an action verb: "Add...", "Show...", "Include...", "Quantify..."
- Be specific: "Add bottom-up sizing (e.g. # of target customers x avg spend)" not "Improve market slide"
- Fixes should directly address the missing items
- Include 2-4 fixes based on the most important gaps

EXAMPLES RULES:
- Reference patterns from well-known strong decks (Airbnb, Dropbox, Buffer, etc.)
- Keep examples generic but recognizable - describe the PATTERN, not fake data
- Examples should illustrate how to fix the gaps
- Do NOT cite fabricated numbers, metrics, or specific claims
- Include 1-2 examples maximum

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:

{
  "answers": [
    {
      "question_id": "problem_01",
      "answer": "yes|partial|no",
      "score": 2|1|0,
      "evidence": "Brief quote or reference from the slide text that supports this score",
      "reasoning": "1 sentence explaining why this score was given"
    }
  ],
  "missing": [
    "Specific thing that's missing vs investor expectations"
  ],
  "fixes": [
    "Specific actionable fix starting with action verb"
  ],
  "examples": [
    "Pattern from strong decks that illustrates the fix"
  ],
  "summary": "1-2 sentence diagnosis of the slide's main strength and weakness"
}

REQUIREMENTS:
- Answer EVERY question in the rubric provided
- Each answer must have question_id, answer, score, evidence, and reasoning
- score must match answer: yes=2, partial=1, no=0
- missing: 1-4 items derived from low-scoring rubric questions
- fixes: 2-4 specific actionable improvements
- examples: 1-2 pattern references from strong decks
- summary: concise diagnosis (strength + weakness)`

/**
 * Prompt for generating the deck summary after all slides are evaluated.
 */
const SUMMARY_PROMPT = `You are an experienced early-stage startup investor. You have just evaluated a pitch deck slide-by-slide using a structured rubric. Now summarize the overall findings.

RULES:
- Be balanced and honest. Include both strengths and weaknesses.
- The summary should be 2-4 sentences covering: the strongest positive signal, the main investor friction, and overall investor-readiness.
- Do NOT invent facts not in the slide data. Base all observations on the evaluation results.

OUTPUT FORMAT:
Return ONLY valid JSON:

{
  "summary": "2-4 sentence summary of the deck's investor-readiness."
}`

/**
 * Generate fallback diagnosis when evaluation fails.
 */
function generateFallbackDiagnosis(rubric) {
  return {
    missing: ['Unable to evaluate slide content'],
    fixes: ['Ensure slide has clear, readable content'],
    examples: [],
    summary: 'Evaluation failed due to processing error.',
  }
}

/**
 * Evaluate a single slide against its rubric with actionable feedback.
 */
async function evaluateSlide(openai, slide, rubric) {
  const rubricQuestions = rubric.map((q) => ({
    question_id: q.id,
    question: q.question,
  }))

  const userMessage = `SLIDE TYPE: ${slide.inferred_type}
SLIDE NUMBER: ${slide.slide_number}

EXTRACTED TEXT:
${slide.extracted_text || '(No text extracted)'}

RUBRIC QUESTIONS TO ANSWER:
${JSON.stringify(rubricQuestions, null, 2)}

Evaluate this slide by answering each rubric question, then provide missing items, fixes, examples, and a summary.`

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
      const score =
        a.answer === 'yes' ? 2 : a.answer === 'partial' ? 1 : a.answer === 'no' ? 0 : a.score ?? 0
      return {
        question_id: a.question_id,
        answer: a.answer,
        score,
        evidence: a.evidence || '',
        reasoning: a.reasoning || '',
      }
    })

    // Validate and normalize actionable feedback
    const missing = Array.isArray(result.missing) ? result.missing.filter((m) => typeof m === 'string' && m.trim()) : []
    const fixes = Array.isArray(result.fixes) ? result.fixes.filter((f) => typeof f === 'string' && f.trim()) : []
    const examples = Array.isArray(result.examples) ? result.examples.filter((e) => typeof e === 'string' && e.trim()) : []
    const summary = typeof result.summary === 'string' ? result.summary : ''

    return {
      success: true,
      answers: validatedAnswers,
      missing,
      fixes,
      examples,
      summary,
    }
  } catch (err) {
    console.error(`Slide ${slide.slide_number} evaluation error:`, err.message)
    const fallback = generateFallbackDiagnosis(rubric)
    return {
      success: false,
      answers: generateFallbackAnswers(rubric),
      ...fallback,
    }
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
    missing_count: s.diagnosis?.missing?.length || 0,
    fix_count: s.fixes?.length || 0,
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
 * Exposes limited info: fix_count, short diagnosis. No fixes/examples leaked.
 */
function buildFreeReport(fullReport) {
  // Collect issues from slides with their fix counts
  const slideIssues = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue // Skip cover/contact

    // Get missing items for this slide
    const missingItems = slide.diagnosis?.missing || []
    const fixCount = slide.fixes?.length || 0

    for (const missing of missingItems) {
      slideIssues.push({
        title: missing,
        slide_type: slide.type,
        slide_number: slide.slide_number,
        slide_weight: weight,
        fix_count: fixCount,
        grade: slide.grade,
      })
    }
  }

  // Sort by slide weight (higher impact slides first), then by grade (worse first)
  const gradeOrder = { E: 0, D: 1, C: 2, B: 3, A: 4 }
  slideIssues.sort((a, b) => {
    if (b.slide_weight !== a.slide_weight) return b.slide_weight - a.slide_weight
    return (gradeOrder[a.grade] || 2) - (gradeOrder[b.grade] || 2)
  })

  // Top 3 biggest issues with fix_count
  const topIssues = slideIssues.slice(0, 3).map((issue) => ({
    title: issue.title,
    detail: `${issue.slide_type} slide needs improvement`,
    slide_type: issue.slide_type,
    fix_count: issue.fix_count,
    priority: issue.slide_weight >= 1.2 ? 'high' : issue.slide_weight >= 0.8 ? 'medium' : 'low',
  }))

  // Collect strengths from high-scoring slides
  const slideStrengths = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue
    if (slide.grade !== 'A' && slide.grade !== 'B') continue

    // Use slide summary as strength indicator
    if (slide.summary) {
      slideStrengths.push({
        title: `Strong ${slide.type} slide`,
        detail: slide.summary,
        slide_type: slide.type,
        slide_weight: weight,
      })
    }
  }

  slideStrengths.sort((a, b) => b.slide_weight - a.slide_weight)
  const topStrengths = slideStrengths.slice(0, 3).map((s) => ({
    title: s.title,
    detail: s.detail,
    slide_type: s.slide_type,
  }))

  // Light slide notes: short diagnosis only (no fixes, no examples)
  const slideNotes = fullReport.slides.map((slide) => {
    const missingCount = slide.diagnosis?.missing?.length || 0
    const firstMissing = slide.diagnosis?.missing?.[0]

    let note
    if (slide.grade === 'A') {
      note = 'Excellent - meets investor expectations'
    } else if (slide.grade === 'B') {
      note = 'Good - minor improvements possible'
    } else if (missingCount > 0 && firstMissing) {
      note = firstMissing
    } else {
      note = 'Needs improvement'
    }

    return {
      slide_number: slide.slide_number,
      inferred_type: slide.type,
      grade: slide.grade,
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
        'Specific fixes for each weak slide',
        'Examples from successful pitch decks',
        'Detailed rubric scoring with evidence',
        'Prioritized action items by investor impact',
      ],
    },
  }
}

/**
 * Generate a full rubric-based report with actionable feedback, then derive the free subset.
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

  console.log(`Generating rubric-based report for deck ${deckId}, report ${reportId}`)

  try {
    const openai = new OpenAI.default({ apiKey: openaiKey })

    // Evaluate each slide
    const slideEvaluations = []

    for (const slide of slides) {
      const slideType = slide.inferred_type || 'other'
      const rubric = RUBRICS[slideType] || RUBRICS.other

      console.log(`Evaluating slide ${slide.slide_number} (${slideType})...`)

      const evalResult = await evaluateSlide(openai, slide, rubric)

      // Compute deterministic slide score
      const slideScoreResult = computeSlideScore(evalResult.answers, rubric)

      slideEvaluations.push({
        slide_number: slide.slide_number,
        type: slideType,
        rubric_answers: evalResult.answers,
        weighted_score: slideScoreResult.weightedScore,
        max_score: slideScoreResult.maxScore,
        normalized: slideScoreResult.normalized,
        grade: slideScoreResult.grade,
        diagnosis: {
          missing: evalResult.missing,
        },
        fixes: evalResult.fixes,
        examples: evalResult.examples,
        summary: evalResult.summary,
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
