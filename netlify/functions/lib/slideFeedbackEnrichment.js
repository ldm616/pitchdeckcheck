/**
 * Slide-feedback grounding enrichment.
 *
 * The slide-feedback builders (canonicalReport.buildSlideFeedbackEntry →
 * reportV2Assembler templates) run WITHOUT the raw slide text, so when the
 * model's rubric answers are thin they fall back to generic copy
 * ("The slide is present…", "Investors still need stronger answers to…",
 * "Add more detail", etc.). This pass runs one level up where the raw
 * extracted_text IS available and, for EVERY supported slide type, rewrites
 * only the generic fields so they reference concrete artifacts actually present
 * on the slide (metrics, amounts, competitors, channels, milestones, …).
 *
 * Deterministic. It:
 *   - never fabricates numbers — figures/names are only surfaced when they
 *     literally appear in the slide's extracted_text;
 *   - preserves already-specific model text (only generic phrasing is replaced);
 *   - never touches grade, assessment, issue_type, or the object shape;
 *   - is generic across slide types (a per-type rule table, no per-deck rules).
 *
 * Output fields touched (per slide_level_feedback entry):
 *   what_works, what_is_missing, recommended_improvement.
 * These flow downstream unchanged into dashboard_feedback.slide_feedback
 * (evidence_found / evidence_missing / what_needs_help / recommended_changes).
 */

'use strict';

const TYPE_DISPLAY_NAMES = {
  cover: 'Cover',
  problem: 'Problem',
  solution: 'Solution',
  product: 'Product',
  market: 'Market',
  market_opportunity: 'Market',
  business_model: 'Business Model',
  traction: 'Traction',
  competition: 'Competition',
  moat: 'Moat',
  team: 'Team',
  financials: 'Financials',
  ask: 'Ask',
  funding: 'Funding',
  go_to_market: 'Go-to-Market',
  why_now: 'Why Now',
  roadmap: 'Roadmap',
  product_roadmap: 'Roadmap',
  vision: 'Vision',
  contact: 'Contact',
  appendix: 'Appendix',
  other: 'Other',
};

function _normType(t) {
  const k = String(t || '').toLowerCase().replace(/\s+/g, '_').trim();
  if (k === 'market_opportunity') return 'market';
  if (k === 'product_roadmap') return 'roadmap';
  return k;
}

function _clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}
function _uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

// Natural-language join: [a,b,c] -> "a, b, and c".
function _list(arr) {
  const a = _uniq(arr).map(_clean).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}

// --- generic-phrase detection ------------------------------------------------
// A field is "generic" (safe to replace) when it matches one of the template /
// fallback families the builders emit, or a forbidden bare phrase. Specific
// model text does NOT match these, so it is preserved.
// Precise template / fallback families the builders emit, plus the bare
// forbidden phrases. Kept specific so genuinely deck-grounded model text (which
// may happen to contain a word like "evidence") is NOT treated as generic.
const GENERIC_RE = new RegExp(
  [
    'the slide is present',
    'this slide was present in the deck',
    'does not yet provide strong evidence',
    'does not provide enough usable evidence',
    'addresses its core investor questions',
    'answers its core investor questions',
    'the slide does not clearly answer',
    'investors? (?:still )?need(?:s)? stronger answers',
    'was not individually assessed',
    'review this slide manually',
    'ensure this slide clearly answers',
    'revise this slide so it directly answers',
    'add evidence that directly answers',
    'sharpen the value gap',
    'investors need a sharper value gap',
    'show how the solution closes the value gap',
    'the solution directly closes the value gap',
    'investors need to see the solution',
    'investors need more detail on',
    'investors need the assumptions',
    'the slide should show sequencing tied to',
  ].join('|'),
  'i'
);
// Bare, low-information fixes that are generic regardless of type.
const GENERIC_BARE_RE =
  /^\s*(add more (?:detail|evidence|data)|strengthen (?:the )?evidence|improve (?:the )?clarity|provide more evidence|add traction|be more specific)\.?\s*$/i;

function _isGeneric(s) {
  const t = _clean(s);
  if (!t) return true; // empty is treated as replaceable
  return GENERIC_RE.test(t) || GENERIC_BARE_RE.test(t);
}

// --- artifact extraction (only literal evidence from the slide text) ---------

const MONEY_RE = /\$\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|mm|bn|b|billion|million|thousand)?/gi;
const PCT_RE = /\b\d+(?:\.\d+)?\s?%/g;
const MULT_RE = /\b\d+(?:\.\d+)?\s?x\b/gi;
const RATING_RE = /\b\d(?:\.\d)?\s?[-\s]?stars?\b|\b\d(?:\.\d)?\s?★/gi;
const COUNT_RE =
  /\b\d[\d,]*(?:\.\d+)?\s?(?:k|m|mm|bn|b|million|billion)?\+?\s+(?:users?|customers?|detailers?|hosts?|providers?|suppliers?|sellers?|buyers?|merchants?|drivers?|vendors?|downloads?|installs?|sign[\s-]?ups?|subscribers?|members?|reviews?|ratings?|bookings?|transactions?|orders?|pilots?|logos?|partners?|cities|markets?|companies)\b/gi;

const CHANNEL_RE =
  /\b(seo|sem|paid ads?|paid search|referrals?|influencers?|partnerships?|content marketing|email|events?|affiliates?|organic|social|outbound|inbound|plg|product[- ]led|sales[- ]led|d2c|b2b2c|b2b|app store|tiktok|instagram|google ads?|meta ads?|word[- ]of[- ]mouth)\b/gi;
const ECON_RE =
  /\b(cac|ltv|payback|take[\s-]?rate|gross margin|margin|arpu|acv|mrr|arr|gmv|churn|retention|runway|burn|conversion|unit economics|pricing|price)\b/gi;
const MILESTONE_RE = /\b(q[1-4]\s?20\d\d|20\d\d|h[12]\s?20\d\d|month\s?\d+|by\s+(?:end of\s+)?20\d\d|launch|milestone|roadmap)\b/gi;

// Candidate proper-noun orgs (competitors / employers). Sequences of Capitalized
// tokens; common non-org words filtered out.
const ORG_RE = /\b([A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+){0,2})\b/g;
const ORG_STOP = new Set(
  [
    'The', 'We', 'Our', 'Your', 'A', 'An', 'It', 'This', 'That', 'These', 'Those',
    'And', 'Or', 'But', 'For', 'With', 'Without', 'From', 'To', 'In', 'On', 'At',
    'Why', 'How', 'What', 'When', 'Where', 'Who', 'Problem', 'Solution', 'Product',
    'Market', 'Traction', 'Team', 'Competition', 'Financials', 'Ask', 'Roadmap',
    'Contact', 'Business', 'Model', 'Go', 'Cover', 'Investors', 'Investor', 'Users',
    'Customers', 'Revenue', 'Growth', 'Vision', 'Mission', 'Overview', 'Company',
    'Founders', 'Founder', 'Founding', 'Competitors', 'Competitor', 'Advisors',
    'Advisor', 'Backers', 'Clients', 'Partners', 'Team', 'Pricing', 'Roadmap', 'Channels',
  ].map((s) => s.toLowerCase())
);

function _orgs(text, companyName) {
  const out = [];
  const cn = _clean(companyName).toLowerCase();
  let m;
  ORG_RE.lastIndex = 0;
  while ((m = ORG_RE.exec(text)) !== null) {
    const cand = _clean(m[1]);
    const low = cand.toLowerCase();
    if (low === cn) continue;
    if (ORG_STOP.has(low)) continue;
    // Skip single short all-caps section-ish tokens and pure numbers.
    if (/^\d/.test(cand)) continue;
    if (cand.length < 3) continue;
    out.push(cand);
  }
  return _uniq(out).slice(0, 6);
}

function _matchAll(text, re) {
  return _uniq((String(text).match(re) || []).map((s) => _clean(s)));
}

function extractArtifacts(text, companyName) {
  const t = String(text || '');
  return {
    money: _matchAll(t, MONEY_RE).map((s) => s.replace(/\s+/g, '')),
    pct: _matchAll(t, PCT_RE),
    mult: _matchAll(t, MULT_RE).map((s) => s.replace(/\s+/g, '')),
    ratings: _matchAll(t, RATING_RE),
    counts: _matchAll(t, COUNT_RE),
    channels: _matchAll(t, CHANNEL_RE),
    econ: _matchAll(t, ECON_RE),
    milestones: _matchAll(t, MILESTONE_RE),
    orgs: _orgs(t, companyName),
    hasText: _clean(t).length > 0,
    firstLine: _clean(t.split('\n')[0]).slice(0, 120),
  };
}

// Quantitative artifacts most useful as "what the slide shows".
function _quantEvidence(a) {
  return _uniq([...a.counts, ...a.money, ...a.ratings, ...a.pct, ...a.mult]).slice(0, 4);
}

// --- per-type grounding rules ------------------------------------------------
// Each rule returns { works?, missing?, rec? } strings (any may be null to keep
// the existing field). `references` are only concrete artifacts from THIS slide.
// Missing/rec asks are the diligence evidence most relevant to the type.

function _worksClause(label, evidence) {
  if (!evidence.length) return null;
  return `The ${label} slide cites ${_list(evidence)}.`;
}

const TYPE_RULES = {
  cover: (a, c) => ({
    works: a.firstLine
      ? `The Cover leads with "${a.firstLine}".`
      : null,
    missing:
      'name the target customer and the specific outcome promised, not just the company and category.',
    rec:
      'state who the customer is and the concrete outcome the product delivers for them.',
  }),
  team: (a) => ({
    works: a.orgs.length ? `The Team slide references ${_list(a.orgs.slice(0, 4))}.` : null,
    missing:
      'add track-record proof — prior outcomes, scale shipped, years in the domain, or founder–market fit — rather than titles alone.',
    rec:
      'back each founder with a specific prior result (what they built, its scale/outcome) that shows founder–market fit.',
  }),
  problem: (a) => ({
    works: null,
    missing:
      'quantify how severe, frequent, and costly the pain is, and name the current alternative customers rely on today.',
    rec:
      'add the severity/frequency/cost of the pain and the specific status-quo alternative it displaces.',
  }),
  solution: (a) => ({
    works: null,
    missing:
      'state why customers switch and what makes the approach meaningfully better than the current alternative.',
    rec:
      'show the specific before/after outcome and the reason customers leave the status quo for it.',
  }),
  product: (a, c) => {
    const ev = _quantEvidence(a);
    return {
      works: ev.length ? `The Product slide shows ${_list(ev)}.` : null,
      missing:
        'add activation, conversion, completion, usage, retention, or reliability metrics for the workflow shown' +
        (c.supplyLabel ? `, on both the customer and ${c.supplyLabel} side.` : '.'),
      rec:
        'attach a usage metric (activation/completion/retention) to the workflow the screens depict.',
    };
  },
  competition: (a) => ({
    works: a.orgs.length
      ? `The Competition slide names ${_list(a.orgs.slice(0, 4))}.`
      : _worksClause('Competition', a.mult),
    missing:
      'explain why the claimed advantage is durable — network density, switching costs, proprietary data, patents, or supply relationships — rather than first-mover or coverage alone.',
    rec:
      'name the competitors and show what makes the edge compound over time, not just today.',
  }),
  business_model: (a) => {
    const ev = _uniq([...a.money, ...a.pct, ...a.econ]).slice(0, 4);
    return {
      works: ev.length ? `The Business Model slide references ${_list(ev)}.` : null,
      missing:
        'show the economics — pricing or take rate, ACV or margin, and per-transaction economics — that make the model attractive at scale.',
      rec:
        'add pricing/take-rate, margin, and transaction economics so the revenue mechanics are legible.',
    };
  },
  market: (a) => {
    const ev = _uniq([...a.money, ...a.mult, ...a.pct]).slice(0, 4);
    return {
      works: ev.length ? `The Market slide sizes the opportunity at ${_list(ev)}.` : null,
      missing:
        'source the market figure and show segmentation and a credible path to capture (serviceable segment / wedge), not just a top-down total.',
      rec:
        'cite the source behind the size and show the serviceable segment and wedge you win first.',
    };
  },
  traction: (a, c) => {
    const ev = _quantEvidence(a);
    return {
      works: ev.length ? `The Traction slide shows ${_list(ev)}.` : null,
      missing: ev.length
        ? `add the next diligence metric beyond ${_list(ev.slice(0, 2))} — retention or repeat rate, cohort curves, or CAC/payback.`
        : 'add the concrete traction metrics investors diligence next — retention/repeat rate, cohorts, or CAC/payback.',
      rec: ev.length
        ? `next to ${_list(ev.slice(0, 1))}, add retention/repeat rate and monthly-active vs cumulative cohorts.`
        : 'add retention/repeat rate and monthly-active vs cumulative cohorts.',
    };
  },
  go_to_market: (a) => {
    const ch = a.channels.slice(0, 4);
    return {
      works: ch.length ? `The Go-to-Market slide lists ${_list(ch)}.` : null,
      missing:
        'name which channel actually drove the existing growth and its CAC, payback, and conversion — a repeatable motion, not a tactic list.',
      rec: ch.length
        ? `show CAC, payback, and conversion for the one or two of ${_list(ch)} that already worked.`
        : 'show CAC, payback, and conversion for the one or two channels that already worked.',
    };
  },
  roadmap: (a) => ({
    works: a.milestones.length ? `The Roadmap slide lists ${_list(a.milestones.slice(0, 4))}.` : null,
    missing:
      'tie each milestone to its dependencies and success criteria, and to what the next round should de-risk.',
    rec:
      'replace feature items with the two or three milestones that de-risk the next round, each with a success metric.',
  }),
  financials: (a) => {
    const ev = _uniq([...a.money, ...a.pct]).slice(0, 4);
    return {
      works: ev.length ? `The Financials slide references ${_list(ev)}.` : null,
      missing: ev.length
        ? `add the operating bridge from ${_list(ev.slice(0, 1))} to the projection — transaction volume, take rate, CAC/payback, and burn/runway.`
        : 'add the operating bridge from current traction to the projection — volume, take rate, CAC/payback, and burn/runway.',
      rec:
        'show the assumptions that bridge current run-rate to the target (volume, take rate, CAC/payback, burn).',
    };
  },
  ask: (a) => {
    const raise = a.money[0] || null;
    return {
      works: raise ? `The Ask slide states a ${raise} raise.` : null,
      missing: raise
        ? `state what the ${raise} buys — hires, markets, product — and the metrics it reaches before the next round.`
        : 'state the raise amount, what it buys (hires, markets, product), and the metrics it reaches before the next round.',
      rec:
        'tie the raise to specific milestones and the metric targets it should hit before the next round.',
    };
  },
  contact: (a) => ({
    works: null,
    missing: 'confirm the contact details are complete and there is a clear next step for an interested investor.',
    rec: 'add a clear next step — who to contact and what happens after the meeting.',
  }),
};
// funding shares the ask rule; moat shares competition.
TYPE_RULES.funding = TYPE_RULES.ask;
TYPE_RULES.moat = TYPE_RULES.competition;

// --- main enrichment ---------------------------------------------------------

/**
 * @param {Object} params
 * @param {Array}  params.entries    slide_level_feedback entries (mutated copies returned)
 * @param {Array}  params.slides     raw analyzed slides (slide_number, extracted_text, inferred_type)
 * @param {Object} [params.investmentCase]
 * @param {string} [params.companyName]
 * @param {string} [params.supplyLabel]
 * @returns {Array} enriched entries (new array; inputs not mutated)
 */
function enrichSlideLevelFeedback(params = {}) {
  const entries = Array.isArray(params.entries) ? params.entries : [];
  const slides = Array.isArray(params.slides) ? params.slides : [];
  const companyName =
    params.companyName || (params.investmentCase && params.investmentCase.company_name) || null;
  const supplyLabel = params.supplyLabel || null;

  // slide_level_feedback entries carry no `type` field — resolve it from the raw
  // slide (inferred_type) matched by slide_number, falling back to any type on
  // the entry, then to the display title.
  const textByNum = {};
  const typeByNum = {};
  for (const s of slides) {
    if (s && s.slide_number != null) {
      textByNum[s.slide_number] = String(s.extracted_text || '');
      typeByNum[s.slide_number] = s.inferred_type || s.type || null;
    }
  }
  const _typeFromTitle = (title) => {
    const t = _clean(title).toLowerCase();
    for (const [k, v] of Object.entries(TYPE_DISPLAY_NAMES)) {
      if (v.toLowerCase() === t) return k;
    }
    return '';
  };

  return entries.map((entry) => {
    if (!entry) return entry;
    const type = _normType(
      typeByNum[entry.slide_number] || entry.type || _typeFromTitle(entry.slide_title_or_section)
    );
    const rule = TYPE_RULES[type];
    const label = TYPE_DISPLAY_NAMES[type] || entry.slide_title_or_section || 'this section';
    const text = textByNum[entry.slide_number] || '';
    const art = extractArtifacts(text, companyName);

    // No rule or no slide text → leave the entry untouched (nothing to ground on).
    if (!rule) return { ...entry };
    const g = rule(art, { supplyLabel, companyName, label }) || {};

    const out = { ...entry };
    // Only fill an EMPTY missing/rec when the slide actually has a gap — never
    // invent a gap on a strong (no-issue) slide, so grades stay coherent.
    const hasGap = !!entry.issue_type && entry.issue_type !== 'None';
    const _replaceable = (v) => {
      const t = _clean(v);
      if (!t) return hasGap; // empty → only when there is a gap
      return _isGeneric(t); // non-empty → only when generic
    };

    // what_works: replace only a NON-empty generic value when we can ground it.
    if (_clean(out.what_works) && _isGeneric(out.what_works) && g.works) {
      out.what_works = g.works;
    }

    // what_is_missing: replace generic text, or fill an empty gap, with the ask.
    if (_replaceable(out.what_is_missing) && g.missing) {
      out.what_is_missing = `The ${label} slide should ${g.missing}`.replace(/\.\.$/, '.');
    }

    // recommended_improvement: replace generic / fill an empty gap with an action.
    if (_replaceable(out.recommended_improvement) && g.rec) {
      out.recommended_improvement = `On the ${label} slide, ${g.rec}`.replace(/\.\.$/, '.');
    }

    return out;
  });
}

module.exports = {
  enrichSlideLevelFeedback,
  // exported for tests
  extractArtifacts,
  _isGeneric,
  TYPE_RULES,
};
