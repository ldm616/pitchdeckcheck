/**
 * Rubric-based slide evaluation for paid reports.
 * Each slide type has a set of investor-grade questions with weights.
 * Higher weight = more impact on slide score.
 */

const RUBRIC_VERSION = 'rubric_v1_2026_05_04'

const RUBRICS = {
  problem: [
    {
      id: 'problem_01',
      question: 'Is the target user/customer clearly defined?',
      weight: 1.0,
    },
    {
      id: 'problem_02',
      question: 'Is the problem concrete and specific (not abstract)?',
      weight: 1.2,
    },
    {
      id: 'problem_03',
      question: 'Is there evidence of frequency or severity?',
      weight: 1.3,
    },
    {
      id: 'problem_04',
      question: 'Is the current alternative or workaround mentioned?',
      weight: 0.8,
    },
    {
      id: 'problem_05',
      question: 'Does the problem create urgency for a solution?',
      weight: 1.0,
    },
  ],

  solution: [
    {
      id: 'solution_01',
      question: 'Is the solution clearly described?',
      weight: 1.0,
    },
    {
      id: 'solution_02',
      question: 'Does the solution directly address the stated problem?',
      weight: 1.3,
    },
    {
      id: 'solution_03',
      question: 'Is the differentiation from alternatives clear?',
      weight: 1.2,
    },
    {
      id: 'solution_04',
      question: 'Is there evidence of why this approach works?',
      weight: 1.0,
    },
    {
      id: 'solution_05',
      question: 'Is the value proposition concise and compelling?',
      weight: 1.1,
    },
  ],

  market: [
    {
      id: 'market_01',
      question: 'Is the target market clearly defined?',
      weight: 1.0,
    },
    {
      id: 'market_02',
      question: 'Is the market size credible and supported with data?',
      weight: 1.5,
    },
    {
      id: 'market_03',
      question: 'Are assumptions for sizing visible or explained?',
      weight: 1.3,
    },
    {
      id: 'market_04',
      question: 'Does this support venture-scale outcomes ($100M+ potential)?',
      weight: 1.2,
    },
    {
      id: 'market_05',
      question: 'Is TAM/SAM/SOM breakdown provided?',
      weight: 0.9,
    },
  ],

  traction: [
    {
      id: 'traction_01',
      question: 'Are there concrete metrics (users, revenue, customers)?',
      weight: 1.5,
    },
    {
      id: 'traction_02',
      question: 'Is growth shown over time (not just a single snapshot)?',
      weight: 1.3,
    },
    {
      id: 'traction_03',
      question: 'Are metrics credible and internally consistent?',
      weight: 1.2,
    },
    {
      id: 'traction_04',
      question: 'Is there evidence of product-market fit signals?',
      weight: 1.4,
    },
    {
      id: 'traction_05',
      question: 'Are key milestones or achievements highlighted?',
      weight: 0.8,
    },
  ],

  product: [
    {
      id: 'product_01',
      question: 'Is the product clearly explained and understandable?',
      weight: 1.0,
    },
    {
      id: 'product_02',
      question: 'Are key features or capabilities highlighted?',
      weight: 1.1,
    },
    {
      id: 'product_03',
      question: 'Is there visual evidence (screenshots, demos, mockups)?',
      weight: 0.9,
    },
    {
      id: 'product_04',
      question: 'Is the technology or approach defensible?',
      weight: 1.2,
    },
    {
      id: 'product_05',
      question: 'Is the product stage clear (MVP, beta, production)?',
      weight: 0.8,
    },
  ],

  competition: [
    {
      id: 'competition_01',
      question: 'Are competitors clearly identified?',
      weight: 1.0,
    },
    {
      id: 'competition_02',
      question: 'Is the competitive positioning honest and realistic?',
      weight: 1.3,
    },
    {
      id: 'competition_03',
      question: 'Are differentiation factors specific and credible?',
      weight: 1.4,
    },
    {
      id: 'competition_04',
      question: 'Is there acknowledgment of competitor strengths?',
      weight: 0.8,
    },
    {
      id: 'competition_05',
      question: 'Is the competitive moat or defensibility explained?',
      weight: 1.2,
    },
  ],

  business_model: [
    {
      id: 'business_model_01',
      question: 'Is the revenue model clearly explained?',
      weight: 1.2,
    },
    {
      id: 'business_model_02',
      question: 'Is pricing mentioned or implied?',
      weight: 1.0,
    },
    {
      id: 'business_model_03',
      question: 'Are unit economics discussed (CAC, LTV, margins)?',
      weight: 1.3,
    },
    {
      id: 'business_model_04',
      question: 'Is the path to profitability credible?',
      weight: 1.1,
    },
    {
      id: 'business_model_05',
      question: 'Are multiple revenue streams identified if applicable?',
      weight: 0.7,
    },
  ],

  go_to_market: [
    {
      id: 'go_to_market_01',
      question: 'Is the distribution strategy clearly defined?',
      weight: 1.2,
    },
    {
      id: 'go_to_market_02',
      question: 'Are customer acquisition channels specified?',
      weight: 1.1,
    },
    {
      id: 'go_to_market_03',
      question: 'Is there evidence of early traction in chosen channels?',
      weight: 1.3,
    },
    {
      id: 'go_to_market_04',
      question: 'Is the sales cycle or process explained?',
      weight: 0.9,
    },
    {
      id: 'go_to_market_05',
      question: 'Are partnerships or key relationships mentioned?',
      weight: 0.8,
    },
  ],

  team: [
    {
      id: 'team_01',
      question: 'Are founders/key team members clearly identified?',
      weight: 1.0,
    },
    {
      id: 'team_02',
      question: 'Is relevant domain expertise demonstrated?',
      weight: 1.4,
    },
    {
      id: 'team_03',
      question: 'Are prior achievements or credentials mentioned?',
      weight: 1.2,
    },
    {
      id: 'team_04',
      question: 'Does the team composition match the business needs?',
      weight: 1.1,
    },
    {
      id: 'team_05',
      question: 'Are advisors or investors mentioned if notable?',
      weight: 0.7,
    },
  ],

  financials: [
    {
      id: 'financials_01',
      question: 'Are revenue projections provided?',
      weight: 1.2,
    },
    {
      id: 'financials_02',
      question: 'Are key assumptions behind projections visible?',
      weight: 1.4,
    },
    {
      id: 'financials_03',
      question: 'Are projections credible given current traction?',
      weight: 1.5,
    },
    {
      id: 'financials_04',
      question: 'Is path to key milestones shown (break-even, profitability)?',
      weight: 1.0,
    },
    {
      id: 'financials_05',
      question: 'Are current financial metrics disclosed if applicable?',
      weight: 0.9,
    },
  ],

  ask: [
    {
      id: 'ask_01',
      question: 'Is the raise amount clearly stated?',
      weight: 1.3,
    },
    {
      id: 'ask_02',
      question: 'Is the use of funds specified?',
      weight: 1.4,
    },
    {
      id: 'ask_03',
      question: 'Are milestones tied to this funding round?',
      weight: 1.2,
    },
    {
      id: 'ask_04',
      question: 'Is the valuation or terms mentioned if relevant?',
      weight: 0.8,
    },
    {
      id: 'ask_05',
      question: 'Is runway or timeline for next round mentioned?',
      weight: 0.9,
    },
  ],

  investment_highlights: [
    {
      id: 'investment_highlights_01',
      question: 'Are key investment reasons clearly summarized?',
      weight: 1.2,
    },
    {
      id: 'investment_highlights_02',
      question: 'Is there a compelling narrative or thesis?',
      weight: 1.1,
    },
    {
      id: 'investment_highlights_03',
      question: 'Are differentiators or moats highlighted?',
      weight: 1.0,
    },
    {
      id: 'investment_highlights_04',
      question: 'Is timing or market opportunity emphasized?',
      weight: 0.9,
    },
  ],

  roadmap: [
    {
      id: 'roadmap_01',
      question: 'Are future milestones clearly defined?',
      weight: 1.1,
    },
    {
      id: 'roadmap_02',
      question: 'Are timelines specific and realistic?',
      weight: 1.2,
    },
    {
      id: 'roadmap_03',
      question: 'Is there alignment between roadmap and funding ask?',
      weight: 1.0,
    },
    {
      id: 'roadmap_04',
      question: 'Are product and business milestones both included?',
      weight: 0.8,
    },
  ],

  cover: [
    {
      id: 'cover_01',
      question: 'Is the company name clearly visible?',
      weight: 1.0,
    },
    {
      id: 'cover_02',
      question: 'Is a tagline or one-liner present?',
      weight: 0.8,
    },
    {
      id: 'cover_03',
      question: 'Is the visual design professional?',
      weight: 0.6,
    },
  ],

  contact: [
    {
      id: 'contact_01',
      question: 'Is contact information provided?',
      weight: 1.0,
    },
    {
      id: 'contact_02',
      question: 'Are multiple contact methods available?',
      weight: 0.6,
    },
  ],

  other: [
    {
      id: 'other_01',
      question: 'Is the slide content clear and understandable?',
      weight: 1.0,
    },
    {
      id: 'other_02',
      question: 'Does the slide serve a clear purpose?',
      weight: 0.8,
    },
    {
      id: 'other_03',
      question: 'Is the information investor-relevant?',
      weight: 0.9,
    },
  ],
}

/**
 * Score thresholds for grade mapping.
 * normalized = weightedScore / maxScore
 */
const GRADE_THRESHOLDS = {
  A: 0.9,
  B: 0.75,
  C: 0.6,
  D: 0.45,
}

/**
 * Convert normalized score (0-1) to letter grade.
 * @param {number} normalized - Score between 0 and 1
 * @returns {string} Letter grade A-E
 */
function normalizedScoreToGrade(normalized) {
  if (normalized >= GRADE_THRESHOLDS.A) return 'A'
  if (normalized >= GRADE_THRESHOLDS.B) return 'B'
  if (normalized >= GRADE_THRESHOLDS.C) return 'C'
  if (normalized >= GRADE_THRESHOLDS.D) return 'D'
  return 'E'
}

/**
 * Compute slide score from rubric answers.
 * @param {Array} answers - Array of {question_id, score, ...} objects
 * @param {Array} rubric - Array of {id, weight, ...} objects
 * @returns {{weightedScore: number, maxScore: number, normalized: number, grade: string}}
 */
function computeSlideScore(answers, rubric) {
  let weightedScore = 0
  let maxScore = 0

  // Create a map of question weights
  const weightMap = {}
  for (const q of rubric) {
    weightMap[q.id] = q.weight
  }

  // Calculate weighted score
  for (const answer of answers) {
    const weight = weightMap[answer.question_id] || 1.0
    weightedScore += answer.score * weight
    maxScore += 2 * weight // max score per question is 2
  }

  // Avoid division by zero
  if (maxScore === 0) {
    return {
      weightedScore: 0,
      maxScore: 0,
      normalized: 0,
      grade: 'E',
    }
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
 * Generate fallback answers when model fails.
 * All answers set to "no" with score 0.
 * @param {Array} rubric - Array of rubric questions
 * @returns {Array} Fallback answers
 */
function generateFallbackAnswers(rubric) {
  return rubric.map((q) => ({
    question_id: q.id,
    answer: 'no',
    score: 0,
    evidence: 'Unable to evaluate - model failure',
    reasoning: 'Fallback due to evaluation error',
  }))
}

/**
 * Extract top strengths from rubric answers.
 * @param {Array} answers - Evaluated answers
 * @param {Array} rubric - Rubric questions
 * @param {number} count - Number of strengths to return
 * @returns {Array} Top strengths with question text
 */
function extractStrengths(answers, rubric, count = 2) {
  // Create question map
  const questionMap = {}
  for (const q of rubric) {
    questionMap[q.id] = q.question
  }

  // Filter to high-scoring answers (score 2)
  const highScoring = answers
    .filter((a) => a.score === 2)
    .sort((a, b) => {
      // Sort by weight (higher weight first)
      const weightA = rubric.find((r) => r.id === a.question_id)?.weight || 1
      const weightB = rubric.find((r) => r.id === b.question_id)?.weight || 1
      return weightB - weightA
    })
    .slice(0, count)

  return highScoring.map((a) => ({
    question: questionMap[a.question_id],
    evidence: a.evidence,
    reasoning: a.reasoning,
  }))
}

/**
 * Extract top issues from rubric answers.
 * @param {Array} answers - Evaluated answers
 * @param {Array} rubric - Rubric questions
 * @param {number} count - Number of issues to return
 * @returns {Array} Top issues with question text and fix suggestions
 */
function extractIssues(answers, rubric, count = 2) {
  // Create question map
  const questionMap = {}
  for (const q of rubric) {
    questionMap[q.id] = q.question
  }

  // Filter to low-scoring answers (score 0 or 1)
  const lowScoring = answers
    .filter((a) => a.score < 2)
    .sort((a, b) => {
      // Sort by score (lowest first), then by weight (higher weight first for same score)
      if (a.score !== b.score) return a.score - b.score
      const weightA = rubric.find((r) => r.id === a.question_id)?.weight || 1
      const weightB = rubric.find((r) => r.id === b.question_id)?.weight || 1
      return weightB - weightA
    })
    .slice(0, count)

  return lowScoring.map((a) => ({
    question: questionMap[a.question_id],
    answer: a.answer,
    evidence: a.evidence,
    reasoning: a.reasoning,
    fix: generateFixSuggestion(a, questionMap[a.question_id]),
  }))
}

/**
 * Generate a specific fix suggestion based on the question.
 * @param {object} answer - The answer object
 * @param {string} question - The question text
 * @returns {string} Fix suggestion
 */
function generateFixSuggestion(answer, question) {
  if (answer.score === 0) {
    return `Add content that addresses: "${question}"`
  }
  return `Strengthen the evidence for: "${question}"`
}

module.exports = {
  RUBRIC_VERSION,
  RUBRICS,
  GRADE_THRESHOLDS,
  normalizedScoreToGrade,
  computeSlideScore,
  generateFallbackAnswers,
  extractStrengths,
  extractIssues,
}
