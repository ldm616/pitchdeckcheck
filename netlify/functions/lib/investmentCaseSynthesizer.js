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

  // --- Market Validation (evidence, not a score) ---
  const ccSignals = (companyContext && companyContext.signals) || {};
  const direct_validation = Boolean(
    ccSignals.user_or_customer_evidence || ccSignals.revenue_evidence
  );
  const proxy_validation = PROXY_PATTERNS.some((re) => re.test(text));
  const missing_validation = !direct_validation && !proxy_validation;

  const mvEvidence = [];
  const mvSignals = [];
  if (direct_validation) {
    mvEvidence.push('Deck shows first-party validation (users, customers, or revenue).');
    mvSignals.push('direct');
  }
  if (proxy_validation) {
    mvEvidence.push('Deck cites proxy or adjacent-behavior validation (substitutes, competitors, existing behavior).');
    mvSignals.push('proxy');
  }
  if (missing_validation) {
    mvEvidence.push('Deck does not yet show direct or proxy evidence that customers want the outcome.');
    mvSignals.push('missing');
  }
  const mvSummary = missing_validation
    ? 'Market validation is largely absent; the opportunity is asserted more than evidenced.'
    : direct_validation
      ? 'Market validation includes direct evidence from the company’s own users or customers.'
      : 'Market validation is currently indirect: it relies on proxy or adjacent-market behavior and still needs direct proof.';

  // --- Investor Fit (audience/raise not collected yet) ---
  const hasAudience = Boolean(options && (options.investorAudience || options.targetRaise));
  const investorFitEvidence = [];
  const investorFitSignals = [];
  let investorFitLabel;
  let investorFitInterpretation;
  if (!hasAudience) {
    investorFitLabel = 'Not Enough Information';
    investorFitInterpretation =
      'Investor Fit cannot be assessed without a stated target investor audience or raise amount; it is left cautious by design.';
    investorFitSignals.push('audience_unknown');
    if (companyContext && companyContext.detected_context) {
      investorFitEvidence.push(`Detected company context: ${companyContext.detected_context}.`);
    }
  } else {
    // Placeholder for a future audience-aware path; conservative for now.
    investorFitLabel = 'Not Enough Information';
    investorFitInterpretation =
      'Investor audience/raise provided, but audience-aware fit scoring is not yet implemented.';
    investorFitSignals.push('audience_provided');
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
      direct_validation,
      proxy_validation,
      missing_validation,
    },
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
