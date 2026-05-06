/**
 * Calibration Suite Runner
 *
 * Netlify Function to run calibration evaluation suite.
 *
 * Behavior:
 * 1. Loads all active calibration decks from DB (or local fallback)
 * 2. Runs full evaluation pipeline on each deck
 * 3. Stores results in calibration_results
 * 4. Generates QA flags automatically
 * 5. Updates calibration_runs summary/status
 *
 * Endpoint: POST /.netlify/functions/run-calibration-suite
 *
 * Body:
 * {
 *   "architecture_version": "v4",
 *   "prompt_version": "v3.1",
 *   "rule_pack_version": "default",
 *   "git_commit": "abc123",
 *   "deck_ids": ["youtube_seed_consumer_network"],  // optional, defaults to all active
 *   "archetype_filter": "consumer_network",          // optional
 *   "dry_run": false                                  // optional
 * }
 */

const calibrationDb = require('./lib/calibrationDb')
const calibrationQA = require('./lib/calibrationQA')
const fs = require('fs')
const path = require('path')

// =============================================================================
// MOCK EVALUATION (placeholder until wired to real pipeline)
// =============================================================================

/**
 * Run evaluation on a calibration deck.
 * This is a placeholder that should be wired to the real evaluation pipeline.
 */
async function evaluateDeck(calibrationDeck) {
  // In production, this would:
  // 1. Load the deck PDF from storage
  // 2. Extract slides
  // 3. Run the full evaluation pipeline
  // 4. Return the evaluation result

  // For now, return a mock structure
  console.log(`[calibration] Evaluating deck: ${calibrationDeck.company}`)

  // Mock evaluation result structure
  return {
    deck_id: calibrationDeck.id,
    overall_grade: 'B-', // Mock
    overall_score: 0.65, // Mock
    slides: [
      { slide_number: 1, type: 'cover', grade: 'B', normalized_score: 0.75, questions: [] },
      { slide_number: 2, type: 'problem', grade: 'B-', normalized_score: 0.68, questions: [
        { question: 'Is the problem clearly articulated?', score: 3.5, fix: 'Add more specific examples.' }
      ]},
      { slide_number: 3, type: 'solution', grade: 'B', normalized_score: 0.72, questions: [
        { question: 'Is the solution clearly explained?', score: 4, fix: 'None needed.' }
      ]},
      { slide_number: 4, type: 'market', grade: 'C+', normalized_score: 0.58, questions: [
        { question: 'Is the market size quantified?', score: 2.5, fix: 'Add more metrics to quantify market size.' }
      ]},
      { slide_number: 5, type: 'business_model', grade: 'C', normalized_score: 0.52, questions: [
        { question: 'Is the revenue model clear?', score: 2, fix: 'Clarify monetization strategy.' }
      ]},
      { slide_number: 6, type: 'traction', grade: 'C+', normalized_score: 0.56, questions: [
        { question: 'Is traction demonstrated?', score: 2.5, fix: 'Provide more detail on user metrics.' }
      ]},
      { slide_number: 7, type: 'team', grade: 'B+', normalized_score: 0.78, questions: [
        { question: 'Does the team have relevant experience?', score: 4, fix: 'None needed.' }
      ]},
      { slide_number: 8, type: 'competition', grade: 'C', normalized_score: 0.50, questions: [
        { question: 'Is competitive positioning clear?', score: 2.5, fix: 'Improve defensibility explanation.' }
      ]},
    ],
    signal_override_debug: {
      status: 'Signal override ACTIVE: lifted 2 slide(s), suppressed 3 fix(es), 0 cap(s) applied',
      signal_override_executed: true,
      summary: {
        slides_processed: 8,
        slides_grade_lifted: 2,
        fixes_suppressed: 3,
      },
      deck_signal_analysis: {
        overall_strength: 'moderate',
        unique_signal_types_found: 3,
        signal_types: ['consumer_pain', 'product_simplicity', 'timing_insight'],
        signals_by_type: {
          consumer_pain: [{ slide_number: 2, match: 'fragmented' }],
          product_simplicity: [{ slide_number: 3, match: 'upload' }],
          timing_insight: [{ slide_number: 4, match: 'finally' }],
        },
      },
    },
    _is_mock: true,
  }
}

// =============================================================================
// CALIBRATION REPORT GENERATION
// =============================================================================

/**
 * Generate aggregate calibration summary.
 */
function generateCalibrationSummary(results, flags) {
  const summary = {
    decks_evaluated: results.length,
    decks_in_range: results.filter(r => r.within_expected_range).length,
    decks_out_of_range: results.filter(r => !r.within_expected_range).length,

    // Grade distribution
    grade_distribution: {},

    // By archetype
    by_archetype: {},

    // By stage
    by_stage: {},

    // Inflation patterns
    inflation_flags: flags.filter(f =>
      f.flag_type.includes('inflated') || f.flag_type === 'signal_override_excessive'
    ).length,

    // Harshness patterns
    under_scoring_flags: flags.filter(f =>
      f.flag_type.includes('under') || f.flag_type.includes('ignored')
    ).length,

    // Generic feedback
    generic_feedback_flags: flags.filter(f =>
      f.flag_type.includes('generic') || f.flag_type.includes('repetitive')
    ).length,

    // Top failing rules
    top_flag_types: {},

    // Score statistics
    score_stats: {
      min: 1,
      max: 0,
      avg: 0,
      std_dev: 0,
    },

    // Signal override stats
    override_stats: {
      total_slides_lifted: 0,
      total_fixes_suppressed: 0,
      decks_with_overrides: 0,
    },

    // Error summary
    errors: [],
    warnings: [],
  }

  // Calculate distributions
  const scores = []
  for (const result of results) {
    // Grade distribution
    const grade = result.actual_grade || 'Unknown'
    summary.grade_distribution[grade] = (summary.grade_distribution[grade] || 0) + 1

    // Scores
    if (result.actual_score) {
      scores.push(result.actual_score)
    }

    // Override stats
    if (result.signal_override_applied) {
      summary.override_stats.decks_with_overrides++
    }
    summary.override_stats.total_slides_lifted += result.result_summary?.slides_lifted || 0
    summary.override_stats.total_fixes_suppressed += result.fixes_suppressed || 0
  }

  // Score statistics
  if (scores.length > 0) {
    summary.score_stats.min = Math.min(...scores)
    summary.score_stats.max = Math.max(...scores)
    summary.score_stats.avg = scores.reduce((a, b) => a + b, 0) / scores.length

    const variance = scores.reduce((sum, s) => sum + Math.pow(s - summary.score_stats.avg, 2), 0) / scores.length
    summary.score_stats.std_dev = Math.sqrt(variance)
  }

  // Top flag types
  for (const flag of flags) {
    summary.top_flag_types[flag.flag_type] = (summary.top_flag_types[flag.flag_type] || 0) + 1
  }

  // Sort top flags
  summary.top_flag_types = Object.fromEntries(
    Object.entries(summary.top_flag_types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  )

  // Errors and warnings
  summary.errors = flags
    .filter(f => f.severity === 'error')
    .map(f => `${f.deck_id || 'unknown'}: ${f.description}`)
  summary.warnings = flags
    .filter(f => f.severity === 'warning')
    .slice(0, 20)
    .map(f => `${f.deck_id || 'unknown'}: ${f.description}`)

  return summary
}

/**
 * Save calibration report to local file.
 */
function saveLocalReport(runId, summary, results, flags) {
  const resultsDir = path.join(__dirname, '../..', 'model/calibration/results')

  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true })
  }

  const report = {
    run_id: runId,
    generated_at: new Date().toISOString(),
    summary,
    results: results.map(r => ({
      deck_id: r.deck_id,
      expected_range: r.expected_grade_range,
      actual_grade: r.actual_grade,
      within_expected_range: r.within_expected_range,
      inflation_flags: r.inflation_flags?.length || 0,
      under_scoring_flags: r.under_scoring_flags?.length || 0,
      generic_feedback_flags: r.generic_feedback_flags?.length || 0,
    })),
    flags_summary: calibrationQA.summarizeFlags(flags),
  }

  // Save as latest report
  const latestPath = path.join(resultsDir, 'latestCalibrationReport.json')
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2))

  // Also save timestamped version
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const timestampedPath = path.join(resultsDir, `calibrationReport_${timestamp}.json`)
  fs.writeFileSync(timestampedPath, JSON.stringify(report, null, 2))

  console.log(`[calibration] Report saved: ${latestPath}`)
  return latestPath
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      architecture_version = 'v4',
      prompt_version = 'unknown',
      rule_pack_version = 'default',
      git_commit = null,
      deck_ids = null,
      archetype_filter = null,
      dry_run = false,
    } = body

    console.log('[calibration] ========================================')
    console.log('[calibration] Starting calibration run')
    console.log(`[calibration] Architecture: ${architecture_version}`)
    console.log(`[calibration] Dry run: ${dry_run}`)

    // 1. Create calibration run record
    const run = await calibrationDb.createCalibrationRun({
      architecture_version,
      prompt_version,
      rule_pack_version,
      git_commit,
    })

    console.log(`[calibration] Run ID: ${run.id}`)

    // 2. Load calibration decks
    let decks = await calibrationDb.getCalibrationDecks({
      activeOnly: true,
      archetype: archetype_filter,
    })

    // Filter to specific deck IDs if provided
    if (deck_ids && deck_ids.length > 0) {
      decks = decks.filter(d => deck_ids.includes(d.id))
    }

    console.log(`[calibration] Evaluating ${decks.length} decks`)

    if (decks.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'No calibration decks found',
          run_id: run.id,
        }),
      }
    }

    // 3. Evaluate each deck
    const results = []
    const allFlags = []

    for (const deck of decks) {
      console.log(`[calibration] Processing: ${deck.company} (${deck.id})`)

      try {
        // Run evaluation
        const evalResult = await evaluateDeck(deck)

        // Run QA checks
        const flags = calibrationQA.runQAChecks(evalResult, deck, evalResult.signal_override_debug)

        // Annotate flags with deck ID
        for (const flag of flags) {
          flag.deck_id = deck.id
          flag.run_id = run.id
        }

        // Determine if within expected range
        const actualGrade = evalResult.overall_grade
        const withinRange = deck.expected_grade_range
          ? calibrationQA.isGradeInRange(actualGrade, deck.expected_grade_range)
          : true

        // Build result record
        const result = {
          run_id: run.id,
          deck_id: deck.id,
          expected_grade_range: deck.expected_grade_range,
          actual_grade: actualGrade,
          actual_score: evalResult.overall_score,
          within_expected_range: withinRange,
          slide_grades: (evalResult.slides || []).map(s => ({
            slide_number: s.slide_number,
            type: s.type,
            grade: s.grade,
          })),
          inflation_flags: flags.filter(f => f.flag_type.includes('inflated')),
          under_scoring_flags: flags.filter(f => f.flag_type.includes('under') || f.flag_type.includes('ignored')),
          generic_feedback_flags: flags.filter(f => f.flag_type.includes('generic') || f.flag_type.includes('repetitive')),
          signal_override_applied: evalResult.signal_override_debug?.signal_override_executed || false,
          fixes_suppressed: evalResult.signal_override_debug?.summary?.fixes_suppressed || 0,
          result_summary: {
            slides_lifted: evalResult.signal_override_debug?.summary?.slides_grade_lifted || 0,
            signal_types_detected: evalResult.signal_override_debug?.deck_signal_analysis?.signal_types || [],
            is_mock: evalResult._is_mock || false,
          },
        }

        results.push(result)
        allFlags.push(...flags)

        // Store result (unless dry run)
        if (!dry_run) {
          await calibrationDb.storeCalibrationResult(result)

          // Store flags
          for (const flag of flags) {
            await calibrationDb.storeCalibrationFlag(flag)
          }
        }

        console.log(`[calibration] ${deck.company}: ${actualGrade} (expected: ${deck.expected_grade_range?.join('-') || 'N/A'}) - ${withinRange ? 'OK' : 'OUT OF RANGE'}`)

      } catch (err) {
        console.error(`[calibration] Error evaluating ${deck.company}:`, err.message)

        // Store error result
        results.push({
          run_id: run.id,
          deck_id: deck.id,
          expected_grade_range: deck.expected_grade_range,
          actual_grade: 'ERROR',
          actual_score: null,
          within_expected_range: false,
          error: err.message,
        })
      }
    }

    // 4. Generate summary
    const summary = generateCalibrationSummary(results, allFlags)

    // 5. Complete the run
    if (!dry_run) {
      await calibrationDb.completeCalibrationRun(run.id, summary)
    }

    // 6. Save local report
    const reportPath = saveLocalReport(run.id, summary, results, allFlags)

    console.log('[calibration] ========================================')
    console.log(`[calibration] Calibration run complete`)
    console.log(`[calibration] Decks evaluated: ${results.length}`)
    console.log(`[calibration] In range: ${summary.decks_in_range}/${summary.decks_evaluated}`)
    console.log(`[calibration] Total flags: ${allFlags.length}`)
    console.log(`[calibration] Errors: ${summary.errors.length}`)
    console.log('[calibration] ========================================')

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        run_id: run.id,
        dry_run,
        summary,
        results: results.map(r => ({
          deck_id: r.deck_id,
          actual_grade: r.actual_grade,
          expected_range: r.expected_grade_range,
          within_range: r.within_expected_range,
          flags_count: (r.inflation_flags?.length || 0) +
                       (r.under_scoring_flags?.length || 0) +
                       (r.generic_feedback_flags?.length || 0),
          is_mock: r.result_summary?.is_mock,
        })),
        flags_summary: calibrationQA.summarizeFlags(allFlags),
        report_path: reportPath,
      }),
    }

  } catch (err) {
    console.error('[calibration] Fatal error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Calibration run failed',
        message: err.message,
      }),
    }
  }
}
