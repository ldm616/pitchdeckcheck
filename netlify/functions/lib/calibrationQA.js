/**
 * Calibration QA Checks
 *
 * Automatic quality assurance checks for calibration runs.
 * Generates flags for:
 * - Inflation (grades too high)
 * - Harshness (grades too low)
 * - Generic feedback (repetitive suggestions)
 * - Weak signal false positives
 * - Stage/archetype mismatches
 */

// =============================================================================
// FLAG TYPES
// =============================================================================

const FLAG_TYPES = {
  // Inflation flags
  INFLATED_BUSINESS_MODEL: 'inflated_business_model',
  INFLATED_COMPETITION: 'inflated_competition',
  INFLATED_TRACTION: 'inflated_traction',
  INFLATED_OVERALL: 'inflated_overall',
  SIGNAL_OVERRIDE_EXCESSIVE: 'signal_override_excessive',

  // Harshness flags
  SPARSE_DECK_UNDER_SCORED: 'sparse_deck_under_scored',
  FOUNDER_FIT_UNDER_WEIGHTED: 'founder_fit_under_weighted',
  TIMING_IGNORED: 'timing_ignored',
  QUALITATIVE_INSIGHT_PENALIZED: 'qualitative_insight_penalized',

  // Generic feedback flags
  GENERIC_FEEDBACK_EXCESSIVE: 'generic_feedback_excessive',
  REPETITIVE_ADD_METRICS: 'repetitive_add_metrics',
  REPETITIVE_CLARIFY_DIFFERENTIATION: 'repetitive_clarify_differentiation',
  REPETITIVE_EXPAND_MARKET: 'repetitive_expand_market',

  // Signal flags
  WEAK_SIGNAL_FALSE_POSITIVE: 'weak_signal_false_positive',

  // Range flags
  OUTSIDE_EXPECTED_RANGE: 'outside_expected_range',
  MUST_NOT_HAPPEN_VIOLATED: 'must_not_happen_violated',
}

// Generic feedback patterns to detect
const GENERIC_FEEDBACK_PATTERNS = [
  { pattern: /add\s+(more\s+)?metrics/i, type: 'add_metrics' },
  { pattern: /clarify\s+differentiation/i, type: 'clarify_differentiation' },
  { pattern: /provide\s+(more\s+)?detail/i, type: 'provide_detail' },
  { pattern: /expand\s+market\s+sizing/i, type: 'expand_market' },
  { pattern: /improve\s+defensibility/i, type: 'improve_defensibility' },
  { pattern: /quantify/i, type: 'quantify' },
  { pattern: /specific\s+numbers/i, type: 'specific_numbers' },
  { pattern: /concrete\s+examples/i, type: 'concrete_examples' },
  { pattern: /more\s+data/i, type: 'more_data' },
  { pattern: /measurable/i, type: 'measurable' },
]

// =============================================================================
// GRADE UTILITIES
// =============================================================================

const GRADE_VALUES = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'E': 0.0, 'F': 0.0
}

function gradeToValue(grade) {
  return GRADE_VALUES[grade] || GRADE_VALUES[grade?.toUpperCase()] || 0
}

function isGradeInRange(grade, range) {
  if (!range || range.length !== 2) return true
  const value = gradeToValue(grade)
  const minValue = gradeToValue(range[0])
  const maxValue = gradeToValue(range[1])
  return value >= minValue && value <= maxValue
}

function isGradeAbove(grade, threshold) {
  return gradeToValue(grade) > gradeToValue(threshold)
}

function isGradeBelow(grade, threshold) {
  return gradeToValue(grade) < gradeToValue(threshold)
}

// =============================================================================
// INFLATION CHECKS
// =============================================================================

/**
 * Check for inflated business_model grades.
 * Flag if B or above without monetization clarity.
 */
function checkInflatedBusinessModel(slideEvals, calibrationDeck) {
  const flags = []

  const bizModelSlide = slideEvals.find(s => s.type === 'business_model')
  if (!bizModelSlide) return flags

  if (isGradeAbove(bizModelSlide.grade, 'B-')) {
    // Check if monetization is actually clear
    const hasMonetizationEvidence = bizModelSlide.questions?.some(q =>
      q.score >= 4 && /revenue|monetiz|pricing|business\s+model/i.test(q.question)
    )

    if (!hasMonetizationEvidence) {
      flags.push({
        flag_type: FLAG_TYPES.INFLATED_BUSINESS_MODEL,
        severity: 'warning',
        slide_number: bizModelSlide.slide_number,
        slide_type: 'business_model',
        description: `Business model grade ${bizModelSlide.grade} without clear monetization evidence`,
        expected_value: 'B- or below without monetization clarity',
        actual_value: bizModelSlide.grade,
      })
    }
  }

  return flags
}

/**
 * Check for inflated competition grades.
 * Flag if B or above without moat explanation.
 */
function checkInflatedCompetition(slideEvals, calibrationDeck) {
  const flags = []

  const compSlide = slideEvals.find(s => s.type === 'competition')
  if (!compSlide) return flags

  if (isGradeAbove(compSlide.grade, 'B-')) {
    // Check if moat is actually explained
    const hasMoatEvidence = compSlide.questions?.some(q =>
      q.score >= 4 && /moat|defensib|advantage|differentiat/i.test(q.question)
    )

    if (!hasMoatEvidence) {
      flags.push({
        flag_type: FLAG_TYPES.INFLATED_COMPETITION,
        severity: 'warning',
        slide_number: compSlide.slide_number,
        slide_type: 'competition',
        description: `Competition grade ${compSlide.grade} without clear moat explanation`,
        expected_value: 'B- or below without moat evidence',
        actual_value: compSlide.grade,
      })
    }
  }

  return flags
}

/**
 * Check for inflated traction grades.
 * Flag if B or above without metrics OR strong qualitative evidence.
 */
function checkInflatedTraction(slideEvals, calibrationDeck) {
  const flags = []

  const tractionSlide = slideEvals.find(s => s.type === 'traction')
  if (!tractionSlide) return flags

  if (isGradeAbove(tractionSlide.grade, 'B-')) {
    // Check for metrics or strong qualitative evidence
    const hasEvidence = tractionSlide.questions?.some(q =>
      q.score >= 4 && /users|revenue|growth|traction|customers/i.test(q.question)
    )

    // For sparse decks, qualitative is OK
    const isSparse = calibrationDeck?.era === 'sparse_classic'

    if (!hasEvidence && !isSparse) {
      flags.push({
        flag_type: FLAG_TYPES.INFLATED_TRACTION,
        severity: 'warning',
        slide_number: tractionSlide.slide_number,
        slide_type: 'traction',
        description: `Traction grade ${tractionSlide.grade} without metrics or strong qualitative evidence`,
        expected_value: 'B- or below without traction evidence',
        actual_value: tractionSlide.grade,
      })
    }
  }

  return flags
}

/**
 * Check for overall inflation.
 */
function checkInflatedOverall(overallGrade, calibrationDeck, signalOverrideApplied) {
  const flags = []

  // Flag if significantly above expected range
  if (calibrationDeck?.expected_grade_range) {
    const maxExpected = calibrationDeck.expected_grade_range[1]
    if (isGradeAbove(overallGrade, maxExpected)) {
      const severity = gradeToValue(overallGrade) - gradeToValue(maxExpected) > 0.5 ? 'error' : 'warning'
      flags.push({
        flag_type: FLAG_TYPES.INFLATED_OVERALL,
        severity,
        description: `Overall grade ${overallGrade} above expected range ${calibrationDeck.expected_grade_range.join('-')}`,
        expected_value: calibrationDeck.expected_grade_range.join('-'),
        actual_value: overallGrade,
      })
    }
  }

  return flags
}

/**
 * Check for excessive signal override lifting.
 */
function checkSignalOverrideExcessive(signalOverrideDebug, calibrationDeck) {
  const flags = []

  if (!signalOverrideDebug) return flags

  const slidesLifted = signalOverrideDebug.summary?.slides_grade_lifted || 0
  const totalSlides = signalOverrideDebug.summary?.slides_processed || 1

  // Flag if more than 50% of slides were lifted
  if (slidesLifted > totalSlides * 0.5) {
    flags.push({
      flag_type: FLAG_TYPES.SIGNAL_OVERRIDE_EXCESSIVE,
      severity: 'warning',
      description: `Signal override lifted ${slidesLifted}/${totalSlides} slides (${Math.round(slidesLifted/totalSlides*100)}%)`,
      expected_value: 'Less than 50% of slides lifted',
      actual_value: `${slidesLifted}/${totalSlides} (${Math.round(slidesLifted/totalSlides*100)}%)`,
      metadata: {
        slides_lifted: slidesLifted,
        total_slides: totalSlides,
        percentage: Math.round(slidesLifted/totalSlides*100),
      }
    })
  }

  return flags
}

// =============================================================================
// HARSHNESS CHECKS
// =============================================================================

/**
 * Check if sparse iconic deck is under-scored.
 */
function checkSparseUnderScored(overallGrade, calibrationDeck) {
  const flags = []

  if (calibrationDeck?.era !== 'sparse_classic') return flags

  if (calibrationDeck?.expected_grade_range) {
    const minExpected = calibrationDeck.expected_grade_range[0]
    if (isGradeBelow(overallGrade, minExpected)) {
      flags.push({
        flag_type: FLAG_TYPES.SPARSE_DECK_UNDER_SCORED,
        severity: 'error',
        description: `Sparse iconic deck scored ${overallGrade}, below expected minimum ${minExpected}`,
        expected_value: calibrationDeck.expected_grade_range.join('-'),
        actual_value: overallGrade,
      })
    }
  }

  // Also flag if below C for any iconic sparse deck
  if (isGradeBelow(overallGrade, 'C')) {
    flags.push({
      flag_type: FLAG_TYPES.SPARSE_DECK_UNDER_SCORED,
      severity: 'error',
      description: `Sparse iconic deck ${calibrationDeck.company} scored below C (${overallGrade})`,
      expected_value: 'C or above',
      actual_value: overallGrade,
    })
  }

  return flags
}

/**
 * Check if founder-market fit is under-weighted.
 */
function checkFounderFitUnderWeighted(slideEvals, signalOverrideDebug, calibrationDeck) {
  const flags = []

  // Check if founder-market fit signals were detected but not reflected in team grade
  const teamSlide = slideEvals.find(s => s.type === 'team')
  if (!teamSlide) return flags

  const founderSignalsDetected = signalOverrideDebug?.deck_signal_analysis?.signals_by_type?.founder_market_fit

  if (founderSignalsDetected && founderSignalsDetected.length > 0) {
    if (isGradeBelow(teamSlide.grade, 'B-')) {
      flags.push({
        flag_type: FLAG_TYPES.FOUNDER_FIT_UNDER_WEIGHTED,
        severity: 'warning',
        slide_number: teamSlide.slide_number,
        slide_type: 'team',
        description: `Founder-market fit signals detected but team grade is ${teamSlide.grade}`,
        expected_value: 'B- or above with founder-market fit signals',
        actual_value: teamSlide.grade,
        metadata: {
          signals_detected: founderSignalsDetected.map(s => s.match),
        }
      })
    }
  }

  return flags
}

/**
 * Check if timing insight is ignored.
 */
function checkTimingIgnored(slideEvals, signalOverrideDebug, calibrationDeck) {
  const flags = []

  const timingSignals = signalOverrideDebug?.deck_signal_analysis?.signals_by_type?.timing_insight
  const infraSignals = signalOverrideDebug?.deck_signal_analysis?.signals_by_type?.infrastructure_shift

  if ((timingSignals?.length > 0 || infraSignals?.length > 0) && calibrationDeck?.strengths?.includes('timing')) {
    // Check market or why_now slide
    const marketSlide = slideEvals.find(s => s.type === 'market')
    const whyNowSlide = slideEvals.find(s => s.type === 'why_now')

    const relevantSlide = whyNowSlide || marketSlide
    if (relevantSlide && isGradeBelow(relevantSlide.grade, 'B-')) {
      flags.push({
        flag_type: FLAG_TYPES.TIMING_IGNORED,
        severity: 'warning',
        slide_number: relevantSlide.slide_number,
        slide_type: relevantSlide.type,
        description: `Timing signals detected but ${relevantSlide.type} grade is ${relevantSlide.grade}`,
        expected_value: 'B- or above with timing signals',
        actual_value: relevantSlide.grade,
      })
    }
  }

  return flags
}

// =============================================================================
// GENERIC FEEDBACK CHECKS
// =============================================================================

/**
 * Check for excessive generic feedback across all slides.
 */
function checkGenericFeedback(slideEvals, calibrationDeck) {
  const flags = []
  const genericCounts = {}
  const slideGenericCounts = []

  for (const slide of slideEvals) {
    let slideGenericCount = 0

    for (const q of slide.questions || []) {
      const fix = q.fix || ''

      for (const { pattern, type } of GENERIC_FEEDBACK_PATTERNS) {
        if (pattern.test(fix)) {
          genericCounts[type] = (genericCounts[type] || 0) + 1
          slideGenericCount++
        }
      }
    }

    slideGenericCounts.push({
      slide_number: slide.slide_number,
      slide_type: slide.type,
      generic_count: slideGenericCount,
    })
  }

  // Count total generic feedback
  const totalGeneric = Object.values(genericCounts).reduce((a, b) => a + b, 0)
  const totalQuestions = slideEvals.reduce((sum, s) => sum + (s.questions?.length || 0), 0)

  // Flag if more than 30% of feedback is generic
  if (totalQuestions > 0 && totalGeneric / totalQuestions > 0.3) {
    flags.push({
      flag_type: FLAG_TYPES.GENERIC_FEEDBACK_EXCESSIVE,
      severity: 'warning',
      description: `${totalGeneric}/${totalQuestions} fixes (${Math.round(totalGeneric/totalQuestions*100)}%) contain generic feedback`,
      expected_value: 'Less than 30% generic feedback',
      actual_value: `${Math.round(totalGeneric/totalQuestions*100)}%`,
      metadata: {
        generic_counts: genericCounts,
        total_generic: totalGeneric,
        total_questions: totalQuestions,
        by_slide: slideGenericCounts.filter(s => s.generic_count > 0),
      }
    })
  }

  // Flag specific repetitive patterns
  for (const [type, count] of Object.entries(genericCounts)) {
    if (count >= 3) {
      const flagType = type === 'add_metrics' ? FLAG_TYPES.REPETITIVE_ADD_METRICS :
                       type === 'clarify_differentiation' ? FLAG_TYPES.REPETITIVE_CLARIFY_DIFFERENTIATION :
                       type === 'expand_market' ? FLAG_TYPES.REPETITIVE_EXPAND_MARKET :
                       FLAG_TYPES.GENERIC_FEEDBACK_EXCESSIVE

      flags.push({
        flag_type: flagType,
        severity: 'info',
        description: `Generic feedback pattern "${type}" repeated ${count} times`,
        metadata: { pattern_type: type, count },
      })
    }
  }

  return flags
}

// =============================================================================
// MUST-NOT-HAPPEN CHECKS
// =============================================================================

/**
 * Check if any must_not_happen conditions are violated.
 */
function checkMustNotHappen(overallGrade, slideEvals, calibrationDeck) {
  const flags = []

  if (!calibrationDeck?.must_not_happen) return flags

  for (const condition of calibrationDeck.must_not_happen) {
    let violated = false
    let description = ''

    if (condition === 'overall_grade_below_C' && isGradeBelow(overallGrade, 'C')) {
      violated = true
      description = `Overall grade ${overallGrade} is below C`
    }

    if (condition === 'overall_grade_above_C+' && isGradeAbove(overallGrade, 'C+')) {
      violated = true
      description = `Overall grade ${overallGrade} is above C+`
    }

    if (condition === 'overall_grade_below_B-' && isGradeBelow(overallGrade, 'B-')) {
      violated = true
      description = `Overall grade ${overallGrade} is below B-`
    }

    if (condition === 'overall_grade_below_B' && isGradeBelow(overallGrade, 'B')) {
      violated = true
      description = `Overall grade ${overallGrade} is below B`
    }

    if (condition === 'overall_grade_A' && overallGrade === 'A') {
      violated = true
      description = 'Overall grade is A (should not happen for this deck)'
    }

    if (condition === 'business_model_grade_A') {
      const bizModel = slideEvals.find(s => s.type === 'business_model')
      if (bizModel && bizModel.grade === 'A') {
        violated = true
        description = 'Business model grade is A (should not happen)'
      }
    }

    if (condition === 'competition_grade_A') {
      const comp = slideEvals.find(s => s.type === 'competition')
      if (comp && comp.grade === 'A') {
        violated = true
        description = 'Competition grade is A (should not happen)'
      }
    }

    if (condition === 'generic_feedback_excessive') {
      // This is checked separately
    }

    if (condition === 'competition_grade_A_without_moat') {
      const comp = slideEvals.find(s => s.type === 'competition')
      if (comp && comp.grade === 'A') {
        const hasMoat = comp.questions?.some(q => q.score >= 4 && /moat|defensib/i.test(q.question))
        if (!hasMoat) {
          violated = true
          description = 'Competition grade is A without clear moat evidence'
        }
      }
    }

    if (violated) {
      flags.push({
        flag_type: FLAG_TYPES.MUST_NOT_HAPPEN_VIOLATED,
        severity: 'error',
        description,
        expected_value: `Condition "${condition}" should not occur`,
        actual_value: 'Condition violated',
        metadata: { condition },
      })
    }
  }

  return flags
}

// =============================================================================
// RANGE CHECK
// =============================================================================

/**
 * Check if overall grade is within expected range.
 */
function checkExpectedRange(overallGrade, calibrationDeck) {
  const flags = []

  if (!calibrationDeck?.expected_grade_range) return flags

  if (!isGradeInRange(overallGrade, calibrationDeck.expected_grade_range)) {
    const isAbove = isGradeAbove(overallGrade, calibrationDeck.expected_grade_range[1])
    flags.push({
      flag_type: FLAG_TYPES.OUTSIDE_EXPECTED_RANGE,
      severity: 'warning',
      description: `Overall grade ${overallGrade} is ${isAbove ? 'above' : 'below'} expected range ${calibrationDeck.expected_grade_range.join('-')}`,
      expected_value: calibrationDeck.expected_grade_range.join('-'),
      actual_value: overallGrade,
      metadata: {
        direction: isAbove ? 'above' : 'below',
      }
    })
  }

  return flags
}

// =============================================================================
// MAIN QA FUNCTION
// =============================================================================

/**
 * Run all QA checks on an evaluation result.
 */
function runQAChecks(evaluationResult, calibrationDeck, signalOverrideDebug) {
  const flags = []

  const overallGrade = evaluationResult.overall_grade || evaluationResult.grade
  const slideEvals = evaluationResult.slides || evaluationResult.slide_evaluations || []

  // Inflation checks
  flags.push(...checkInflatedBusinessModel(slideEvals, calibrationDeck))
  flags.push(...checkInflatedCompetition(slideEvals, calibrationDeck))
  flags.push(...checkInflatedTraction(slideEvals, calibrationDeck))
  flags.push(...checkInflatedOverall(overallGrade, calibrationDeck, signalOverrideDebug))
  flags.push(...checkSignalOverrideExcessive(signalOverrideDebug, calibrationDeck))

  // Harshness checks
  flags.push(...checkSparseUnderScored(overallGrade, calibrationDeck))
  flags.push(...checkFounderFitUnderWeighted(slideEvals, signalOverrideDebug, calibrationDeck))
  flags.push(...checkTimingIgnored(slideEvals, signalOverrideDebug, calibrationDeck))

  // Generic feedback checks
  flags.push(...checkGenericFeedback(slideEvals, calibrationDeck))

  // Must-not-happen checks
  flags.push(...checkMustNotHappen(overallGrade, slideEvals, calibrationDeck))

  // Range check
  flags.push(...checkExpectedRange(overallGrade, calibrationDeck))

  return flags
}

/**
 * Summarize flags by type.
 */
function summarizeFlags(flags) {
  const summary = {
    total: flags.length,
    by_severity: {},
    by_type: {},
    errors: [],
    warnings: [],
    info: [],
  }

  for (const flag of flags) {
    // By severity
    summary.by_severity[flag.severity] = (summary.by_severity[flag.severity] || 0) + 1

    // By type
    summary.by_type[flag.flag_type] = (summary.by_type[flag.flag_type] || 0) + 1

    // Categorize
    if (flag.severity === 'error') {
      summary.errors.push(flag.description)
    } else if (flag.severity === 'warning') {
      summary.warnings.push(flag.description)
    } else {
      summary.info.push(flag.description)
    }
  }

  return summary
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  runQAChecks,
  summarizeFlags,
  FLAG_TYPES,
  GENERIC_FEEDBACK_PATTERNS,

  // Individual checks (for testing)
  checkInflatedBusinessModel,
  checkInflatedCompetition,
  checkInflatedTraction,
  checkInflatedOverall,
  checkSignalOverrideExcessive,
  checkSparseUnderScored,
  checkFounderFitUnderWeighted,
  checkTimingIgnored,
  checkGenericFeedback,
  checkMustNotHappen,
  checkExpectedRange,

  // Utilities
  gradeToValue,
  isGradeInRange,
  isGradeAbove,
  isGradeBelow,
}
