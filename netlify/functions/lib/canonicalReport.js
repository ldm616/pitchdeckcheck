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
  COVER_WORKS,
  COVER_MISSING,
  COVER_RECOMMENDED,
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
  return {
    question: q.question,
    answer_quality: deriveAnswerQuality(q.score),
    answer_location: deriveAnswerLocation(q.score, present),
    evidence_slide_numbers: answered ? [slideNumber] : [],
    evidence_summary: q.assessment || '',
    rationale: q.assessment || '',
    missing_evidence: q.gap && q.gap !== 'None' ? q.gap : '',
    investor_impact: q.investor_impact || '',
    recommendation: q.fix && q.fix !== 'None' ? q.fix : '',
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
    completeness: _mk(comp, "Share of this topic's investor questions that are answered."),
    clarity: _mk(gradeAvg, 'Derived from slide grade; a dedicated evaluator will refine this.'),
    brevity: _mk(3, 'Not separately assessed in this pass.'),
    flow: _mk(gradeAvg, 'Slide headline/takeaway flow evaluator pending; derived from grade.'),
  };
}

function deriveDeckCommunicationScores(evalSlides) {
  const present = new Set((evalSlides || []).map((s) => _normType(s.type)));
  const byType = (t) => (evalSlides || []).filter((s) => _normType(s.type) === t);

  // Completeness: core investor topics that are present AND reasonably answered.
  const answeredCore = CORE_EXPECTED_TOPICS.filter(
    (t) => present.has(t) && _avgQuestionScore(byType(t)) >= 3
  );
  const completeness = _clamp1to5(1 + 4 * (answeredCore.length / CORE_EXPECTED_TOPICS.length));

  // Clarity: how directly the "understand-quickly" topics answer their questions.
  const clarityScores = [];
  for (const t of CLARITY_TOPICS) {
    const g = byType(t);
    if (g.length) clarityScores.push(_avgQuestionScore(g));
  }
  const clarity = _clamp1to5(_avg(clarityScores) || 3);

  // Brevity: efficiency heuristic from slide count and low-signal slides.
  const n = (evalSlides || []).length;
  const otherCount = (evalSlides || []).filter((s) => _normType(s.type) === 'other').length;
  let brevity = n <= 14 ? 4 : n <= 20 ? 3 : 2;
  if (otherCount >= 3) brevity = Math.max(1, brevity - 1);
  brevity = _clamp1to5(brevity);

  // Flow: first-cut approximation from average answer quality across the deck.
  const flow = _clamp1to5(_avg((evalSlides || []).map((s) => _gradeNum(s.grade))) || 3);

  return {
    completeness: _mk(
      completeness,
      `Answered ${answeredCore.length} of ${CORE_EXPECTED_TOPICS.length} core investor topics for this stage.`
    ),
    clarity: _mk(
      clarity,
      'Based on how directly the cover, problem, solution, product, and market answer their core questions.'
    ),
    brevity: _mk(
      brevity,
      `Deck has ${n} evaluated slides${otherCount ? `, including ${otherCount} low-signal slides` : ''}.`
    ),
    flow: _mk(
      flow,
      'Approximated from average slide answer quality; a dedicated narrative-flow evaluator will refine this.'
    ),
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
  const { companyName = null } = opts;
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

  // First-slide cover remap: a slide 1 typed other/unknown with a detectable
  // company name is the cover. Deterministic (position + name), not fabricated.
  const isFirstSlide = Number(slide.slide_number) === 1;
  const untyped = effectiveTypeKey === '' || effectiveTypeKey === 'other' || effectiveTypeKey === 'unknown';
  if (isFirstSlide && untyped && companyName) {
    effectiveTypeKey = 'cover';
    displayTitle = 'Cover';
    whatWorks = COVER_WORKS;
    missing = COVER_MISSING;
    recommended = COVER_RECOMMENDED;
    assessment = _assessmentFromGrade(grade);
    issueType = 'Evidence';
    notAssessed = false;
  }

  return {
    slide_number: slide.slide_number,
    slide_title_or_section: displayTitle,
    investor_decision: TYPE_TO_INVESTOR_DECISION[effectiveTypeKey] || '',
    assessment,
    what_works: whatWorks,
    what_is_missing: missing,
    recommended_improvement: recommended,
    issue_type: notAssessed ? 'None' : missing ? issueType : 'None',
  };
}

function deriveTopicFeedback(representativeSlide, companyName) {
  const e = buildSlideFeedbackEntry(representativeSlide, { companyName });
  return {
    assessment: e.assessment,
    what_works: e.what_works,
    what_is_missing: e.what_is_missing,
    recommended_improvement: e.recommended_improvement,
    issue_type: e.issue_type,
  };
}

// --- topic coverage -----------------------------------------------------------

function buildTopicCoverage(evalSlides, companyName) {
  const byType = new Map();
  for (const s of evalSlides || []) {
    const key = _normType(s.type);
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key).push(s);
  }

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
      topic_feedback: deriveTopicFeedback(rep, companyName),
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

function deriveBelieve(evalSlides) {
  const out = [];
  for (const s of evalSlides || []) {
    for (const q of s.questions || []) {
      if (typeof q.score === 'number' && q.score >= 4 && q.assessment && q.assessment.length > 20) {
        out.push(q.assessment.trim());
      }
    }
  }
  return _dedupe(out).slice(0, 5);
}

function deriveQuestion(evalSlides, missingTopics, marketValidation) {
  const out = [];
  for (const s of evalSlides || []) {
    for (const q of s.questions || []) {
      if (typeof q.score === 'number' && q.score <= 2) {
        const t =
          q.gap && q.gap !== 'None' && q.gap.length > 15
            ? q.gap
            : q.investor_impact && q.investor_impact.length > 15
            ? q.investor_impact
            : '';
        if (t) out.push(t.trim());
      }
    }
  }
  for (const mt of missingTopics || []) {
    out.push(
      `Investors cannot yet evaluate ${mt.topic_label}: ${
        TYPE_TO_INVESTOR_DECISION[mt.topic_key] || 'the topic is not addressed in the deck.'
      }`
    );
  }
  if (marketValidation && marketValidation.missing_validation) {
    out.push(
      'Investors have limited evidence that customers want the outcome (market validation is thin).'
    );
  }
  return _dedupe(out).slice(0, 5);
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

  const topics = buildTopicCoverage(evalSlides, companyName);
  const deck_communication_scores = deriveDeckCommunicationScores(evalSlides);
  const deckCommV2 = toV2CommScores(deck_communication_scores);

  const constraint = _derivePrimaryConstraint(deckCommV2, investmentCase, marketValidation);
  const priority_improvements = _buildPriorityImprovements(deckCommV2, investmentCase);
  const suggested_next_steps = _buildSuggestedNextSteps(constraint, priority_improvements);

  const missingTopics = topics.filter((t) => t.status === 'missing');
  const what_investors_may_believe = deriveBelieve(evalSlides);
  const what_investors_may_question = deriveQuestion(evalSlides, missingTopics, marketValidation);

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

  const slide_level_feedback = evalSlides
    .slice()
    .sort((a, b) => _num(a.slide_number) - _num(b.slide_number))
    .map((s) => buildSlideFeedbackEntry(s, { companyName }));

  return {
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
}

module.exports = {
  CANONICAL_REPORT_VERSION,
  buildCanonicalReport,
  buildCanonicalReportV2Sections,
  // exported for tests
  buildTopicCoverage,
  buildQuestionCoverage,
  deriveAnswerQuality,
  deriveAnswerLocation,
  deriveDeckCommunicationScores,
  deriveTopicCommunicationScores,
  buildSlideFeedbackEntry,
};
