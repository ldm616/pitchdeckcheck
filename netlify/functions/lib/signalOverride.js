/**
 * Investor Signal Override System v4
 *
 * Post-rubric adjustment layer that detects when underlying investor signal
 * is materially stronger than raw rubric deductions imply.
 *
 * CALIBRATION RULES (v4):
 * 1. Max +1 letter grade lift per slide (D→C, C→B, etc.)
 * 2. No deck-wide synergy boosts on individual slides
 * 3. Weak keywords filtered out (user, internet, video, etc.)
 * 4. Slide-specific evidence required for lift
 * 5. business_model and competition excluded from score lifts
 * 6. Synergies affect deck-level thesis only
 *
 * IMPORTANT: Universal across all deck types.
 */

console.log('[signal-override] SIGNAL OVERRIDE MODULE LOADED (v4 - calibrated)')

// =============================================================================
// WEAK KEYWORDS - These alone are NOT investor signals
// =============================================================================

// Generic words that match too broadly - must be paired with stronger context
const WEAK_KEYWORDS = new Set([
  'user', 'users', 'internet', 'video', 'videos', 'google', 'media',
  'product', 'products', 'design', 'designs', 'produce', 'now', 'today',
  'members', 'member', 'platform', 'data', 'content', 'service',
  'solution', 'tool', 'app', 'web', 'online', 'digital'
])

// =============================================================================
// GRADE UTILITIES
// =============================================================================

const GRADE_ORDER = ['E', 'D', 'C', 'B', 'A']
const GRADE_TO_INDEX = { 'E': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4 }
const GRADE_THRESHOLDS = {
  'A': 0.85,
  'B': 0.70,
  'C': 0.55,
  'D': 0.40,
  'E': 0.00
}

function scoreToGrade(normalizedScore) {
  if (normalizedScore >= 0.85) return 'A'
  if (normalizedScore >= 0.70) return 'B'
  if (normalizedScore >= 0.55) return 'C'
  if (normalizedScore >= 0.40) return 'D'
  return 'E'
}

function getNextGrade(grade) {
  const idx = GRADE_TO_INDEX[grade]
  if (idx === undefined || idx >= 4) return grade
  return GRADE_ORDER[idx + 1]
}

function getGradeMinScore(grade) {
  return GRADE_THRESHOLDS[grade] || 0
}

// =============================================================================
// SIGNAL PATTERNS - Strong signals only (weak keywords filtered)
// =============================================================================

const SIGNAL_PATTERNS = {
  // Consumer/user pain - problem language showing friction
  consumer_pain: [
    /\b(frustrat|annoy|hate|painful|tedious)\w*/i,
    /\b(problem|issue|challenge|gap|limitation|barrier|obstacle|bottleneck)\b/i,
    /\b(pain\s*point|headache|nightmare|hassle|struggle)\b/i,
    /\b(difficult|complicated|confusing|overwhelming)\b/i,
    /\bhard\s+to\b/i,
    /\bdifficult\s+to\b/i,
    /\b(too\s+(large|big|slow|expensive|hard|complex|fragmented|small|limited))\b/i,
    /\b(can'?t|cannot|unable\s+to|no\s+way\s+to|impossible\s+to)\b/i,
    /\b(waste|wasted|wasting)\b/i,
    /\b(inefficien|time-consuming|labor-intensive)\w*/i,
    /\b(lack\s+of|lacking|missing|no\s+standard)\b/i,
    /\b(broken|failed|failing|outdated|legacy|antiquated)\b/i,
    /\b(isolated|fragmented|disconnected|siloed|scattered)\b/i,
    /\b(friction|clunky|cumbersome|awkward)\b/i,
    /\b(manual|manually|by\s+hand)\b/i,
    /\b(expensive|costly|high\s+cost|overpriced)\b/i,
    /\b(inaccessible|unavailable)\b/i,
  ],

  // Product simplicity - specific action verbs (not generic)
  product_simplicity: [
    /\b(upload|download|share|browse|watch|view|listen|play)\b/i,
    /\b(automate|simplif|streamlin|eliminat)\w*/i,
    /\b(one[\s-]?click|single[\s-]?click)\b/i,
    /\b(intuitive|straightforward|frictionless|effortless)\b/i,
    /\b(self[\s-]?service|no[\s-]?code|low[\s-]?code)\b/i,
    /\b(anyone\s+can|just|simply|easily|instantly|automatically)\b/i,
    /\b(no\s+\w+\s+(required|needed|necessary))\b/i,
    /\b(takes?\s+care\s+of|handles?)\s+\w+\s+(for|automatically)\b/i,
    /\b(converts?|transforms?|turns?)\s+\w+\s+(into|to)\b/i,
    /\b(serves?|delivers?)\s+\w+\s+to\s+(millions?|thousands?|everyone)\b/i,
  ],

  // Network effect / community - explicit network dynamics
  network_effect: [
    /\b(network\s+effect|network\s+effects)\b/i,
    /\b(flywheel|virtuous\s+(cycle|circle|loop))\b/i,
    /\b(two[\s-]?sided|multi[\s-]?sided)\s+(market|platform|network)\b/i,
    /\b(user[\s-]?to[\s-]?user|peer[\s-]?to[\s-]?peer|p2p)\b/i,
    /\b(creator|creators)\s+(and|to)\s+(audience|viewer)/i,
    /\b(buyer|buyers)\s+(and|to)\s+(seller|sellers)/i,
    /\bconnects?\s+(users?|people|buyers?|sellers?|creators?|viewers?)\s+to\b/i,
    /\bconnects?\s+\w+\s+to\s+\w+\s+to\s+\w+/i, // "connects users to videos to users"
    /\b(community|communities)\s+(of|connects?|driven)\b/i,
    /\b(user[\s-]?generated|crowd[\s-]?sourced|community[\s-]?driven)\b/i,
    /\b(viral|virality|word[\s-]?of[\s-]?mouth)\b/i,
    /\b(referral|referrals)\s+(loop|program|driven)\b/i,
    /\bmarketplace\b/i,
  ],

  // Founder-market fit - specific credibility signals
  founder_market_fit: [
    /\b(paypal|stripe|airbnb|uber|linkedin|twitter|netflix)\b/i,
    /\b(facebook|meta|amazon|apple|microsoft)\b/i,
    /\b(mckinsey|bain|bcg|goldman|morgan\s+stanley)\b/i,
    /\b(sequoia|a16z|andreessen|ycombinator|y\s+combinator)\b/i,
    /\b(recruited|hired)\s+(by|from)\b/i,
    /\b(first|early|founding)\s+(engineer|engineers|employee|employees|hire|hires)\b/i,
    /\bone\s+of\s+(the\s+)?(first|early|founding)\b/i,
    /\b(built|created|led|scaled|grew)\s+\w+\s+(at|for)\s+(paypal|google|facebook|amazon|apple|microsoft|stripe)\b/i,
    /\b(stanford|mit|harvard|yale|princeton|berkeley|wharton)\b/i,
    /\b(phd|ph\.d|doctorate)\b/i,
    /\b(exit|exited|sold|acquired|ipo)\b/i,
    /\b(serial\s+entrepreneur|industry\s+veteran)\b/i,
    /\b(years?\s+(of|in)\s+experience)\b/i,
  ],

  // Early pull / traction - specific evidence
  early_pull: [
    /\b(launched|shipped|deployed|went\s+live)\b/i,
    /\b(beta|alpha|pilot)\s+(customer|user|partner|launch)/i,
    /\b(active\s+users?|monthly\s+users?|daily\s+users?)\b/i,
    /\b(revenue|sales|bookings)\s+(\$|of\s+\$|\d)/i,
    /\b(arr|mrr|gmv)\s*[:\s]*\$?\d/i,
    /\b(downloads?|installs?|signups?)\s*[:\s]*\d/i,
    /\b(growth|growing|grew)\s+(\d+[%x]|\d+\s*(times?|x))/i,
    /\b(dominant|dominating|overtaken|surpassed|outpaced)\b/i,
    /\b(market\s+leader|#1|number\s+one|fastest\s+growing)\b/i,
    /\b(million|millions)\s+(users?|views?|downloads?|streams?)/i,
    /\b\d+\s*(k|m|mm)\s+(users?|customers?|downloads?|views?)/i,
    /\b(waitlist|wait\s+list)\s+of\s+\d/i,
    /\b(loi|letter\s+of\s+intent)\b/i,
    /\b(design\s+partner|beta\s+customer)\b/i,
  ],

  // Timing insight - specific timing arguments
  timing_insight: [
    /\b(finally|first\s+time|for\s+the\s+first\s+time|just\s+became)\b/i,
    /\b(shift|shifting|transition|transformation)\s+(in|to|from|happening)\b/i,
    /\b(disruption|disruptive|inflection|tipping\s+point)\b/i,
    /\b(reached|reaching|hit|crossed)\s+\w*\s*(critical\s+mass|scale|tipping|inflection)\b/i,
    /\b(cost|price)\s+\w*\s*(dropped|declined|decreased|fell|falling)\b/i,
    /\b(cheap\s+enough|affordable|democratiz)\w*/i,
    /\b(enables?|enabled|enabling|makes?\s+possible|made\s+possible)\b/i,
    /\b(wasn'?t\s+possible|couldn'?t\s+have|never\s+before)\b/i,
    /\b(regulation|regulatory)\s+\w*\s*(change|shift|new)\b/i,
    /\b(pandemic|covid|remote\s+work)\s+(drove|accelerated|changed)/i,
  ],

  // Infrastructure shift - specific technology shifts
  infrastructure_shift: [
    /\b(broadband|5g|4g|lte)\s+(penetration|adoption|rollout|enabled)/i,
    /\b(cloud|aws|azure|gcp)\s+(enabled|made\s+possible|infrastructure)/i,
    /\b(ai|machine\s+learning|ml|deep\s+learning|llm|gpt)\s+(enabled|breakthrough|revolution)/i,
    /\b(api|apis)\s+(economy|first|enabled|driven)/i,
    /\b(flash|streaming)\s+(video|enabled|technology)/i,
    /\bstreaming\s+(video|audio|media)\b/i,
    /\b(encoding|compression)\s+(improved|advances?|breakthrough)/i,
    /\b(cost\s+of\s+\w+\s+(dropped|declined|fell))/i,
    /\b(gpu|gpus|tpu)\s+(availability|cost|enabled)/i,
    /\b(mobile|smartphone)\s+(penetration|adoption|first)/i,
    /\b(scalable|scalability)\s+(infrastructure|architecture)/i,
  ],

  // Behavioral insight - specific user behavior understanding
  behavioral_insight: [
    /\b(users?|people|consumers?)\s+\w*\s*(want|need|prefer|choose|demand|love|hate)\b/i,
    /\b(behavior|behaviour|habit)\s+(change|shift|pattern)/i,
    /\b(trust|loyalty|satisfaction)\s+(built|earned|demonstrated)/i,
    /\b(motivation|incentive|reward)\s+(structure|loop|system)/i,
    /\b(discover|discovery)\s+(mechanism|loop|behavior)/i,
    /\b(word[\s-]?of[\s-]?mouth|organic)\s+(growth|spread|adoption)/i,
    /\b(switching|switch)\s+(cost|behavior|barrier)/i,
    /\b(daily|weekly)\s+(usage|engagement|habit)/i,
    /\b(repeat|recurring)\s+(usage|behavior|purchase)/i,
  ],
}

// Slide types that boost specific signal detection
const SLIDE_TYPE_SIGNAL_BOOST = {
  problem: ['consumer_pain', 'behavioral_insight'],
  solution: ['product_simplicity', 'infrastructure_shift'],
  product: ['product_simplicity', 'network_effect'],
  market: ['timing_insight', 'infrastructure_shift'],
  traction: ['early_pull'],
  team: ['founder_market_fit'],
  why_now: ['timing_insight', 'infrastructure_shift'],
}

// Slide types ELIGIBLE for grade lift (v4: excludes business_model and competition)
const GRADE_LIFT_ELIGIBLE_SLIDES = [
  'problem',
  'solution',
  'market',
  'traction',
  'team',
  'product',
  'why_now',
]

// Slide types that can receive fix suppression but NOT grade lifts
const FIX_SUPPRESSION_ONLY_SLIDES = [
  'business_model',
  'competition',
]

// All slides that can receive any signal override processing
const ALL_SIGNAL_OVERRIDE_SLIDES = [...GRADE_LIFT_ELIGIBLE_SLIDES, ...FIX_SUPPRESSION_ONLY_SLIDES]

// =============================================================================
// SUPPRESSION PATTERNS AND CONTEXT-SPECIFIC REPLACEMENTS
// =============================================================================

const SUPPRESSION_CATEGORIES = {
  unit_economics: {
    patterns: [
      /\bCAC\b/i,
      /\bLTV\b/i,
      /\bcustomer\s+acquisition\s+cost/i,
      /\blifetime\s+value/i,
      /\bpayback\s+period/i,
      /\bunit\s+economics/i,
      /\bcontribution\s+margin/i,
      /\bgross\s+margin/i,
      /\bprofit\s+margin/i,
      /\bmargins?\b/i,
    ],
    replacement_by_slide_type: {
      business_model: 'Clarify the primary monetization wedge and what user behavior would prove revenue potential.',
      traction: 'Focus on demonstrating user pull and engagement patterns rather than unit economics.',
      default: 'Demonstrate user traction and engagement before detailed unit economics.',
    },
  },

  retention_metrics: {
    patterns: [
      /\bretention\b/i,
      /\bchurn\b/i,
      /\bcohort/i,
      /\bDAU\b/i,
      /\bMAU\b/i,
      /\bDAU[\s\/]+MAU/i,
      /\bstickiness/i,
    ],
    replacement_by_slide_type: {
      traction: 'Provide the strongest available evidence of user pull: usage growth, repeat behavior, or competitor displacement.',
      product: 'Show evidence that users return or engage repeatedly, even without formal cohort data.',
      default: 'Qualitative evidence of repeat usage or user enthusiasm can substitute for formal retention metrics.',
    },
  },

  pricing: {
    patterns: [
      /\bpricing\b/i,
      /\bprice\s+point/i,
      /\bmonetization\b/i,
      /\brevenue\s+model\b/i,
      /\bARPU\b/i,
    ],
    replacement_by_slide_type: {
      business_model: 'Identify the likely monetization path and which user behavior indicates willingness to pay.',
      default: 'Demonstrate a plausible monetization path rather than detailed pricing.',
    },
  },

  moat_defensibility: {
    patterns: [
      /\bmoat\b/i,
      /\bdefensib/i,
      /\bbarrier\s+to\s+entry/i,
      /\bcompetitive\s+advantage/i,
      /\bsustainable\s+advantage/i,
      /\bpatent/i,
      /\block[\s-]?in/i,
    ],
    replacement_by_slide_type: {
      competition: 'Clarify the specific user or product insight that explains why users choose this product over alternatives.',
      solution: 'Show what makes the solution compelling to users rather than articulating formal defensibility.',
      default: 'Demonstrate user preference and product insight rather than formal moat articulation.',
    },
  },

  market_quantification: {
    patterns: [
      /\bTAM\b/i,
      /\bSAM\b/i,
      /\bSOM\b/i,
      /\bmarket\s+size\b/i,
      /\b(total|serviceable|obtainable)\s+\w*\s*market/i,
    ],
    replacement_by_slide_type: {
      market: 'Connect the market shift to the user behavior it unlocks and the initial segment most likely to adopt.',
      default: 'Demonstrate a clear wedge into a large opportunity rather than formal market sizing.',
    },
  },

  pmf_metrics: {
    patterns: [
      /\bproduct[\s-]?market\s+fit/i,
      /\bPMF\b/,
      /\bNPS\b/i,
      /\bnet\s+promoter/i,
    ],
    replacement_by_slide_type: {
      traction: 'Show qualitative evidence of product-market fit: user enthusiasm, organic growth, or strong engagement.',
      default: 'User behavior and organic growth are stronger PMF indicators than survey scores.',
    },
  },

  enterprise_saas: {
    patterns: [
      /\bsales\s+cycle/i,
      /\benterprise\s+sales/i,
      /\bcontract\s+value/i,
      /\bACV\b/i,
      /\bARR\b/i,
      /\bMRR\b/i,
      /\bpipeline\b/i,
    ],
    replacement_by_slide_type: {
      business_model: 'Show early customer interest (pilots, LOIs, design partners) rather than formal sales metrics.',
      traction: 'Demonstrate customer pull through pilots, waitlists, or design partnerships.',
      default: 'Early customer engagement signals matter more than formal sales metrics.',
    },
  },

  detailed_projections: {
    patterns: [
      /\bdetailed\s+(financial|revenue)/i,
      /\b5[\s-]?year/i,
      /\b(financial|revenue)\s+projection/i,
      /\bburn\s+rate/i,
      /\brunway/i,
      /\bforecast/i,
    ],
    replacement_by_slide_type: {
      financials: 'Show key assumptions driving growth rather than detailed multi-year projections.',
      default: 'Focus on growth drivers and capital efficiency rather than detailed forecasts.',
    },
  },
}

// =============================================================================
// SIGNAL DETECTION FUNCTIONS
// =============================================================================

/**
 * Check if a matched phrase is a weak keyword that shouldn't count alone.
 */
function isWeakMatch(matchedPhrase) {
  const normalized = matchedPhrase.toLowerCase().trim()
  return WEAK_KEYWORDS.has(normalized)
}

/**
 * Detect STRONG signals in slide text (filters out weak keywords).
 */
function detectSignals(slideText, slideType) {
  if (!slideText || typeof slideText !== 'string') {
    return { signals: [], signalCount: 0, signalStrength: 'none', signalTypes: [], strongSignalCount: 0 }
  }

  const signals = []
  const signalTypesFound = new Set()
  const boostedTypes = SLIDE_TYPE_SIGNAL_BOOST[slideType] || []

  for (const [signalType, patterns] of Object.entries(SIGNAL_PATTERNS)) {
    for (const pattern of patterns) {
      const match = slideText.match(pattern)
      if (match) {
        const matchedPhrase = match[0]

        // Filter out weak matches
        if (isWeakMatch(matchedPhrase)) {
          continue
        }

        const isBoosted = boostedTypes.includes(signalType)
        const isRelevantToSlide = isBoosted || isSignalRelevantToSlideType(signalType, slideType)

        signals.push({
          type: signalType,
          match: matchedPhrase,
          pattern: pattern.toString(),
          boosted: isBoosted,
          relevant_to_slide: isRelevantToSlide,
          slide_type_context: slideType,
          is_strong: true, // Only strong signals make it here
          qualification_reason: getSignalQualificationReason(signalType, matchedPhrase, slideType),
        })
        signalTypesFound.add(signalType)
        break // One match per signal type per slide
      }
    }
  }

  // Only count signals relevant to this slide type for strength calculation
  const relevantSignals = signals.filter(s => s.relevant_to_slide)
  const relevantCount = relevantSignals.length

  let signalStrength = 'none'
  if (relevantCount >= 3) {
    signalStrength = 'strong'
  } else if (relevantCount >= 2) {
    signalStrength = 'moderate'
  } else if (relevantCount >= 1) {
    signalStrength = 'weak'
  }

  return {
    signals,
    signalCount: signals.length,
    strongSignalCount: relevantCount,
    signalStrength,
    signalTypes: Array.from(signalTypesFound),
    relevantSignalTypes: relevantSignals.map(s => s.type),
  }
}

/**
 * Check if a signal type is relevant to a slide type.
 */
function isSignalRelevantToSlideType(signalType, slideType) {
  const relevanceMap = {
    problem: ['consumer_pain', 'behavioral_insight'],
    solution: ['product_simplicity', 'infrastructure_shift', 'behavioral_insight'],
    product: ['product_simplicity', 'network_effect', 'behavioral_insight'],
    market: ['timing_insight', 'infrastructure_shift', 'consumer_pain'],
    traction: ['early_pull', 'network_effect'],
    team: ['founder_market_fit'],
    competition: ['timing_insight', 'product_simplicity'],
    business_model: ['network_effect', 'early_pull'],
    why_now: ['timing_insight', 'infrastructure_shift'],
  }

  const relevant = relevanceMap[slideType] || []
  return relevant.includes(signalType)
}

/**
 * Get human-readable reason why a signal qualifies.
 */
function getSignalQualificationReason(signalType, matchedPhrase, slideType) {
  const reasons = {
    consumer_pain: `Problem/friction language "${matchedPhrase}" indicates user pain point`,
    product_simplicity: `Action/ease language "${matchedPhrase}" indicates clear product value`,
    network_effect: `Network dynamics "${matchedPhrase}" indicates multi-sided or viral potential`,
    founder_market_fit: `Credibility signal "${matchedPhrase}" indicates relevant background`,
    early_pull: `Traction evidence "${matchedPhrase}" indicates user/market pull`,
    timing_insight: `Timing argument "${matchedPhrase}" indicates why-now clarity`,
    infrastructure_shift: `Infrastructure change "${matchedPhrase}" indicates enabling technology`,
    behavioral_insight: `Behavioral understanding "${matchedPhrase}" indicates user insight`,
  }
  return reasons[signalType] || `Signal "${matchedPhrase}" detected`
}

/**
 * Detect deck-wide signals (for thesis-level analysis only).
 */
function detectDeckSignals(slides) {
  const allSignals = []
  const signalsByType = {}
  const signalsBySlide = {}

  for (const slide of slides) {
    const slideText = slide.extracted_text || slide.text || ''
    const slideType = slide.inferred_type || slide.type || 'unknown'

    const slideSignals = detectSignals(slideText, slideType)
    signalsBySlide[slide.slide_number] = slideSignals

    for (const signal of slideSignals.signals) {
      allSignals.push({
        ...signal,
        slide_number: slide.slide_number,
        slide_type: slideType,
      })

      if (!signalsByType[signal.type]) {
        signalsByType[signal.type] = []
      }
      signalsByType[signal.type].push({
        slide_number: slide.slide_number,
        match: signal.match,
        relevant: signal.relevant_to_slide,
      })
    }
  }

  // Synergies - for deck-level thesis interpretation ONLY (not individual slides)
  const synergies = []

  if (signalsByType.timing_insight && signalsByType.infrastructure_shift) {
    synergies.push({
      name: 'timing_infrastructure_synergy',
      description: 'Clear timing insight combined with infrastructure shift',
    })
  }

  if (signalsByType.consumer_pain && signalsByType.product_simplicity) {
    synergies.push({
      name: 'clear_value_prop_synergy',
      description: 'Clear pain point + simple solution',
    })
  }

  if (signalsByType.founder_market_fit && signalsByType.early_pull) {
    synergies.push({
      name: 'credible_traction_synergy',
      description: 'Strong founder-market fit with early traction',
    })
  }

  const uniqueSignalTypes = Object.keys(signalsByType).length
  let deckSignalStrength = 'none'
  if (uniqueSignalTypes >= 5) {
    deckSignalStrength = 'strong'
  } else if (uniqueSignalTypes >= 3) {
    deckSignalStrength = 'moderate'
  } else if (uniqueSignalTypes >= 1) {
    deckSignalStrength = 'weak'
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

// =============================================================================
// SLIDE OVERRIDE LOGIC (v4 - calibrated)
// =============================================================================

/**
 * Apply signal override to a single slide with +1 grade cap.
 */
function applySlideSignalOverride(slideEval, slideSignals, deckSignals, options = {}) {
  const originalScore = slideEval.normalized_score
  const originalGrade = slideEval.grade
  const slideType = slideEval.type

  // Check if slide is eligible for GRADE LIFT (not just fix suppression)
  const eligibleForGradeLift = GRADE_LIFT_ELIGIBLE_SLIDES.includes(slideType)
  const eligibleForFixSuppression = ALL_SIGNAL_OVERRIDE_SLIDES.includes(slideType)

  if (!eligibleForFixSuppression) {
    return {
      adjusted: false,
      reason: 'Slide type not eligible for signal override',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      maxAllowedGrade: originalGrade,
      capPrevented: false,
      signalsDetected: [],
      signalTypes: [],
      slideSpecificSignals: [],
    }
  }

  // For business_model and competition - no grade lift, only fix suppression
  if (!eligibleForGradeLift) {
    return {
      adjusted: false,
      reason: `Slide type "${slideType}" only eligible for fix suppression, not grade lift`,
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      maxAllowedGrade: originalGrade,
      capPrevented: false,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
      slideSpecificSignals: slideSignals.signals.filter(s => s.relevant_to_slide),
      fixSuppressionOnly: true,
    }
  }

  // v4: Only use slide-specific signals (not deck-level)
  const relevantSignals = slideSignals.signals.filter(s => s.relevant_to_slide)
  const relevantSignalCount = relevantSignals.length

  if (relevantSignalCount === 0) {
    return {
      adjusted: false,
      reason: 'No slide-specific investor signals detected',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      maxAllowedGrade: getNextGrade(originalGrade),
      capPrevented: false,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
      slideSpecificSignals: [],
    }
  }

  // v4: Calculate max allowed grade (+1 letter grade cap)
  const maxAllowedGrade = getNextGrade(originalGrade)
  const maxAllowedScore = getGradeMinScore(maxAllowedGrade)

  // Check if already at or above the next grade threshold
  // Exception: if within 0.25 points (0.05 normalized) of next grade, allow reaching it
  const distanceToNextGrade = maxAllowedScore - originalScore
  const withinException = distanceToNextGrade <= 0.05 && distanceToNextGrade > 0

  if (originalScore >= maxAllowedScore) {
    return {
      adjusted: false,
      reason: `Score ${(originalScore * 5).toFixed(2)} already meets or exceeds cap`,
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      maxAllowedGrade,
      capPrevented: false,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
      slideSpecificSignals: relevantSignals,
      signalStrength: slideSignals.signalStrength,
    }
  }

  // Calculate target score based on signal strength (v4: no synergy boost on slides)
  let targetScore
  if (relevantSignalCount >= 3) {
    // Strong slide-specific signals: lift to just above next grade threshold
    targetScore = maxAllowedScore + 0.01
  } else if (relevantSignalCount >= 2) {
    // Moderate: lift to next grade threshold
    targetScore = maxAllowedScore
  } else {
    // Weak (1 signal): lift halfway to next grade
    targetScore = originalScore + (distanceToNextGrade / 2)
  }

  // v4: HARD CAP - never exceed +1 letter grade
  const adjustedScore = Math.min(targetScore, maxAllowedScore + 0.01)
  const adjustedGrade = scoreToGrade(adjustedScore)

  // Check if cap prevented further lift
  const capPrevented = targetScore > (maxAllowedScore + 0.01)
  const wouldHaveBeenGrade = scoreToGrade(targetScore)

  if (adjustedScore <= originalScore) {
    return {
      adjusted: false,
      reason: 'Calculated adjustment would not improve score',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      maxAllowedGrade,
      capPrevented: false,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
      slideSpecificSignals: relevantSignals,
    }
  }

  return {
    adjusted: true,
    reason: `Signal override: ${relevantSignalCount} slide-specific signal(s) lifted ${originalGrade} → ${adjustedGrade}`,
    originalScore,
    originalScoreOn5Scale: originalScore * 5,
    adjustedScore,
    adjustedScoreOn5Scale: adjustedScore * 5,
    originalGrade,
    adjustedGrade,
    maxAllowedGrade,
    capPrevented,
    wouldHaveBeenGrade: capPrevented ? wouldHaveBeenGrade : null,
    liftAmount: (adjustedScore - originalScore) * 5,
    signalsDetected: slideSignals.signals.map(s => s.match),
    signalTypes: slideSignals.signalTypes,
    slideSpecificSignals: relevantSignals.map(s => ({
      type: s.type,
      match: s.match,
      qualification_reason: s.qualification_reason,
    })),
    signalStrength: slideSignals.signalStrength,
    relevantSignalCount,
  }
}

// =============================================================================
// FIX SUPPRESSION
// =============================================================================

function suppressInappropriateFixesForSlide(questions, slideType, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  if (!isSeedConsumerNetwork) {
    return { questions, suppressedCount: 0, suppressedFixes: [] }
  }

  const suppressedFixes = []
  let suppressedCount = 0

  const filteredQuestions = questions.map(q => {
    if (!q.fix || q.fix === 'None needed' || q.fix === 'None needed.') {
      return q
    }

    for (const [category, config] of Object.entries(SUPPRESSION_CATEGORIES)) {
      for (const pattern of config.patterns) {
        if (pattern.test(q.fix)) {
          suppressedCount++

          const replacement = config.replacement_by_slide_type[slideType] ||
                              config.replacement_by_slide_type.default

          suppressedFixes.push({
            slide_type: slideType,
            question: q.question,
            original_fix: q.fix,
            replacement_fix: replacement,
            matched_pattern: pattern.toString(),
            suppression_category: category,
          })

          return {
            ...q,
            fix: replacement,
            fix_suppressed: true,
            original_fix: q.fix,
            suppression_category: category,
          }
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

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

function applySignalOverride(slides, slideEvaluations, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  console.log('[signal-override] ========================================')
  console.log('[signal-override] applySignalOverride v4 CALLED (calibrated)')
  console.log(`[signal-override] isSeedConsumerNetwork: ${isSeedConsumerNetwork}`)
  console.log(`[signal-override] Slides: ${slides.length}, Evaluations: ${slideEvaluations.length}`)

  const deckSignals = detectDeckSignals(slides)

  console.log(`[signal-override] Deck signal strength: ${deckSignals.deckSignalStrength}`)
  console.log(`[signal-override] Unique signal types: ${deckSignals.uniqueSignalTypes}`)
  console.log(`[signal-override] Signal types found: ${Object.keys(deckSignals.signalsByType).join(', ') || 'NONE'}`)
  console.log(`[signal-override] Synergies (thesis-level only): ${deckSignals.synergies.length}`)

  if (deckSignals.allSignals.length > 0) {
    console.log('[signal-override] Strong signals detected:')
    for (const sig of deckSignals.allSignals) {
      const marker = sig.relevant_to_slide ? '[RELEVANT]' : '[deck-only]'
      console.log(`[signal-override]   Slide ${sig.slide_number} (${sig.slide_type}): ${sig.type} = "${sig.match}" ${marker}`)
    }
  } else {
    console.log('[signal-override] NO STRONG SIGNALS DETECTED')
  }

  const adjustedEvaluations = []
  const overrideResults = []
  let totalLifted = 0
  let totalSuppressedFixes = 0
  let totalCapPrevented = 0
  const beforeAfterSummary = []
  const allSuppressedFixes = []

  for (const slideEval of slideEvaluations) {
    const slideSignals = deckSignals.signalsBySlide[slideEval.slide_number] || {
      signals: [],
      signalCount: 0,
      signalStrength: 'none',
      signalTypes: [],
    }

    const overrideResult = applySlideSignalOverride(slideEval, slideSignals, deckSignals, options)
    overrideResults.push({
      slide_number: slideEval.slide_number,
      slide_type: slideEval.type,
      ...overrideResult,
    })

    if (overrideResult.adjusted) {
      totalLifted++
      console.log(`[signal-override] LIFTED: Slide ${slideEval.slide_number} (${slideEval.type}): ${overrideResult.originalGrade} -> ${overrideResult.adjustedGrade} (max: ${overrideResult.maxAllowedGrade})`)
    }

    if (overrideResult.capPrevented) {
      totalCapPrevented++
      console.log(`[signal-override] CAP PREVENTED: Slide ${slideEval.slide_number} would have been ${overrideResult.wouldHaveBeenGrade}`)
    }

    const { questions, suppressedCount, suppressedFixes } = suppressInappropriateFixesForSlide(
      slideEval.questions,
      slideEval.type,
      options
    )
    totalSuppressedFixes += suppressedCount

    if (suppressedCount > 0) {
      console.log(`[signal-override] Suppressed ${suppressedCount} fix(es) on slide ${slideEval.slide_number}`)
      for (const sf of suppressedFixes) {
        allSuppressedFixes.push(sf)
      }
    }

    beforeAfterSummary.push({
      slide: slideEval.slide_number,
      type: slideEval.type,
      eligible_for_lift: GRADE_LIFT_ELIGIBLE_SLIDES.includes(slideEval.type),
      signals_count: slideSignals.signalCount,
      relevant_signals_count: overrideResult.relevantSignalCount || 0,
      signal_types: slideSignals.signalTypes,
      before_grade: overrideResult.originalGrade,
      after_grade: overrideResult.adjustedGrade,
      max_allowed_grade: overrideResult.maxAllowedGrade,
      cap_prevented: overrideResult.capPrevented,
      changed: overrideResult.adjusted,
      reason: overrideResult.reason,
      fixes_suppressed_count: suppressedCount,
    })

    const adjusted = {
      ...slideEval,
      grade: overrideResult.adjustedGrade,
      normalized_score: overrideResult.adjustedScore,
      questions,
      _original_grade: overrideResult.originalGrade,
      _original_score: overrideResult.originalScore,
      _signal_override_applied: overrideResult.adjusted,
      _fixes_suppressed: suppressedCount,
      _cap_prevented: overrideResult.capPrevented,
    }

    adjustedEvaluations.push(adjusted)
  }

  console.log(`[signal-override] Total slides lifted: ${totalLifted}`)
  console.log(`[signal-override] Total caps prevented further lift: ${totalCapPrevented}`)
  console.log(`[signal-override] Total fixes suppressed: ${totalSuppressedFixes}`)
  console.log('[signal-override] ========================================')

  const slidesChangedList = beforeAfterSummary
    .filter(s => s.changed)
    .map(s => `Slide ${s.slide} (${s.type}): ${s.before_grade} → ${s.after_grade} (max: ${s.max_allowed_grade})`)

  const statusMessage = (totalLifted > 0 || totalSuppressedFixes > 0)
    ? `Signal override ACTIVE: lifted ${totalLifted} slide(s), suppressed ${totalSuppressedFixes} fix(es), ${totalCapPrevented} cap(s) applied`
    : `Signal override ran, no changes made (${deckSignals.deckSignalStrength} deck signal strength)`

  const debug = {
    status: statusMessage,
    signal_override_executed: true,
    version: 'v4-calibrated',
    executed_at: new Date().toISOString(),

    calibration_rules: {
      max_lift_per_slide: '+1 letter grade',
      synergy_boost_on_slides: false,
      weak_keywords_filtered: Array.from(WEAK_KEYWORDS).slice(0, 10).join(', ') + '...',
      slide_specific_evidence_required: true,
      grade_lift_eligible_types: GRADE_LIFT_ELIGIBLE_SLIDES,
      fix_suppression_only_types: FIX_SUPPRESSION_ONLY_SLIDES,
    },

    summary: {
      any_changes_made: totalLifted > 0 || totalSuppressedFixes > 0,
      slides_processed: slideEvaluations.length,
      slides_eligible_for_lift: slideEvaluations.filter(s => GRADE_LIFT_ELIGIBLE_SLIDES.includes(s.type)).length,
      slides_grade_lifted: totalLifted,
      caps_that_prevented_lift: totalCapPrevented,
      fixes_suppressed: totalSuppressedFixes,
      slides_changed: slidesChangedList,
    },

    deck_signal_analysis: {
      overall_strength: deckSignals.deckSignalStrength,
      unique_signal_types_found: deckSignals.uniqueSignalTypes,
      signal_types: Object.keys(deckSignals.signalsByType),
      signals_by_type: Object.fromEntries(
        Object.entries(deckSignals.signalsByType).map(([type, matches]) => [
          type,
          matches.map(m => ({
            slide: m.slide_number,
            match: m.match,
            relevant_to_slide: m.relevant,
          }))
        ])
      ),
      all_signals_found: deckSignals.allSignals.map(s => ({
        slide_number: s.slide_number,
        slide_type: s.slide_type,
        signal_type: s.type,
        matched_phrase: s.match,
        relevant_to_slide: s.relevant_to_slide,
        qualification_reason: s.qualification_reason,
      })),
      synergies_detected: deckSignals.synergies,
      synergies_note: 'Synergies affect deck-level thesis interpretation only, not individual slide scores',
    },

    suppression_reasons: allSuppressedFixes,

    slide_by_slide: beforeAfterSummary.map(s => ({
      slide_number: s.slide,
      slide_type: s.type,
      eligible_for_grade_lift: s.eligible_for_lift,
      signals_detected: s.signals_count,
      relevant_signals_count: s.relevant_signals_count,
      signal_types: s.signal_types,
      grade_before: s.before_grade,
      grade_after: s.after_grade,
      max_allowed_grade: s.max_allowed_grade,
      cap_prevented_further_lift: s.cap_prevented,
      was_changed: s.changed,
      reason: s.reason,
      fixes_suppressed: s.fixes_suppressed_count,
    })),

    detailed_overrides: overrideResults,

    config: {
      is_seed_consumer_network: isSeedConsumerNetwork,
      grade_lift_eligible_types: GRADE_LIFT_ELIGIBLE_SLIDES,
      fix_suppression_only_types: FIX_SUPPRESSION_ONLY_SLIDES,
    },
  }

  return {
    adjustedEvaluations,
    debug,
    totalLifted,
    totalSuppressedFixes,
    totalCapPrevented,
  }
}

module.exports = {
  detectSignals,
  detectDeckSignals,
  applySlideSignalOverride,
  suppressInappropriateFixesForSlide,
  applySignalOverride,
  SIGNAL_PATTERNS,
  SUPPRESSION_CATEGORIES,
  WEAK_KEYWORDS,
  GRADE_LIFT_ELIGIBLE_SLIDES,
  FIX_SUPPRESSION_ONLY_SLIDES,
}
