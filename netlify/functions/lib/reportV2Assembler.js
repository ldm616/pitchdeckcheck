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

// Join a list human-style: "a", "a and b", "a, b, and c".
function _joinList(arr) {
  const a = (arr || []).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
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
  // Strong early traction with open diligence gaps: name the specific remaining
  // questions rather than declaring the case resolved. Fires whenever there is
  // direct validation and at least one concern, regardless of the opportunity
  // label (a strong-traction deck can still have real durability questions).
  const flags = (investmentCase && investmentCase.detected) || {};
  const areaStrongish = (a) =>
    a && (a.label === 'Strong' || a.label === 'Mixed' || a.label === 'Promising but Under-Supported');
  if (marketValidation && marketValidation.direct_validation) {
    const concerns = [];
    if (!flags.has_defensibility) concerns.push('defensibility');
    if (!flags.has_retention_data) concerns.push('repeat usage');
    if (flags.is_marketplace) concerns.push('marketplace liquidity');
    if (flags.has_gtm_channels && !flags.has_cac_economics) concerns.push('acquisition efficiency');
    if (flags.has_market_size_claim && !(ic.opportunity_strength && ic.opportunity_strength.label === 'Strong')) {
      concerns.push('the market-size assumptions');
    }
    if (concerns.length > 0) {
      const lead = areaStrongish(ic.execution_credibility)
        ? 'strong early traction and credible execution'
        : 'strong early traction';
      return {
        issue_type: 'Substance',
        constraint: 'Defensibility & durability',
        summary: `The deck shows ${lead}, but investors may still question ${_joinList(concerns.slice(0, 4))}.`,
      };
    }
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

function _buildHeader(v1Report, generatedAt, companyName) {
  return {
    report_title: 'Pitch Deck Check Report',
    company_name: companyName || undefined,
    deck_filename: undefined,
    generated_at: generatedAt,
    positioning_statement:
      'This report evaluates the pitch deck as presented. It does not predict fundraising success or judge the company’s ultimate potential outside the deck.',
  };
}

function _buildContextSummary(companyContext, investmentCase) {
  const cc = companyContext || {};
  const ft = (investmentCase && investmentCase.funding_terms) || {};
  const audience = (investmentCase && investmentCase.inferred_investor_audience) || undefined;
  const evaluation_note =
    audience || ft.raise
      ? 'Investor audience and target raise were inferred from the deck; Investor Fit reflects the round the deck presents.'
      : 'The deck did not state an investor audience or target raise, so Investor Fit is evaluated cautiously.';
  return {
    company_context: cc.detected_context || 'Unknown',
    context_confidence: cc.confidence || 'Low',
    intended_investor_audience: audience,
    target_raise: ft.raise || undefined,
    evaluation_note,
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

function _buildPriorityImprovements(deckCommScores, investmentCase) {
  const ic = investmentCase || {};
  const mv = ic.market_validation || {};
  const flags = ic.detected || {};
  const items = [];
  const push = (o) => {
    if (items.length < 5) items.push(o);
  };

  const label = (a) => (a && a.label) || 'Not Enough Information';
  const oppWeak = label(ic.opportunity_strength) === 'Weak';
  const exeWeak = label(ic.execution_credibility) === 'Weak';
  const oppUnder =
    label(ic.opportunity_strength) === 'Promising but Under-Supported' ||
    label(ic.opportunity_strength) === 'Mixed';
  const strongTraction = Boolean(mv.direct_validation);

  // 1. Substantive weaknesses first.
  if (oppWeak) {
    push({
      title: 'Strengthen the opportunity',
      why_it_matters: 'Investors need to believe the opportunity is large, urgent, and differentiated.',
      what_to_add_or_change: 'Sharpen the value gap, market size, and why this becomes a large outcome.',
      issue_type: 'Substance',
    });
  }
  if (exeWeak) {
    push({
      title: 'Show why this team can execute',
      why_it_matters: 'An attractive opportunity still needs a credible team to capture it.',
      what_to_add_or_change: 'Add founder-market fit, relevant experience, and evidence of execution so far.',
      issue_type: 'Substance',
    });
  }

  // 2. Genuinely missing validation.
  if (mv.missing_validation) {
    push({
      title: 'Add market validation',
      why_it_matters: 'Investors need evidence that customers already want the outcome.',
      what_to_add_or_change:
        'Add customer discovery, waitlist quality, pilots, or proxy/adjacent-behavior evidence of demand.',
      issue_type: 'Evidence',
    });
  }

  // 3. Strong traction but durability/scale gaps → SPECIFIC next-proof asks.
  //    (When validation is already strong, do not fall back to a generic
  //    "add evidence for the opportunity".)
  if (strongTraction && (oppUnder || !flags.has_defensibility || !flags.has_retention_data)) {
    if (!flags.has_defensibility) {
      push({
        title: 'Explain defensibility beyond first-mover advantage',
        why_it_matters: 'Strong early traction invites fast followers; investors need a durable moat.',
        what_to_add_or_change:
          'Show defensibility beyond coverage, ratings, and being first — e.g. network effects, switching costs, proprietary data, or supply lock-in.',
        issue_type: 'Substance',
      });
    }
    if (!flags.has_retention_data) {
      push({
        title: 'Add retention and repeat-usage data',
        why_it_matters: 'Durable demand, not just cumulative signups, drives venture outcomes.',
        what_to_add_or_change: 'Add cohort retention, repeat-booking rates, or active-usage trends over time.',
        issue_type: 'Evidence',
      });
    }
    if (flags.is_marketplace) {
      push({
        title: 'Show marketplace liquidity by market',
        why_it_matters: 'Aggregate totals can mask thin liquidity in individual markets.',
        what_to_add_or_change: 'Break out supply/demand density and repeat transactions per city or market.',
        issue_type: 'Evidence',
      });
    }
    if (flags.has_market_size_claim) {
      push({
        title: 'Support the market-size assumptions',
        why_it_matters: 'Headline market and projection figures need a defensible build-up.',
        what_to_add_or_change: 'Show bottom-up sizing and the assumptions behind the projection.',
        issue_type: 'Evidence',
      });
    }
    if (flags.has_gtm_channels && !flags.has_cac_economics) {
      push({
        title: 'Add acquisition economics (CAC / payback)',
        why_it_matters: 'Channels are listed, but investors need to see efficient, scalable acquisition.',
        what_to_add_or_change: 'Add CAC, payback period, and channel efficiency by channel.',
        issue_type: 'Evidence',
      });
    }
  } else if (oppUnder && !strongTraction) {
    // Under-supported without strong traction: scoped evidence ask.
    push({
      title: 'Add evidence for the opportunity',
      why_it_matters: 'The opportunity looks promising but is not yet supported by proof.',
      what_to_add_or_change: 'Add stage-appropriate proof that customers want the outcome.',
      issue_type: 'Evidence',
    });
  }

  // 4. Lowest communication dimensions.
  const dims = Object.entries(deckCommScores || {})
    .filter(([, v]) => v && v.score <= 3)
    .sort((a, b) => a[1].score - b[1].score);
  for (const [dim, v] of dims) {
    push({
      title: `Improve ${dim}`,
      why_it_matters: 'Communication weaknesses make the thesis harder for investors to evaluate.',
      what_to_add_or_change: v.priority_improvement,
      issue_type: 'Communication',
    });
  }

  // 5. Investor fit only when genuinely unknown.
  if (label(ic.investor_fit) === 'Not Enough Information') {
    push({
      title: 'State the round, raise, and target investor',
      why_it_matters: 'Investor Fit cannot be assessed without a round/raise or audience.',
      what_to_add_or_change: 'State the target raise, round stage, instrument, and intended investor type.',
      issue_type: 'Investor Fit',
    });
  }

  return items.slice(0, 5);
}

// Claims that the company name is missing (false negatives we suppress when the
// name is actually detectable elsewhere in the deck).
const NAME_MISSING_RE = /company\s*name|company['’]s\s+name|missing\s+.*\bname\b|\bname\b\s+is\s+missing|no\s+company\s+name|lacks?\s+.*\bname\b/i;

// Claims that product maturity/stage is unclear — a false negative when the
// deck clearly shows a built, shipping product.
const PRODUCT_MATURITY_RE = /product\s+maturity|maturity\s+level|maturity\s+is\s+unclear|how\s+mature|stage\s+of\s+(?:the\s+)?product|whether\s+the\s+product\s+is\s+built|level\s+of\s+product\s+maturity/i;

function _buildSlideLevelFeedback(v1Report, companyName, productBuilt) {
  const slides = (v1Report && v1Report.slides) || [];
  return slides.map((s) => {
    const typeKey = String(s.type || '').toLowerCase().replace(/\s+/g, '_');
    let missing = s.missing_investor_proof || '';
    let recommended = s.missing_investor_proof || '';

    // Fix cover/company-name false negatives: if the company name is detectable
    // in the deck, do not claim the cover is missing it. Use safer wording.
    if ((typeKey === 'cover' || typeKey === 'contact') && companyName && NAME_MISSING_RE.test(missing)) {
      missing = 'The positioning line could be sharper.';
      recommended = 'Make the target customer or primary outcome more specific on the cover.';
    }

    // Fix product-maturity false negatives: if the deck shows a built, shipping
    // product, do not say maturity is unclear — focus on delivered value.
    if (typeKey === 'product' && productBuilt && PRODUCT_MATURITY_RE.test(missing)) {
      missing = 'Investors need more evidence that the product consistently delivers the promised value.';
      recommended = 'Add evidence of product differentiation, reliability, repeat usage, or workflow depth.';
    }

    return {
      slide_number: s.slide_number,
      slide_title_or_section: s.type || 'Section',
      investor_decision: TYPE_TO_INVESTOR_DECISION[typeKey] || '',
      assessment: _assessmentFromGrade(s.grade),
      what_works: s.investor_insight || '',
      what_is_missing: missing,
      recommended_improvement: recommended,
      issue_type: missing ? 'Evidence' : 'None',
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

  const companyName = (investmentCase && investmentCase.company_name) || null;
  const header = _buildHeader(v1Report, generatedAt, companyName);
  const context_summary = _buildContextSummary(companyContext, investmentCase);
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
    investmentCase
  );
  const productBuilt = Boolean(
    investmentCase && investmentCase.detected && investmentCase.detected.product_built
  );
  const slide_level_feedback = _buildSlideLevelFeedback(v1Report, companyName, productBuilt);
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
