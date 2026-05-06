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
 *
 * IMPORTANT: This system is universal - it works across all deck types:
 * SaaS, marketplace, consumer, infrastructure, healthcare, fintech, AI, B2B, etc.
 */

console.log('[signal-override] SIGNAL OVERRIDE MODULE LOADED (v2 - improved detection)')

// =============================================================================
// SIGNAL PATTERNS - Broad semantic detection across all deck types
// =============================================================================

const SIGNAL_PATTERNS = {
  // Consumer/user pain - problem language showing friction, inconvenience, broken workflow
  consumer_pain: [
    // Direct pain language
    /\b(frustrat|annoy|hate|difficult|hard|painful|tedious|slow|expensive|broken|manual|clunky)\w*/i,
    /\b(problem|issue|challenge|gap|limitation|barrier|obstacle|bottleneck|friction)\b/i,
    /\b(pain point|headache|nightmare|hassle|struggle)\b/i,
    // Negative state
    /\b(too large|too big|too slow|too expensive|too hard|too complex|too fragmented)\b/i,
    /\b(can't|cannot|unable to|no way to|impossible to|hard to)\b/i,
    /\b(waste|wasted|wasting) (time|money|effort|resources)\b/i,
    /\b(lack of|missing|no|without) (standard|solution|option|alternative|tool)\b/i,
    // Existing behavior failure
    /\b(exist|current|today|traditional)\w* .{0,20}(fail|broken|inadequate|poor|bad|limited)\b/i,
    /\b(isolated|fragmented|disconnected|siloed|scattered)\b/i,
    // File/data problems (common in tech)
    /\bfiles? (are |is )?(too |very )?(large|big|heavy|unwieldy)\b/i,
    /\b(no |lack of |missing )standardization\b/i,
  ],

  // Product simplicity - clear action verbs and ease language
  product_simplicity: [
    // Simple action verbs
    /\b(upload|download|share|browse|watch|create|connect|automate|simplify|manage|search|discover|match|generate|analyze|track|monitor|sync|integrate|route|replace)\b/i,
    // Ease language
    /\b(simple|easy|instant|fast|quick|automatic|seamless|one[- ]?click|frictionless|intuitive|self[- ]?service)\b/i,
    /\b(anyone can|just|simply|automatically|instantly)\b/i,
    /\b(no .{0,15}(required|needed|necessary))\b/i,
    /\b(free to|easy to|simple to)\b/i,
    // Takes care of / handles
    /\b(takes? care of|handles?|manages?|automates?) .{0,30}(for|automatically)\b/i,
    // Platform value prop
    /\b(platform|service|tool|app|solution) (that |which )?(lets?|allows?|enables?|helps?)\b/i,
    // Conversion/transformation
    /\b(converts?|transforms?|turns?) .{0,20}(into|to)\b/i,
  ],

  // Network effect / community / marketplace dynamics
  network_effect: [
    // Direct network language
    /\bnetwork effect\b/i,
    /\b(flywheel|virtuous cycle|virtuous circle)\b/i,
    /\b(two[- ]?sided|multi[- ]?sided) (market|platform|network)\b/i,
    // User-to-user dynamics
    /\b(user[- ]?to[- ]?user|peer[- ]?to[- ]?peer|p2p|creator|audience|buyer|seller|supply|demand)\b/i,
    /\b(connects?) .{0,20}(users?|people|buyers?|sellers?|creators?|viewers?)\b/i,
    /\bconnects? .{0,15}to .{0,15}(users?|videos?|content|products?)\b/i,
    // Community language
    /\b(community|social|sharing|collaboration|collaborative|referral|invite|viral)\b/i,
    /\b(user[- ]?generated|crowd[- ]?sourced|community[- ]?driven)\b/i,
    // Marketplace language
    /\b(marketplace|platform|ecosystem|hub|network)\b/i,
    // Distribution dynamics
    /\b(share|sharing|shared|shares) .{0,20}(with|to|among)\b/i,
    /\b(spread|spreading|viral|organic)\b/i,
  ],

  // Founder-market fit - credibility, expertise, relevant background
  founder_market_fit: [
    // Prior company credibility
    /\b(paypal|google|facebook|meta|amazon|apple|microsoft|stripe|airbnb|uber|linkedin|twitter|netflix|salesforce|oracle|ibm|mckinsey|bain|bcg|goldman|morgan stanley)\b/i,
    // Role/expertise language
    /\b(founder|co[- ]?founder|ceo|cto|cpo|cmo|vp|director|head of|lead|senior|principal|partner)\b/i,
    /\b(engineer|designer|product|architect|scientist|researcher|analyst|developer)\b/i,
    // Background indicators
    /\b(recruited|hired) by\b/i,
    /\b(first|early|founding) (engineer|employee|designer|hire|team member)\b/i,
    /\b(built|created|designed|led|managed|scaled|grew) .{0,30}(at|for|while)\b/i,
    // Education signals
    /\b(stanford|mit|harvard|yale|princeton|berkeley|carnegie mellon|caltech|oxford|cambridge)\b/i,
    /\b(phd|doctorate|graduate student|researcher|professor)\b/i,
    // Domain expertise
    /\b(years? of|years? in) (experience|industry|domain)\b/i,
    /\b(domain expert|subject matter expert|industry veteran|serial entrepreneur)\b/i,
    /\bpreviously (built|founded|led|created|sold|exited)\b/i,
  ],

  // Early pull / traction - evidence of user interest or growth
  early_pull: [
    // Launch/live indicators
    /\b(launched|live|released|shipped|deployed|beta|alpha|pilot)\b/i,
    // User/customer metrics (even qualitative)
    /\b(users?|customers?|clients?|subscribers?|members?|accounts?)\b/i,
    /\b(revenue|sales|bookings|arr|mrr|gmv)\b/i,
    /\b(downloads?|installs?|signups?|registrations?)\b/i,
    // Growth language
    /\b(growth|growing|grew|traction|adoption|uptake|engagement|retention)\b/i,
    /\b(dominant|leading|overtaken|surpassed|outpaced)\b/i,
    /\b(million|thousand|100k|\d+k|\d+m)\b/i,
    // Pipeline/interest indicators
    /\b(waitlist|pipeline|loi|letter of intent|pilot|trial|poc|proof of concept)\b/i,
    /\b(partnership|partner|integration|customer|testimonial)\b/i,
    // Competitive position
    /\b(market leader|dominant player|#1|number one|fastest growing)\b/i,
  ],

  // Timing insight - why now is the right moment
  timing_insight: [
    // Now language
    /\b(now|finally|first time|just became|recently|emerging)\b/i,
    /\b(for the first time)\b/i,
    // Shift/change language
    /\b(shift|change|transition|transformation|disruption|inflection|tipping point)\b/i,
    /\b(reached|reaching|hit|hitting) .{0,15}(critical mass|scale|tipping point|inflection)\b/i,
    // Cost/capability changes
    /\b(cost|price|expense) .{0,20}(drop|decline|decrease|fell|falling|cheaper)\b/i,
    /\b(cheap enough|affordable|accessible|democratized)\b/i,
    // Enabler language
    /\b(enables?|enabled|enabling|makes? possible|made possible|unlocks?|unlocked)\b/i,
    /\b(viable|feasible|practical|possible) .{0,15}(for the first time|now|finally)\b/i,
    // Regulatory/market timing
    /\b(regulation|regulatory|compliance|policy) .{0,15}(change|shift|new|recent)\b/i,
    /\b(pandemic|covid|remote work|ai revolution|ai wave)\b/i,
  ],

  // Infrastructure shift - enabling technology or platform change
  infrastructure_shift: [
    // Technology platforms
    /\b(broadband|5g|4g|lte|wifi|internet|web|mobile|smartphone|tablet|cloud|saas|api)\b/i,
    /\b(ai|artificial intelligence|machine learning|ml|deep learning|llm|gpt|neural)\b/i,
    /\b(blockchain|crypto|web3|defi)\b/i,
    // Infrastructure language
    /\b(infrastructure|platform|ecosystem|stack|framework|protocol)\b/i,
    /\b(scalable|scalability|elastic|serverless|distributed)\b/i,
    // Encoding/processing
    /\b(encoding|processing|compute|storage|bandwidth|latency)\b/i,
    /\b(flash|streaming|video|audio|media|content delivery)\b/i,
    // Cost curves
    /\b(mass[- ]?produce|commoditized|standardized|ubiquitous|widespread)\b/i,
    /\b(penetration|adoption|availability|accessibility)\b/i,
    // Data/sensors
    /\b(sensors?|iot|data|analytics|telemetry|real[- ]?time)\b/i,
  ],

  // Behavioral insight - understanding of user behavior and psychology
  behavioral_insight: [
    // User behavior language
    /\b(users?|people|consumers?|customers?) .{0,20}(want|need|prefer|choose|expect|demand|love|hate)\b/i,
    /\b(behavior|habit|pattern|workflow|routine|practice)\b/i,
    /\b(adoption|usage|engagement|interaction|activity)\b/i,
    // Psychology language
    /\b(trust|loyalty|satisfaction|delight|frustration|anxiety|fear|excitement)\b/i,
    /\b(motivation|incentive|reward|gamification|sticky|addictive)\b/i,
    // Discovery/sharing behavior
    /\b(discover|share|recommend|refer|invite|spread|tell friends)\b/i,
    /\b(word[- ]?of[- ]?mouth|organic|viral|social proof)\b/i,
    // Switching/avoidance
    /\b(switch|switching|migrate|abandon|leave|avoid|replace)\b/i,
    // Repeated need
    /\b(daily|weekly|monthly|regular|frequent|repeated|recurring|habitual)\b/i,
  ],
}

// Slide types that boost specific signal detection
const SLIDE_TYPE_SIGNAL_BOOST = {
  problem: ['consumer_pain', 'behavioral_insight'],
  solution: ['product_simplicity', 'infrastructure_shift'],
  product: ['product_simplicity', 'network_effect'],
  market: ['timing_insight', 'infrastructure_shift', 'behavioral_insight'],
  traction: ['early_pull', 'network_effect'],
  team: ['founder_market_fit'],
  competition: ['timing_insight', 'product_simplicity'],
  business_model: ['network_effect', 'product_simplicity'],
}

// Slide types eligible for score override
const SIGNAL_OVERRIDE_ELIGIBLE_SLIDES = [
  'problem',
  'solution',
  'market',
  'traction',
  'team',
  'product',
  'competition',
  'business_model',
]

// Score floors based on signal strength
const SIGNAL_SCORE_FLOORS = {
  exceptional: 4.0, // 4+ signals = minimum B
  strong: 3.5,      // 2-3 signals = minimum B-
  moderate: 3.0,    // 1 signal = minimum C+
}

const SIGNAL_GRADE_FLOORS = {
  exceptional: 'B',
  strong: 'B',
  moderate: 'C',
}

// =============================================================================
// SUPPRESSION PATTERNS AND CONTEXT-SPECIFIC REPLACEMENTS
// =============================================================================

// Categories of fixes to suppress with context-aware replacements
const SUPPRESSION_CATEGORIES = {
  unit_economics: {
    patterns: [
      /\bCAC\b/i,
      /\bLTV\b/i,
      /\bcustomer acquisition cost/i,
      /\blifetime value/i,
      /\bpayback period/i,
      /\bunit economics/i,
      /\bcontribution margin/i,
      /\bgross margin/i,
      /\bprofit margin/i,
      /\bmargin[s]?\b/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, clarify which revenue stream is the primary wedge and what milestone would prove monetization potential.',
      traction: 'At this stage, focus on demonstrating user pull and engagement patterns rather than unit economics.',
      default: 'For seed-stage companies, demonstrate user traction and engagement before detailed unit economics.',
    },
  },

  retention_metrics: {
    patterns: [
      /\bretention\b/i,
      /\bchurn\b/i,
      /\bcohort/i,
      /\bDAU\b/i,
      /\bMAU\b/i,
      /\bDAU\/MAU/i,
      /\bstickiness/i,
      /\bengagement (rate|metric)/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, provide the strongest available evidence of user pull, such as usage growth, repeat behavior, or competitor displacement.',
      product: 'At this stage, show evidence that users return or engage repeatedly, even without formal cohort data.',
      default: 'For seed-stage companies, qualitative evidence of repeat usage or user enthusiasm can substitute for formal retention metrics.',
    },
  },

  pricing: {
    patterns: [
      /\bpricing\b/i,
      /\bprice point/i,
      /\bmonetization\b/i,
      /\brevenue model\b/i,
      /\bARPU\b/i,
      /\brevenue per user/i,
      /\bsubscription (tier|plan|pricing)/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, identify the likely monetization path without requiring full pricing detail. Show which user behavior indicates willingness to pay.',
      default: 'For seed-stage companies, demonstrate a plausible monetization path rather than detailed pricing.',
    },
  },

  moat_defensibility: {
    patterns: [
      /\bmoat\b/i,
      /\bdefensib/i,
      /\bbarrier to entry/i,
      /\bcompetitive advantage/i,
      /\bsustainable advantage/i,
      /\bpatent/i,
      /\bintellectual property\b/i,
      /\bIP strategy/i,
      /\block[- ]?in/i,
    ],
    replacement_by_slide_type: {
      competition: 'At this stage, clarify the specific user or product insight that explains why users choose this product over alternatives.',
      solution: 'At this stage, show what makes the solution compelling to users rather than articulating formal defensibility.',
      default: 'For seed-stage companies, demonstrate user preference and product insight rather than formal moat articulation.',
    },
  },

  market_quantification: {
    patterns: [
      /\bTAM\b/i,
      /\bSAM\b/i,
      /\bSOM\b/i,
      /\bmarket size\b/i,
      /\b(total|serviceable|obtainable) .{0,15}market/i,
      /\bbottom[- ]?up .{0,10}(analysis|sizing|calculation)/i,
      /\bmarket (quantif|sizing|calculation)/i,
    ],
    replacement_by_slide_type: {
      market: 'At this stage, connect the market shift to the user behavior it unlocks and the initial segment most likely to adopt.',
      default: 'For seed-stage companies, demonstrate a clear wedge into a large opportunity rather than formal market sizing.',
    },
  },

  pmf_metrics: {
    patterns: [
      /\bproduct[- ]?market fit/i,
      /\bNPS\b/i,
      /\bnet promoter/i,
      /\bsatisfaction score/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, show qualitative evidence of product-market fit: user enthusiasm, organic growth, or strong engagement.',
      default: 'For seed-stage companies, user behavior and organic growth are stronger PMF indicators than survey scores.',
    },
  },

  enterprise_saas: {
    patterns: [
      /\bsales cycle/i,
      /\benterprise sales/i,
      /\bcontract value/i,
      /\bACV\b/i,
      /\bARR\b/i,
      /\bMRR\b/i,
      /\bpipeline\b/i,
      /\bquota\b/i,
      /\bsales team/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, show early customer interest (pilots, LOIs, design partners) rather than formal sales metrics.',
      traction: 'At this stage, demonstrate customer pull through pilots, waitlists, or design partnerships.',
      default: 'For seed-stage B2B companies, early customer engagement signals matter more than formal sales metrics.',
    },
  },

  detailed_projections: {
    patterns: [
      /\bdetailed (financial|revenue)/i,
      /\b5[- ]?year/i,
      /\b(financial|revenue) projection/i,
      /\bburn rate/i,
      /\brunway/i,
      /\bbreak[- ]?even/i,
      /\bforecast/i,
    ],
    replacement_by_slide_type: {
      financials: 'At this stage, show key assumptions driving growth rather than detailed multi-year projections.',
      default: 'For seed-stage companies, focus on growth drivers and capital efficiency rather than detailed forecasts.',
    },
  },

  specific_metrics: {
    patterns: [
      /\bspecific metrics/i,
      /\bquantif/i,
      /\bmeasurable/i,
      /\bconcrete numbers/i,
      /\bexact figures/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, provide the strongest available evidence of momentum, even if qualitative.',
      problem: 'At this stage, demonstrate the problem clearly through user examples or behavioral evidence.',
      default: 'For seed-stage companies, directional evidence and user stories can be as compelling as precise metrics.',
    },
  },
}

// =============================================================================
// SIGNAL DETECTION FUNCTIONS
// =============================================================================

/**
 * Detect signals in slide text with slide-type context boosting.
 */
function detectSignals(slideText, slideType) {
  if (!slideText || typeof slideText !== 'string') {
    return { signals: [], signalCount: 0, signalStrength: 'none', signalTypes: [] }
  }

  const signals = []
  const signalTypesFound = new Set()

  // Get boosted signal types for this slide type
  const boostedTypes = SLIDE_TYPE_SIGNAL_BOOST[slideType] || []

  for (const [signalType, patterns] of Object.entries(SIGNAL_PATTERNS)) {
    for (const pattern of patterns) {
      const match = slideText.match(pattern)
      if (match) {
        const isBoosted = boostedTypes.includes(signalType)
        signals.push({
          type: signalType,
          match: match[0],
          pattern: pattern.toString(),
          boosted: isBoosted,
          slide_type_context: slideType,
        })
        signalTypesFound.add(signalType)
        break // One match per signal type per slide
      }
    }
  }

  // Calculate signal strength
  // Boosted signals count extra
  const boostedCount = signals.filter(s => s.boosted).length
  const effectiveCount = signals.length + (boostedCount * 0.5) // Boosted signals worth 1.5x

  let signalStrength = 'none'
  if (effectiveCount >= 4) {
    signalStrength = 'exceptional'
  } else if (effectiveCount >= 2) {
    signalStrength = 'strong'
  } else if (effectiveCount >= 1) {
    signalStrength = 'moderate'
  }

  return {
    signals,
    signalCount: signals.length,
    signalStrength,
    signalTypes: Array.from(signalTypesFound),
    boostedCount,
  }
}

/**
 * Detect deck-wide signals across all slides.
 */
function detectDeckSignals(slides) {
  const allSignals = []
  const signalsByType = {}
  const signalsBySlide = {}

  for (const slide of slides) {
    const slideSignals = detectSignals(slide.extracted_text, slide.inferred_type)
    signalsBySlide[slide.slide_number] = slideSignals

    for (const signal of slideSignals.signals) {
      allSignals.push({
        ...signal,
        slide_number: slide.slide_number,
        slide_type: slide.inferred_type,
      })

      if (!signalsByType[signal.type]) {
        signalsByType[signal.type] = []
      }
      signalsByType[signal.type].push({
        slide_number: slide.slide_number,
        match: signal.match,
      })
    }
  }

  // Check for synergistic signal combinations
  const synergies = []

  if (signalsByType.timing_insight && signalsByType.infrastructure_shift) {
    synergies.push({
      name: 'timing_infrastructure_synergy',
      description: 'Clear timing insight combined with infrastructure shift',
      boost: 0.3,
    })
  }

  if (signalsByType.behavioral_insight && signalsByType.network_effect) {
    synergies.push({
      name: 'viral_potential_synergy',
      description: 'Behavioral understanding + network effect potential',
      boost: 0.3,
    })
  }

  if (signalsByType.consumer_pain && signalsByType.product_simplicity) {
    synergies.push({
      name: 'clear_value_prop_synergy',
      description: 'Clear pain point + simple solution',
      boost: 0.2,
    })
  }

  if (signalsByType.founder_market_fit && Object.keys(signalsByType).length > 1) {
    synergies.push({
      name: 'founder_fit_synergy',
      description: 'Strong founder-market fit with domain signals',
      boost: 0.2,
    })
  }

  if (signalsByType.early_pull && signalsByType.network_effect) {
    synergies.push({
      name: 'traction_network_synergy',
      description: 'Early traction with network dynamics',
      boost: 0.25,
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
// SLIDE OVERRIDE LOGIC
// =============================================================================

/**
 * Apply signal override to a single slide evaluation.
 */
function applySlideSignalOverride(slideEval, slideSignals, deckSignals, options = {}) {
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
      signalsDetected: [],
      signalTypes: [],
    }
  }

  const signalStrength = slideSignals.signalStrength
  const deckStrength = deckSignals.deckSignalStrength

  // Use stronger of slide signal or deck signal (with dampening)
  let effectiveStrength = signalStrength
  if (deckStrength === 'exceptional' && signalStrength !== 'exceptional') {
    effectiveStrength = signalStrength === 'none' ? 'moderate' : signalStrength
  } else if (deckStrength === 'strong' && signalStrength === 'none') {
    effectiveStrength = 'moderate'
  }

  if (effectiveStrength === 'none' || effectiveStrength === 'weak') {
    return {
      adjusted: false,
      reason: 'Insufficient investor signals detected',
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
    }
  }

  // Get score floor for this signal strength
  const scoreFloor = SIGNAL_SCORE_FLOORS[effectiveStrength]
  const gradeFloor = SIGNAL_GRADE_FLOORS[effectiveStrength]

  // Convert normalized score (0-1) to 5-point scale
  const scoreOn5Scale = originalScore * 5

  if (scoreOn5Scale >= scoreFloor) {
    return {
      adjusted: false,
      reason: `Score ${scoreOn5Scale.toFixed(2)} already meets floor ${scoreFloor}`,
      originalScore,
      adjustedScore: originalScore,
      originalGrade,
      adjustedGrade: originalGrade,
      signalsDetected: slideSignals.signals.map(s => s.match),
      signalTypes: slideSignals.signalTypes,
      signalStrength: effectiveStrength,
    }
  }

  // Apply the floor
  const adjustedScoreOn5Scale = scoreFloor

  // Calculate synergy bonus from deck-level signals
  let synergyBoost = 0
  for (const synergy of deckSignals.synergies) {
    synergyBoost += synergy.boost
  }
  synergyBoost = Math.min(0.5, synergyBoost) // Cap at 0.5

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
    reason: `Signal override: ${effectiveStrength} signals (${slideSignals.signalTypes.join(', ')}) lifted score from ${scoreOn5Scale.toFixed(2)} to ${finalScoreOn5Scale.toFixed(2)}`,
    originalScore,
    originalScoreOn5Scale: scoreOn5Scale,
    adjustedScore: finalNormalized,
    adjustedScoreOn5Scale: finalScoreOn5Scale,
    originalGrade,
    adjustedGrade,
    liftAmount: finalScoreOn5Scale - scoreOn5Scale,
    signalsDetected: slideSignals.signals.map(s => s.match),
    signalTypes: slideSignals.signalTypes,
    signalStrength: effectiveStrength,
    deckSignalStrength: deckStrength,
    synergyBoost,
    synergiesApplied: deckSignals.synergies.map(s => s.name),
    floor: scoreFloor,
    gradeFloor,
  }
}

// =============================================================================
// FIX SUPPRESSION WITH CONTEXT-SPECIFIC REPLACEMENTS
// =============================================================================

/**
 * Suppress inappropriate fixes with context-specific replacements.
 */
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

    // Check each suppression category
    for (const [category, config] of Object.entries(SUPPRESSION_CATEGORIES)) {
      for (const pattern of config.patterns) {
        if (pattern.test(q.fix)) {
          suppressedCount++

          // Get context-specific replacement
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

/**
 * Apply signal override adjustment to all slide evaluations.
 */
function applySignalOverride(slides, slideEvaluations, options = {}) {
  const { isSeedConsumerNetwork = false } = options

  console.log('[signal-override] ========================================')
  console.log('[signal-override] applySignalOverride v2 CALLED')
  console.log(`[signal-override] isSeedConsumerNetwork: ${isSeedConsumerNetwork}`)
  console.log(`[signal-override] Slides: ${slides.length}, Evaluations: ${slideEvaluations.length}`)

  // Detect deck-wide signals
  const deckSignals = detectDeckSignals(slides)

  console.log(`[signal-override] Deck signal strength: ${deckSignals.deckSignalStrength}`)
  console.log(`[signal-override] Unique signal types: ${deckSignals.uniqueSignalTypes}`)
  console.log(`[signal-override] Signal types found: ${Object.keys(deckSignals.signalsByType).join(', ') || 'NONE'}`)
  console.log(`[signal-override] Synergies: ${deckSignals.synergies.length}`)

  // Log all detected signals
  if (deckSignals.allSignals.length > 0) {
    console.log('[signal-override] All signals detected:')
    for (const sig of deckSignals.allSignals) {
      console.log(`[signal-override]   Slide ${sig.slide_number} (${sig.slide_type}): ${sig.type} = "${sig.match}"`)
    }
  }

  // Process each slide
  const adjustedEvaluations = []
  const overrideResults = []
  let totalLifted = 0
  let totalSuppressedFixes = 0
  const beforeAfterSummary = []
  const allSuppressedFixes = []

  for (const slideEval of slideEvaluations) {
    const slideSignals = deckSignals.signalsBySlide[slideEval.slide_number] || {
      signals: [],
      signalCount: 0,
      signalStrength: 'none',
      signalTypes: [],
    }

    // Apply signal override
    const overrideResult = applySlideSignalOverride(slideEval, slideSignals, deckSignals, options)
    overrideResults.push({
      slide_number: slideEval.slide_number,
      slide_type: slideEval.type,
      ...overrideResult,
    })

    if (overrideResult.adjusted) {
      totalLifted++
      console.log(`[signal-override] LIFTED: Slide ${slideEval.slide_number} (${slideEval.type}): ${overrideResult.originalGrade} -> ${overrideResult.adjustedGrade}`)
    }

    // Suppress inappropriate fixes
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

    // Track before/after
    beforeAfterSummary.push({
      slide: slideEval.slide_number,
      type: slideEval.type,
      eligible: SIGNAL_OVERRIDE_ELIGIBLE_SLIDES.includes(slideEval.type),
      signals_count: slideSignals.signalCount,
      signal_types: slideSignals.signalTypes,
      before_grade: overrideResult.originalGrade,
      after_grade: overrideResult.adjustedGrade,
      changed: overrideResult.adjusted,
      reason: overrideResult.reason,
      fixes_suppressed_count: suppressedCount,
    })

    // Build adjusted evaluation
    const adjusted = {
      ...slideEval,
      grade: overrideResult.adjustedGrade,
      normalized_score: overrideResult.adjustedScore,
      questions,
      _original_grade: overrideResult.originalGrade,
      _original_score: overrideResult.originalScore,
      _signal_override_applied: overrideResult.adjusted,
      _fixes_suppressed: suppressedCount,
    }

    adjustedEvaluations.push(adjusted)
  }

  console.log(`[signal-override] Total slides lifted: ${totalLifted}`)
  console.log(`[signal-override] Total fixes suppressed: ${totalSuppressedFixes}`)
  console.log('[signal-override] ========================================')

  // Build human-readable status
  const slidesChangedList = beforeAfterSummary
    .filter(s => s.changed)
    .map(s => `Slide ${s.slide} (${s.type}): ${s.before_grade} → ${s.after_grade}`)

  const statusMessage = (totalLifted > 0 || totalSuppressedFixes > 0)
    ? `Signal override ACTIVE: lifted ${totalLifted} slide(s), suppressed ${totalSuppressedFixes} fix(es)`
    : `Signal override ran, no changes made (${deckSignals.deckSignalStrength} deck signal strength, ${deckSignals.uniqueSignalTypes} signal types)`

  // Build comprehensive debug output
  const debug = {
    status: statusMessage,
    signal_override_executed: true,
    executed_at: new Date().toISOString(),

    summary: {
      any_changes_made: totalLifted > 0 || totalSuppressedFixes > 0,
      slides_processed: slideEvaluations.length,
      slides_eligible_for_override: slideEvaluations.filter(s => SIGNAL_OVERRIDE_ELIGIBLE_SLIDES.includes(s.type)).length,
      slides_grade_lifted: totalLifted,
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
          matches.map(m => ({ slide: m.slide_number, match: m.match }))
        ])
      ),
      all_signals_found: deckSignals.allSignals.map(s => ({
        slide_number: s.slide_number,
        slide_type: s.slide_type,
        signal_type: s.type,
        matched_phrase: s.match,
        boosted: s.boosted,
      })),
      synergies_detected: deckSignals.synergies,
    },

    suppression_reasons: allSuppressedFixes,

    slide_by_slide: beforeAfterSummary.map(s => ({
      slide_number: s.slide,
      slide_type: s.type,
      eligible_for_override: s.eligible,
      signals_detected: s.signals_count,
      signal_types: s.signal_types,
      grade_before: s.before_grade,
      grade_after: s.after_grade,
      was_changed: s.changed,
      reason: s.reason,
      fixes_suppressed: s.fixes_suppressed_count,
    })),

    detailed_overrides: overrideResults,

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
  SUPPRESSION_CATEGORIES,
}
