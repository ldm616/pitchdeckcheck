/**
 * Company Context Classifier
 *
 * Deterministic, heuristic-only inference of a deck's Company Context stage,
 * per the product-owned model (model/company-context.md):
 *
 *   - Idea / Pre-Product
 *   - Product / Pre-Revenue
 *   - Early Revenue
 *   - Growth
 *   - Unknown
 *
 * ADDITIVE / BEHAVIOR-PRESERVING:
 *   - No external API calls, no LLM calls.
 *   - Does not change scoring, grades, prompts, or report sections.
 *   - Output is attached to the report content as metadata only; nothing
 *     renders it yet.
 *
 * Classification uses only evidence present in the deck. Per company-context.md,
 * when evidence is weak or ambiguous the classifier defaults to the LOWER
 * (less mature) context and reports lower confidence. Higher-maturity contexts
 * require correspondingly stronger evidence (Early Revenue requires revenue
 * evidence; Growth requires both revenue and growth/scale evidence).
 */

'use strict';

const COMPANY_CONTEXTS = [
  'Idea / Pre-Product',
  'Product / Pre-Revenue',
  'Early Revenue',
  'Growth',
  'Unknown',
];

// --- Signal detection patterns ------------------------------------------------
// Word-boundary anchored to limit false positives.

// Product EXISTENCE (something built), not a proposed solution. "solution" is
// intentionally excluded: an idea-stage deck describes a solution/vision but has
// no product yet (Investor Framework: Solution = vision, Product = what is built).
const PRODUCT_PATTERNS = [
  /\b(our|the)\s+(product|app|platform|software)\b/i,
  /\b(demo|screenshot|prototype|beta|mvp|launched|shipping|now live|is live|in production)\b/i,
  /\b(available (on|in)|app store|google play|download the)\b/i,
  /\busers?\s+can\b/i,
];

const USER_PATTERNS = [
  /\b(sign[\s-]?ups?|wait[\s-]?list|pilots?|design partners?|beta users?|early adopters?)\b/i,
  /\b(dau|mau|wau|active users?|registered users?)\b/i,
  /\b\d[\d,\.]*\s*(k|m|thousand|million)?\+?\s*(users?|customers?|sign[\s-]?ups?|downloads?|members?)\b/i,
  /\b(customers?|clients?)\s+(include|such as|like)\b/i,
];

const REVENUE_PATTERNS = [
  /\b(arr|mrr|gmv)\b/i,
  /\b(revenue|bookings|monetization|monetize)\b/i,
  /\bpaying\s+(customers?|users?|subscribers?)\b/i,
  /\$\s?\d[\d,\.]*\s*(k|m|mm|million|bn|billion)?\s*(in\s+)?(revenue|arr|mrr|sales|bookings|gmv)/i,
];

const GROWTH_PATTERNS = [
  /\b\d+\s*%\s*(mom|yoy|wow|month[\s-]over[\s-]month|year[\s-]over[\s-]year|growth)\b/i,
  /\b(month[\s-]over[\s-]month|year[\s-]over[\s-]year|week[\s-]over[\s-]week)\b/i,
  /\b(net revenue retention|ndr|nrr|net dollar retention|expansion revenue|cohort retention)\b/i,
  /\b(million\s+(users?|customers?|downloads?)|hyper[\s-]?growth|doubling (every|each)|scaling rapidly)\b/i,
];

// Ordered most-mature first; the first match wins for the reported string.
const FUNDING_STAGE_PATTERNS = [
  { stage: 'series c', re: /\bseries\s+c\b/i },
  { stage: 'series b', re: /\bseries\s+b\b/i },
  { stage: 'series a', re: /\bseries\s+a\b/i },
  // Negative lookbehind so the "seed" inside "pre-seed" does not match here.
  { stage: 'seed', re: /(?<!pre[\s-])\bseed(\s+(round|stage|funding|extension))?\b/i },
  { stage: 'pre-seed', re: /\bpre[\s-]?seed\b/i },
];

// --- Helpers ------------------------------------------------------------------

// Accept a slides array, a { slides } object, or a raw string; normalize to a
// { text, types } view over the deck.
function _normalize(deckData) {
  let slides = [];
  if (Array.isArray(deckData)) {
    slides = deckData;
  } else if (deckData && Array.isArray(deckData.slides)) {
    slides = deckData.slides;
  } else if (typeof deckData === 'string') {
    return { text: deckData, types: new Set() };
  }

  const text = slides
    .map((s) => (s && s.extracted_text ? String(s.extracted_text) : ''))
    .join('\n');
  const types = new Set(
    slides
      .map((s) => (s && s.inferred_type ? String(s.inferred_type).toLowerCase() : ''))
      .filter(Boolean)
  );
  return { text, types };
}

function _anyMatch(patterns, text) {
  return patterns.some((re) => re.test(text));
}

function _detectFundingStage(text) {
  for (const { stage, re } of FUNDING_STAGE_PATTERNS) {
    if (re.test(text)) return stage;
  }
  return null;
}

// --- Public API ---------------------------------------------------------------

/**
 * Classify a deck's Company Context stage from deck evidence only.
 * @param {Array|Object|string} deckData slides array (each with extracted_text,
 *   inferred_type), or { slides }, or raw aggregated text.
 * @returns {{
 *   detected_context: string,
 *   confidence: 'High'|'Medium'|'Low',
 *   evidence: string[],
 *   signals: {
 *     product_evidence: boolean,
 *     user_or_customer_evidence: boolean,
 *     revenue_evidence: boolean,
 *     growth_scale_evidence: boolean,
 *     funding_stage_evidence: string|null
 *   }
 * }}
 */
function classifyCompanyContext(deckData) {
  const { text, types } = _normalize(deckData);
  const evidence = [];

  // A deck with essentially no extractable text cannot be classified.
  const meaningfulText = (text || '').trim();
  if (meaningfulText.length < 120) {
    return {
      detected_context: 'Unknown',
      confidence: 'Low',
      evidence: ['Deck contains too little extractable text to classify context.'],
      signals: {
        product_evidence: false,
        user_or_customer_evidence: false,
        revenue_evidence: false,
        growth_scale_evidence: false,
        funding_stage_evidence: null,
      },
    };
  }

  // Slide-type corroboration: a substantive product/traction/financials slide
  // is weak additional evidence alongside the text patterns.
  // Only a dedicated product slide corroborates product existence; a solution
  // slide describes the proposed approach, not a built product.
  const hasProductSlide = types.has('product');
  const hasTractionSlide = types.has('traction');
  const hasFinancialsSlide = types.has('financials');

  const product_evidence = _anyMatch(PRODUCT_PATTERNS, text) || hasProductSlide;
  const user_or_customer_evidence = _anyMatch(USER_PATTERNS, text) || hasTractionSlide;
  const revenue_evidence = _anyMatch(REVENUE_PATTERNS, text);
  const growth_scale_evidence = _anyMatch(GROWTH_PATTERNS, text);
  const funding_stage_evidence = _detectFundingStage(text);

  if (product_evidence) evidence.push('Deck describes an existing product, demo, or solution.');
  if (user_or_customer_evidence) evidence.push('Deck references users, customers, pilots, or adoption.');
  if (revenue_evidence) evidence.push('Deck references revenue, paying customers, or monetization.');
  if (growth_scale_evidence) evidence.push('Deck references growth rates, retention, or scale.');
  if (funding_stage_evidence) evidence.push(`Deck references funding stage: ${funding_stage_evidence}.`);
  if (hasFinancialsSlide) evidence.push('Deck includes a financials slide.');

  // --- Decide context (higher maturity requires stronger evidence) ---
  // Default to the lower context on weak/ambiguous evidence, per the model.
  let detected_context;
  if (revenue_evidence && growth_scale_evidence) {
    detected_context = 'Growth';
  } else if (revenue_evidence) {
    detected_context = 'Early Revenue';
  } else if (product_evidence) {
    detected_context = 'Product / Pre-Revenue';
  } else {
    detected_context = 'Idea / Pre-Product';
    evidence.push('No product, adoption, or revenue evidence found; treated as earliest stage.');
  }

  // --- Confidence ---
  // High: the deciding evidence is corroborated (multiple aligned signals or an
  // aligned explicit funding stage). Medium: the deciding signal is present but
  // uncorroborated. Low: minimal signals overall.
  const signalCount =
    (product_evidence ? 1 : 0) +
    (user_or_customer_evidence ? 1 : 0) +
    (revenue_evidence ? 1 : 0) +
    (growth_scale_evidence ? 1 : 0);

  const fundingAligns =
    (funding_stage_evidence === 'pre-seed' && detected_context === 'Idea / Pre-Product') ||
    (funding_stage_evidence === 'seed' &&
      (detected_context === 'Product / Pre-Revenue' || detected_context === 'Early Revenue')) ||
    ((funding_stage_evidence === 'series a' ||
      funding_stage_evidence === 'series b' ||
      funding_stage_evidence === 'series c') &&
      (detected_context === 'Early Revenue' || detected_context === 'Growth'));

  let confidence;
  if (detected_context === 'Growth' || detected_context === 'Early Revenue') {
    // Revenue-bearing decisions: strong when corroborated by growth or funding.
    confidence = growth_scale_evidence || fundingAligns ? 'High' : 'Medium';
  } else if (detected_context === 'Product / Pre-Revenue') {
    confidence = user_or_customer_evidence || fundingAligns ? 'High' : 'Medium';
  } else {
    // Idea / Pre-Product: absence-of-evidence is inherently less certain, but an
    // explicit aligned funding stage (pre-seed) or any weak signal lifts it.
    confidence = fundingAligns || signalCount > 0 ? 'Medium' : 'Low';
  }

  return {
    detected_context,
    confidence,
    evidence,
    signals: {
      product_evidence,
      user_or_customer_evidence,
      revenue_evidence,
      growth_scale_evidence,
      funding_stage_evidence,
    },
  };
}

module.exports = {
  COMPANY_CONTEXTS,
  classifyCompanyContext,
};
