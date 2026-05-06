/**
 * Investor Signal Override System v3
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

console.log('[signal-override] SIGNAL OVERRIDE MODULE LOADED (v3 - comprehensive detection)')

// =============================================================================
// SIGNAL PATTERNS - Broad semantic detection across all deck types
// =============================================================================

const SIGNAL_PATTERNS = {
  // Consumer/user pain - problem language showing friction, inconvenience, broken workflow
  consumer_pain: [
    // Direct pain/problem words
    /\b(frustrat|annoy|hate|painful|tedious)\w*/i,
    /\b(problem|issue|challenge|gap|limitation|barrier|obstacle|bottleneck)\b/i,
    /\b(pain\s*point|headache|nightmare|hassle|struggle)\b/i,
    // Difficulty language
    /\b(difficult|hard|complicated|complex|confusing|overwhelming)\b/i,
    /\bhard\s+to\b/i,
    /\bdifficult\s+to\b/i,
    // Negative state qualifiers
    /\b(too\s+(large|big|slow|expensive|hard|complex|fragmented|small|limited))\b/i,
    /\b(very\s+(large|big|slow|expensive|hard|complex|fragmented))\b/i,
    // Inability language
    /\b(can'?t|cannot|unable\s+to|no\s+way\s+to|impossible\s+to)\b/i,
    /\b(couldn'?t|could\s+not)\b/i,
    // Waste/inefficiency
    /\b(waste|wasted|wasting)\b/i,
    /\b(inefficien|time-consuming|labor-intensive)\w*/i,
    // Missing/lacking
    /\b(lack\s+of|lacking|missing|no\s+standard|without)\b/i,
    /\b(no\s+(good|real|easy|simple)\s+(way|solution|option|tool))\b/i,
    // Broken/failing existing state
    /\b(broken|failed|failing|outdated|legacy|antiquated)\b/i,
    /\b(exist\w*|current|today'?s?|traditional)\s+\w+\s+(fail|broken|inadequate|poor|bad|limited|don'?t)\w*/i,
    // Fragmentation/isolation
    /\b(isolated|fragmented|disconnected|siloed|scattered|decentralized)\b/i,
    /\b(fragment\w*|dispers\w*|disorganiz\w*)\b/i,
    // Specific friction language
    /\b(friction|clunky|cumbersome|awkward)\b/i,
    /\b(manual|manually|by\s+hand)\b/i,
    /\b(slow|slower|slowest)\b/i,
    /\b(expensive|costly|high\s+cost|overpriced)\b/i,
    // User suffering
    /\b(suffer|suffering|pain|pains|ache|aching)\b/i,
    /\b(burden|burdensome|onerous)\b/i,
    // Access/availability issues
    /\b(inaccessible|unavailable|hard\s+to\s+(find|get|access|reach))\b/i,
    /\b(limited\s+(access|availability|options?))\b/i,
    // Workflow problems
    /\b(workflow|process)\s+\w*\s*(broken|inefficient|slow|manual|painful)\b/i,
  ],

  // Product simplicity - clear action verbs and ease language
  product_simplicity: [
    // Core action verbs (from user spec)
    /\b(upload|download|share|browse|watch|view|listen|read|play)\b/i,
    /\b(automate|simplif|streamlin|eliminat)\w*/i,
    /\b(create|build|make|design|generate|produce)\b/i,
    /\b(connect|link|join|bridge|integrate)\b/i,
    /\b(manage|organize|track|monitor|control|coordinate)\b/i,
    /\b(search|find|discover|explore|browse|locate)\b/i,
    /\b(match|route|direct|guide|recommend)\b/i,
    /\b(analyze|measure|assess|evaluate|compare)\b/i,
    /\b(replace|substitute|swap|convert|transform|turn)\b/i,
    /\b(sync|synchronize|update|refresh)\b/i,
    // Ease/simplicity language
    /\b(simple|easy|instant|fast|quick|rapid)\b/i,
    /\b(automatic|automated|seamless|frictionless|effortless)\b/i,
    /\b(one[\s-]?click|single[\s-]?click|with\s+one\s+click)\b/i,
    /\b(intuitive|straightforward|user[\s-]?friendly)\b/i,
    /\b(self[\s-]?service|no[\s-]?code|low[\s-]?code)\b/i,
    // Qualifier phrases
    /\b(anyone\s+can|just|simply|easily|instantly|automatically)\b/i,
    /\b(no\s+\w+\s+(required|needed|necessary))\b/i,
    /\b(free\s+to|easy\s+to|simple\s+to)\b/i,
    /\b(without\s+(any|the\s+need|having))\b/i,
    // Platform/product value proposition
    /\b(platform|service|tool|app|product|solution)\s+(that\s+)?(lets?|allows?|enables?|helps?|makes?)\b/i,
    /\b(lets?\s+(you|users?|people|anyone))\b/i,
    /\b(allows?\s+(you|users?|people|anyone))\b/i,
    /\b(enables?\s+(you|users?|people|anyone))\b/i,
    // Handles/takes care of
    /\b(takes?\s+care\s+of|handles?|manages?)\s+\w+\s+(for|automatically)\b/i,
    /\b(handles?\s+(all|the|everything))\b/i,
    // Transformation language
    /\b(converts?|transforms?|turns?)\s+\w+\s+(into|to|from)\b/i,
    // Serving/delivering value
    /\b(serves?|delivers?|provides?)\s+\w+\s+to\b/i,
  ],

  // Network effect / community / marketplace dynamics
  network_effect: [
    // Direct network terminology
    /\b(network\s+effect|network\s+effects)\b/i,
    /\b(flywheel|virtuous\s+(cycle|circle|loop))\b/i,
    /\b(two[\s-]?sided|multi[\s-]?sided|double[\s-]?sided)\s+(market|platform|network)?\b/i,
    // User-to-user dynamics - flexible patterns
    /\b(user[\s-]?to[\s-]?user|peer[\s-]?to[\s-]?peer|p2p)\b/i,
    /\b(creator|creators|audience|audiences|viewer|viewers)\b/i,
    /\b(buyer|buyers|seller|sellers|merchant|merchants)\b/i,
    /\b(supply|demand|supplier|suppliers)\b/i,
    // Connect patterns - flexible word order
    /\bconnects?\s+\w+\s+to\b/i,
    /\bconnects?\s+(users?|people|buyers?|sellers?|creators?|viewers?|videos?|content)\b/i,
    /\bconnecting\s+\w+\s+(to|with|and)\b/i,
    // Community language
    /\b(community|communities|social|collaborative|shared)\b/i,
    /\b(sharing|share|shares|shared)\b/i,
    /\b(collaboration|collaborate|collaborating)\b/i,
    /\b(referral|referrals|invite|invites|invitation)\b/i,
    /\b(viral|virality|word[\s-]?of[\s-]?mouth)\b/i,
    // User-generated content
    /\b(user[\s-]?generated|crowd[\s-]?sourced|community[\s-]?driven|community[\s-]?created)\b/i,
    /\b(ugc|content\s+creators?)\b/i,
    // Marketplace/platform language
    /\b(marketplace|market\s+place|platform|ecosystem|hub|exchange)\b/i,
    // Distribution dynamics
    /\b(spread|spreading|spreads|organic)\b/i,
    /\b(distribution|distribute|distributed)\b/i,
    /\b(loop|loops|cycle|cycles)\b/i,
    // Interaction patterns
    /\b(interact|interaction|interacting|engagement|engaging)\b/i,
    /\bto\s+\w+\s+to\s+\w+\s+to\b/i, // "users to videos to users" pattern
  ],

  // Founder-market fit - credibility, expertise, relevant background
  founder_market_fit: [
    // Prior company credibility - major tech companies
    /\b(paypal|google|facebook|meta|amazon|apple|microsoft|stripe|airbnb|uber|linkedin|twitter|netflix)\b/i,
    /\b(salesforce|oracle|ibm|intel|nvidia|adobe|spotify|snap|pinterest|dropbox|slack|zoom|figma)\b/i,
    // Top consulting/finance
    /\b(mckinsey|bain|bcg|boston\s+consulting|goldman|morgan\s+stanley|jp\s*morgan)\b/i,
    /\b(sequoia|a16z|andreessen|ycombinator|y\s+combinator|kpcb|kleiner|accel|benchmark)\b/i,
    // Role/title language - flexible
    /\b(founder|co[\s-]?founder|ceo|cto|cpo|cmo|coo|cfo)\b/i,
    /\b(vp|vice\s+president|director|head\s+of|lead|senior|principal|partner)\b/i,
    /\b(engineer|engineers|engineering|designer|designers|product)\b/i,
    /\b(architect|scientist|researcher|analyst|developer|developers)\b/i,
    // Recruitment/hiring signals
    /\b(recruited|hired|brought\s+on)\s+(by|from|at)\b/i,
    /\b(joined|joining)\s+\w+\s+(at|from)\b/i,
    // Early employee patterns - with plural support
    /\b(first|early|founding|original)\s+(engineer|engineers|employee|employees|designer|designers|hire|hires|team|member|members)\b/i,
    /\b(employee\s+#?\d+|hire\s+#?\d+)\b/i,
    /\bone\s+of\s+(the\s+)?(first|early|founding)\b/i,
    // Built/led experience
    /\b(built|created|designed|led|managed|scaled|grew|launched|founded|started)\s+\w+\s+(at|for|while|with)\b/i,
    /\b(built|created|led|scaled|grew)\s+(the|a)\s+\w+\b/i,
    /\b(previously|formerly)\s+(built|founded|led|created|worked|at)\b/i,
    // Education signals
    /\b(stanford|mit|harvard|yale|princeton|berkeley|carnegie\s*mellon|caltech|oxford|cambridge|wharton)\b/i,
    /\b(phd|ph\.d|doctorate|masters?|mba|graduate\s+student)\b/i,
    /\b(professor|researcher|research\s+scientist)\b/i,
    // Domain expertise
    /\b(years?\s+(of|in)\s+(experience|industry|the\s+industry|this\s+space))\b/i,
    /\b(domain\s+expert|subject\s+matter\s+expert|industry\s+veteran|serial\s+entrepreneur)\b/i,
    /\b(deep\s+(expertise|experience|knowledge|understanding))\b/i,
    // Exit/track record
    /\b(exit|exited|sold|acquired|ipo)\b/i,
    /\b(track\s+record|proven|successful\s+(entrepreneur|founder))\b/i,
    // Team composition signals
    /\b(team\s+(from|includes?|with|of))\b/i,
    /\b(background\s+in|background\s+from|came\s+from)\b/i,
  ],

  // Early pull / traction - evidence of user interest or growth
  early_pull: [
    // Launch/live indicators
    /\b(launched|launch|launching|live|released|release|shipped|ship|deployed|deploy)\b/i,
    /\b(beta|alpha|pilot|pilots|piloting|soft\s+launch|early\s+access)\b/i,
    /\b(went\s+live|going\s+live|now\s+live)\b/i,
    // User/customer language - flexible
    /\b(users?|customers?|clients?|subscribers?|members?|accounts?)\b/i,
    /\b(active\s+users?|monthly\s+users?|daily\s+users?)\b/i,
    // Revenue/sales
    /\b(revenue|sales|bookings|income|earnings)\b/i,
    /\b(arr|mrr|gmv|arpu|aov)\b/i,
    // Downloads/signups
    /\b(downloads?|installs?|signups?|sign[\s-]?ups?|registrations?)\b/i,
    // Growth language
    /\b(growth|growing|grew|traction|adoption|uptake|momentum)\b/i,
    /\b(engagement|retention|usage|activity)\b/i,
    /\b(increasing|increased|increase|rising|rose|accelerat)\w*/i,
    // Competitive position
    /\b(dominant|dominating|dominance|leading|leader|overtaken|surpassed|outpaced|beat|beating)\b/i,
    /\b(market\s+leader|#1|number\s+one|fastest\s+growing|top\s+\d+)\b/i,
    // Metrics language
    /\b(million|millions|thousand|thousands|100k|10k|\d+k|\d+m|\d+\s*mm)\b/i,
    /\b(\d+[%x]\s+(growth|increase|improvement))\b/i,
    // Pipeline/interest indicators
    /\b(waitlist|wait\s+list|pipeline|loi|letter\s+of\s+intent)\b/i,
    /\b(pilot|pilots|trial|trials|poc|proof\s+of\s+concept)\b/i,
    /\b(design\s+partner|beta\s+(customer|user|tester))\b/i,
    // Partnership/validation
    /\b(partnership|partnerships|partner|partners|integration|integrations)\b/i,
    /\b(customer|customers|testimonial|testimonials|case\s+study|case\s+studies)\b/i,
    // Demand indicators
    /\b(demand|inquir|interest|request)\w*/i,
    /\b(inbound|organic|word[\s-]?of[\s-]?mouth)\b/i,
  ],

  // Timing insight - why now is the right moment
  timing_insight: [
    // Now language
    /\b(now|finally|first\s+time|for\s+the\s+first\s+time|just\s+became|recently|emerging)\b/i,
    /\b(today|this\s+year|this\s+decade|this\s+moment)\b/i,
    // Shift/change language
    /\b(shift|shifting|change|changing|transition|transitioning|transformation|transforming)\b/i,
    /\b(disruption|disrupting|disruptive|inflection|tipping\s+point)\b/i,
    /\b(evolution|revolution|breakthrough)\b/i,
    // Critical mass language
    /\b(reached|reaching|hit|hitting|crossed|crossing)\s+\w*\s*(critical\s+mass|scale|tipping|inflection|milestone)\b/i,
    /\b(critical\s+mass|tipping\s+point|inflection\s+point)\b/i,
    // Cost/capability changes
    /\b(cost|price|expense)\s+\w*\s*(drop|decline|decrease|fell|falling|cheaper|down)\b/i,
    /\b(cheap\s+enough|affordable|accessible|democratiz)\w*/i,
    /\b(cost\s+curve|price\s+decline|cost\s+reduction)\b/i,
    // Enabler language
    /\b(enables?|enabled|enabling|makes?\s+possible|made\s+possible|unlock|unlocked|unlocking)\b/i,
    /\b(viable|feasible|practical|possible)\s+\w*\s*(for\s+the\s+first\s+time|now|finally|today)\b/i,
    /\b(wasn'?t\s+possible|couldn'?t\s+have|never\s+before)\b/i,
    // Regulatory/market timing
    /\b(regulation|regulatory|compliance|policy)\s+\w*\s*(change|shift|new|recent|update)\b/i,
    /\b(deregulation|new\s+regulation|regulatory\s+change)\b/i,
    // Era/wave language
    /\b(pandemic|covid|remote\s+work|ai\s+revolution|ai\s+wave|new\s+era)\b/i,
    /\b(wave|trend|movement|adoption\s+curve)\b/i,
    // Maturity signals
    /\b(mature|matured|maturing|ready|readiness|ripe)\b/i,
    /\b(infrastructure\s+(is|was|now)\s+(ready|mature|available))\b/i,
  ],

  // Infrastructure shift - enabling technology or platform change
  infrastructure_shift: [
    // Connectivity/communication
    /\b(broadband|5g|4g|lte|wifi|wi[\s-]?fi|internet|web|online|connected)\b/i,
    /\b(mobile|smartphone|tablet|device|devices)\b/i,
    // Cloud/computing
    /\b(cloud|aws|azure|gcp|saas|paas|iaas|serverless|microservices)\b/i,
    /\b(api|apis|rest|graphql|webhook|integration)\b/i,
    // AI/ML
    /\b(ai|artificial\s+intelligence|machine\s+learning|ml|deep\s+learning|neural|llm|gpt|transformer)\b/i,
    /\b(nlp|natural\s+language|computer\s+vision|cv|generative)\b/i,
    // Blockchain/crypto (if relevant)
    /\b(blockchain|crypto|web3|defi|smart\s+contract)\b/i,
    // Infrastructure language
    /\b(infrastructure|platform|ecosystem|stack|framework|protocol)\b/i,
    /\b(scalable|scalability|elastic|distributed|decentralized)\b/i,
    // Processing/encoding
    /\b(encoding|decoding|processing|compression|compute|computing)\b/i,
    /\b(storage|bandwidth|latency|throughput|capacity)\b/i,
    // Media/content delivery
    /\b(flash|streaming|video|audio|media|content\s+delivery|cdn)\b/i,
    /\b(streaming\s+(video|audio|media|content))\b/i,
    // Cost curve / availability
    /\b(mass[\s-]?produc|commoditiz|standardiz|ubiquit|widesprea)\w*/i,
    /\b(penetration|adoption|availability|accessibility)\b/i,
    /\b(cost\s+(of|for)\s+\w+\s+(dropped|declined|fell|decreased|down))\b/i,
    // Data/sensors
    /\b(sensors?|iot|internet\s+of\s+things|telemetry|real[\s-]?time)\b/i,
    /\b(data|big\s+data|analytics|data\s+availability)\b/i,
    // GPU/hardware
    /\b(gpu|gpus|tpu|chip|chips|semiconductor|hardware)\b/i,
    // Payment/fintech infrastructure
    /\b(payments?|payment\s+rails|stripe|square|fintech|banking\s+api)\b/i,
  ],

  // Behavioral insight - understanding of user behavior and psychology
  behavioral_insight: [
    // User behavior explicit
    /\b(users?|people|consumers?|customers?)\s+\w*\s*(want|need|prefer|choose|expect|demand|love|hate|like|avoid)\b/i,
    /\b(behavior|behaviour|habit|habits|pattern|patterns|workflow|routine|practice)\b/i,
    /\b(adoption|usage|engagement|interaction|activity)\b/i,
    // Psychology/emotion language
    /\b(trust|loyalty|satisfaction|delight|frustration|anxiety|fear|excitement|confidence)\b/i,
    /\b(motivation|incentive|reward|gamification|sticky|addictive|hook|hooked)\b/i,
    /\b(emotional|psychology|psycholog|mindset)\w*/i,
    // Discovery/sharing behavior
    /\b(discover|discovering|discovery|share|sharing|recommend|recommending|refer|referring|invite|inviting)\b/i,
    /\b(tell\s+friends|tell\s+others|spread|spreading)\b/i,
    /\b(word[\s-]?of[\s-]?mouth|organic|viral|social\s+proof)\b/i,
    // Switching/avoidance
    /\b(switch|switching|migrate|migrating|abandon|abandoning|leave|leaving|churn)\b/i,
    /\b(avoid|avoiding|replace|replacing)\b/i,
    // Repeated/frequent need
    /\b(daily|weekly|monthly|regular|regularly|frequent|frequently|repeated|recurring|habitual)\b/i,
    /\b(every\s+(day|week|month|time)|all\s+the\s+time|constantly)\b/i,
    // User action language
    /\b(when\s+(users?|people|they)\s+\w+)\b/i,
    /\b(how\s+(users?|people|they)\s+\w+)\b/i,
    // Value perception
    /\b(value|valuable|worth|worthwhile|willingness\s+to\s+pay)\b/i,
    /\b(pain\s+point|friction\s+point|moment\s+of)\b/i,
  ],
}

// Slide types that boost specific signal detection
const SLIDE_TYPE_SIGNAL_BOOST = {
  problem: ['consumer_pain', 'behavioral_insight', 'timing_insight'],
  solution: ['product_simplicity', 'infrastructure_shift', 'behavioral_insight'],
  product: ['product_simplicity', 'network_effect', 'behavioral_insight'],
  market: ['timing_insight', 'infrastructure_shift', 'behavioral_insight', 'consumer_pain'],
  traction: ['early_pull', 'network_effect', 'behavioral_insight'],
  team: ['founder_market_fit'],
  competition: ['timing_insight', 'product_simplicity', 'infrastructure_shift'],
  business_model: ['network_effect', 'product_simplicity', 'behavioral_insight'],
  why_now: ['timing_insight', 'infrastructure_shift'],
  financials: ['early_pull'],
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
  'why_now',
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
      /\bcustomer\s+acquisition\s+cost/i,
      /\blifetime\s+value/i,
      /\bpayback\s+period/i,
      /\bunit\s+economics/i,
      /\bcontribution\s+margin/i,
      /\bgross\s+margin/i,
      /\bprofit\s+margin/i,
      /\bmargins?\b/i,
      /\bcost\s+per\s+(acquisition|customer|user)/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, clarify which revenue stream is the primary wedge and what milestone would prove monetization potential.',
      traction: 'At this stage, focus on demonstrating user pull and engagement patterns rather than unit economics.',
      market: 'At this stage, show why this market timing creates a cost-effective acquisition opportunity.',
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
      /\bDAU[\s\/]+MAU/i,
      /\bstickiness/i,
      /\bengagement\s+(rate|metric|score)/i,
      /\brepeat\s+(rate|usage|purchase)/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, provide the strongest available evidence of user pull, such as usage growth, repeat behavior, or competitor displacement.',
      product: 'At this stage, show evidence that users return or engage repeatedly, even without formal cohort data.',
      business_model: 'At this stage, demonstrate user engagement patterns that suggest long-term value.',
      default: 'For seed-stage companies, qualitative evidence of repeat usage or user enthusiasm can substitute for formal retention metrics.',
    },
  },

  pricing: {
    patterns: [
      /\bpricing\b/i,
      /\bprice\s+point/i,
      /\bmonetization\b/i,
      /\brevenue\s+model\b/i,
      /\bARPU\b/i,
      /\brevenue\s+per\s+user/i,
      /\bsubscription\s+(tier|plan|pricing)/i,
      /\bpricing\s+(strategy|model|structure)/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, identify the likely monetization path without requiring full pricing detail. Show which user behavior indicates willingness to pay.',
      traction: 'At this stage, focus on user engagement that validates demand before optimizing pricing.',
      default: 'For seed-stage companies, demonstrate a plausible monetization path rather than detailed pricing.',
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
      /\bintellectual\s+property\b/i,
      /\bIP\s+strategy/i,
      /\block[\s-]?in/i,
      /\bswitching\s+cost/i,
    ],
    replacement_by_slide_type: {
      competition: 'At this stage, clarify the specific user or product insight that explains why users choose this product over alternatives.',
      solution: 'At this stage, show what makes the solution compelling to users rather than articulating formal defensibility.',
      product: 'At this stage, demonstrate unique product value that creates natural user preference.',
      market: 'At this stage, explain the insight that gives this team an advantage in capturing this opportunity.',
      default: 'For seed-stage companies, demonstrate user preference and product insight rather than formal moat articulation.',
    },
  },

  market_quantification: {
    patterns: [
      /\bTAM\b/i,
      /\bSAM\b/i,
      /\bSOM\b/i,
      /\bmarket\s+size\b/i,
      /\b(total|serviceable|obtainable)\s+\w*\s*market/i,
      /\bbottom[\s-]?up\s+\w*\s*(analysis|sizing|calculation)/i,
      /\bmarket\s+(quantif|sizing|calculation)/i,
      /\b(top[\s-]?down|bottom[\s-]?up)\s+(analysis|approach)/i,
    ],
    replacement_by_slide_type: {
      market: 'At this stage, connect the market shift to the user behavior it unlocks and the initial segment most likely to adopt.',
      problem: 'At this stage, demonstrate the scope of the problem through user examples rather than market sizing.',
      default: 'For seed-stage companies, demonstrate a clear wedge into a large opportunity rather than formal market sizing.',
    },
  },

  pmf_metrics: {
    patterns: [
      /\bproduct[\s-]?market\s+fit/i,
      /\bPMF\b/,
      /\bNPS\b/i,
      /\bnet\s+promoter/i,
      /\bsatisfaction\s+score/i,
      /\buser\s+satisfaction/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, show qualitative evidence of product-market fit: user enthusiasm, organic growth, or strong engagement.',
      product: 'At this stage, demonstrate that users genuinely value the product through behavior and feedback.',
      default: 'For seed-stage companies, user behavior and organic growth are stronger PMF indicators than survey scores.',
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
      /\bquota\b/i,
      /\bsales\s+team/i,
      /\bsales\s+motion/i,
      /\bsales\s+process/i,
    ],
    replacement_by_slide_type: {
      business_model: 'At this stage, show early customer interest (pilots, LOIs, design partners) rather than formal sales metrics.',
      traction: 'At this stage, demonstrate customer pull through pilots, waitlists, or design partnerships.',
      team: 'At this stage, show relevant domain expertise rather than formal sales organization.',
      default: 'For seed-stage B2B companies, early customer engagement signals matter more than formal sales metrics.',
    },
  },

  detailed_projections: {
    patterns: [
      /\bdetailed\s+(financial|revenue)/i,
      /\b5[\s-]?year/i,
      /\b(financial|revenue)\s+projection/i,
      /\bburn\s+rate/i,
      /\brunway/i,
      /\bbreak[\s-]?even/i,
      /\bforecast/i,
      /\bpro[\s-]?forma/i,
    ],
    replacement_by_slide_type: {
      financials: 'At this stage, show key assumptions driving growth rather than detailed multi-year projections.',
      business_model: 'At this stage, clarify the path to revenue and key milestones rather than detailed forecasts.',
      default: 'For seed-stage companies, focus on growth drivers and capital efficiency rather than detailed forecasts.',
    },
  },

  specific_metrics: {
    patterns: [
      /\bspecific\s+metrics/i,
      /\bquantif/i,
      /\bmeasurable/i,
      /\bconcrete\s+numbers/i,
      /\bexact\s+figures/i,
      /\bhard\s+data/i,
    ],
    replacement_by_slide_type: {
      traction: 'At this stage, provide the strongest available evidence of momentum, even if qualitative.',
      problem: 'At this stage, demonstrate the problem clearly through user examples or behavioral evidence.',
      market: 'At this stage, show market opportunity through user behavior and adoption patterns.',
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

  // Normalize text for matching (preserve original for display)
  const normalizedText = slideText.toLowerCase()

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
        break // One match per signal type per slide is sufficient
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

  if (signalsByType.consumer_pain && signalsByType.timing_insight) {
    synergies.push({
      name: 'pain_timing_synergy',
      description: 'Clear pain point with timing insight',
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
  console.log('[signal-override] applySignalOverride v3 CALLED')
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
  } else {
    console.log('[signal-override] NO SIGNALS DETECTED - check slide text extraction')
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
