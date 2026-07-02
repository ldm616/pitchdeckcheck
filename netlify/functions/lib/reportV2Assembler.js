/**
 * Report V2 Assembler
 *
 * Assembles the additive `report_v2` object (the new Pitch Deck Check report
 * shape defined by model/report-spec.md + model/sample-report-format.md and
 * typed in app/src/lib/types.ts as PitchDeckCheckReportV2).
 *
 * ADDITIVE / BEHAVIOR-PRESERVING:
 *   - Pure deterministic MAPPING of already-generated data. No API/LLM calls,
 *     no new prompts, no product-owned markdown imported.
 *   - Reads: fullReport, v1Report, freeReport, companyContext (Phase 3a),
 *     investmentCase (Phase 3b).
 *   - Does not replace v1_report, does not change scoring/grades/prompts.
 *
 * Defensive: any missing input degrades gracefully to a valid, sparse report.
 */

'use strict';

const REPORT_V2_VERSION = 'v2';

// Investor Decisions per framework slide type (product-owned content from
// model/investor-framework.md — referenced, not re-authored).
const TYPE_TO_INVESTOR_DECISION = {
  cover: 'What does this company do, who is it for, and why should I care?',
  team: 'Why is this team more likely to succeed than other capable teams?',
  problem: 'Is there a meaningful value gap that customers are motivated to close?',
  why_now: 'Why is this the right time for this company to exist?',
  solution:
    'Do I believe the founders understand what a winning solution should make possible for customers?',
  product: 'Do I believe this product can reliably deliver the promised customer value?',
  competition: 'Why will customers choose this company instead of existing alternatives?',
  moat: "Why won't competitors erode this company's advantage over time?",
  business_model: 'Can this company turn customer value into a large, durable and attractive business?',
  market: 'Is this opportunity large enough to support venture-scale returns?',
  market_opportunity: 'Is this opportunity large enough to support venture-scale returns?',
  traction: "What evidence shows that the company's promise is becoming proof?",
  go_to_market: 'Can this company repeatedly and efficiently acquire the customers it needs to scale?',
  roadmap: 'Does the product roadmap show a credible path to greater customer value and company value?',
  product_roadmap:
    'Does the product roadmap show a credible path to greater customer value and company value?',
  financials: 'Do the financials support a believable path to meaningful company value?',
  ask: 'Does this financing plan create a credible path to the next major value-creating milestone?',
  funding: 'Does this financing plan create a credible path to the next major value-creating milestone?',
  contact: 'How do I continue the conversation with this company?',
};

const V2_GRADE_LETTERS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
const SCORE_LABEL = { 1: 'Very Weak', 2: 'Weak', 3: 'Adequate', 4: 'Strong', 5: 'Excellent' };
// Quality dimension letter -> 1–5 band (label meaning aligned: B=Strong, C=Adequate).
const QUALITY_GRADE_TO_SCORE = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 1 };

// --- small helpers ------------------------------------------------------------

function _toV2Letter(grade) {
  if (!grade || typeof grade !== 'string') return 'F';
  const g = grade.toUpperCase().trim();
  if (V2_GRADE_LETTERS.includes(g)) return g;
  const remap = { 'A+': 'A', 'D+': 'D', 'D-': 'D', E: 'F' };
  if (remap[g]) return remap[g];
  const base = g[0];
  if (base === 'E') return 'F';
  return V2_GRADE_LETTERS.includes(base) ? base : 'F';
}

function _qualityToScore(grade) {
  if (!grade || typeof grade !== 'string') return 3;
  return QUALITY_GRADE_TO_SCORE[grade[0].toUpperCase()] || 3;
}

function _commImprovement(dim, score) {
  if (score >= 4) return 'Maintain this strength.';
  switch (dim) {
    case 'completeness':
      return 'Answer the remaining investor questions and support key claims with credible evidence.';
    case 'clarity':
      return 'Clarify the customer, the value gap, and the core thesis so each idea is easy to understand.';
    case 'brevity':
      return 'Reduce cognitive load: trim redundancy and lead with the strongest evidence.';
    case 'flow':
      return 'Reorder or connect sections so conviction builds toward the financing ask.';
    default:
      return 'Improve this dimension.';
  }
}

function _assessmentFromGrade(grade) {
  const n = _qualityToScore(grade);
  if (n >= 4.5) return 'Strong';
  if (n >= 3.5) return 'Mostly answered';
  if (n >= 2.5) return 'Partially answered';
  return 'Under-supported';
}

// --- primary constraint (drives overall grade + primary diagnosis) ------------

function _derivePrimaryConstraint(deckCommScores, investmentCase, marketValidation) {
  // Lowest communication dimension.
  let minDim = null;
  let minScore = 6;
  for (const [dim, v] of Object.entries(deckCommScores || {})) {
    if (v && typeof v.score === 'number' && v.score < minScore) {
      minScore = v.score;
      minDim = dim;
    }
  }

  const ic = investmentCase || {};
  const areaWeak = (a) => a && a.label === 'Weak';
  const areaUnderSupported = (a) =>
    a && (a.label === 'Promising but Under-Supported' || a.label === 'Not Enough Information');

  // Substance (central weakness) takes precedence, then hard communication
  // failures, then evidence gaps, then investor fit.
  if (areaWeak(ic.opportunity_strength)) {
    return {
      issue_type: 'Substance',
      constraint: 'Opportunity Strength',
      summary:
        'The deck communicates the pitch, but the opportunity as presented does not yet appear compelling enough.',
    };
  }
  if (areaWeak(ic.execution_credibility)) {
    return {
      issue_type: 'Substance',
      constraint: 'Execution Credibility',
      summary:
        'The deck describes the opportunity, but it does not yet show enough reason to believe this team can execute.',
    };
  }
  if (minDim && minScore <= 2) {
    return {
      issue_type: 'Communication',
      constraint: minDim.charAt(0).toUpperCase() + minDim.slice(1),
      summary: `The deck's ${minDim} makes it hard for investors to evaluate the thesis efficiently.`,
    };
  }
  if (marketValidation && marketValidation.missing_validation) {
    return {
      issue_type: 'Evidence',
      constraint: 'Market Validation',
      summary:
        'The core claims are not yet backed by evidence that customers want the outcome.',
    };
  }
  if (areaUnderSupported(ic.opportunity_strength) || areaUnderSupported(ic.execution_credibility)) {
    return {
      issue_type: 'Evidence',
      constraint: 'Evidence',
      summary:
        'The thesis is directionally promising but under-supported; investors need more proof before conviction.',
    };
  }
  if (minDim && minScore <= 3) {
    return {
      issue_type: 'Communication',
      constraint: minDim.charAt(0).toUpperCase() + minDim.slice(1),
      summary: `The main opportunity to improve is the deck's ${minDim}.`,
    };
  }
  return {
    issue_type: 'None',
    constraint: 'None',
    summary: 'The deck communicates a credible, well-supported case for its stage.',
  };
}

// --- section builders ---------------------------------------------------------

function _buildHeader(v1Report, generatedAt) {
  return {
    report_title: 'Pitch Deck Check Report',
    company_name: undefined,
    deck_filename: undefined,
    generated_at: generatedAt,
    positioning_statement:
      'This report evaluates the pitch deck as presented. It does not predict fundraising success or judge the company’s ultimate potential outside the deck.',
  };
}

function _buildContextSummary(companyContext) {
  const cc = companyContext || {};
  return {
    company_context: cc.detected_context || 'Unknown',
    context_confidence: cc.confidence || 'Low',
    intended_investor_audience: undefined,
    target_raise: undefined,
    evaluation_note:
      'Intended investor audience and target raise were not provided, so Investor Fit is evaluated cautiously.',
  };
}

function _buildDeckCommunicationScores(v1Report) {
  const qd = (v1Report && v1Report.quality_dimensions) || {};
  const build = (dim) => {
    const d = qd[dim] || {};
    const score = _qualityToScore(d.grade);
    return {
      score,
      label: SCORE_LABEL[score] || 'Adequate',
      explanation: d.description || d.diagnostic || 'Not separately assessed.',
      primary_reason: d.diagnostic || d.description || 'Not separately assessed.',
      priority_improvement: _commImprovement(dim, score),
    };
  };
  return {
    completeness: build('completeness'),
    clarity: build('clarity'),
    brevity: build('brevity'),
    flow: build('flow'),
  };
}

function _buildInvestmentCase(investmentCase) {
  const ic = investmentCase || {};
  const area = (a) => ({
    label: (a && a.label) || 'Not Enough Information',
    interpretation: (a && a.interpretation) || 'Not enough information to evaluate this area.',
  });
  const mv = ic.market_validation || {};
  return {
    opportunity_strength: area(ic.opportunity_strength),
    execution_credibility: area(ic.execution_credibility),
    investor_fit: area(ic.investor_fit),
    // Phase 2a type expects a string here (evidence, not a score).
    market_validation: mv.summary || 'Market validation not assessed.',
  };
}

function _buildPriorityImprovements(deckCommScores, investmentCase, marketValidation) {
  const ic = investmentCase || {};
  const items = [];

  // 1. Central substantive weaknesses first.
  if (ic.opportunity_strength && ic.opportunity_strength.label === 'Weak') {
    items.push({
      title: 'Strengthen the opportunity',
      why_it_matters: 'Investors need to believe the opportunity is large, urgent, and differentiated.',
      what_to_add_or_change:
        'Sharpen the value gap, market size, expansion path, and why this becomes a large outcome.',
      issue_type: 'Substance',
    });
  }
  if (ic.execution_credibility && ic.execution_credibility.label === 'Weak') {
    items.push({
      title: 'Show why this team can execute',
      why_it_matters: 'An attractive opportunity still needs a credible team to capture it.',
      what_to_add_or_change:
        'Add founder-market fit, relevant experience, and evidence of execution so far.',
      issue_type: 'Substance',
    });
  }

  // 2. Market validation gap.
  if (marketValidation && marketValidation.missing_validation) {
    items.push({
      title: 'Add market validation',
      why_it_matters: 'Investors need evidence that customers already want the promised outcome.',
      what_to_add_or_change:
        'Add customer discovery, waitlist quality, pilots, or proxy/adjacent-behavior evidence of demand.',
      issue_type: 'Evidence',
    });
  }

  // 3. Under-supported (promising) areas.
  for (const [key, name] of [
    ['opportunity_strength', 'the opportunity'],
    ['execution_credibility', 'execution'],
  ]) {
    const a = ic[key];
    if (a && a.label === 'Promising but Under-Supported') {
      items.push({
        title: `Add evidence for ${name}`,
        why_it_matters: `${name[0].toUpperCase() + name.slice(1)} looks promising but is not yet fully supported.`,
        what_to_add_or_change: 'Add specific proof appropriate for the company’s stage.',
        issue_type: 'Evidence',
      });
    }
  }

  // 4. Lowest communication dimensions.
  const dims = Object.entries(deckCommScores || {})
    .filter(([, v]) => v && v.score <= 3)
    .sort((a, b) => a[1].score - b[1].score);
  for (const [dim, v] of dims) {
    items.push({
      title: `Improve ${dim}`,
      why_it_matters: 'Communication weaknesses make the thesis harder for investors to evaluate.',
      what_to_add_or_change: v.priority_improvement,
      issue_type: 'Communication',
    });
  }

  // 5. Investor fit clarification.
  if (ic.investor_fit && ic.investor_fit.label === 'Not Enough Information') {
    items.push({
      title: 'Clarify the intended investor audience',
      why_it_matters: 'Investor Fit cannot be assessed without a target audience or raise amount.',
      what_to_add_or_change: 'State the target raise, round stage, and intended investor type.',
      issue_type: 'Investor Fit',
    });
  }

  return items.slice(0, 5);
}

function _buildSlideLevelFeedback(v1Report) {
  const slides = (v1Report && v1Report.slides) || [];
  return slides.map((s) => {
    const typeKey = String(s.type || '').toLowerCase().replace(/\s+/g, '_');
    return {
      slide_number: s.slide_number,
      slide_title_or_section: s.type || 'Section',
      investor_decision: TYPE_TO_INVESTOR_DECISION[typeKey] || '',
      assessment: _assessmentFromGrade(s.grade),
      what_works: s.investor_insight || '',
      what_is_missing: s.missing_investor_proof || '',
      recommended_improvement: s.missing_investor_proof || '',
      issue_type: s.missing_investor_proof ? 'Evidence' : 'None',
    };
  });
}

function _buildSuggestedNextSteps(constraint, priorityImprovements) {
  const steps = [];
  if (constraint.issue_type === 'Investor Fit') {
    steps.push({
      title: 'Decide who this deck is for',
      detail: 'Clarify the target investor audience and raise amount before making fit claims.',
    });
  }
  if (constraint.issue_type === 'Substance') {
    steps.push({
      title: 'Strengthen the investment case',
      detail: constraint.summary,
    });
  }
  if (constraint.issue_type === 'Evidence') {
    steps.push({
      title: 'Add evidence before polishing language',
      detail: 'The next improvement should be stronger proof, not more copywriting.',
    });
  }
  if (constraint.issue_type === 'Communication') {
    steps.push({
      title: `Improve ${String(constraint.constraint).toLowerCase()}`,
      detail: 'Make the strongest parts of the thesis easier for investors to find and follow.',
    });
  }
  // Include up to two remaining priorities not already represented.
  for (const p of priorityImprovements) {
    if (steps.length >= 4) break;
    if (!steps.some((s) => s.title.toLowerCase().includes(p.title.toLowerCase().slice(0, 8)))) {
      steps.push({ title: p.title, detail: p.what_to_add_or_change });
    }
  }
  steps.push({
    title: 'Re-run the analysis after revising',
    detail: 'Check whether the primary constraint has shifted after your changes.',
  });
  return steps.slice(0, 5);
}

function _buildSaveShareUpgrade() {
  return {
    intro: 'Save this report so you can compare it against your next deck revision.',
    options: [
      'Download this report.',
      'Share this report with a cofounder or advisor.',
      'Re-run Pitch Deck Check after revising your deck.',
      'Upgrade for detailed slide-by-slide improvement guidance.',
      'Upgrade for investor-targeting guidance.',
    ],
  };
}

// --- public API ---------------------------------------------------------------

/**
 * Assemble the additive report_v2 object from already-generated data.
 * @param {Object} inputs { fullReport, v1Report, freeReport, companyContext,
 *   investmentCase, generatedAt? }
 * @returns {Object} PitchDeckCheckReportV2-shaped object
 */
function assembleReportV2(inputs = {}) {
  const {
    fullReport = {},
    v1Report = null,
    companyContext = null,
    investmentCase = null,
    generatedAt = new Date().toISOString(),
  } = inputs;

  const header = _buildHeader(v1Report, generatedAt);
  const context_summary = _buildContextSummary(companyContext);
  const deck_communication_scores = _buildDeckCommunicationScores(v1Report);
  const investment_case = _buildInvestmentCase(investmentCase);
  const marketValidation = (investmentCase && investmentCase.market_validation) || null;

  const constraint = _derivePrimaryConstraint(
    deck_communication_scores,
    investmentCase,
    marketValidation
  );

  const overall_grade = {
    letter: _toV2Letter(fullReport.overall_grade),
    concise_interpretation:
      (v1Report && v1Report.overall && v1Report.overall.investor_readout) ||
      fullReport.summary ||
      'Assessment not available.',
    primary_constraint: constraint.constraint,
    what_this_means: constraint.summary,
  };

  const primary_diagnosis = {
    summary: constraint.summary,
    issue_type: constraint.issue_type,
  };

  const what_investors_may_believe = (v1Report && v1Report.what_investors_believe) || [];
  const what_investors_may_question = (v1Report && v1Report.what_still_feels_unproven) || [];

  const priority_improvements = _buildPriorityImprovements(
    deck_communication_scores,
    investmentCase,
    marketValidation
  );
  const slide_level_feedback = _buildSlideLevelFeedback(v1Report);
  const suggested_next_steps = _buildSuggestedNextSteps(constraint, priority_improvements);
  const save_share_upgrade = _buildSaveShareUpgrade();

  return {
    report_version: REPORT_V2_VERSION,
    header,
    context_summary,
    overall_grade,
    deck_communication_scores,
    investment_case,
    primary_diagnosis,
    what_investors_may_believe,
    what_investors_may_question,
    priority_improvements,
    slide_level_feedback,
    suggested_next_steps,
    save_share_upgrade,
  };
}

module.exports = {
  REPORT_V2_VERSION,
  assembleReportV2,
};
