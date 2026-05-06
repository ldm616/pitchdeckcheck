/**
 * Rubric-based slide evaluation - single source of truth.
 * Used for both free and paid reports.
 *
 * Each question has:
 * - id: unique identifier
 * - question: the investor question being evaluated
 * - weight: scoring weight (higher = more impact on slide grade)
 * - importance: display priority (1 = highest, shown first)
 */

const RUBRIC_VERSION = 'rubric_v2_2026_05_04'

const RUBRICS = {
  problem: [
    { id: 'problem_01', question: 'Is the problem specific and concrete?', weight: 1.3, importance: 1 },
    { id: 'problem_02', question: 'Is severity or frequency demonstrated?', weight: 1.2, importance: 2 },
    { id: 'problem_03', question: 'Is the target user clearly defined?', weight: 1.0, importance: 3 },
    { id: 'problem_04', question: 'Is the current alternative mentioned?', weight: 0.8, importance: 4 },
  ],

  solution: [
    { id: 'solution_01', question: 'Is differentiation evident?', weight: 1.3, importance: 1 },
    { id: 'solution_02', question: 'Does it directly address the problem?', weight: 1.2, importance: 2 },
    { id: 'solution_03', question: 'Is the value proposition clear?', weight: 1.1, importance: 3 },
    { id: 'solution_04', question: 'Is the solution clearly explained?', weight: 1.0, importance: 4 },
  ],

  market: [
    { id: 'market_01', question: 'Is market size credible and supported?', weight: 1.5, importance: 1 },
    { id: 'market_02', question: 'Are assumptions visible?', weight: 1.3, importance: 2 },
    { id: 'market_03', question: 'Does it support venture-scale outcomes?', weight: 1.2, importance: 3 },
    { id: 'market_04', question: 'Is the market clearly defined?', weight: 1.0, importance: 4 },
  ],

  traction: [
    { id: 'traction_01', question: 'Are concrete metrics provided?', weight: 1.5, importance: 1 },
    { id: 'traction_02', question: 'Is product-market fit evident?', weight: 1.4, importance: 2 },
    { id: 'traction_03', question: 'Is growth shown over time?', weight: 1.3, importance: 3 },
    { id: 'traction_04', question: 'Are metrics credible?', weight: 1.2, importance: 4 },
  ],

  product: [
    { id: 'product_01', question: 'Is the technology defensible?', weight: 1.2, importance: 1 },
    { id: 'product_02', question: 'Are key features highlighted?', weight: 1.1, importance: 2 },
    { id: 'product_03', question: 'Is the product clearly explained?', weight: 1.0, importance: 3 },
    { id: 'product_04', question: 'Is the product stage clear?', weight: 0.8, importance: 4 },
  ],

  competition: [
    { id: 'competition_01', question: 'Are differentiators specific?', weight: 1.4, importance: 1 },
    { id: 'competition_02', question: 'Is positioning honest and realistic?', weight: 1.3, importance: 2 },
    { id: 'competition_03', question: 'Is competitive moat explained?', weight: 1.2, importance: 3 },
    { id: 'competition_04', question: 'Are competitors identified?', weight: 1.0, importance: 4 },
  ],

  business_model: [
    { id: 'business_model_01', question: 'Are unit economics discussed?', weight: 1.3, importance: 1 },
    { id: 'business_model_02', question: 'Is the revenue model clear?', weight: 1.2, importance: 2 },
    { id: 'business_model_03', question: 'Is path to profitability credible?', weight: 1.1, importance: 3 },
    { id: 'business_model_04', question: 'Is pricing mentioned?', weight: 1.0, importance: 4 },
  ],

  go_to_market: [
    { id: 'go_to_market_01', question: 'Is there evidence in chosen channels?', weight: 1.3, importance: 1 },
    { id: 'go_to_market_02', question: 'Is distribution strategy defined?', weight: 1.2, importance: 2 },
    { id: 'go_to_market_03', question: 'Are acquisition channels specified?', weight: 1.1, importance: 3 },
    { id: 'go_to_market_04', question: 'Is sales process explained?', weight: 0.9, importance: 4 },
  ],

  team: [
    { id: 'team_01', question: 'Does the team have relevant experience?', weight: 1.2, importance: 1 },
    { id: 'team_02', question: 'Is credibility clearly demonstrated?', weight: 1.2, importance: 2 },
    { id: 'team_03', question: 'Does team composition match needs?', weight: 1.1, importance: 3 },
    { id: 'team_04', question: 'Are prior achievements mentioned?', weight: 1.0, importance: 4 },
  ],

  financials: [
    { id: 'financials_01', question: 'Are assumptions visible?', weight: 1.5, importance: 1 },
    { id: 'financials_02', question: 'Are projections credible given traction?', weight: 1.4, importance: 2 },
    { id: 'financials_03', question: 'Are projections clearly presented?', weight: 1.2, importance: 3 },
    { id: 'financials_04', question: 'Is path to milestones shown?', weight: 1.0, importance: 4 },
  ],

  ask: [
    { id: 'ask_01', question: 'Is use of funds explained?', weight: 1.2, importance: 1 },
    { id: 'ask_02', question: 'Are milestones tied to funding?', weight: 1.1, importance: 2 },
    { id: 'ask_03', question: 'Is the raise clearly stated?', weight: 1.0, importance: 3 },
    { id: 'ask_04', question: 'Is timeline mentioned?', weight: 0.9, importance: 4 },
  ],

  investment_highlights: [
    { id: 'investment_highlights_01', question: 'Are key reasons summarized?', weight: 1.2, importance: 1 },
    { id: 'investment_highlights_02', question: 'Is there a compelling thesis?', weight: 1.1, importance: 2 },
    { id: 'investment_highlights_03', question: 'Are differentiators highlighted?', weight: 1.0, importance: 3 },
  ],

  roadmap: [
    { id: 'roadmap_01', question: 'Are timelines realistic?', weight: 1.2, importance: 1 },
    { id: 'roadmap_02', question: 'Are milestones clearly defined?', weight: 1.1, importance: 2 },
    { id: 'roadmap_03', question: 'Is there alignment with funding?', weight: 1.0, importance: 3 },
  ],

  cover: [
    { id: 'cover_01', question: 'Is company name visible?', weight: 1.0, importance: 1 },
    { id: 'cover_02', question: 'Is tagline present?', weight: 0.8, importance: 2 },
  ],

  contact: [
    { id: 'contact_01', question: 'Is contact info provided?', weight: 1.0, importance: 1 },
  ],

  other: [
    { id: 'other_01', question: 'Is the content clear?', weight: 1.0, importance: 1 },
    { id: 'other_02', question: 'Does it serve a purpose?', weight: 0.8, importance: 2 },
  ],
}

// Slide weights for deck-level scoring
// investment_highlights is 0 - excluded from deck scoring (it's a summary, not evaluated)
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
  investment_highlights: 0.0,
  cover: 0.0,
  contact: 0.0,
  other: 0.5,
}

// Grade thresholds for slide scoring (normalized 0-1)
// Calibrated for better B-D distribution:
// - A: exceptional, rare (85%+)
// - B: strong but incomplete (70%+)
// - C: partial with meaningful gaps (55%+)
// - D: weak but present (40%+)
// - E: essentially missing
const SLIDE_GRADE_THRESHOLDS = {
  A: 0.85,
  B: 0.70,
  C: 0.55,
  D: 0.40,
}

// Grade to numeric score for deck-level
const GRADE_TO_SCORE = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
}

// V3 slide weights for seed-stage consumer/network decks
// Reduces emphasis on business_model and competition for early-stage consumer products
const V3_SEED_CONSUMER_WEIGHTS = {
  problem: 1.4, // Higher - core thesis element
  solution: 1.4, // Higher - core thesis element
  market: 1.3,
  traction: 1.6, // Highest - most important for consumer
  team: 1.4, // Higher - founder-market fit crucial
  business_model: 0.8, // Lower - seed stage doesn't need unit economics
  financials: 0.8, // Lower - seed stage projections less meaningful
  ask: 1.0,
  product: 1.2, // Higher - product insight matters
  competition: 0.7, // Lower - early moats often unclear
  go_to_market: 0.9, // Slightly lower - distribution often emerging
  roadmap: 0.6,
  investment_highlights: 0.0,
  cover: 0.0,
  contact: 0.0,
  other: 0.3,
}

// V3 scoring blend weights
const V3_BLEND_WEIGHTS = {
  slides: 0.6, // 60% from slide scores
  thesis: 0.4, // 40% from thesis scores
}

/**
 * Convert normalized score (0-1) to letter grade.
 */
function normalizedScoreToGrade(normalized) {
  if (normalized >= SLIDE_GRADE_THRESHOLDS.A) return 'A'
  if (normalized >= SLIDE_GRADE_THRESHOLDS.B) return 'B'
  if (normalized >= SLIDE_GRADE_THRESHOLDS.C) return 'C'
  if (normalized >= SLIDE_GRADE_THRESHOLDS.D) return 'D'
  return 'E'
}

/**
 * Convert deck score (1-5) to letter grade.
 */
function deckScoreToGrade(score) {
  if (score >= 4.5) return 'A'
  if (score >= 3.5) return 'B'
  if (score >= 2.5) return 'C'
  if (score >= 1.5) return 'D'
  return 'E'
}

/**
 * Compute slide score from question answers (0-5 scale).
 * weightedScore = Σ(score * weight)
 * maxScore = Σ(5 * weight)
 * normalized = weightedScore / maxScore
 */
function computeSlideScore(answers, rubric) {
  const weightMap = {}
  for (const q of rubric) {
    weightMap[q.id] = q.weight
  }

  let weightedScore = 0
  let maxScore = 0

  for (const answer of answers) {
    const weight = weightMap[answer.question_id] || 1.0
    const score = Math.min(5, Math.max(0, answer.score || 0)) // Clamp to 0-5
    weightedScore += score * weight
    maxScore += 5 * weight
  }

  if (maxScore === 0) {
    return { weightedScore: 0, maxScore: 0, normalized: 0, grade: 'E' }
  }

  const normalized = weightedScore / maxScore
  const grade = normalizedScoreToGrade(normalized)

  return {
    weightedScore: Math.round(weightedScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    normalized: Math.round(normalized * 1000) / 1000,
    grade,
  }
}

/**
 * Compute deck score from slide evaluations.
 */
function computeDeckScore(slideEvaluations) {
  let totalWeightedScore = 0
  let totalWeight = 0
  let slideCountUsed = 0

  for (const slide of slideEvaluations) {
    const type = slide.type || 'other'
    const weight = SLIDE_WEIGHTS[type] ?? 0.5

    if (weight === 0) continue

    const gradeScore = GRADE_TO_SCORE[slide.grade]
    if (gradeScore === undefined) continue

    totalWeightedScore += gradeScore * weight
    totalWeight += weight
    slideCountUsed++
  }

  if (totalWeight === 0) {
    return { deckScore: 3.0, totalWeight: 0, slideCountUsed: 0, overallGrade: 'C' }
  }

  const deckScore = totalWeightedScore / totalWeight
  const overallGrade = deckScoreToGrade(deckScore)

  return {
    deckScore: Math.round(deckScore * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
    slideCountUsed,
    overallGrade,
  }
}

/**
 * V3 deck scoring that blends slide scores with thesis scores.
 *
 * For v3 only:
 * - Uses adjusted slide weights for seed-stage consumer/network decks
 * - Incorporates thesis scores (why_this_market, why_this_product, why_this_team, why_now)
 * - Allows strong thesis to lift overall grade
 *
 * @param {Object[]} slideEvaluations - Array of evaluated slides with grade, type
 * @param {Object} investmentThesis - Thesis evaluation with scores for each thesis question
 * @param {Object} options - Configuration options
 * @param {boolean} options.isSeedConsumerNetwork - Whether to use seed consumer/network weights
 * @returns {Object} - deckScore, overallGrade, debug info
 */
function computeDeckScoreV3(slideEvaluations, investmentThesis, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  // Select appropriate slide weights
  const slideWeights = isSeedConsumerNetwork ? V3_SEED_CONSUMER_WEIGHTS : SLIDE_WEIGHTS

  // ===== Calculate slide score component =====
  let totalSlideWeightedScore = 0
  let totalSlideWeight = 0
  let slideCountUsed = 0
  const slideBreakdown = []

  for (const slide of slideEvaluations) {
    const type = slide.type || 'other'
    const weight = slideWeights[type] ?? 0.5

    if (weight === 0) continue

    const gradeScore = GRADE_TO_SCORE[slide.grade]
    if (gradeScore === undefined) continue

    totalSlideWeightedScore += gradeScore * weight
    totalSlideWeight += weight
    slideCountUsed++

    slideBreakdown.push({
      type,
      grade: slide.grade,
      grade_score: gradeScore,
      weight,
      weighted_contribution: gradeScore * weight,
    })
  }

  const slideComponent = totalSlideWeight > 0
    ? totalSlideWeightedScore / totalSlideWeight
    : 3.0

  // ===== Calculate thesis score component =====
  const thesisKeys = ['why_this_market', 'why_this_product', 'why_this_team', 'why_now']
  let totalThesisScore = 0
  let thesisCount = 0
  const thesisBreakdown = []

  for (const key of thesisKeys) {
    const thesis = investmentThesis[key]
    if (thesis && typeof thesis.score === 'number') {
      totalThesisScore += thesis.score
      thesisCount++
      thesisBreakdown.push({
        key,
        score: thesis.score,
      })
    }
  }

  // Thesis scores are 0-5, same scale as slide grades
  const thesisComponent = thesisCount > 0
    ? totalThesisScore / thesisCount
    : 3.0

  // ===== Blend slide and thesis components =====
  const blendedScore = (slideComponent * V3_BLEND_WEIGHTS.slides) +
                       (thesisComponent * V3_BLEND_WEIGHTS.thesis)

  // ===== Apply thesis lift for strong thesis + weak slides =====
  // If thesis average >= 4.0 but slide score < 3.5, apply modest lift
  // This allows strong narrative to compensate for presentation gaps
  let thesisLift = 0
  let thesisLiftApplied = false
  if (thesisComponent >= 4.0 && slideComponent < 3.5) {
    // Lift capped at 0.3 points (prevents inflating truly weak decks)
    thesisLift = Math.min(0.3, (thesisComponent - 4.0) * 0.15)
    thesisLiftApplied = thesisLift > 0
  }

  const finalScore = Math.min(5.0, blendedScore + thesisLift)
  const overallGrade = deckScoreToGrade(finalScore)

  // Build debug output
  const debug = {
    scoring_mode: 'v3_blended',
    weight_profile: isSeedConsumerNetwork ? 'seed_consumer_network' : 'standard',
    blend_weights: V3_BLEND_WEIGHTS,
    slide_score_component: {
      raw_weighted_sum: Math.round(totalSlideWeightedScore * 100) / 100,
      total_weight: Math.round(totalSlideWeight * 100) / 100,
      slide_count_used: slideCountUsed,
      component_score: Math.round(slideComponent * 100) / 100,
      breakdown: slideBreakdown,
    },
    thesis_score_component: {
      total_score: totalThesisScore,
      thesis_count: thesisCount,
      component_score: Math.round(thesisComponent * 100) / 100,
      breakdown: thesisBreakdown,
    },
    blending: {
      slide_contribution: Math.round(slideComponent * V3_BLEND_WEIGHTS.slides * 100) / 100,
      thesis_contribution: Math.round(thesisComponent * V3_BLEND_WEIGHTS.thesis * 100) / 100,
      blended_score: Math.round(blendedScore * 100) / 100,
    },
    thesis_lift: {
      applied: thesisLiftApplied,
      lift_amount: Math.round(thesisLift * 100) / 100,
      reason: thesisLiftApplied
        ? `Strong thesis (${thesisComponent.toFixed(1)}) lifted score for weaker slides (${slideComponent.toFixed(1)})`
        : thesisComponent < 4.0
          ? 'Thesis not strong enough to trigger lift (needs >= 4.0)'
          : 'Slides already strong enough (>= 3.5)',
    },
    final_score: Math.round(finalScore * 100) / 100,
    final_grade: overallGrade,
    formula: `(slide_component × ${V3_BLEND_WEIGHTS.slides}) + (thesis_component × ${V3_BLEND_WEIGHTS.thesis}) + thesis_lift`,
  }

  return {
    deckScore: Math.round(finalScore * 100) / 100,
    totalWeight: Math.round(totalSlideWeight * 100) / 100,
    slideCountUsed,
    overallGrade,
    debug,
  }
}

/**
 * Generate fallback answers when model fails (0-5 scale).
 */
function generateFallbackAnswers(rubric) {
  return rubric.map((q) => ({
    question_id: q.id,
    score: 0,
    assessment: 'Unable to evaluate slide content.',
    gap: 'Evaluation failed due to processing error.',
    investor_impact: 'Cannot assess investor impact without successful evaluation.',
    fix: 'Ensure slide has clear, readable content.',
    confidence: 'low',
  }))
}

/**
 * Sort questions by importance (lower number = higher priority).
 */
function sortByImportance(rubric) {
  return [...rubric].sort((a, b) => (a.importance || 99) - (b.importance || 99))
}

/**
 * Sort answers by question importance.
 */
function sortAnswersByImportance(answers, rubric) {
  const importanceMap = {}
  for (const q of rubric) {
    importanceMap[q.id] = q.importance || 99
  }
  return [...answers].sort((a, b) => {
    return (importanceMap[a.question_id] || 99) - (importanceMap[b.question_id] || 99)
  })
}

module.exports = {
  RUBRIC_VERSION,
  RUBRICS,
  SLIDE_WEIGHTS,
  V3_SEED_CONSUMER_WEIGHTS,
  V3_BLEND_WEIGHTS,
  SLIDE_GRADE_THRESHOLDS,
  GRADE_TO_SCORE,
  normalizedScoreToGrade,
  deckScoreToGrade,
  computeSlideScore,
  computeDeckScore,
  computeDeckScoreV3,
  generateFallbackAnswers,
  sortByImportance,
  sortAnswersByImportance,
}
