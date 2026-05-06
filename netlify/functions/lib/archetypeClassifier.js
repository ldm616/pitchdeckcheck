/**
 * Archetype Classification System
 *
 * Classifies pitch decks into archetypes based on:
 * - Explicit classification (from calibration registry)
 * - Signal profile analysis
 * - Content heuristics
 *
 * Archetypes:
 * - consumer_network
 * - marketplace
 * - local_marketplace
 * - saas
 * - developer_tools
 * - infrastructure
 * - ai_application
 * - fintech
 * - healthcare
 * - biotech
 * - hardtech
 * - enterprise_ai
 * - consumer_ai
 */

const { getArchetypeConfig, getAllArchetypes } = require('./calibrationDb')

// =============================================================================
// ARCHETYPE DETECTION PATTERNS
// =============================================================================

const ARCHETYPE_PATTERNS = {
  consumer_network: {
    keywords: [
      /\b(social|network|connect|community|share|viral|users?|members?)\b/i,
      /\b(feed|timeline|profile|friends?|followers?)\b/i,
      /\b(creator|audience|content|video|photo|stream)\b/i,
    ],
    signals: ['network_effect', 'behavioral_insight', 'consumer_pain'],
    negative_keywords: [/\b(enterprise|b2b|saas|api)\b/i],
  },

  marketplace: {
    keywords: [
      /\b(marketplace|market\s*place|buyer|seller|supply|demand)\b/i,
      /\b(transaction|listing|booking|commission|take[\s-]?rate)\b/i,
      /\b(two[\s-]?sided|multi[\s-]?sided|platform)\b/i,
    ],
    signals: ['network_effect', 'early_pull'],
    negative_keywords: [/\b(local|neighborhood|city[\s-]?specific)\b/i],
  },

  local_marketplace: {
    keywords: [
      /\b(local|neighborhood|city|geo|location[\s-]?based)\b/i,
      /\b(delivery|pickup|nearby|around\s+you)\b/i,
      /\b(restaurant|store|shop|service\s+provider)\b/i,
    ],
    signals: ['network_effect'],
    required_keywords: [/\b(local|city|neighborhood|geo)\b/i],
  },

  saas: {
    keywords: [
      /\b(saas|software|subscription|arr|mrr|ndr)\b/i,
      /\b(dashboard|analytics|reporting|workflow)\b/i,
      /\b(team|collaboration|productivity|management)\b/i,
    ],
    signals: ['product_simplicity', 'early_pull'],
    negative_keywords: [/\b(consumer|social|network\s+effect)\b/i],
  },

  developer_tools: {
    keywords: [
      /\b(developer|api|sdk|integration|devtool)\b/i,
      /\b(github|npm|package|library|framework)\b/i,
      /\b(cli|code|programming|engineer)\b/i,
    ],
    signals: ['product_simplicity', 'infrastructure_shift'],
    required_keywords: [/\b(developer|api|sdk|code|engineer)\b/i],
  },

  infrastructure: {
    keywords: [
      /\b(infrastructure|platform|backend|cloud|aws|gcp|azure)\b/i,
      /\b(database|compute|storage|networking|kubernetes)\b/i,
      /\b(scalab|distributed|microservice|container)\b/i,
    ],
    signals: ['infrastructure_shift', 'timing_insight'],
    negative_keywords: [/\b(consumer|social)\b/i],
  },

  ai_application: {
    keywords: [
      /\b(ai|artificial\s+intelligence|machine\s+learning|ml)\b/i,
      /\b(gpt|llm|neural|deep\s+learning|transformer)\b/i,
      /\b(automated?|intelligent|smart|prediction)\b/i,
    ],
    signals: ['infrastructure_shift', 'timing_insight'],
    negative_keywords: [/\b(enterprise[\s-]?only|b2b[\s-]?only)\b/i],
  },

  fintech: {
    keywords: [
      /\b(fintech|financial|banking|payment|lending)\b/i,
      /\b(credit|debit|transaction|money|wallet)\b/i,
      /\b(insurance|invest|trading|wealth)\b/i,
    ],
    signals: ['timing_insight', 'infrastructure_shift'],
    required_keywords: [/\b(fintech|financial|banking|payment|lending|credit|money)\b/i],
  },

  healthcare: {
    keywords: [
      /\b(health|healthcare|medical|clinical|patient)\b/i,
      /\b(hospital|doctor|physician|nurse|care)\b/i,
      /\b(diagnosis|treatment|therapy|drug|pharma)\b/i,
    ],
    signals: ['founder_market_fit', 'timing_insight'],
    required_keywords: [/\b(health|medical|clinical|patient|hospital|doctor)\b/i],
  },

  biotech: {
    keywords: [
      /\b(biotech|biotechnology|drug|therapeutic|molecule)\b/i,
      /\b(clinical\s+trial|fda|regulatory|patent)\b/i,
      /\b(protein|gene|dna|rna|cell)\b/i,
    ],
    signals: ['founder_market_fit'],
    required_keywords: [/\b(biotech|drug|therapeutic|clinical\s+trial|fda)\b/i],
  },

  hardtech: {
    keywords: [
      /\b(hardware|device|sensor|robot|drone)\b/i,
      /\b(manufacturing|factory|production|supply\s+chain)\b/i,
      /\b(chip|semiconductor|circuit|electronics)\b/i,
    ],
    signals: ['infrastructure_shift', 'founder_market_fit'],
    negative_keywords: [/\b(software[\s-]?only|saas)\b/i],
  },

  enterprise_ai: {
    keywords: [
      /\b(enterprise|b2b|business)\b/i,
      /\b(ai|ml|machine\s+learning|automation)\b/i,
      /\b(workflow|process|productivity|efficiency)\b/i,
    ],
    signals: ['timing_insight', 'infrastructure_shift'],
    required_keywords: [
      /\b(enterprise|b2b)\b/i,
      /\b(ai|ml|machine\s+learning|automation)\b/i,
    ],
  },

  consumer_ai: {
    keywords: [
      /\b(consumer|personal|individual|everyone)\b/i,
      /\b(ai|ml|machine\s+learning|smart|intelligent)\b/i,
      /\b(app|mobile|chat|assistant|companion)\b/i,
    ],
    signals: ['product_simplicity', 'behavioral_insight'],
    required_keywords: [
      /\b(consumer|personal|app|mobile)\b/i,
      /\b(ai|ml|smart|intelligent)\b/i,
    ],
  },
}

// =============================================================================
// CLASSIFICATION FUNCTIONS
// =============================================================================

/**
 * Classify a deck based on extracted text and detected signals.
 */
function classifyDeck(deckText, detectedSignals = [], explicitArchetype = null) {
  // If explicit archetype provided, validate and return
  if (explicitArchetype) {
    const config = getArchetypeConfig(explicitArchetype)
    if (config) {
      return {
        archetype: explicitArchetype,
        confidence: 1.0,
        source: 'explicit',
        config,
      }
    }
  }

  // Score each archetype
  const scores = {}

  for (const [archetypeId, patterns] of Object.entries(ARCHETYPE_PATTERNS)) {
    let score = 0

    // Check required keywords first
    if (patterns.required_keywords) {
      const hasRequired = patterns.required_keywords.every(pattern =>
        pattern.test(deckText)
      )
      if (!hasRequired) {
        scores[archetypeId] = 0
        continue
      }
      score += 2 // Bonus for required keywords
    }

    // Check negative keywords (disqualifiers)
    if (patterns.negative_keywords) {
      const hasNegative = patterns.negative_keywords.some(pattern =>
        pattern.test(deckText)
      )
      if (hasNegative) {
        score -= 1
      }
    }

    // Score keyword matches
    for (const pattern of patterns.keywords) {
      const matches = (deckText.match(pattern) || []).length
      score += Math.min(matches * 0.5, 2) // Cap at 2 per pattern
    }

    // Score signal matches
    if (patterns.signals && detectedSignals.length > 0) {
      for (const signal of patterns.signals) {
        if (detectedSignals.includes(signal)) {
          score += 1
        }
      }
    }

    scores[archetypeId] = Math.max(0, score)
  }

  // Find best match
  const sortedArchetypes = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])

  if (sortedArchetypes.length === 0) {
    return {
      archetype: 'unknown',
      confidence: 0,
      source: 'heuristic',
      config: null,
      all_scores: scores,
    }
  }

  const [bestArchetype, bestScore] = sortedArchetypes[0]
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalScore > 0 ? bestScore / totalScore : 0

  const config = getArchetypeConfig(bestArchetype)

  return {
    archetype: bestArchetype,
    confidence: Math.min(confidence * 2, 1.0), // Scale up confidence
    source: 'heuristic',
    config,
    all_scores: scores,
    runner_up: sortedArchetypes[1] ? sortedArchetypes[1][0] : null,
  }
}

/**
 * Get stage-adjusted expectations for an archetype.
 */
function getStageAdjustedExpectations(archetypeId, stage) {
  const config = getArchetypeConfig(archetypeId)
  if (!config) {
    return {
      metric_expectation: 'normal',
      metric_density_tolerance: 'medium',
    }
  }

  const stageAdjustment = config.stage_adjustments?.[stage] || {}

  return {
    metric_expectation: stageAdjustment.metric_expectation || 'normal',
    metric_density_tolerance: config.metric_density_tolerance || 'medium',
    key_signals: config.key_signals || [],
    common_weaknesses: config.common_weaknesses || [],
  }
}

/**
 * Check if a deck matches expected archetype signals.
 */
function validateArchetypeSignals(archetypeId, detectedSignals) {
  const config = getArchetypeConfig(archetypeId)
  if (!config) return { valid: true, missing: [], present: [] }

  const expectedSignals = config.key_signals || []
  const present = expectedSignals.filter(s => detectedSignals.includes(s))
  const missing = expectedSignals.filter(s => !detectedSignals.includes(s))

  return {
    valid: present.length >= Math.ceil(expectedSignals.length / 2),
    present,
    missing,
    coverage: expectedSignals.length > 0 ? present.length / expectedSignals.length : 1,
  }
}

/**
 * Get evaluation adjustments for an archetype + stage combination.
 */
function getEvaluationAdjustments(archetypeId, stage) {
  const expectations = getStageAdjustedExpectations(archetypeId, stage)

  const adjustments = {
    // Metric tolerance
    suppress_metric_requests: false,
    metric_request_limit: null,

    // Signal weighting
    boost_signals: [],
    dampen_signals: [],

    // Slide type adjustments
    slide_type_adjustments: {},
  }

  // Adjust based on metric density tolerance
  if (expectations.metric_density_tolerance === 'low') {
    adjustments.suppress_metric_requests = true
    adjustments.metric_request_limit = 2 // Max 2 "add metrics" suggestions
  }

  // Boost expected signals
  adjustments.boost_signals = expectations.key_signals

  // Add slide-specific adjustments based on archetype
  if (archetypeId === 'consumer_network' || archetypeId === 'consumer_ai') {
    adjustments.slide_type_adjustments.business_model = {
      grade_cap: 'B+', // Cap business model grade for consumer
      suppress_detailed_revenue: true,
    }
  }

  if (archetypeId === 'biotech' || archetypeId === 'hardtech') {
    adjustments.slide_type_adjustments.traction = {
      metric_expectation: 'milestones_ok', // Milestones instead of revenue
      suppress_revenue_requests: true,
    }
  }

  if (archetypeId === 'marketplace' || archetypeId === 'local_marketplace') {
    adjustments.slide_type_adjustments.competition = {
      boost_network_effect: true,
    }
  }

  return adjustments
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  classifyDeck,
  getStageAdjustedExpectations,
  validateArchetypeSignals,
  getEvaluationAdjustments,
  ARCHETYPE_PATTERNS,
}
