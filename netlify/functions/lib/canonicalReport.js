/**
 * Canonical PitchDeckCheck Report Engine (artifact-based, V1-free)
 *
 * Builds the live report intelligence directly from:
 *   - framework topics (RUBRICS) + rubric questions
 *   - already-computed per-slide rubric evaluations (fullReport.slides[].questions)
 *   - deterministic company context + investment case
 *
 * It does NOT consume v1_report, V1 slide feedback, V1 quality dimensions, the
 * V1 believe/question sections, or V1 unified synthesis. Reusable non-V1 mapping
 * helpers are imported from reportV2Assembler.js (single source of truth).
 *
 * Two entry points:
 *   - buildCanonicalReport(input)            -> the canonical model (stored)
 *   - buildCanonicalReportV2Sections(m, ctx) -> report_v2-shaped object (rendered)
 *
 * First live cut: answer quality/location and communication scores are derived
 * deterministically from the rubric results. A dedicated LLM communication
 * evaluator (Completeness/Clarity/Brevity/Flow at deck + topic level) is planned
 * for a later phase and will replace deriveDeckCommunicationScores.
 */

'use strict';

const { RUBRICS } = require('./rubrics');
const {
  SCORE_LABEL,
  TYPE_DISPLAY_NAMES,
  TYPE_TO_INVESTOR_DECISION,
  TYPE_TO_RUBRIC_KEY,
  _toV2Letter,
  _normType,
  _isFrameworkType,
  _hasUsableQuestions,
  _assessmentFromGrade,
  _commImprovement,
  _feedbackFromQuestions,
  _frameworkWeakFallback,
  _contactFeedback,
  _buildHeader,
  _buildContextSummary,
  _buildInvestmentCase,
  _buildSaveShareUpgrade,
  _buildPriorityImprovements,
  _derivePrimaryConstraint,
  _buildSuggestedNextSteps,
} = require('./reportV2Assembler');

const CANONICAL_REPORT_VERSION = 'canonical_v1';

// Framework topics investors expect a stage-appropriate deck to address. Used to
// surface "missing topic" investor questions without inventing slide content.
const CORE_EXPECTED_TOPICS = [
  'problem',
  'solution',
  'market',
  'team',
  'business_model',
  'traction',
];

// Topics whose clarity is central to "understand the company quickly".
const CLARITY_TOPICS = ['cover', 'problem', 'solution', 'product', 'market'];

const GRADE_TO_NUM = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 1 };

// "What Investors May Believe" should surface higher-level conclusions, not
// slide-level logistics. Cover/contact/logistics topics are excluded, and
// belief candidates are ranked by investor importance (lower = more important).
const BELIEF_EXCLUDE_TYPES = new Set([
  'cover',
  'contact',
  'other',
  'appendix',
  'investment_highlights',
  'unknown',
  '',
]);
const BELIEF_TOPIC_PRIORITY = {
  team: 1,
  traction: 2,
  market: 3,
  business_model: 4,
  product: 5,
  solution: 6,
  competition: 7,
  moat: 7,
  ask: 8,
  funding: 8,
  go_to_market: 9,
  problem: 10,
  financials: 11,
};
// Low-level / logistics statements that must never appear as investor beliefs.
const LOW_LEVEL_BELIEF_RE = /\b(company name|tagline|logo|visible on|clearly visible|title slide|contact (?:info|information|details)|font|colou?r|slide layout|readable)\b/i;

// Topics whose missing-proof feedback can be made more specific by leading with
// grounded evidence from the deck, then naming the concrete remaining gap.
const SPECIFIC_TOPIC_GAP = {
  business_model:
    'investors still need to know whether the per-transaction economics stay attractive after acquisition, support, payment processing, refunds, and marketplace operations',
  go_to_market:
    'investors need evidence that one or two channels can repeatedly acquire users and supply at an acceptable CAC and payback',
  ask: 'investors still need clearer use-of-funds detail, a runway bridge, and milestone timing showing why this round reaches the next value inflection',
  funding:
    'investors still need clearer use-of-funds detail, a runway bridge, and milestone timing showing why this round reaches the next value inflection',
  financials:
    'investors need the bridge from the current run rate to the target: transaction volume, take rate, user and supply growth, CAC/payback, burn, and operating assumptions',
  product:
    'investors need proof the product reliably delivers the promised value — activation, conversion, completed transactions, repeat usage, reliability, or clear preference — and that the workflow shows that value being delivered',
  market:
    'investors still need stronger external sourcing for the market size and a clearer path to capturing meaningful share',
  problem:
    'investors need a sharper value gap: who feels it, what they do today, why current alternatives are inadequate, and how painful, frequent, or expensive it is',
  solution:
    'investors need to see the solution directly closes the value gap and why customers would switch from the current alternatives',
};
const SPECIFIC_TOPIC_RECOMMENDED = {
  business_model:
    'Show whether the per-transaction economics remain attractive after all marketplace and acquisition costs.',
  go_to_market: 'Show CAC and payback for one or two channels that can scale repeatably.',
  ask: 'Add an explicit use-of-funds and runway bridge, with milestone timing, to the next value inflection.',
  funding: 'Add an explicit use-of-funds and runway bridge, with milestone timing, to the next value inflection.',
  financials:
    'Show the bridge from the current run rate to the target with the underlying growth and cost assumptions.',
  product:
    'Add proof of value delivery — activation, completed transactions, repeat usage, or reliability — and show the workflow delivering that value on both sides.',
  market:
    'Add external sourcing for the market size and show a credible path to capturing meaningful share.',
  problem:
    'Sharpen the value gap: who feels it, what they do today, and why the status quo is inadequate and costly.',
  solution:
    'Show how the solution closes the value gap and why it is meaningfully better than the current alternatives.',
};
// Neutral lead-ins for the specific gap wording when no strong grounded evidence
// exists to lead with (contains no invented facts/numbers).
const SPECIFIC_TOPIC_NEUTRAL_LEAD = {
  business_model: 'The revenue model is described',
  go_to_market: 'The channel list is broad',
  ask: 'The raise and terms are stated',
  funding: 'The raise and terms are stated',
  financials: 'The headline targets are stated',
  product: 'The product and workflow are explained',
  market: 'The market is defined and sized',
  problem: 'The problem is described',
  solution: 'The solution is described',
};
// Evidence that a roadmap connects milestones to value/defensibility/financing.
const ROADMAP_LINKAGE_RE = /(customer value|retention|repeat|defensib|moat|revenue growth|revenue|financing|next round|runway|milestone[^.]*fund|fund[^.]*milestone|value inflection)/i;

// Value-gap-centric investor decisions for Problem/Solution/Product (override
// the generic per-type investor decision so the report follows the value-gap
// chain: is there a gap → does the solution close it → does the product prove it).
const VALUE_GAP_DECISION = {
  problem:
    'Is there a meaningful value gap — who feels it, what they do today, and why current alternatives are inadequate?',
  solution:
    'Does the solution directly close the value gap and give customers a reason to switch?',
  product: 'Does the product prove the solution can reliably deliver the promised value?',
};

// Signals that a Product slide is about the consumer/demand side vs the
// supply/provider side, so two Product slides get side-specific feedback.
const PRODUCT_SUPPLY_SIDE_RE = /\b(detailer|provider|supplier|seller|driver|host|merchant|earnings|payout|job|accept|onboard|supply[- ]side)\b/i;
const PRODUCT_CONSUMER_SIDE_RE = /\b(consumer|customer|booking|book|order|checkout|convert|conversion|activation|rating|review|demand[- ]side)\b/i;

// A slide-local ask for a product visual (screenshot/mockup/workflow diagram).
// On a Solution slide this is a false negative when a Product slide already
// shows it.
const VISUAL_ASK_RE = /screenshot|mock-?up|wireframe|flow-?chart|workflow (?:diagram|graphic|screenshot)|product (?:visual|shot|screenshot)|add (?:a )?(?:visual|diagram)/i;

// Slide types exempt from the "Strong must have no gap" cap. team/traction can
// stay Strong with a forward-looking next-proof caveat; cover/contact are
// logistical.
const GAP_CAP_EXEMPT_TYPES = new Set(['cover', 'contact', 'team', 'traction']);

// "No gap" phrasing — a criterion that is fully met. Such answers must not be
// treated as missing evidence downstream.
const NO_GAP_RE = /^\s*none\b|criterion\s+(?:met|fully\s+met)|fully\s+met|no\s+gap|not\s+applicable|none\s+needed/i;
function _isNoGap(gap) {
  const g = String(gap || '').trim();
  return g === '' || NO_GAP_RE.test(g);
}

// Caveat language that disqualifies a statement from positive-only sections
// (investor beliefs / recommended investment highlights).
const CAVEAT_RE = /\b(however|but|lacks?|missing|without|not provided|unclear|though|although|yet to|need to|needs? more)\b/i;

// Weak "criterion satisfied" signals that are not investor-exciting conclusions
// (product stage clear, name/tagline/contact present, slide clarity, assumptions
// merely visible) — excluded from beliefs.
const WEAK_SIGNAL_RE = /\b(stage of the product|product stage|implicitly clear|company name|tagline|contact info|assumptions? (?:are |is )?(?:visible|shown|present)|clearly (?:presented|labeled|labelled|organized|organised|structured)|easy to (?:read|understand|follow)|legible|readable)\b/i;

// Market is only fully answered when the size is externally sourced AND there is
// a credible capture pathway. These detect those signals in the rubric evidence.
const MARKET_SOURCING_RE = /(sourc|third[-\s]?party|citation|report|analyst|external|verified|per\s+\w+\s+data)/i;
const MARKET_CAPTURE_RE = /(capture|market share|serviceable|\bsom\b|\bsam\b|beachhead|wedge|go[-\s]?to[-\s]?market|path to|obtainable|penetrat)/i;

// Marketplace supply-side role labels, used to prefer concrete terms (e.g.
// "detailers") over generic "supply" when the deck makes the side detectable.
const SUPPLY_ROLE_RE = /\b(detailers?|drivers?|hosts?|sellers?|providers?|suppliers?|merchants?|couriers?|creators?|freelancers?|contractors?|vendors?|professionals?|caterers?|cleaners?|tutors?|stylists?|shoppers?|renters?)\b/i;

// Cover feedback assesses investor comprehension and positioning — not logo or
// company-name visibility. These replace any name/tagline-presence feedback.
const COVER_WHAT_WORKS =
  'The cover communicates the company concept and category, so investors can quickly grasp what the company does.';
const COVER_MISSING =
  'The positioning could more clearly state the target customer and the core outcome the product delivers.';
const COVER_RECOMMENDED =
  'Sharpen the one-line positioning so it names the target customer and primary outcome, not just the category.';

// Investor-level framing that converts a strong, grounded topic assessment into
// a synthesized, single-sentence belief (the evidence itself is never invented).
const BELIEF_FRAMING = {
  team: (ev) => `The team appears credible for this market: ${ev}.`,
  traction: (ev) => `The deck shows real early marketplace demand: ${ev}.`,
  market: (ev) => `The market opportunity appears meaningful: ${ev}.`,
  business_model: (ev) => `The business model is easy to understand: ${ev}.`,
  product: (ev) => `The product concept is easy to understand: ${ev}.`,
  solution: (ev) => `The solution is clear: ${ev}.`,
  competition: (ev) => `The competitive positioning is credible: ${ev}.`,
  moat: (ev) => `There is a credible basis for defensibility: ${ev}.`,
  ask: (ev) => `The financing ask is clear: ${ev}.`,
  funding: (ev) => `The financing ask is clear: ${ev}.`,
  go_to_market: (ev) => `The go-to-market approach is defined: ${ev}.`,
  problem: (ev) => `The problem is well-defined: ${ev}.`,
  financials: (ev) => `The financial picture is presented: ${ev}.`,
};

function _capitalize(s) {
  const t = String(s || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
function _lowerFirst(s) {
  const t = String(s || '').trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

// Reduce a rubric assessment to a concise, single-sentence belief fragment:
// take the first sentence, drop "the slide/deck provides/shows…" lead-ins.
function _beliefEvidence(assessment) {
  let ev = String(assessment || '').trim();
  ev = (ev.split(/(?<=[.!?])\s+/)[0] || ev).replace(/[.!?]+$/, '').trim();
  ev = ev.replace(
    /^(the\s+slide|the\s+deck|this\s+slide|it)\s+(provides|shows|includes|has|presents|highlights|demonstrates|lists|contains|offers)\s+/i,
    ''
  );
  ev = ev.replace(/^(the\s+slide|the\s+deck|this\s+slide)\s+/i, '');
  return _lowerFirst(ev);
}

// Detect a concrete marketplace supply-side label (e.g. "detailers") from the
// deck evidence so wording can prefer it over the generic "supply".
// Preferred marketplace supply-side labels, in priority order. Concrete deck
// terms (detailers) win over generic ones (professionals, providers) even when
// the generic term appears earlier in the text. Always returned PLURAL.
const SUPPLY_ROLE_PRIORITY = [
  'detailers',
  'drivers',
  'hosts',
  'sellers',
  'providers',
  'suppliers',
  'merchants',
  'couriers',
  'creators',
  'freelancers',
  'contractors',
  'vendors',
  'caterers',
  'cleaners',
  'tutors',
  'stylists',
  'shoppers',
  'renters',
  'professionals',
];

function _detectSupplyLabel(evalSlides) {
  const text = (evalSlides || [])
    .flatMap((s) => (s.questions || []).map((q) => `${q.assessment || ''} ${q.gap || ''}`))
    .join(' ')
    .toLowerCase();
  if (!text) return null;
  for (const plural of SUPPLY_ROLE_PRIORITY) {
    const singular = plural.replace(/s$/, '');
    // match singular or plural, return the plural form
    if (new RegExp(`\\b${singular}s?\\b`, 'i').test(text)) return plural;
  }
  return null;
}

// Replace generic "user(s) and supply" phrasing with the detected side label,
// using the natural plural for the actors ("users and detailers") and the
// singular form when it modifies a following noun ("user and detailer growth").
function _applySupplyLabel(text, label) {
  if (!text || !label) return text;
  const plural = label; // already plural from _detectSupplyLabel
  const singular = label.replace(/s$/, '');
  return text.replace(/\b(users?)\s+and\s+supply\b(\s+\w+)?/gi, (_m, users, tail) => {
    if (tail && /^\s+(growth|acquisition|retention|density|liquidity)\b/i.test(tail)) {
      return `${users} and ${singular}${tail}`;
    }
    return `${users} and ${plural}${tail || ''}`;
  });
}

// --- small numeric helpers ----------------------------------------------------

function _num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function _clamp1to5(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}
function _gradeNum(grade) {
  const g = String(grade || '').trim().toUpperCase()[0];
  return GRADE_TO_NUM[g] || 3;
}
function _avg(arr) {
  const a = (arr || []).filter((x) => typeof x === 'number');
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}
function _avgQuestionScore(slides) {
  const scores = [];
  for (const s of slides || []) {
    for (const q of s.questions || []) {
      if (typeof q.score === 'number') scores.push(q.score);
    }
  }
  return _avg(scores); // 0..5
}
function _dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const k = String(x).trim().toLowerCase();
    if (!x || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
function _mk(score, rationale) {
  const s = _clamp1to5(score);
  return { score: s, label: SCORE_LABEL[s] || 'Adequate', rationale: rationale || '' };
}

// Count the major, investor-consequential questions that remain open, derived
// from the deterministic investment-case flags (defensibility, retention,
// marketplace liquidity, CAC/payback, market-size, market validation).
function _majorGapCount(investmentCase) {
  const f = (investmentCase && investmentCase.detected) || {};
  const mv = (investmentCase && investmentCase.market_validation) || {};
  let n = 0;
  if (!f.has_defensibility) n++;
  if (!f.has_retention_data) n++;
  if (f.is_marketplace) n++;
  if (f.has_gtm_channels && !f.has_cac_economics) n++;
  if (f.has_market_size_claim) n++;
  if (mv.missing_validation) n++;
  return n;
}

// Strongest grounded evaluator rationale for a topic's questions (score >= 4),
// used as a factual lead-in. Returns '' when there is no strong evidence.
function _strongLead(questions) {
  const strong = (questions || [])
    .filter((q) => q && typeof q.score === 'number' && q.score >= 4 && q.assessment && String(q.assessment).trim())
    .sort((a, b) => b.score - a.score)[0];
  return strong ? String(strong.assessment).trim().replace(/\.+$/, '') : '';
}

// --- answer quality / location ------------------------------------------------

const QUALITY_BY_SCORE = {
  5: 'Strong',
  4: 'Mostly answered',
  3: 'Partially answered',
  2: 'Weakly answered',
  1: 'Weakly answered',
  0: 'Not answered',
};

function deriveAnswerQuality(score) {
  if (typeof score !== 'number') return 'Not answered';
  return QUALITY_BY_SCORE[_clamp1to5(score) === 0 ? 0 : Math.max(0, Math.min(5, Math.round(score)))] ||
    'Not answered';
}

// First live cut: each rubric question is evaluated on its own (expected) slide,
// so location is expected-slide vs not-found. Cross-slide "elsewhere/scattered"
// detection is deferred to a later phase.
function deriveAnswerLocation(score, present) {
  if (present && typeof score === 'number' && score >= 1) return 'answered on expected slide';
  return 'not found';
}

function buildQuestionCoverage(q, slideNumber, present) {
  const answered = present && typeof q.score === 'number' && q.score >= 1;
  // A "criterion met" answer carries no real gap, so it must not surface as
  // missing evidence or as an optional recommendation.
  const noGap = _isNoGap(q.gap);
  return {
    question: q.question,
    answer_quality: deriveAnswerQuality(q.score),
    answer_location: deriveAnswerLocation(q.score, present),
    evidence_slide_numbers: answered ? [slideNumber] : [],
    evidence_summary: q.assessment || '',
    rationale: q.assessment || '',
    missing_evidence: noGap ? '' : q.gap,
    investor_impact: q.investor_impact || '',
    recommendation: noGap ? '' : q.fix && q.fix !== 'None' ? q.fix : '',
    confidence: q.confidence || 'medium',
  };
}

function buildQuestionCoverageFromRubric(rq) {
  return {
    question: rq.question,
    answer_quality: 'Not answered',
    answer_location: 'not found',
    evidence_slide_numbers: [],
    evidence_summary: '',
    rationale: '',
    missing_evidence: '',
    investor_impact: '',
    recommendation: '',
    confidence: 'low',
  };
}

// --- communication scores (deterministic first cut) ---------------------------

function deriveTopicCommunicationScores(group) {
  if (!group || !group.length) {
    return {
      completeness: _mk(1, 'Topic is not present in the deck.'),
      clarity: _mk(1, 'Topic is not present in the deck.'),
      brevity: _mk(3, 'Not applicable — topic absent.'),
      flow: _mk(1, 'Topic is not present in the deck.'),
    };
  }
  const comp = _clamp1to5(_avgQuestionScore(group) || 3);
  const gradeAvg = _clamp1to5(_avg(group.map((s) => _gradeNum(s.grade))) || 3);
  return {
    completeness: _mk(comp, 'How fully this topic answers its investor questions.'),
    clarity: _mk(gradeAvg, 'How clearly this topic makes its key point for investors.'),
    brevity: _mk(3, 'Whether the slide stays focused on its key point.'),
    flow: _mk(gradeAvg, 'Whether the slide leads with a clear takeaway and supports it in order.'),
  };
}

function deriveDeckCommunicationScores(evalSlides, investmentCase) {
  const present = new Set((evalSlides || []).map((s) => _normType(s.type)));
  const byType = (t) => (evalSlides || []).filter((s) => _normType(s.type) === t);

  // Completeness: combine topic presence with answer quality. Presence alone is
  // not enough — a deck can include a topic and still under-answer its questions.
  const answeredCore = CORE_EXPECTED_TOPICS.filter(
    (t) => present.has(t) && _avgQuestionScore(byType(t)) >= 3
  );
  const stronglyAnswered = CORE_EXPECTED_TOPICS.filter(
    (t) => present.has(t) && _avgQuestionScore(byType(t)) >= 4
  );
  let completeness = _clamp1to5(1 + 4 * (answeredCore.length / CORE_EXPECTED_TOPICS.length));
  const majorGaps = _majorGapCount(investmentCase);
  // Cap at Strong (4) when major investor questions remain open, unless coverage
  // is genuinely strong across every core topic.
  if (majorGaps >= 1 && stronglyAnswered.length < CORE_EXPECTED_TOPICS.length) {
    completeness = Math.min(completeness, 4);
  }
  const completenessRationale =
    answeredCore.length >= CORE_EXPECTED_TOPICS.length
      ? majorGaps >= 1
        ? 'The deck covers the core investor topics, but several major questions are still only partly answered.'
        : 'The deck covers the core investor topics and answers them well.'
      : `The deck answers ${answeredCore.length} of ${CORE_EXPECTED_TOPICS.length} core investor topics for this stage.`;

  // Clarity: how directly the "understand-quickly" topics answer their questions.
  const clarityScores = [];
  for (const t of CLARITY_TOPICS) {
    const g = byType(t);
    if (g.length) clarityScores.push(_avgQuestionScore(g));
  }
  const clarity = _clamp1to5(_avg(clarityScores) || 3);
  const clarityRationale =
    clarity >= 4
      ? 'Investors can quickly understand the company, opportunity, proof, and ask.'
      : clarity === 3
      ? 'The core story is understandable, though parts of the opportunity, proof, or ask could be sharper.'
      : 'Investors may struggle to quickly grasp the company, opportunity, proof, or ask.';

  // Brevity: judge focus and redundancy, not raw slide count. Recap/summary
  // slides are already excluded upstream, so slide count alone is not penalized.
  const otherCount = (evalSlides || []).filter((s) => _normType(s.type) === 'other').length;
  const brevity = _clamp1to5(otherCount >= 3 ? 3 : 4);
  const brevityRationale =
    otherCount >= 3
      ? 'A few slides add little investor signal and could be tightened or merged.'
      : 'The deck stays focused and avoids unnecessary repetition.';

  // Flow: whether conviction builds across the narrative.
  const flow = _clamp1to5(_avg((evalSlides || []).map((s) => _gradeNum(s.grade))) || 3);
  const flowRationale =
    flow >= 4
      ? 'Conviction builds cleanly from problem and solution into proof, business model, and the funding ask.'
      : 'The narrative generally builds from problem and solution into proof, business model, and the funding ask, but some proof points need tighter connection to defensibility and scalable growth.';

  return {
    completeness: _mk(completeness, completenessRationale),
    clarity: _mk(clarity, clarityRationale),
    brevity: _mk(brevity, brevityRationale),
    flow: _mk(flow, flowRationale),
  };
}

// Map canonical {score,label,rationale} dims to the report_v2 comm-score shape
// the frontend renders (and that _derivePrimaryConstraint / _buildPriorityImprovements expect).
function toV2CommScores(dims) {
  const one = (dim) => {
    const d = (dims && dims[dim]) || {};
    const score = d.score || 3;
    return {
      score,
      label: d.label || SCORE_LABEL[score] || 'Adequate',
      explanation: d.rationale || 'Not separately assessed.',
      primary_reason: d.rationale || 'Not separately assessed.',
      priority_improvement: _commImprovement(dim, score),
    };
  };
  return {
    completeness: one('completeness'),
    clarity: one('clarity'),
    brevity: one('brevity'),
    flow: one('flow'),
  };
}

// --- slide / topic feedback (rubric-derived, no V1) ---------------------------

function buildSlideFeedbackEntry(slide, opts = {}) {
  const { companyName = null, supplyLabel = null, hasProductSlide = false } = opts;
  const typeKey = _normType(slide.type);
  const grade = slide.grade || null;
  const questions = Array.isArray(slide.questions) ? slide.questions : [];
  const rubricKey = TYPE_TO_RUBRIC_KEY[typeKey] || null;

  let effectiveTypeKey = typeKey;
  let displayTitle = TYPE_DISPLAY_NAMES[typeKey] || 'Section';
  let assessment;
  let whatWorks;
  let missing;
  let recommended;
  let issueType = 'Evidence';
  let notAssessed = false;

  if (typeKey === 'contact') {
    const c = _contactFeedback(questions);
    assessment = c.assessment;
    whatWorks = c.what_works;
    missing = c.what_is_missing;
    recommended = c.recommended;
    issueType = c.issue_type;
  } else if (_hasUsableQuestions(questions)) {
    const f = _feedbackFromQuestions(questions, grade, typeKey, rubricKey);
    assessment = f.assessment;
    whatWorks = f.what_works;
    missing = f.what_is_missing;
    recommended = f.recommended;
    issueType = f.issue_type;
  } else if (_isFrameworkType(typeKey)) {
    const f = _frameworkWeakFallback(typeKey, rubricKey, grade);
    assessment = f.assessment;
    whatWorks = f.what_works;
    missing = f.what_is_missing;
    recommended = f.recommended;
    issueType = f.issue_type;
  } else {
    notAssessed = true;
    assessment = 'Not assessed';
    whatWorks = 'This slide was present in the deck but was not individually assessed.';
    missing = 'Review this slide manually to confirm it supports the investor narrative.';
    recommended =
      'Ensure this slide clearly answers its intended investor question and avoids duplicating earlier content.';
    issueType = 'None';
  }

  // Ask / Funding is Strong only when the full financing picture is supported.
  // If use of funds or timeline/milestone granularity is partial, cap at
  // "Mostly answered" and force the specific missing-proof wording below.
  let forceSpecific = false;
  if (!notAssessed && (effectiveTypeKey === 'ask' || effectiveTypeKey === 'funding')) {
    const uof = questions.find((q) => /use of funds/i.test(q.question || ''));
    const timing = questions.find((q) => /timeline|milestone/i.test(q.question || ''));
    const partial =
      (uof && typeof uof.score === 'number' && uof.score < 4) ||
      (timing && typeof timing.score === 'number' && timing.score < 4);
    if (partial) {
      if (assessment === 'Strong') assessment = 'Mostly answered';
      if (issueType === 'None') issueType = 'Evidence';
      forceSpecific = true;
    }
  }

  // Market is Strong only when size is externally sourced AND there is a credible
  // capture pathway. If sourcing or capture logic is incomplete, cap at "Mostly
  // answered" and surface the sourcing/capture gap.
  if (!notAssessed && effectiveTypeKey === 'market') {
    const marketText = questions.map((q) => `${q.assessment || ''} ${q.gap || ''}`).join(' ');
    const complete = MARKET_SOURCING_RE.test(marketText) && MARKET_CAPTURE_RE.test(marketText);
    if (!complete) {
      if (assessment === 'Strong') assessment = 'Mostly answered';
      if (issueType === 'None') issueType = 'Evidence';
      forceSpecific = true;
    }
  }

  // Capture whether the Solution feedback (as produced by the evaluator) asked
  // for a product visual while a Product slide already shows it — that is a
  // slide-local false negative answered elsewhere in the deck.
  const solutionVisualElsewhere =
    !notAssessed &&
    effectiveTypeKey === 'solution' &&
    hasProductSlide &&
    VISUAL_ASK_RE.test(`${missing} ${recommended}`);

  // Make selected topic feedback more specific: lead with grounded evidence from
  // the deck, then name the concrete remaining gap. Only using facts already
  // present in the rubric evidence (no invention). Avoid repeating the exact
  // what_works sentence at the start of what_is_missing (issue 5).
  if (!notAssessed && SPECIFIC_TOPIC_GAP[effectiveTypeKey] && (missing || forceSpecific)) {
    let gap = SPECIFIC_TOPIC_GAP[effectiveTypeKey];
    let rec = SPECIFIC_TOPIC_RECOMMENDED[effectiveTypeKey];

    // Product: give consumer- vs supply-facing Product slides side-specific
    // proof asks so multiple Product slides don't repeat the same generic gap.
    if (effectiveTypeKey === 'product') {
      const ev = questions.map((q) => `${q.assessment || ''} ${q.gap || ''} ${q.question || ''}`).join(' ');
      const supplySide = PRODUCT_SUPPLY_SIDE_RE.test(ev);
      const consumerSide = PRODUCT_CONSUMER_SIDE_RE.test(ev);
      const sideActor = supplyLabel ? supplyLabel.replace(/s$/, '') : 'provider';
      if (supplySide && !consumerSide) {
        gap = `investors need proof the supply side delivers value: ${sideActor} activation, job acceptance, earnings impact, retention, and supply-side reliability`;
        rec = `Show supply-side proof — ${sideActor} activation, job acceptance, earnings impact, and retention.`;
      } else if (consumerSide && !supplySide) {
        gap =
          'investors need proof the consumer side delivers value: activation, completed bookings, conversion, repeat usage, and preference';
        rec = 'Show consumer-side proof — activation, completed bookings, conversion, and repeat usage.';
      }
    }

    const lead = _strongLead(questions);
    const worksStripped = String(whatWorks || '').trim().replace(/\.+$/, '');
    if (lead && lead !== worksStripped) {
      missing = `${lead}, but ${gap}.`;
    } else if (!lead && SPECIFIC_TOPIC_NEUTRAL_LEAD[effectiveTypeKey]) {
      missing = `${SPECIFIC_TOPIC_NEUTRAL_LEAD[effectiveTypeKey]}, but ${gap}.`;
    } else {
      // what_works already states the grounded lead — don't repeat it.
      missing = `${_capitalize(gap)}.`;
    }
    recommended = rec;
  }

  // Roadmap should not read as fully answered just because it lists milestones.
  // Cap at "Mostly answered" unless it explicitly connects milestones to customer
  // value, retention, defensibility, revenue growth, or the next financing milestone.
  if (!notAssessed && effectiveTypeKey === 'roadmap') {
    const roadmapText = (questions || [])
      .map((q) => `${q.assessment || ''} ${q.question || ''}`)
      .join(' ');
    if (!ROADMAP_LINKAGE_RE.test(roadmapText)) {
      if (assessment === 'Strong') assessment = 'Mostly answered';
      if (!missing) {
        missing =
          'The roadmap lists milestones, but investors need each tied to customer value, retention, revenue growth, defensibility, or the next financing milestone.';
        recommended =
          'Connect roadmap milestones to customer value, revenue growth, and the next financing inflection.';
        issueType = 'Evidence';
      }
    }
  }

  // First-slide cover remap: a slide 1 typed other/unknown with a detectable
  // company name is the cover. Deterministic (position + name), not fabricated.
  const isFirstSlide = Number(slide.slide_number) === 1;
  const untyped = effectiveTypeKey === '' || effectiveTypeKey === 'other' || effectiveTypeKey === 'unknown';
  if (isFirstSlide && untyped && companyName) {
    effectiveTypeKey = 'cover';
    displayTitle = 'Cover';
    notAssessed = false;
  }

  // Cover normalization: assess investor comprehension and positioning, not
  // logo/name/tagline visibility. This overrides any name-presence feedback that
  // the cover rubric questions would otherwise surface as the main what_works.
  if (effectiveTypeKey === 'cover') {
    displayTitle = 'Cover';
    whatWorks = COVER_WHAT_WORKS;
    missing = COVER_MISSING;
    recommended = COVER_RECOMMENDED;
    assessment = _assessmentFromGrade(grade);
    issueType = 'Evidence';
  }

  // Team: when founder-market fit is present (grade B or better), missing
  // role-level accomplishments are a strengthening opportunity, not core
  // investor friction — do not let them downgrade a strong team.
  if (!notAssessed && effectiveTypeKey === 'team' && missing) {
    const g = String(grade || '').trim().toUpperCase()[0];
    // Clearly strong founder-market fit = at least one strongly-answered team
    // question (relevant companies/roles/domain).
    const hasStrongFmf = questions.some((q) => typeof q.score === 'number' && q.score >= 4);
    if ((g === 'A' || g === 'B') && hasStrongFmf) {
      // Founder-market fit is strong and only a strengthening opportunity
      // remains, so the slide reads Strong (not Mostly answered) with an
      // optional strengthening note rather than a friction gap.
      assessment = 'Strong';
      missing =
        'The founders are directly relevant to this market; adding specific role-level outcomes or metrics would strengthen the case further.';
      recommended =
        "Add concrete outcomes or metrics from the founders' most relevant prior roles.";
      issueType = 'None';
    }
  }

  // Solution slide-local false negative: a product visual was asked for here but
  // a Product slide already shows it. Suppress the visual ask and reframe the
  // Solution around whether it closes the value gap. (Runs after the value-gap
  // reframe above, using the pre-reframe detection.)
  if (solutionVisualElsewhere) {
    missing =
      'The solution is shown (product visuals appear on the Product slide); investors still need it framed as directly closing the value gap and why customers would switch from the current alternatives.';
    recommended =
      'Frame the solution around closing the value gap and why it is meaningfully better than the status quo, not around adding screenshots the deck already shows.';
    issueType = 'Evidence';
  }

  // Prefer a concrete marketplace side label (e.g. "detailers") over generic
  // "supply" when the deck makes the side detectable.
  if (supplyLabel) {
    missing = _applySupplyLabel(missing, supplyLabel);
    recommended = _applySupplyLabel(recommended, supplyLabel);
  }

  // Consistency cap: a slide with a real evidence/substance gap should not read
  // as Strong. Exemptions:
  //  - cover/contact are logistical (their "missing" is a soft suggestion);
  //  - team/traction can be Strong with a forward-looking next-proof caveat
  //    (accomplishments / retention) without erasing strong founder-market fit
  //    or strong concrete growth.
  if (
    assessment === 'Strong' &&
    missing &&
    (issueType === 'Evidence' || issueType === 'Substance') &&
    !GAP_CAP_EXEMPT_TYPES.has(effectiveTypeKey)
  ) {
    assessment = 'Mostly answered';
  }

  return {
    slide_number: slide.slide_number,
    slide_title_or_section: displayTitle,
    investor_decision:
      VALUE_GAP_DECISION[effectiveTypeKey] || TYPE_TO_INVESTOR_DECISION[effectiveTypeKey] || '',
    assessment,
    what_works: whatWorks,
    what_is_missing: missing,
    recommended_improvement: recommended,
    issue_type: notAssessed ? 'None' : missing ? issueType : 'None',
  };
}

function deriveTopicFeedback(representativeSlide, companyName, supplyLabel, hasProductSlide) {
  const e = buildSlideFeedbackEntry(representativeSlide, {
    companyName,
    supplyLabel,
    hasProductSlide,
  });
  return {
    assessment: e.assessment,
    what_works: e.what_works,
    what_is_missing: e.what_is_missing,
    recommended_improvement: e.recommended_improvement,
    issue_type: e.issue_type,
  };
}

// --- topic coverage -----------------------------------------------------------

function buildTopicCoverage(evalSlides, companyName, supplyLabel) {
  const byType = new Map();
  for (const s of evalSlides || []) {
    const key = _normType(s.type);
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(s);
  }

  const hasProductSlide = (evalSlides || []).some((s) => _normType(s.type) === 'product');

  const topics = [];

  for (const [key, group] of byType) {
    const label = TYPE_DISPLAY_NAMES[key] || (key ? key : 'Section');
    const present_slide_numbers = group.map((s) => s.slide_number);
    const status = key === 'investment_highlights' ? 'ignored_summary' : 'present';
    // Representative slide (best-graded) supplies the topic's question coverage
    // and topic-level feedback; all present slides are listed by number.
    const rep = group.slice().sort((a, b) => _gradeNum(b.grade) - _gradeNum(a.grade))[0];
    const questions = (rep.questions || []).map((q) =>
      buildQuestionCoverage(q, rep.slide_number, true)
    );
    topics.push({
      topic_key: key,
      topic_label: label,
      expected_slide_numbers: [],
      present_slide_numbers,
      status,
      topic_communication_scores: deriveTopicCommunicationScores(group),
      questions,
      topic_feedback: deriveTopicFeedback(rep, companyName, supplyLabel, hasProductSlide),
    });
  }

  // Missing core topics: surface the unanswered investor questions without
  // inventing slide content.
  const presentKeys = new Set(byType.keys());
  for (const key of CORE_EXPECTED_TOPICS) {
    if (presentKeys.has(key)) continue;
    const rubric = RUBRICS[key] || [];
    const label = TYPE_DISPLAY_NAMES[key] || key;
    topics.push({
      topic_key: key,
      topic_label: label,
      expected_slide_numbers: [],
      present_slide_numbers: [],
      status: 'missing',
      topic_communication_scores: deriveTopicCommunicationScores([]),
      questions: rubric.map(buildQuestionCoverageFromRubric),
      topic_feedback: {
        assessment: 'Not answered',
        what_works: 'This framework topic is not present in the deck.',
        what_is_missing: `Investors cannot evaluate ${label}: ${
          TYPE_TO_INVESTOR_DECISION[key] || 'the topic is unaddressed.'
        }`,
        recommended_improvement: `Add a ${label} slide that answers its core investor questions.`,
        issue_type: 'Substance',
      },
    });
  }

  return topics;
}

// --- believe / question -------------------------------------------------------

// Higher-level investor beliefs: the strongest grounded conclusion per high-value
// topic, ranked by investor importance. Slide-level logistics (cover/company
// name/tagline) are excluded. Limited to 2–4 beliefs.
function deriveBelieve(evalSlides) {
  const byTopic = new Map();
  for (const s of evalSlides || []) {
    const typeKey = _normType(s.type);
    if (BELIEF_EXCLUDE_TYPES.has(typeKey)) continue;
    if (!(typeKey in BELIEF_TOPIC_PRIORITY)) continue;
    for (const q of s.questions || []) {
      if (
        typeof q.score === 'number' &&
        q.score >= 4 &&
        q.assessment &&
        q.assessment.trim().length > 20 &&
        !LOW_LEVEL_BELIEF_RE.test(q.assessment)
      ) {
        const evidence = _beliefEvidence(q.assessment);
        const existing = byTopic.get(typeKey);
        // Keep the highest-scoring grounded statement per topic. Beliefs are
        // positive-only, so skip any evidence fragment carrying a caveat.
        if (
          evidence &&
          !CAVEAT_RE.test(evidence) &&
          !WEAK_SIGNAL_RE.test(evidence) &&
          (!existing || q.score > existing.score)
        ) {
          byTopic.set(typeKey, { evidence, score: q.score, priority: BELIEF_TOPIC_PRIORITY[typeKey], typeKey });
        }
      }
    }
  }
  const ranked = Array.from(byTopic.values()).sort(
    (a, b) => a.priority - b.priority || b.score - a.score
  );
  // Synthesize an investor-level conclusion per topic, grounded in the real
  // evidence (framing adds the conclusion; the evidence itself is never invented).
  const beliefs = ranked.map((b) => {
    const frame = BELIEF_FRAMING[b.typeKey];
    return frame ? frame(b.evidence) : `${_capitalize(b.evidence)}.`;
  });
  return _dedupe(beliefs).slice(0, 4);
}

// Investor-level, consequence-ranked concerns derived from the deterministic
// investment-case flags (the same signals that drive Priority Improvements),
// plus genuinely missing core topics. Limited to 2–4 questions.
function deriveQuestion(evalSlides, missingTopics, investmentCase, supplyLabel) {
  const flags = (investmentCase && investmentCase.detected) || {};
  const mv = (investmentCase && investmentCase.market_validation) || {};
  const candidates = []; // { p (lower = higher consequence), text }

  if (!flags.has_defensibility)
    candidates.push({
      p: 1,
      text: 'Whether the company has durable defensibility or a moat beyond being first to market.',
    });
  if (!flags.has_retention_data)
    candidates.push({
      p: 2,
      text: 'Whether early usage turns into retention and repeat usage, not just cumulative signups.',
    });
  if (mv.missing_validation)
    candidates.push({
      p: 2.5,
      text: 'Whether there is enough evidence that customers actually want the outcome.',
    });
  if (flags.is_marketplace)
    candidates.push({
      p: 3,
      text: 'Whether the marketplace has real liquidity and density at the city or market level, not just aggregate totals.',
    });
  if (flags.has_gtm_channels && !flags.has_cac_economics)
    candidates.push({
      p: 4,
      text: 'Whether one or two channels can acquire users and supply repeatably at an acceptable CAC and payback.',
    });
  if (flags.has_market_size_claim)
    candidates.push({
      p: 5,
      text: 'Whether the market-size and projection assumptions hold up under a bottom-up build.',
    });

  // Use of funds / runway when a funding ask is present but not strongly answered.
  const askSlides = (evalSlides || []).filter((s) =>
    ['ask', 'funding'].includes(_normType(s.type))
  );
  if (askSlides.length && _avgQuestionScore(askSlides) < 4)
    candidates.push({
      p: 6,
      text: 'Whether the raise, use of funds, and runway are sufficient to reach the next value inflection.',
    });

  // Missing core topics investors expect at this stage (lowest priority).
  for (const mt of missingTopics || [])
    candidates.push({
      p: 7,
      text: `Whether the deck addresses ${mt.topic_label}, which investors expect at this stage.`,
    });

  candidates.sort((a, b) => a.p - b.p);
  return _dedupe(candidates.map((c) => _applySupplyLabel(c.text, supplyLabel))).slice(0, 4);
}

// --- dashboard_feedback (deterministic reshaper over canonical/v2 content) -----
//
// Report substance is generated by the canonical report generation above. This
// builder RESHAPES already-generated canonical fields into the
// report_v2.dashboard_feedback contract: it reuses canonical strings verbatim,
// reshapes arrays, splits an existing rationale at its own pivot word, and
// classifies text into a fixed deck-issue label set. It does NOT author new
// investor claims or fabricate deck-specific content. Fields with no canonical
// source are populated from the nearest existing signal or left empty.
// TODO: deeper per-field specificity (e.g. localized flow-scatter narrative,
// sharper pass risks) should come from upstream canonical/LLM generation, not
// this reshaper.

const _DASH_PIVOT_RE = /,?\s+(?:but|though|although|however|yet)\s+/i;

// Split an existing rationale into its positive lead and gap tail at the
// rationale's own pivot word. Never invents text; only cuts an existing string.
function _dashSplitPivot(text) {
  const t = String(text || '').trim();
  if (!t) return { positive: '', gap: '' };
  const m = t.match(_DASH_PIVOT_RE);
  if (!m) return { positive: t, gap: '' };
  const idx = t.indexOf(m[0]);
  let positive = t.slice(0, idx).replace(/[.,;:\s]+$/, '');
  if (positive && !/[.!?]$/.test(positive)) positive += '.';
  let gap = _capitalize(t.slice(idx + m[0].length).trim());
  if (gap && !/[.!?]$/.test(gap)) gap += '.';
  return { positive, gap };
}

// Normalize an overall grade letter (A/A-/B+/…/F) to A/B/C/D.
function _dashDeckGradeFromLetter(letter) {
  const c = String(letter || '').trim().toUpperCase()[0];
  if (c === 'A') return 'A';
  if (c === 'B') return 'B';
  if (c === 'C') return 'C';
  if (c === 'D' || c === 'E' || c === 'F') return 'D';
  return 'C';
}

// Deck communication score (1–5) -> A/B/C/D (mirrors the frontend mapping).
function _dashCommGrade(score) {
  if (typeof score !== 'number') return 'C';
  if (score >= 4) return 'A';
  if (score === 3) return 'B';
  if (score === 2) return 'C';
  return 'D';
}

const _DASH_SLIDE_GRADE = {
  Strong: 'A',
  'Mostly answered': 'B',
  'Partially answered': 'C',
  'Under-supported': 'C',
  'Weakly answered': 'D',
  Weak: 'D',
  'Not answered': 'D',
};
function _dashSlideGrade(assessment) {
  const a = String(assessment || '').trim();
  return _DASH_SLIDE_GRADE[a] || 'C';
}

// Fixed deck-issue label set (from the product spec). Classify slide text into
// at most one label; empty string when nothing matches. Classification only —
// no content authored.
// Slide topic (title) maps to its natural deck-level issue first — a slide's own
// section is a stronger signal than an incidental keyword in its body.
const _DASH_TITLE_ISSUE = [
  { label: 'Acquisition efficiency', re: /go[-\s]?to[-\s]?market|gtm/i },
  { label: 'Financial bridge', re: /financ/i },
  { label: 'Team proof', re: /\bteam\b|founder/i },
  { label: 'Defensibility', re: /competit|moat|defensib/i },
  { label: 'Marketplace liquidity', re: /marketplace|liquidity/i },
  { label: 'Retention / repeat usage', re: /traction/i },
  { label: 'Market sizing support', re: /\bmarket\b(?!place)/i },
];
// Body-keyword fallback when the title carries no clear topic signal.
const _DASH_ISSUE_RULES = [
  { label: 'Defensibility', re: /defensib|moat|competitor|switching cost|proprietary|first[-\s]mover/i },
  { label: 'Retention / repeat usage', re: /retention|repeat[-\s]?(?:usage|use|book|booking|buy|purchase|customer|transaction)|cohort|churn|active[-\s]?usage/i },
  { label: 'Marketplace liquidity', re: /liquidity|marketplace|demand density|city[-\s]level|per city|\bdensity\b/i },
  { label: 'Acquisition efficiency', re: /\bcac\b|payback|acquisition|\bchannel/i },
  { label: 'Financial bridge', re: /run[-\s]?rate|\bbridge\b|projection|\bburn\b|use of funds|runway/i },
  { label: 'Team proof', re: /founder|\bteam\b|role[-\s]level|execution credibility/i },
  { label: 'Market sizing support', re: /market size|market sizing|\btam\b|\bsam\b|\bsom\b|bottom[-\s]up/i },
];
function _dashRelatedDeckIssue(title, body) {
  const t = String(title || '');
  for (const r of _DASH_TITLE_ISSUE) if (r.re.test(t)) return r.label;
  const b = String(body || '');
  for (const r of _DASH_ISSUE_RULES) if (r.re.test(b)) return r.label;
  return '';
}

/**
 * Build report_v2.dashboard_feedback by reshaping an already-assembled report_v2
 * object. No new investor content is authored.
 * @param {Object} v2   output of buildCanonicalReportV2Sections (pre-attach)
 * @param {Object} opts { investmentCase }
 */
function buildDashboardFeedback(v2, opts = {}) {
  const investmentCase = opts.investmentCase || null;
  const flags = (investmentCase && investmentCase.detected) || {};
  const companyName = (v2.header && v2.header.company_name) || null;
  const og = v2.overall_grade || {};
  const pd = v2.primary_diagnosis || {};
  const cs = v2.context_summary || {};
  const comm = v2.deck_communication_scores || {};
  const priorities = Array.isArray(v2.priority_improvements) ? v2.priority_improvements : [];

  // ---- deck_score (reuse canonical belief/question/priority content verbatim) --
  const priorityAdds = _dedupe(priorities.map((p) => p.what_to_add_or_change).filter(Boolean));
  const passRisks = _dedupe(priorities.map((p) => p.why_it_matters).filter(Boolean)).slice(0, 5);
  const deck_score = {
    grade: _dashDeckGradeFromLetter(og.letter),
    title: companyName || 'Deck Score',
    summary: og.what_this_means || pd.summary || 'Assessment not available.',
    investors_will_like: (v2.what_investors_may_believe || []).slice(0, 5),
    investors_will_question: (v2.what_investors_may_question || []).slice(0, 5),
    what_could_make_investors_pass: passRisks,
    highest_leverage_revision_focus: priorityAdds[0] || pd.summary || '',
    evaluated_context: {
      stage: cs.company_context && cs.company_context !== 'Unknown' ? cs.company_context : '',
      audience: cs.intended_investor_audience || '',
      target_raise: cs.target_raise || '',
      deck_purpose: 'Fundraising',
      business_type: flags.is_marketplace ? 'Marketplace' : '',
      confidence: cs.context_confidence || '',
      note: 'Context was inferred from the deck. TODO: replace inferred context with explicit user-provided context from upload/report setup flow.',
    },
  };

  // ---- deck_feedback (split an existing rationale into positive/gap) -----------
  const dim = (key) => {
    const d = comm[key] || {};
    const { positive, gap } = _dashSplitPivot(d.primary_reason || d.explanation || '');
    const what_works = positive || String(d.explanation || '').trim();
    const improve =
      d.priority_improvement && d.priority_improvement !== 'Maintain this strength.'
        ? d.priority_improvement
        : '';
    // what_needs_help must never equal what_works. Prefer the rationale's own gap
    // tail; otherwise fall back to the canonical priority_improvement.
    let what_needs_help = gap && gap !== what_works ? gap : '';
    if (!what_needs_help && improve && improve !== what_works) what_needs_help = improve;
    // completeness recommendations are the concrete missing proof to add
    // (all canonical priority_improvements, not a truncated few); other dims use
    // their own improvement.
    const recommended_changes =
      key === 'completeness' && priorityAdds.length
        ? priorityAdds.slice(0, 6)
        : _dedupe([improve]).filter(Boolean);
    return {
      grade: _dashCommGrade(d.score),
      assessment: d.label || SCORE_LABEL[d.score] || 'Adequate',
      what_works,
      what_needs_help,
      recommended_changes,
    };
  };

  const completeness = dim('completeness');
  const clarity = dim('clarity');
  const brevity = dim('brevity');
  const flowBase = dim('flow');

  // Flow narrative arrays — populated only from existing canonical signals.
  const flowComm = comm.flow || {};
  const brevityComm = comm.brevity || {};
  const sequencing_notes = [];
  if (typeof flowComm.score === 'number' && flowComm.score < 4 && flowComm.primary_reason) {
    sequencing_notes.push(flowComm.primary_reason);
  }
  const redundancy_or_repetition = [];
  if (typeof brevityComm.score === 'number' && brevityComm.score < 4 && brevityComm.primary_reason) {
    redundancy_or_repetition.push(brevityComm.primary_reason);
  }
  // No canonical field currently localizes scattered evidence; leave empty rather
  // than fabricate deck-specific scatter claims.
  const misplaced_or_scattered_evidence = [];
  const suggested_moves_or_cuts = _dedupe(
    [
      flowComm.priority_improvement && flowComm.priority_improvement !== 'Maintain this strength.'
        ? flowComm.priority_improvement
        : null,
      brevityComm.priority_improvement && brevityComm.priority_improvement !== 'Maintain this strength.'
        ? brevityComm.priority_improvement
        : null,
    ].filter(Boolean)
  );

  const flow = {
    ...flowBase,
    sequencing_notes,
    redundancy_or_repetition,
    misplaced_or_scattered_evidence,
    suggested_moves_or_cuts,
  };

  const deck_feedback = { completeness, clarity, brevity, flow };

  // ---- slide_feedback (reshape existing slide_level_feedback verbatim) ---------
  // Map each canonical priority improvement to its deck-level issue so the
  // strongest artifact-driven fix guidance is surfaced on the slide it concerns
  // (verbatim canonical text; no rewriting).
  const priorityByIssue = {};
  for (const p of priorities) {
    const iss = _dashRelatedDeckIssue(p.title, `${p.why_it_matters || ''} ${p.what_to_add_or_change || ''}`);
    if (!iss || !p.what_to_add_or_change) continue;
    (priorityByIssue[iss] = priorityByIssue[iss] || []).push(p.what_to_add_or_change);
  }

  const slide_feedback = (v2.slide_level_feedback || []).map((s) => {
    const classifyBody = `${s.what_is_missing || ''} ${s.recommended_improvement || ''} ${
      s.investor_decision || ''
    } ${s.issue_type || ''}`;
    const related = _dashRelatedDeckIssue(s.slide_title_or_section, classifyBody);
    // Slide's own canonical fix first, then the matching deck-level priority
    // fix(es) for the same issue. Capped at 4 specific actions.
    const recommended_changes = _dedupe([
      ...(s.recommended_improvement ? [s.recommended_improvement] : []),
      ...((related && priorityByIssue[related]) || []),
    ]).slice(0, 4);
    return {
      slide_number: typeof s.slide_number === 'number' ? s.slide_number : 0,
      title: s.slide_title_or_section || 'Section',
      grade: _dashSlideGrade(s.assessment),
      assessment: s.assessment || '',
      investor_decision: s.investor_decision || '',
      what_works: s.what_works || '',
      what_needs_help: s.what_is_missing || '',
      recommended_changes,
      evidence_found: s.what_works ? [s.what_works] : [],
      evidence_missing: s.what_is_missing ? [s.what_is_missing] : [],
      related_deck_issue: related,
    };
  });

  return { deck_score, deck_feedback, slide_feedback };
}

// --- public API ---------------------------------------------------------------

/**
 * Build the canonical report model from artifact-based inputs.
 * @param {Object} input { fullReport, slides, companyContext, investmentCase }
 *   - fullReport.slides: per-slide rubric evaluations (slide_number, type, grade, questions[])
 *   - slides: raw analyzed slides (extracted_text, inferred_type) — reserved for
 *     future headline/flow signals
 * @returns {Object} canonical model (report_version: canonical_v1)
 */
function buildCanonicalReport(input = {}) {
  const { fullReport = {}, companyContext = null, investmentCase = null } = input;
  const evalSlides = Array.isArray(fullReport.slides) ? fullReport.slides : [];
  const companyName = (investmentCase && investmentCase.company_name) || null;
  const marketValidation = (investmentCase && investmentCase.market_validation) || null;
  const supplyLabel = _detectSupplyLabel(evalSlides);

  const topics = buildTopicCoverage(evalSlides, companyName, supplyLabel);
  const deck_communication_scores = deriveDeckCommunicationScores(evalSlides, investmentCase);
  const deckCommV2 = toV2CommScores(deck_communication_scores);

  const constraint = _derivePrimaryConstraint(deckCommV2, investmentCase, marketValidation);
  const priority_improvements = _buildPriorityImprovements(deckCommV2, investmentCase);
  const suggested_next_steps = _buildSuggestedNextSteps(constraint, priority_improvements);

  const missingTopics = topics.filter((t) => t.status === 'missing');
  const what_investors_may_believe = deriveBelieve(evalSlides);
  const what_investors_may_question = deriveQuestion(evalSlides, missingTopics, investmentCase, supplyLabel);

  return {
    report_version: CANONICAL_REPORT_VERSION,
    company_context: companyContext,
    investment_case: investmentCase,
    topics,
    deck_communication_scores,
    primary_constraint: constraint.constraint,
    primary_diagnosis: { summary: constraint.summary, issue_type: constraint.issue_type },
    what_investors_may_believe,
    what_investors_may_question,
    priority_improvements,
    suggested_next_steps,
  };
}

/**
 * Map the canonical model into the existing report_v2 shape the frontend renders.
 * No v1_report is consumed.
 * @param {Object} canonical  output of buildCanonicalReport
 * @param {Object} ctx { fullReport, companyContext, investmentCase, generatedAt? }
 */
function buildCanonicalReportV2Sections(canonical, ctx = {}) {
  const {
    fullReport = {},
    companyContext = null,
    investmentCase = null,
    generatedAt = new Date().toISOString(),
  } = ctx;
  const companyName = (investmentCase && investmentCase.company_name) || null;
  const evalSlides = Array.isArray(fullReport.slides) ? fullReport.slides : [];
  const supplyLabel = _detectSupplyLabel(evalSlides);
  const hasProductSlide = evalSlides.some((s) => _normType(s.type) === 'product');

  const slide_level_feedback = evalSlides
    .slice()
    .sort((a, b) => _num(a.slide_number) - _num(b.slide_number))
    .map((s) => buildSlideFeedbackEntry(s, { companyName, supplyLabel, hasProductSlide }));

  const v2 = {
    report_version: 'v2',
    header: _buildHeader(null, generatedAt, companyName),
    context_summary: _buildContextSummary(companyContext, investmentCase),
    overall_grade: {
      letter: _toV2Letter(fullReport.overall_grade),
      concise_interpretation: canonical.primary_diagnosis.summary || 'Assessment not available.',
      primary_constraint: canonical.primary_constraint,
      what_this_means: canonical.primary_diagnosis.summary,
    },
    deck_communication_scores: toV2CommScores(canonical.deck_communication_scores),
    investment_case: _buildInvestmentCase(investmentCase),
    primary_diagnosis: canonical.primary_diagnosis,
    what_investors_may_believe: canonical.what_investors_may_believe,
    what_investors_may_question: canonical.what_investors_may_question,
    priority_improvements: canonical.priority_improvements,
    slide_level_feedback,
    suggested_next_steps: canonical.suggested_next_steps,
    save_share_upgrade: _buildSaveShareUpgrade(),
  };

  // Attach dashboard-native feedback (reshaped from the fields above). All
  // existing report_v2 fields are preserved unchanged.
  v2.dashboard_feedback = buildDashboardFeedback(v2, { investmentCase });

  return v2;
}

module.exports = {
  CANONICAL_REPORT_VERSION,
  buildCanonicalReport,
  buildCanonicalReportV2Sections,
  buildDashboardFeedback,
  // exported for tests
  buildTopicCoverage,
  buildQuestionCoverage,
  deriveAnswerQuality,
  deriveAnswerLocation,
  deriveDeckCommunicationScores,
  deriveTopicCommunicationScores,
  buildSlideFeedbackEntry,
};
