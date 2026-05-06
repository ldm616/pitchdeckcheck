/**
 * Investor Signal Override System
 *
 * Post-rubric adjustment layer that detects when underlying investor signal
 * is materially stronger than raw rubric deductions imply.
 *
 * Prevents sparse high-signal seed decks from collapsing into D/C ranges
 * solely due to missing modern startup metrics.
 *
 * Evaluates investor signal quality, not compliance with modern deck conventions.
 */

// Module load confirmation
console.log('[signal-override] ****************************************************')
console.log('[signal-override] SIGNAL OVERRIDE MODULE LOADED')
console.log('[signal-override] ****************************************************')

// Signal patterns to detect in slide text
const SIGNAL_PATTERNS = {
  // Strong behavioral insight - understanding of user behavior/psychology
  behavioral_insight: [
    /users? (want|need|crave|desire|love|hate|struggle|spend|waste)/i,
    /behavior(al)? (shift|change|pattern)/i,
    /people (are|have been|started) (watching|sharing|uploading|creating)/i,
    /consumption (pattern|habit|behavior)/i,
    /user (habit|addiction|engagement|retention)/i,
    /(viral|organic) (growth|spread|adoption)/i,
    /word[- ]of[- ]mouth/i,
    /users? (tell|invite|share with) (friends|others)/i,
  ],

  // Strong timing insight - why now is the right moment
  timing_insight: [
    /now (is|becoming|possible|feasible)/i,
    /(first time|finally|just became) (possible|feasible|affordable)/i,
    /cost (of|for).*(dropped|decreased|fell|declining)/i,
    /broadband (penetration|adoption|availability)/i,
    /infrastructure (ready|available|mature|widespread)/i,
    /(smartphone|mobile|internet) (adoption|penetration|ubiquity)/i,
    /tipping point/i,
    /inflection point/i,
    /window (of opportunity|closing)/i,
    /(technology|platform) (shift|change|transition)/i,
  ],

  // Infrastructure shift - new enabling technology/platform
  infrastructure_shift: [
    /broadband/i,
    /smartphone/i,
    /cloud (computing|infrastructure)/i,
    /api[s]? (enable|allow|make possible)/i,
    /platform (shift|change|emergence)/i,
    /(new|emerging) (infrastructure|platform|technology)/i,
    /flash (video|player|adoption)/i,
    /streaming (technology|capability)/i,
    /bandwidth (increase|improvement|availability)/i,
    /processing (power|capability) (increase|improvement)/i,
  ],

  // Clear consumer pain - obvious user problem
  consumer_pain: [
    /(frustrat|annoy|hate|difficult|hard|painful|tedious|slow|expensive)/i,
    /problem (is|with|for)/i,
    /pain (point|of)/i,
    /waste (time|money|effort)/i,
    /(no|lack of) (good|easy|simple) (way|option|solution)/i,
    /current (solution|option|alternative)s? (are|is) (bad|poor|inadequate)/i,
    /users? (struggle|have trouble|can't easily)/i,
  ],

  // Network effect potential - platform/marketplace dynamics
  network_effect: [
    /network effect/i,
    /more users?.*(more|better) (content|value|utility)/i,
    /more (content|creators|sellers).*(more|attract) (users|buyers|viewers)/i,
    /flywheel/i,
    /virtuous (cycle|circle)/i,
    /marketplace (dynamics|effect)/i,
    /two[- ]sided (market|platform|network)/i,
    /platform (effect|dynamics)/i,
    /user[- ]generated (content|value)/i,
    /community[- ]driven/i,
  ],

  // Product simplicity - clear, focused value prop
  product_simplicity: [
    /simple|easy|one[- ]click|instant|free/i,
    /just (upload|share|watch|click|sign up)/i,
    /anyone can/i,
    /no (download|install|software|cost) (required|needed)/i,
    /(upload|share|watch|create) (anything|videos?|content)/i,
    /frictionless/i,
    /intuitive/i,
    /self[- ]explanatory/i,
  ],

  // Founder-market fit signals
  founder_market_fit: [
    /founder[s]? (from|worked at|built|created|led)/i,
    /years? (of|in) (experience|industry|domain)/i,
    /previously (built|founded|led|created)/i,
    /domain expert/i,
    /insider (knowledge|experience|access)/i,
    /(paypal|google|facebook|amazon|apple|microsoft) (alum|veteran|founder)/i,
    /serial entrepreneur/i,
    /technical (founder|co-founder|team)/i,
  ],

  // Sparse but sharp communication
  sparse_sharp: [
    // Detected by brevity + clarity metrics, not regex
  ],

  // Historical pattern recognition (consumer viral growth)
  viral_growth_pattern: [
    /viral/i,
    /exponential (growth|adoption)/i,
    /hockey[- ]stick/i,
    /(rapid|explosive|massive) (growth|adoption|spread)/i,
    /growing (fast|rapidly|exponentially)/i,
    /doubl(e|ing) (every|each)/i,
    /million (users|views|downloads)/i,
    /organic (growth|adoption|spread)/i,
  ],
}

// Slide types that benefit from signal override (core thesis slides)
const SIGNAL_OVERRIDE_ELIGIBLE_SLIDES = [
  'problem',
  'solution',
  'market',
  'traction',
  'team',
  'product',
]

// Score floors based on signal strength
// If a slide has strong signals, it cannot score below this floor
const SIGNAL_SCORE_FLOORS = {
  exceptional: 4.0, // Multiple strong signals = minimum B+
  strong: 3.5,      // Clear signal present = minimum B-
  moderate: 3.0,    // Some signal detected = minimum C+
}

// Grade floors (letter grade equivalent)
const SIGNAL_GRADE_FLOORS = {
  exceptional: 'B',
  strong: 'B',
  moderate: 'C',
}

// Fixes to suppress for seed consumer/network decks
const SUPPRESSED_FIX_PATTERNS = [
  // CAC/LTV metrics
  /\b(CAC|LTV|customer acquisition cost|lifetime value|payback period)\b/i,
  /\b(unit economics|contribution margin)\b/i,

  // Detailed pricing
  /\b(pricing (model|strategy|detail|breakdown)|price point|monetization detail)\b/i,
  /\b(revenue per user|ARPU|average revenue)\b/i,

  // Detailed moat articulation
  /\b(defensib|moat|barrier to entry|competitive advantage) (detail|breakdown|articulation)\b/i,
  /\b(patent|intellectual property|IP) (portfolio|strategy)\b/i,

  // Advanced PMF analytics
  /\b(product[- ]market fit (score|metric|measurement))\b/i,
  /\b(NPS|net promoter|cohort analysis|retention curve)\b/i,
  /\b(churn (rate|analysis)|DAU\/MAU)\b/i,

  // Enterprise/SaaS specific
  /\b(sales cycle|enterprise (sales|deal)|contract value|ACV)\b/i,
  /\b(pipeline|quota|sales team)\b/i,

  // Detailed financial projections
  /\b(detailed (financial|revenue) projection|5[- ]year (plan|projection))\b/i,
  /\b(burn rate|runway calculation)\b/i,
]

/**
 * Detect signals in slide text.
 * Returns array of detected signal types with match details.
 */
function detectSignals(slideText, slideType) {
  if (!slideText || typeof slideText !== 'string') {
    return { signals: [], signalCount: 0, signalStrength: 'none' }
  }

  const textLower = slideText.toLowerCase()
  const signals = []

  for (const [signalType, patterns] of Object.entries(SIGNAL_PATTERNS)) {
    if (signalType === 'sparse_sharp') continue // Handled separately

    for (const pattern of patterns) {
      const match = slideText.match(pattern)
      if (match) {
        signals.push({
          type: signalType,
          match: match[0],
          pattern: pattern.toString(),
        })
        break // One match per signal type is enough
      }
    }
  }

  // Detect sparse-but-sharp communication
  // Short text that hits key points = high signal density
  const wordCount = slideText.split(/\s+/).length
  const signalDensity = signals.length / Math.max(1, wordCount / 50)

  if (wordCount < 150 && signals.length >= 2 && signalDensity > 0.3) {
    signals.push({
      type: 'sparse_sharp',
      match: `${wordCount} words, ${signals.length} signals, density ${signalDensity.toFixed(2)}`,
      pattern: 'brevity + signal density',
    })
  }

  // Determine overall signal strength
  let signalStrength = 'none'
  if (signals.length >= 4) {
    signalStrength = 'exceptional'
  } else if (signals.length >= 2) {
    signalStrength = 'strong'
  } else if (signals.length >= 1) {
    signalStrength = 'moderate'
  }

  return {
    signals,
    signalCount: signals.length,
    signalStrength,
  }
}

/**
 * Detect deck-wide signals across all slides.
 * Some signals are cumulative (e.g., timing + infrastructure = stronger).
 */
function detectDeckSignals(slides) {
  const allSignals = []
  const signalsByType = {}
  const signalsBySlide = {}

  for (const slide of slides) {
    const slideSignals = detectSignals(slide.extracted_text, slide.inferred_type)
    signalsBySlide[slide.slide_number] = slideSignals

    for (const signal of slideSignals.signals) {
      allSignals.push({ ...signal, slide_number: slide.slide_number })
      if (!signalsByType[signal.type]) {
        signalsByType[signal.type] = []
      }
      signalsByType[signal.type].push(slide.slide_number)
    }
  }

  // Check for synergistic signal combinations
  const synergies = []

  // Timing + Infrastructure = very strong why-now
  if (signalsByType.timing_insight && signalsByType.infrastructure_shift) {
    synergies.push({
      name: 'timing_infrastructure_synergy',
      description: 'Clear timing insight combined with infrastructure shift',
      boost: 0.3,
    })
  }

  // Behavioral insight + Network effect = viral potential
  if (signalsByType.behavioral_insight && signalsByType.network_effect) {
    synergies.push({
      name: 'viral_potential_synergy',
      description: 'Behavioral understanding + network effect potential',
      boost: 0.3,
    })
  }

  // Consumer pain + Product simplicity = clear value prop
  if (signalsByType.consumer_pain && signalsByType.product_simplicity) {
    synergies.push({
      name: 'clear_value_prop_synergy',
      description: 'Clear pain point + simple solution',
      boost: 0.2,
    })
  }

  // Founder-market fit + any domain signal = team strength
  if (signalsByType.founder_market_fit && Object.keys(signalsByType).length > 1) {
    synergies.push({
      name: 'founder_fit_synergy',
      description: 'Strong founder-market fit with domain signals',
      boost: 0.2,
    })
  }

  // Determine overall deck signal strength
  const uniqueSignalTypes = Object.keys(signalsByType).length
  let deckSignalStrength = 'none'
  if (uniqueSignalTypes >= 5 || (uniqueSignalTypes >= 3 && synergies.length >= 2)) {
    deckSignalStrength = 'exceptional'
  } else if (uniqueSignalTypes >= 3 || synergies.length >= 1) {
    deckSignalStrength = 'strong'
  } else if (uniqueSignalTypes >= 2) {
    deckSignalStrength = 'moderate'
  }

  return {
    allSignals,
    signalsByType,
    signalsBySlide,
    synergies,
    uniqueSignalTypes,
    deckSignalStrength,
  }
}

/**
 * Apply signal override to a single slide evaluation.
 * Returns adjusted score and debug info.
 */
function applySlideSignalOverride(slideEval, slideSignals, deckSignals, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  const originalScore = slideEval.normalized_score
  const originalGrade = slideEval.grade
  const slideType = slideEval.type

  // Check if slide is eligible for override
  if (!SIGNAL_OVERRIDE_ELIGIBLE_SLIDES.includes(slideType)) {
    return {
      adjusted: false,
      reason: 'Slide type not eligible for signal override',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
    }
  }

  const signalStrength = slideSignals.signalStrength
  const deckStrength = deckSignals.deckSignalStrength

  // Use stronger of slide signal or deck signal (with dampening)
  let effectiveStrength = signalStrength
  if (deckStrength === 'exceptional' && signalStrength !== 'exceptional') {
    // Deck-level exceptional signals can lift slides to at least 'moderate'
    effectiveStrength = signalStrength === 'none' ? 'moderate' : signalStrength
  } else if (deckStrength === 'strong' && signalStrength === 'none') {
    effectiveStrength = 'moderate'
  }

  if (effectiveStrength === 'none') {
    return {
      adjusted: false,
      reason: 'No investor signals detected',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      signalsDetected: [],
    }
  }

  // Get the score floor for this signal strength
  const scoreFloor = SIGNAL_SCORE_FLOORS[effectiveStrength]
  const gradeFloor = SIGNAL_GRADE_FLOORS[effectiveStrength]

  // Check if override is needed
  // Convert normalized score (0-1) to 5-point scale for comparison
  const scoreOn5Scale = originalScore * 5

  if (scoreOn5Scale >= scoreFloor) {
    return {
      adjusted: false,
      reason: `Score ${scoreOn5Scale.toFixed(2)} already meets floor ${scoreFloor}`,
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      signalsDetected: slideSignals.signals.map(s => s.type),
      signalStrength: effectiveStrength,
    }
  }

  // Apply the floor
  const adjustedScoreOn5Scale = scoreFloor
  const adjustedNormalized = adjustedScoreOn5Scale / 5
  const liftAmount = adjustedScoreOn5Scale - scoreOn5Scale

  // Calculate synergy bonus from deck-level signals
  let synergyBoost = 0
  for (const synergy of deckSignals.synergies) {
    synergyBoost += synergy.boost
  }
  // Cap synergy boost at 0.5
  synergyBoost = Math.min(0.5, synergyBoost)

  // Apply synergy boost (but don't exceed 4.5 = A-)
  const finalScoreOn5Scale = Math.min(4.5, adjustedScoreOn5Scale + synergyBoost)
  const finalNormalized = finalScoreOn5Scale / 5

  // Determine final grade
  let adjustedGrade
  if (finalNormalized >= 0.85) adjustedGrade = 'A'
  else if (finalNormalized >= 0.70) adjustedGrade = 'B'
  else if (finalNormalized >= 0.55) adjustedGrade = 'C'
  else if (finalNormalized >= 0.40) adjustedGrade = 'D'
  else adjustedGrade = 'E'

  return {
    adjusted: true,
    reason: `Signal override applied: ${effectiveStrength} signals lifted score from ${scoreOn5Scale.toFixed(2)} to ${finalScoreOn5Scale.toFixed(2)}`,
    originalScore,
    originalScoreOn5Scale: scoreOn5Scale,
    adjustedScore: finalNormalized,
    adjustedScoreOn5Scale: finalScoreOn5Scale,
    originalGrade,
    adjustedGrade,
    liftAmount: finalScoreOn5Scale - scoreOn5Scale,
    signalsDetected: slideSignals.signals.map(s => s.type),
    signalStrength: effectiveStrength,
    deckSignalStrength: deckStrength,
    synergyBoost,
    synergiesApplied: deckSignals.synergies.map(s => s.name),
    floor: scoreFloor,
    gradeFloor,
  }
}

/**
 * Suppress inappropriate fixes for seed consumer/network decks.
 * Returns filtered questions array with fixes cleaned up.
 */
function suppressInappropriateFixesForSlide(questions, slideType, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  if (!isSeedConsumerNetwork) {
    return { questions, suppressedCount: 0, suppressedFixes: [] }
  }

  const suppressedFixes = []
  let suppressedCount = 0

  const filteredQuestions = questions.map(q => {
    if (!q.fix || q.fix === 'None needed') {
      return q
    }

    // Check if fix matches suppression patterns
    for (const pattern of SUPPRESSED_FIX_PATTERNS) {
      if (pattern.test(q.fix)) {
        suppressedCount++
        suppressedFixes.push({
          question: q.question,
          originalFix: q.fix,
          pattern: pattern.toString(),
        })

        // Replace with stage-appropriate guidance
        return {
          ...q,
          fix: 'For seed-stage consumer/network companies, focus on demonstrating user traction and engagement rather than detailed unit economics.',
          fix_suppressed: true,
          original_fix: q.fix,
        }
      }
    }

    return q
  })

  return {
    questions: filteredQuestions,
    suppressedCount,
    suppressedFixes,
  }
}

/**
 * Main entry point: Apply signal override adjustment to all slide evaluations.
 *
 * @param {Object[]} slides - Raw slide data with extracted_text
 * @param {Object[]} slideEvaluations - Evaluated slides with scores/grades
 * @param {Object} options - Configuration options
 * @returns {Object} - Adjusted evaluations with debug info
 */
function applySignalOverride(slides, slideEvaluations, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  console.log('[signal-override] ========================================')
  console.log('[signal-override] *** applySignalOverride ENTRY POINT ***')
  console.log('[signal-override] ========================================')
  console.log(`[signal-override] Timestamp: ${new Date().toISOString()}`)
  console.log(`[signal-override] isSeedConsumerNetwork: ${isSeedConsumerNetwork}`)
  console.log(`[signal-override] Input slides count: ${slides.length}`)
  console.log(`[signal-override] Input evaluations count: ${slideEvaluations.length}`)

  // Log input slide types and grades
  console.log('[signal-override] --- INPUT SLIDE GRADES (BEFORE OVERRIDE) ---')
  for (const se of slideEvaluations) {
    console.log(`[signal-override]   Slide ${se.slide_number} (${se.type}): grade=${se.grade}, normalized=${se.normalized_score?.toFixed(3) || 'N/A'}`)
  }

  // Detect deck-wide signals
  console.log('[signal-override] --- DETECTING DECK SIGNALS ---')
  const deckSignals = detectDeckSignals(slides)
  console.log(`[signal-override] Deck signal strength: ${deckSignals.deckSignalStrength}`)
  console.log(`[signal-override] Unique signal types: ${deckSignals.uniqueSignalTypes}`)
  console.log(`[signal-override] Signal types found: ${Object.keys(deckSignals.signalsByType).join(', ') || 'NONE'}`)
  console.log(`[signal-override] Synergies detected: ${deckSignals.synergies.length}`)
  if (deckSignals.synergies.length > 0) {
    for (const syn of deckSignals.synergies) {
      console.log(`[signal-override]   - ${syn.name}: ${syn.description} (+${syn.boost})`)
    }
  }

  // Log signals per slide
  console.log('[signal-override] --- SIGNALS PER SLIDE ---')
  for (const slideNum of Object.keys(deckSignals.signalsBySlide)) {
    const ss = deckSignals.signalsBySlide[slideNum]
    console.log(`[signal-override]   Slide ${slideNum}: ${ss.signalCount} signals (strength: ${ss.signalStrength})`)
    if (ss.signals.length > 0) {
      for (const sig of ss.signals) {
        console.log(`[signal-override]     - ${sig.type}: "${sig.match}"`)
      }
    }
  }

  // Process each slide
  console.log('[signal-override] --- PROCESSING SLIDES FOR OVERRIDE ---')
  const adjustedEvaluations = []
  const overrideResults = []
  let totalLifted = 0
  let totalSuppressedFixes = 0
  const beforeAfterSummary = []

  for (const slideEval of slideEvaluations) {
    const slideData = slides.find(s => s.slide_number === slideEval.slide_number)
    const slideSignals = deckSignals.signalsBySlide[slideEval.slide_number] || {
      signals: [],
      signalCount: 0,
      signalStrength: 'none',
    }

    // Check eligibility
    const isEligible = SIGNAL_OVERRIDE_ELIGIBLE_SLIDES.includes(slideEval.type)
    console.log(`[signal-override] Slide ${slideEval.slide_number} (${slideEval.type}): eligible=${isEligible}, signals=${slideSignals.signalCount}, strength=${slideSignals.signalStrength}`)

    // Apply signal override
    const overrideResult = applySlideSignalOverride(slideEval, slideSignals, deckSignals, options)
    overrideResults.push({
      slide_number: slideEval.slide_number,
      slide_type: slideEval.type,
      ...overrideResult,
    })

    // Track before/after
    beforeAfterSummary.push({
      slide: slideEval.slide_number,
      type: slideEval.type,
      eligible: isEligible,
      signals: slideSignals.signalCount,
      before_grade: overrideResult.originalGrade,
      after_grade: overrideResult.adjustedGrade,
      changed: overrideResult.adjusted,
      reason: overrideResult.reason,
    })

    if (overrideResult.adjusted) {
      totalLifted++
      console.log(`[signal-override]   >>> LIFTED: ${overrideResult.originalGrade} -> ${overrideResult.adjustedGrade} (lift: +${overrideResult.liftAmount.toFixed(2)})`)
    } else {
      console.log(`[signal-override]   No change: ${overrideResult.reason}`)
    }

    // Suppress inappropriate fixes
    const { questions, suppressedCount, suppressedFixes } = suppressInappropriateFixesForSlide(
      slideEval.questions,
      slideEval.type,
      options
    )
    totalSuppressedFixes += suppressedCount

    if (suppressedCount > 0) {
      console.log(`[signal-override]   Suppressed ${suppressedCount} fix(es):`)
      for (const sf of suppressedFixes) {
        console.log(`[signal-override]     - "${sf.originalFix.slice(0, 60)}..."`)
      }
    }

    // Build adjusted evaluation
    const adjusted = {
      ...slideEval,
      // Update score/grade if override was applied
      grade: overrideResult.adjustedGrade,
      normalized_score: overrideResult.adjustedScore,
      questions,
      // Preserve original for debug
      _original_grade: overrideResult.originalGrade,
      _original_score: overrideResult.originalScore,
      _signal_override_applied: overrideResult.adjusted,
    }

    adjustedEvaluations.push(adjusted)
  }

  // Final summary
  console.log('[signal-override] --- OVERRIDE SUMMARY ---')
  console.log(`[signal-override] Total slides processed: ${slideEvaluations.length}`)
  console.log(`[signal-override] Total slides LIFTED: ${totalLifted}`)
  console.log(`[signal-override] Total fixes SUPPRESSED: ${totalSuppressedFixes}`)
  console.log('[signal-override] Before/After:')
  for (const ba of beforeAfterSummary) {
    const marker = ba.changed ? '>>>' : '   '
    console.log(`[signal-override] ${marker} Slide ${ba.slide} (${ba.type}): ${ba.before_grade} -> ${ba.after_grade} [${ba.reason}]`)
  }
  console.log('[signal-override] ========================================')

  // Build human-readable status message
  const slidesChangedList = beforeAfterSummary
    .filter(s => s.changed)
    .map(s => `Slide ${s.slide} (${s.type}): ${s.before_grade} → ${s.after_grade}`)

  const statusMessage = totalLifted > 0
    ? `Signal override ACTIVE: lifted ${totalLifted} slide(s), suppressed ${totalSuppressedFixes} fix(es)`
    : `Signal override ran but made NO changes (${slideEvaluations.length} slides processed, ${deckSignals.deckSignalStrength} deck signal strength)`

  // Build debug output
  const debug = {
    // ===== CONFIRMATION SECTION =====
    // This confirms signal override ran and what it did
    status: statusMessage,
    signal_override_executed: true,
    executed_at: new Date().toISOString(),

    // Quick summary
    summary: {
      any_changes_made: totalLifted > 0 || totalSuppressedFixes > 0,
      slides_processed: slideEvaluations.length,
      slides_eligible_for_override: slideEvaluations.filter(s => SIGNAL_OVERRIDE_ELIGIBLE_SLIDES.includes(s.type)).length,
      slides_grade_lifted: totalLifted,
      fixes_suppressed: totalSuppressedFixes,
      slides_changed: slidesChangedList,
    },

    // Deck-level signal detection results
    deck_signal_analysis: {
      overall_strength: deckSignals.deckSignalStrength,
      unique_signal_types_found: deckSignals.uniqueSignalTypes,
      signal_types: Object.keys(deckSignals.signalsByType),
      synergies_detected: deckSignals.synergies.map(s => s.name),
      all_signals_found: deckSignals.allSignals.map(s => ({
        slide: s.slide_number,
        signal_type: s.type,
        matched_text: s.match,
      })),
    },

    // Before/After for every slide
    slide_by_slide: beforeAfterSummary.map(s => ({
      slide_number: s.slide,
      slide_type: s.type,
      eligible_for_override: s.eligible,
      signals_detected: s.signals,
      grade_before: s.before_grade,
      grade_after: s.after_grade,
      was_changed: s.changed,
      reason: s.reason,
    })),

    // Detailed override results (for deep debugging)
    detailed_overrides: overrideResults,

    // Configuration that was used
    config: {
      is_seed_consumer_network: isSeedConsumerNetwork,
      eligible_slide_types: SIGNAL_OVERRIDE_ELIGIBLE_SLIDES,
      score_floors: SIGNAL_SCORE_FLOORS,
      grade_floors: SIGNAL_GRADE_FLOORS,
    },
  }

  return {
    adjustedEvaluations,
    debug,
    totalLifted,
    totalSuppressedFixes,
  }
}

module.exports = {
  detectSignals,
  detectDeckSignals,
  applySlideSignalOverride,
  suppressInappropriateFixesForSlide,
  applySignalOverride,
  SIGNAL_PATTERNS,
  SIGNAL_SCORE_FLOORS,
  SIGNAL_GRADE_FLOORS,
  SUPPRESSED_FIX_PATTERNS,
}
