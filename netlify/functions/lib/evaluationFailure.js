/**
 * Evaluation-failure guardrails.
 *
 * A processing/evaluation failure (OpenAI error, timeout, empty/invalid
 * response) causes `evaluateSlide` to fall back to `generateFallbackAnswers`,
 * which emits zero-score, low-confidence placeholder answers:
 *
 *   assessment: "Unable to evaluate slide content."
 *   gap:        "Evaluation failed due to processing error."
 *   fix:        "Ensure slide has clear, readable content."
 *
 * Those placeholders are an INFRASTRUCTURE failure signal, not investor
 * critique. Without a guardrail they flow into scoring and every downstream
 * synthesis and masquerade as legitimate deck weakness (a healthy deck
 * collapses to E/F). This module detects such failures so the pipeline can
 * either fail the analysis outright or exclude the failed slides.
 *
 * Pure/deterministic. No I/O, no scoring changes.
 */

'use strict';

// Exact placeholder strings emitted by the fallback paths (rubrics.js
// generateFallbackAnswers + reportGenerator.js thesis fallback). Detection keys
// off these literals plus the score===0 / confidence==='low' shape.
const PLACEHOLDER_STRINGS = [
  'Unable to evaluate slide content.',
  'Evaluation failed due to processing error.',
  'Ensure slide has clear, readable content.',
  'Cannot assess investor impact without successful evaluation.',
];

// User-facing report_v2 must never contain these (except admin/diagnostic
// metadata). Used by the downstream sanitizer as a belt-and-suspenders guard.
const FORBIDDEN_PLACEHOLDER_RE = new RegExp(
  '(' +
    [
      'Unable to evaluate slide content',
      'Evaluation failed due to processing error',
      'Ensure slide has clear, readable content',
      'Cannot assess investor impact without successful evaluation',
    ]
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|') +
    ')',
  'i'
);

// Share of scored slides that must be failed placeholders before the whole
// analysis is declared unreliable. >= this => major (fail the report);
// (0, this) => partial (drop failed slides, keep the rest); 0 => normal.
const MAJOR_FAILURE_RATIO = 0.5;

// Founder-facing message for a major failure. Surfaced via the existing
// deck `processing_status='failed'` path (ProcessingPage), NOT as a grade.
const FAILED_ANALYSIS_MESSAGE =
  'We could not evaluate this deck reliably. Please regenerate the report.';

function _isPlaceholderText(v) {
  if (!v) return false;
  const s = String(v).trim();
  return PLACEHOLDER_STRINGS.some((p) => s === p);
}

/**
 * True when a single rubric answer is a processing-error placeholder:
 * zero score, low confidence, and a known placeholder string in
 * assessment / gap / fix / investor_impact.
 */
function isFailedAnswer(a) {
  if (!a) return false;
  const zero = Number(a.score) === 0;
  const lowConf = String(a.confidence || '').toLowerCase() === 'low';
  const placeholder =
    _isPlaceholderText(a.assessment) ||
    _isPlaceholderText(a.gap) ||
    _isPlaceholderText(a.fix) ||
    _isPlaceholderText(a.investor_impact);
  return zero && lowConf && placeholder;
}

/**
 * True when a slide evaluation is a failed (placeholder) evaluation rather
 * than a real assessment. A failure marks EVERY question via the fallback, so
 * we require a strong majority of placeholder answers to avoid false positives
 * on genuinely weak-but-real slides.
 *
 * @param {Object} slideEval  { questions: [{score, confidence, assessment, gap, fix, ...}], ... }
 */
function isFailedSlideEvaluation(slideEval) {
  const qs = (slideEval && slideEval.questions) || [];
  if (qs.length === 0) return false;
  const failed = qs.filter(isFailedAnswer).length;
  return failed / qs.length >= 0.6;
}

/**
 * Assess deck-wide evaluation failure over the SCORED slide evaluations
 * (investment_highlights etc. are already excluded upstream).
 *
 * @param {Array}  slideEvaluations  built slide evaluations (with questions[])
 * @param {Object} [opts]
 * @param {Set|Array} [opts.knownFailedNumbers]  slide_numbers whose evaluateSlide
 *        call returned success:false (authoritative signal for fresh runs). Unioned
 *        with the placeholder-pattern detection so stored/legacy reports are caught too.
 * @returns {{ scoredCount, failedCount, failedSlideNumbers, ratio, level }}
 */
function assessDeckFailure(slideEvaluations, opts = {}) {
  const evals = Array.isArray(slideEvaluations) ? slideEvaluations : [];
  const known = new Set(
    Array.from(opts.knownFailedNumbers || []).map((n) => Number(n))
  );
  const failedNumbers = new Set();
  for (const se of evals) {
    const num = Number(se.slide_number);
    if (known.has(num) || isFailedSlideEvaluation(se)) {
      failedNumbers.add(num);
    }
  }
  const scoredCount = evals.length;
  const failedCount = evals.filter((se) =>
    failedNumbers.has(Number(se.slide_number))
  ).length;
  const ratio = scoredCount > 0 ? failedCount / scoredCount : 0;
  let level = 'none';
  if (ratio >= MAJOR_FAILURE_RATIO) level = 'major';
  else if (failedCount > 0) level = 'partial';
  return {
    scoredCount,
    failedCount,
    failedSlideNumbers: Array.from(failedNumbers).sort((a, b) => a - b),
    ratio: Math.round(ratio * 1000) / 1000,
    level,
  };
}

/**
 * Belt-and-suspenders: recursively strip any residual placeholder strings from
 * an already-assembled, user-facing object (report_v2). Upstream exclusion
 * should already prevent these, so this is normally a no-op. Mutates in place.
 *
 * - String array items matching the forbidden pattern are removed.
 * - String object values matching the forbidden pattern are blanked ('').
 *
 * @returns {number} count of occurrences stripped
 */
function stripForbiddenPlaceholders(node) {
  let stripped = 0;
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const item = node[i];
      if (typeof item === 'string') {
        if (FORBIDDEN_PLACEHOLDER_RE.test(item)) {
          node.splice(i, 1);
          stripped++;
        }
      } else if (item && typeof item === 'object') {
        stripped += stripForbiddenPlaceholders(item);
      }
    }
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (typeof val === 'string') {
        if (FORBIDDEN_PLACEHOLDER_RE.test(val)) {
          node[key] = '';
          stripped++;
        }
      } else if (val && typeof val === 'object') {
        stripped += stripForbiddenPlaceholders(val);
      }
    }
  }
  return stripped;
}

module.exports = {
  MAJOR_FAILURE_RATIO,
  FAILED_ANALYSIS_MESSAGE,
  FORBIDDEN_PLACEHOLDER_RE,
  isFailedAnswer,
  isFailedSlideEvaluation,
  assessDeckFailure,
  stripForbiddenPlaceholders,
};
