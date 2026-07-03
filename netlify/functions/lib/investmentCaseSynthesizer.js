/**
 * Investment Case Synthesizer
 *
 * Deterministic, heuristic-only synthesis of "Investment Case as Presented"
 * (model/scoring-rubric.md): a qualitative reading of Opportunity Strength,
 * Execution Credibility, and Investor Fit, plus Market Validation as EVIDENCE
 * (never a score).
 *
 * ADDITIVE / BEHAVIOR-PRESERVING:
 *   - No external API calls, no LLM calls.
 *   - Derives only from signals the pipeline already computed (thesis scores,
 *     slide grades, company context). Does not change scoring, grades, prompts,
 *     or report sections.
 *   - Output is attached to report content as metadata only; nothing renders it.
 *
 * The five qualitative labels (not 1–5 peer scores):
 *   Strong | Promising but Under-Supported | Mixed | Weak | Not Enough Information
 *
 * Per the model, absence of evidence is not the same as a weak thesis: when the
 * relevant material is missing the label is "Not Enough Information"; when the
 * direction is positive but proof is thin (common at early stages) the label is
 * "Promising but Under-Supported" rather than "Weak".
 */

'use strict';

const INVESTMENT_CASE_LABELS = [
  'Strong',
  'Promising but Under-Supported',
  'Mixed',
  'Weak',
  'Not Enough Information',
];

// Relevant slide types per assessment area (matches inferred_type vocabulary).
const OPPORTUNITY_SLIDE_TYPES = [
  'problem',
  'market',
  'competition',
  'business_model',
  'solution',
];
const EXECUTION_SLIDE_TYPES = [
  'team',
  'traction',
  'product',
  'go_to_market',
];

// Thesis elements per area (from fullReport.investment_thesis).
const OPPORTUNITY_THESIS_KEYS = ['why_this_market', 'why_now'];
const EXECUTION_THESIS_KEYS = ['why_this_team', 'why_this_product'];

// Proxy / adjacent-behavior market-validation language.
const PROXY_PATTERNS = [
  /\b(craigslist|competitor|substitute|alternative)s?\b/i,
  /\b(already\s+(use|using|do|doing|pay|paying|spend|spending))\b/i,
  /\b(adjacent\s+(market|behavior|marketplace|community)|comparable\s+market|existing\s+behavior|workaround)\b/i,
];

// Letter grade -> 1–5 number (A best). Mirrors rubrics' GRADE_TO_SCORE and
// tolerates +/- variants and F without taking a hard dependency.
function _gradeToNum(grade) {
  if (!grade || typeof grade !== 'string') return null;
  const base = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }[grade[0].toUpperCase()];
  if (base == null) return null;
  if (grade.includes('-')) return Math.max(0, base - 0.4);
  if (grade.includes('+')) return Math.min(5, base + 0.3);
  return base;
}

function _normalize(deckData) {
  const d = deckData || {};
  const fullReport = d.fullReport || (d.investment_thesis || d.slides ? d : {});
  const slides = d.slides || fullReport.slides || [];
  const companyContext = d.companyContext || null;
  return { fullReport, slides, companyContext };
}

// Aggregate raw deck text from evaluation slides (which may carry extracted_text)
// or from the passed-in slides.
function _deckText(fullReport, slides) {
  const parts = [];
  for (const s of slides || []) {
    if (s && s.extracted_text) parts.push(String(s.extracted_text));
  }
  for (const s of fullReport.slides || []) {
    if (s && s.assessment) parts.push(String(s.assessment));
  }
  return parts.join('\n');
}

function _isEarly(companyContext) {
  const ctx = companyContext && companyContext.detected_context;
  return ctx === 'Idea / Pre-Product' || ctx === 'Product / Pre-Revenue';
}

// Collect a composite 0–5 score and evidence for one area.
function _areaScore(fullReport, thesisKeys, slideTypes) {
  const thesis = fullReport.investment_thesis || {};
  const values = [];
  const evidence = [];
  const signals = [];
  let hasThinEvidence = false;

  for (const key of thesisKeys) {
    const el = thesis[key];
    if (el && typeof el.score === 'number') {
      values.push(el.score);
      signals.push(`${key}=${el.score}/5`);
      if (el.gaps && String(el.gaps).trim() && !/^(none|n\/a|unable)/i.test(String(el.gaps))) {
        hasThinEvidence = true;
      }
      if (el.verdict) evidence.push(String(el.verdict));
    }
  }

  const byType = {};
  for (const s of fullReport.slides || []) {
    if (s && s.type) byType[String(s.type).toLowerCase()] = s;
  }
  for (const type of slideTypes) {
    const s = byType[type];
    if (s && s.grade) {
      const n = _gradeToNum(s.grade);
      if (n != null) {
        values.push(n);
        signals.push(`${type}:${s.grade}`);
      }
    }
  }

  const present = values.length > 0;
  const score = present ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return { present, score, evidence, signals, hasThinEvidence };
}

function _scoreToLabel(area, companyContext) {
  if (!area.present || area.score == null) return 'Not Enough Information';
  const s = area.score;
  const early = _isEarly(companyContext);
  if (s >= 4.0) return 'Strong';
  if (s >= 3.25) return early || area.hasThinEvidence ? 'Promising but Under-Supported' : 'Mixed';
  if (s >= 2.5) return 'Mixed';
  return 'Weak';
}

function _interpret(areaName, label) {
  switch (label) {
    case 'Strong':
      return `The deck makes a compelling, well-supported case for ${areaName}.`;
    case 'Promising but Under-Supported':
      return `${areaName} looks directionally promising, but the deck does not yet provide enough evidence to fully support it.`;
    case 'Mixed':
      return `The deck presents both credible strengths and meaningful concerns for ${areaName}.`;
    case 'Weak':
      return `The deck provides enough information to evaluate ${areaName}, and it appears materially weak as presented.`;
    default:
      return `The deck does not provide enough information to evaluate ${areaName} responsibly.`;
  }
}

// --- Grounded deck-evidence extraction ---------------------------------------
// All extraction is regex over already-extracted deck text. Numbers are only
// ever surfaced when they literally appear in the text (nothing is invented).

const MONEY = '\\$\\s?\\d[\\d,]*(?:\\.\\d+)?\\s?(?:k|m|mm|bn|b|billion|million|thousand)?';

function _cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Join a list human-style: "a", "a and b", "a, b, and c".
function _joinList(arr) {
  const a = (arr || []).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}

// Fallback: most-mature round mentioned anywhere (seed beats pre-seed, so the
// standalone-seed lookbehind check must come BEFORE pre-seed).
function _detectRound(text) {
  if (/\bseries\s+d\b/i.test(text)) return 'Series D';
  if (/\bseries\s+c\b/i.test(text)) return 'Series C';
  if (/\bseries\s+b\b/i.test(text)) return 'Series B';
  if (/\bseries\s+a\b/i.test(text)) return 'Series A';
  if (/(?<!pre[\s-])\bseed\b/i.test(text)) return 'Seed';
  if (/\bpre[\s-]?seed\b/i.test(text)) return 'Pre-seed';
  return null;
}

// Explicit CURRENT financing ask (e.g. "raising $2M seed", "Seed Round pitch
// deck"). Takes priority over historical/timeline stage labels elsewhere in the
// deck (a funding history may list both "Pre-Seed" and "Seed").
function _detectCurrentRound(text) {
  const t = text || '';
  const AMT = `(?:${MONEY}\\s+)?`;
  // Series A–D ask.
  let m =
    t.match(new RegExp(`(?:raising|raise|closing|our|seeking)\\s+(?:a\\s+)?${AMT}series\\s+([a-d])\\b`, 'i')) ||
    t.match(/series\s+([a-d])\s+(?:round|pitch\s+deck|financing|raise)/i) ||
    t.match(new RegExp(`${MONEY}\\s+series\\s+([a-d])\\b`, 'i'));
  if (m) return `Series ${m[1].toUpperCase()}`;
  // Pre-seed ask (checked before seed so "seed" inside "pre-seed" doesn't win).
  if (
    new RegExp(`(?:raising|raise|closing|our|seeking)\\s+(?:a\\s+)?${AMT}pre[\\s-]?seed\\b`, 'i').test(t) ||
    /pre[\s-]?seed\s+round\s+(?:pitch|deck|to|of|financing)/i.test(t) ||
    new RegExp(`${MONEY}\\s+pre[\\s-]?seed\\s+round`, 'i').test(t)
  ) {
    return 'Pre-seed';
  }
  // Seed ask (lookbehind excludes "pre-seed").
  if (
    new RegExp(`(?:raising|raise|closing|our|seeking)\\s+(?:a\\s+)?${AMT}(?<!pre[\\s-])seed\\b`, 'i').test(t) ||
    new RegExp(`${MONEY}\\s+(?<!pre[\\s-])seed\\s+round`, 'i').test(t) ||
    /(?<!pre[\s-])seed\s+round\s+(?:pitch|deck)/i.test(t)
  ) {
    return 'Seed';
  }
  return null;
}

// Extract financing terms from deck text; each field null when not stated.
function _extractFundingTerms(text) {
  const t = text || '';
  const clean = (s) => (s ? s.replace(/\s+/g, '') : null);
  // Explicit current ask wins over any timeline/historical stage labels.
  const round = _detectCurrentRound(t) || _detectRound(t);

  let raise = null;
  const raiseCtx =
    t.match(new RegExp(`\\braising\\s+(?:a\\s+)?(${MONEY})`, 'i')) ||
    t.match(new RegExp(`(${MONEY})\\s+(?:seed|pre[\\s-]?seed|round|raise|safe|note)`, 'i')) ||
    t.match(new RegExp(`(?:target(?:ing)?|raise|round)\\s*[:\\-]?\\s*(${MONEY})`, 'i'));
  if (raiseCtx) raise = clean(raiseCtx[1]);

  let instrument = null;
  if (/\bSAFE\b/.test(t)) instrument = 'SAFE';
  else if (/\bconvertible\s+note\b/i.test(t)) instrument = 'Convertible note';
  else if (/\b(?:priced\s+)?equity\s+round\b/i.test(t)) instrument = 'Priced equity round';
  else if (/\bnote\b/i.test(t)) instrument = 'Note';
  else if (/\bequity\b/i.test(t)) instrument = 'Equity';

  let cap = null;
  const capM =
    t.match(new RegExp(`(${MONEY})\\s*(?:post|pre)?[\\s-]*(?:money\\s+)?cap\\b`, 'i')) ||
    t.match(new RegExp(`\\bcap\\s*(?:of)?\\s*(${MONEY})`, 'i'));
  if (capM) cap = clean(capM[1]);

  let discount = null;
  const discM = t.match(/(\d{1,2})\s*%\s*discount/i);
  if (discM) discount = `${discM[1]}%`;

  let committed = null;
  const commM =
    t.match(new RegExp(`(${MONEY})\\s+(?:already\\s+)?(?:committed|soft[\\s-]?circled|secured|closed)`, 'i')) ||
    t.match(new RegExp(`(?:committed|soft[\\s-]?circled|secured)\\s*[:\\-]?\\s*(${MONEY})`, 'i'));
  if (commM) committed = clean(commM[1]);

  let remaining = null;
  const remM = t.match(new RegExp(`(${MONEY})\\s+(?:remaining|left|open|available)`, 'i'));
  if (remM) remaining = clean(remM[1]);

  return { round, raise, instrument, cap, discount, committed, remaining };
}

// Extract concrete direct-validation phrases (with numbers when present).
function _extractDirectSignals(text) {
  const t = text || '';
  const out = [];
  const seen = new Set();
  const add = (p) => {
    const k = (p || '').toLowerCase();
    if (p && !seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  };
  const NUM = '[\\d][\\d,\\.]*\\s?(?:k|m|thousand|million)?\\+?';
  let m;
  if ((m = t.match(new RegExp(`(${NUM})\\s+(?:registered |active |monthly |total )?users\\b`, 'i')))) add(`${m[1].trim()} users`);
  if ((m = t.match(new RegExp(`(${NUM})\\s+(detailers|suppliers|hosts|providers|merchants|sellers|vendors|drivers)\\b`, 'i')))) add(`${m[1].trim()} ${m[2].toLowerCase()}`);
  if ((m = t.match(new RegExp(`(${NUM})\\s+paying\\s+(?:customers|users)\\b`, 'i')))) add(`${m[1].trim()} paying customers`);
  else if ((m = t.match(new RegExp(`(${NUM})\\s+customers\\b`, 'i')))) add(`${m[1].trim()} customers`);
  if ((m = t.match(new RegExp(`(${MONEY})\\s+(?:revenue\\s+)?run[\\s-]?rate`, 'i')))) add(`${m[1].replace(/\s+/g, '')} revenue run rate`);
  if ((m = t.match(new RegExp(`(${MONEY})\\s+ARR\\b`, 'i')))) add(`${m[1].replace(/\s+/g, '')} ARR`);
  if ((m = t.match(new RegExp(`(${MONEY})\\s+MRR\\b`, 'i')))) add(`${m[1].replace(/\s+/g, '')} MRR`);
  if ((m = t.match(/\b([0-5](?:\.\d)?)\s?(?:★|-?\s?stars?|-star)\b/i)) || (m = t.match(/rated\s+([0-5](?:\.\d)?)/i))) add(`${m[1]}-star app ratings`);
  if ((m = t.match(/((?:thousands|hundreds)|[\d][\d,\.]*\s?(?:k|m)?\+?)(?:\s+of)?\s+(?:app[\s-]?store\s+|google\s+play\s+|5[\s-]?star\s+)?reviews\b/i))) {
    const n = m[1].trim();
    add(/^(?:thousands|hundreds)$/i.test(n) ? `${n} of reviews` : `${n} reviews`);
  }
  // Qualitative first-party signals (no number required).
  const qual = [
    [/\bwait[\s-]?list\b/i, 'a waitlist'],
    [/\bdesign partners?\b/i, 'design partners'],
    [/\bpilots?\b/i, 'pilots'],
    [/\bLOIs?\b|letters?\s+of\s+intent/i, 'letters of intent'],
  ];
  for (const [re, label] of qual) if (re.test(t)) add(label);
  return out;
}

// Deck-shape flags used to make priorities/diagnosis specific.
function _detectFlags(text) {
  const t = text || '';
  return {
    is_marketplace: /\b(marketplace|two[\s-]?sided|supply[\s-]?and[\s-]?demand|supply\/demand|liquidity|take[\s-]?rate|gmv|buyers?\s+and\s+sellers?|detailers|hosts)\b/i.test(t),
    has_gtm_channels: /\b(acquisition|channels?|paid\s+(ads|marketing|acquisition)|organic|referral|seo|sem|\bads\b|growth\s+loops?)\b/i.test(t),
    has_cac_economics: /\b(cac|payback|ltv|unit\s+economics|contribution\s+margin|cost\s+per\s+acquisition)\b/i.test(t),
    has_market_size_claim: new RegExp(`\\b(tam|sam|som|market\\s+size|projection|projected|${MONEY}\\s+(?:market|opportunity))\\b`, 'i').test(t),
    has_retention_data: /\b(retention|repeat\s+(usage|purchase|booking)|cohort|churn|ndr|nrr|net\s+(dollar|revenue)\s+retention)\b/i.test(t),
    has_defensibility: /\b(moat|defensib|network\s+effect|switching\s+cost|proprietary|patent|lock[\s-]?in|barriers?\s+to\s+entry)\b/i.test(t),
    // A built, shipping product (used to suppress "product maturity unclear").
    product_built: /\b(web\s?app|responsive\s+web|native\s+(ios|android)|ios\s+(app|and\s+android)|android\s+app|mobile\s+apps?|app\s?store|google\s+play|screenshots?|(?:is|now)\s+live|in\s+production|shipping|beta)\b/i.test(t),
  };
}

// Best-effort company-name detection to avoid false "name missing" feedback.
function _detectCompanyName(slides) {
  const parts = [];
  for (const s of slides || []) {
    if (s && s.extracted_text) parts.push({ type: String(s.inferred_type || '').toLowerCase(), text: String(s.extracted_text) });
  }
  const all = parts.map((p) => p.text).join('\n');
  let m = all.match(/\b[\w.+-]+@([a-z0-9-]+)\.(?:com|io|co|app|ai|xyz|net|org)\b/i);
  if (m) return _cap(m[1]);
  m = all.match(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]{2,})\.(?:com|io|co|app|ai)\b/i);
  if (m && !/^www$/i.test(m[1])) return _cap(m[1]);
  const cover = parts.find((p) => p.type === 'cover');
  if (cover) {
    const firstLine = cover.text.split(/\n/).map((s) => s.trim()).find(Boolean);
    if (firstLine) {
      const tok = firstLine.match(/^[A-Z][A-Za-z0-9&.\-]{1,20}/);
      if (tok) return tok[0];
    }
  }
  return null;
}

// --- Public API ---------------------------------------------------------------

/**
 * Synthesize the Investment Case as Presented from already-computed pipeline
 * signals. Deterministic; never throws on missing data.
 *
 * @param {Object} deckData { fullReport, slides, companyContext } (any subset).
 * @param {Object} [options] { investorAudience?, targetRaise? } — NOT collected
 *   yet, so Investor Fit defaults to "Not Enough Information".
 */
function synthesizeInvestmentCase(deckData, options = {}) {
  const { fullReport, slides, companyContext } = _normalize(deckData);
  const text = _deckText(fullReport, slides);

  // --- Opportunity Strength ---
  const opp = _areaScore(fullReport, OPPORTUNITY_THESIS_KEYS, OPPORTUNITY_SLIDE_TYPES);
  const opportunityLabel = _scoreToLabel(opp, companyContext);

  // --- Execution Credibility ---
  const exe = _areaScore(fullReport, EXECUTION_THESIS_KEYS, EXECUTION_SLIDE_TYPES);
  const executionLabel = _scoreToLabel(exe, companyContext);

  // --- Grounded deck-evidence extraction ---
  const fundingTerms = _extractFundingTerms(text);
  const directSignals = _extractDirectSignals(text);
  const flags = _detectFlags(text);
  const companyName = _detectCompanyName(slides);

  // --- Market Validation (evidence, not a score) ---
  const ccSignals = (companyContext && companyContext.signals) || {};
  const direct_validation = Boolean(
    directSignals.length > 0 || ccSignals.user_or_customer_evidence || ccSignals.revenue_evidence
  );
  const proxy_validation = PROXY_PATTERNS.some((re) => re.test(text));
  const missing_validation = !direct_validation && !proxy_validation;

  const mvEvidence = [];
  const mvSignals = [];
  if (direct_validation) mvSignals.push('direct');
  if (proxy_validation) mvSignals.push('proxy');
  if (missing_validation) mvSignals.push('missing');
  directSignals.forEach((p) => mvEvidence.push(p));
  if (proxy_validation) {
    mvEvidence.push('Proxy/adjacent-behavior validation (substitutes, competitors, or existing behavior).');
  }

  let mvSummary;
  if (missing_validation) {
    mvSummary = 'Market validation is largely absent; the opportunity is asserted more than evidenced.';
  } else if (directSignals.length > 0) {
    mvSummary = `The deck provides direct market validation through ${_joinList(directSignals)}.`;
  } else if (direct_validation) {
    mvSummary = 'Market validation includes direct evidence from the company’s own users or customers.';
  } else {
    mvSummary =
      'Market validation is currently indirect: it relies on proxy or adjacent-market behavior and still needs direct proof.';
  }

  // --- Investor Fit (inferred from deck funding terms; audience optional) ---
  let inferredAudience = (options && options.investorAudience) || null;
  if (!inferredAudience && fundingTerms.round) {
    const r = fundingTerms.round.toLowerCase();
    if (r.includes('pre-seed')) inferredAudience = 'Pre-seed investors or angel investors';
    else if (r === 'seed') inferredAudience = 'Seed investors / seed venture capital';
    else if (r === 'series a') inferredAudience = 'Series A investors';
    else inferredAudience = 'Growth-stage venture investors';
  }
  const hasStatedRaise = Boolean(
    fundingTerms.round || fundingTerms.raise || (options && (options.investorAudience || options.targetRaise))
  );

  const investorFitEvidence = [];
  const investorFitSignals = [];
  let investorFitLabel;
  let investorFitInterpretation;

  if (!hasStatedRaise) {
    investorFitLabel = 'Not Enough Information';
    investorFitInterpretation =
      'The deck does not state a round or raise, and no investor audience was provided, so Investor Fit cannot be assessed.';
    investorFitSignals.push('audience_unknown');
  } else {
    if (fundingTerms.round) investorFitEvidence.push(`Round: ${fundingTerms.round}.`);
    if (fundingTerms.raise) investorFitEvidence.push(`Target raise: ${fundingTerms.raise}.`);
    if (fundingTerms.instrument) investorFitEvidence.push(`Instrument: ${fundingTerms.instrument}.`);
    if (fundingTerms.cap) investorFitEvidence.push(`Valuation cap: ${fundingTerms.cap}.`);
    if (fundingTerms.discount) investorFitEvidence.push(`Discount: ${fundingTerms.discount}.`);
    if (fundingTerms.committed) investorFitEvidence.push(`Committed: ${fundingTerms.committed}.`);
    if (fundingTerms.remaining) investorFitEvidence.push(`Remaining: ${fundingTerms.remaining}.`);
    investorFitSignals.push('round_or_raise_stated');

    // Open diligence questions that should keep fit below "Strong".
    const diligenceGaps = [];
    if (!flags.has_defensibility) diligenceGaps.push('defensibility');
    if (!flags.has_retention_data) diligenceGaps.push('retention/repeat usage');
    if (flags.is_marketplace) diligenceGaps.push('marketplace liquidity');
    if (flags.has_gtm_channels && !flags.has_cac_economics) diligenceGaps.push('acquisition economics');
    if (flags.has_market_size_claim && opportunityLabel !== 'Strong') diligenceGaps.push('market-size assumptions');

    // Strong only when round+raise AND everything is well supported with no
    // open diligence gaps. Strong traction with gaps → Promising but
    // Under-Supported. Otherwise Mixed.
    const wellSupported =
      opportunityLabel === 'Strong' &&
      (executionLabel === 'Strong' || executionLabel === 'Mixed') &&
      direct_validation &&
      diligenceGaps.length === 0;
    if (wellSupported && fundingTerms.round && fundingTerms.raise) {
      investorFitLabel = 'Strong';
    } else if (direct_validation && diligenceGaps.length > 0) {
      investorFitLabel = 'Promising but Under-Supported';
    } else {
      investorFitLabel = 'Mixed';
    }

    const parts = [];
    if (fundingTerms.round) parts.push(fundingTerms.round);
    if (fundingTerms.raise) parts.push(fundingTerms.raise);
    if (fundingTerms.instrument) parts.push(`on a ${fundingTerms.instrument}`);
    const stated = parts.length
      ? ` (${parts.join(' ')}${fundingTerms.committed ? `, ${fundingTerms.committed} committed` : ''})`
      : '';
    let caveat;
    if (investorFitLabel === 'Strong') {
      caveat = 'this depends on continued proof of durable growth';
    } else if (diligenceGaps.length > 0) {
      caveat = `key ${(fundingTerms.round || 'venture').toLowerCase()} diligence questions — ${_joinList(diligenceGaps.slice(0, 4))} — are still open`;
    } else {
      caveat = 'some evidence, such as use-of-funds milestones and durable growth, is still thin';
    }
    investorFitInterpretation = `The deck presents a ${inferredAudience || 'venture'} raise${stated}. As presented it appears a plausible fit for ${inferredAudience || 'the stated investors'}, though ${caveat}.`;
  }

  return {
    opportunity_strength: {
      label: opportunityLabel,
      interpretation: _interpret('the opportunity', opportunityLabel),
      evidence: opp.evidence,
    },
    execution_credibility: {
      label: executionLabel,
      interpretation: _interpret('execution', executionLabel),
      evidence: exe.evidence,
    },
    investor_fit: {
      label: investorFitLabel,
      interpretation: investorFitInterpretation,
      evidence: investorFitEvidence,
    },
    market_validation: {
      summary: mvSummary,
      evidence: mvEvidence,
      direct_signals: directSignals,
      direct_validation,
      proxy_validation,
      missing_validation,
    },
    funding_terms: fundingTerms,
    inferred_investor_audience: inferredAudience,
    detected: flags,
    company_name: companyName,
    company_name_present: Boolean(companyName),
    signals: {
      opportunity_signals: opp.signals,
      execution_signals: exe.signals,
      investor_fit_signals: investorFitSignals,
      market_validation_signals: mvSignals,
    },
  };
}

module.exports = {
  INVESTMENT_CASE_LABELS,
  synthesizeInvestmentCase,
};
