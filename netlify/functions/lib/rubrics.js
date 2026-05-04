/**
 * Rubric-based slide evaluation - single source of truth.
 * Used for both free and paid reports.
 */

const RUBRIC_VERSION = 'rubric_v1_2026_05_04'

const RUBRICS = {
  problem: [
    { id: 'problem_01', question: 'Is the target user clearly defined?', weight: 1.0 },
    { id: 'problem_02', question: 'Is the problem specific and concrete?', weight: 1.2 },
    { id: 'problem_03', question: 'Is severity or frequency demonstrated?', weight: 1.3 },
    { id: 'problem_04', question: 'Is the current alternative mentioned?', weight: 0.8 },
  ],

  solution: [
    { id: 'solution_01', question: 'Is the solution clearly explained?', weight: 1.0 },
    { id: 'solution_02', question: 'Is differentiation evident?', weight: 1.3 },
    { id: 'solution_03', question: 'Does it directly address the problem?', weight: 1.2 },
    { id: 'solution_04', question: 'Is the value proposition clear?', weight: 1.1 },
  ],

  market: [
    { id: 'market_01', question: 'Is the market clearly defined?', weight: 1.0 },
    { id: 'market_02', question: 'Is market size credible and supported?', weight: 1.5 },
    { id: 'market_03', question: 'Are assumptions visible?', weight: 1.3 },
    { id: 'market_04', question: 'Does it support venture-scale outcomes?', weight: 1.2 },
  ],

  traction: [
    { id: 'traction_01', question: 'Are concrete metrics provided?', weight: 1.5 },
    { id: 'traction_02', question: 'Is growth shown over time?', weight: 1.3 },
    { id: 'traction_03', question: 'Are metrics credible?', weight: 1.2 },
    { id: 'traction_04', question: 'Is product-market fit evident?', weight: 1.4 },
  ],

  product: [
    { id: 'product_01', question: 'Is the product clearly explained?', weight: 1.0 },
    { id: 'product_02', question: 'Are key features highlighted?', weight: 1.1 },
    { id: 'product_03', question: 'Is the technology defensible?', weight: 1.2 },
    { id: 'product_04', question: 'Is the product stage clear?', weight: 0.8 },
  ],

  competition: [
    { id: 'competition_01', question: 'Are competitors identified?', weight: 1.0 },
    { id: 'competition_02', question: 'Is positioning honest and realistic?', weight: 1.3 },
    { id: 'competition_03', question: 'Are differentiators specific?', weight: 1.4 },
    { id: 'competition_04', question: 'Is competitive moat explained?', weight: 1.2 },
  ],

  business_model: [
    { id: 'business_model_01', question: 'Is the revenue model clear?', weight: 1.2 },
    { id: 'business_model_02', question: 'Is pricing mentioned?', weight: 1.0 },
    { id: 'business_model_03', question: 'Are unit economics discussed?', weight: 1.3 },
    { id: 'business_model_04', question: 'Is path to profitability credible?', weight: 1.1 },
  ],

  go_to_market: [
    { id: 'go_to_market_01', question: 'Is distribution strategy defined?', weight: 1.2 },
    { id: 'go_to_market_02', question: 'Are acquisition channels specified?', weight: 1.1 },
    { id: 'go_to_market_03', question: 'Is there evidence in chosen channels?', weight: 1.3 },
    { id: 'go_to_market_04', question: 'Is sales process explained?', weight: 0.9 },
  ],

  team: [
    { id: 'team_01', question: 'Does the team have relevant experience?', weight: 1.2 },
    { id: 'team_02', question: 'Is credibility clearly demonstrated?', weight: 1.2 },
    { id: 'team_03', question: 'Are prior achievements mentioned?', weight: 1.0 },
    { id: 'team_04', question: 'Does team composition match needs?', weight: 1.1 },
  ],

  financials: [
    { id: 'financials_01', question: 'Are projections clearly presented?', weight: 1.2 },
    { id: 'financials_02', question: 'Are assumptions visible?', weight: 1.5 },
    { id: 'financials_03', question: 'Are projections credible given traction?', weight: 1.4 },
    { id: 'financials_04', question: 'Is path to milestones shown?', weight: 1.0 },
  ],

  ask: [
    { id: 'ask_01', question: 'Is the raise clearly stated?', weight: 1.0 },
    { id: 'ask_02', question: 'Is use of funds explained?', weight: 1.2 },
    { id: 'ask_03', question: 'Are milestones tied to funding?', weight: 1.1 },
    { id: 'ask_04', question: 'Is timeline mentioned?', weight: 0.9 },
  ],

  investment_highlights: [
    { id: 'investment_highlights_01', question: 'Are key reasons summarized?', weight: 1.2 },
    { id: 'investment_highlights_02', question: 'Is there a compelling thesis?', weight: 1.1 },
    { id: 'investment_highlights_03', question: 'Are differentiators highlighted?', weight: 1.0 },
  ],

  roadmap: [
    { id: 'roadmap_01', question: 'Are milestones clearly defined?', weight: 1.1 },
    { id: 'roadmap_02', question: 'Are timelines realistic?', weight: 1.2 },
    { id: 'roadmap_03', question: 'Is there alignment with funding?', weight: 1.0 },
  ],

  cover: [
    { id: 'cover_01', question: 'Is company name visible?', weight: 1.0 },
    { id: 'cover_02', question: 'Is tagline present?', weight: 0.8 },
  ],

  contact: [
    { id: 'contact_01', question: 'Is contact info provided?', weight: 1.0 },
  ],

  other: [
    { id: 'other_01', question: 'Is the content clear?', weight: 1.0 },
    { id: 'other_02', question: 'Does it serve a purpose?', weight: 0.8 },
  ],
}

// Slide weights for deck-level scoring
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

// Grade thresholds for slide scoring (normalized 0-1)
const SLIDE_GRADE_THRESHOLDS = {
  A: 0.9,
  B: 0.75,
  C: 0.6,
  D: 0.45,
}

// Grade to numeric score for deck-level
const GRADE_TO_SCORE = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
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
 * Compute slide score from rubric answers.
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
    weightedScore += answer.score * weight
    maxScore += 2 * weight
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
 * Generate fallback answers when model fails.
 */
function generateFallbackAnswers(rubric) {
  return rubric.map((q) => ({
    question_id: q.id,
    answer: 'no',
    score: 0,
    evidence: 'Unable to evaluate',
    reasoning: 'Fallback due to evaluation error',
  }))
}

/**
 * Extract strengths from rubric answers (highest scoring).
 */
function extractStrengths(answers, rubric, count = 2) {
  const questionMap = {}
  for (const q of rubric) {
    questionMap[q.id] = q
  }

  return answers
    .filter((a) => a.score === 2)
    .sort((a, b) => (questionMap[b.question_id]?.weight || 1) - (questionMap[a.question_id]?.weight || 1))
    .slice(0, count)
    .map((a) => ({
      question: questionMap[a.question_id]?.question,
      evidence: a.evidence,
    }))
}

/**
 * Extract issues from rubric answers (lowest scoring).
 */
function extractIssues(answers, rubric, count = 2) {
  const questionMap = {}
  for (const q of rubric) {
    questionMap[q.id] = q
  }

  return answers
    .filter((a) => a.score < 2)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      return (questionMap[b.question_id]?.weight || 1) - (questionMap[a.question_id]?.weight || 1)
    })
    .slice(0, count)
    .map((a) => ({
      question: questionMap[a.question_id]?.question,
      answer: a.answer,
      reasoning: a.reasoning,
      fix: a.score === 0
        ? `Add: ${questionMap[a.question_id]?.question}`
        : `Strengthen: ${questionMap[a.question_id]?.question}`,
    }))
}

module.exports = {
  RUBRIC_VERSION,
  RUBRICS,
  SLIDE_WEIGHTS,
  SLIDE_GRADE_THRESHOLDS,
  GRADE_TO_SCORE,
  normalizedScoreToGrade,
  deckScoreToGrade,
  computeSlideScore,
  computeDeckScore,
  generateFallbackAnswers,
  extractStrengths,
  extractIssues,
}
