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

// --- labeled-metric extraction (label proximity, not bare number+word) --------
// Decks lay metrics out either inline ("2.3K+ reviews", "82K+ users") or in
// COLUMNS ("Users\nQ2 10,936\nQ3 31,714\nQ4 82,457\nDetailers\n…"). A naive
// number+next-word match wrongly ties the last Users value to the Detailers
// label across the newline. This extractor attaches each number to the correct
// label using line structure, then emits compact labeled phrases.

function _toNum(raw) {
  const s = String(raw).toLowerCase();
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isFinite(n)) return null;
  if (/\bbn\b|billion/.test(s)) return n * 1e9;
  if (/\bmm\b|million|(?:^|[^a-z])m\+?$/.test(s)) return n * 1e6;
  if (/k\+?$|thousand/.test(s)) return n * 1e3;
  return n;
}
function _compactCount(n) {
  if (n >= 1e6) return String(Math.round(n / 1e5) / 10).replace(/\.0$/, '') + 'M+';
  if (n >= 1000) return Math.floor(n / 1000) + 'K+';
  return String(Math.round(n));
}
function _compactMoney(n) {
  if (n >= 1e6) return '$' + String(Math.round(n / 1e5) / 10).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + Math.round(n);
}

// Metric labels that head a column block (label on its own line, values below).
const BLOCK_LABELS = [
  { key: 'users', re: /^users?$/i, money: false, noun: 'users' },
  { key: 'customers', re: /^customers?$/i, money: false, noun: 'customers' },
  { key: 'supply', re: /^(detailers?|hosts?|providers?|suppliers?|sellers?|drivers?|merchants?|vendors?)$/i, money: false },
  { key: 'revenue', re: /^revenue\b.*$/i, money: true, noun: 'revenue' },
  { key: 'bookings', re: /^(bookings?|transactions?|orders?)$/i, money: false, noun: 'bookings' },
];
// Inline "value + label" patterns (value immediately precedes the label ON THE
// SAME LINE — horizontal whitespace only, so a column value on the line above a
// label is never captured).
const INLINE_METRICS = [
  { key: 'reviews', noun: 'reviews', re: /(\d[\d.,]*[ \t]?[km]?\+?)[ \t]*reviews?\b/gi, keepRaw: true },
  { key: 'rating', re: /(\d(?:\.\d)?)[ \t]*(?:[-\s]?stars?\b|★)/gi, fmt: (v) => `${v}-star rating` },
  { key: 'users', noun: 'users', re: /(\d[\d.,]*[ \t]?[km]?\+?)[ \t]*users?\b/gi, keepRaw: true },
  { key: 'supply', re: /(\d[\d.,]*[ \t]?[km]?\+?)[ \t]*(detailers?|hosts?|providers?|suppliers?|sellers?|drivers?)\b/gi, keepRaw: true, nounFromMatch: 2 },
  { key: 'logos', noun: 'logos', re: /(\d[\d.,]*[ \t]?[km]?\+?)[ \t]*logos?\b/gi, keepRaw: true },
];
// A block data-row: an optional period label (Q1, 2024, H1) then a number/$.
const DATA_ROW_RE = /^(?:q[1-4]|h[12]|fy)?\s*(?:20\d\d)?\s*\$?\d/i;

function extractLabeledMetrics(text) {
  const lines = String(text).split(/\r?\n/).map((l) => _clean(l)).filter(Boolean);
  const best = {}; // key -> { value, display }
  const consider = (key, value, display) => {
    if (value == null || !isFinite(value) || value <= 0) return;
    if (!best[key] || value > best[key].value) best[key] = { value, display };
  };

  // 1) Column blocks: a lone label line followed by number lines (stop at next label).
  for (let i = 0; i < lines.length; i++) {
    const L = BLOCK_LABELS.find((b) => b.re.test(lines[i]));
    if (!L) continue;
    const isMM = /\$?mm\b|\(\$?mm\)/i.test(lines[i]);
    const noun = L.noun || lines[i].toLowerCase().replace(/[^a-z].*$/, '');
    for (let j = i + 1; j < lines.length && j - i <= 8; j++) {
      if (BLOCK_LABELS.some((b) => b.re.test(lines[j]))) break;
      if (!DATA_ROW_RE.test(lines[j])) break; // stop at the first non-data row
      const nums = lines[j].match(/\$?\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|mm|bn|b)?\+?/gi);
      if (!nums) continue;
      for (const raw of nums) {
        let v = _toNum(raw);
        if (v == null) continue;
        if (L.money && isMM && v < 1000) v *= 1e6; // "Revenue ($MM) … 1.5" → $1.5M
        consider(L.key, v, L.money ? `${_compactMoney(v)} ${noun}` : `${_compactCount(v)} ${noun}`);
      }
    }
  }

  // 2) Inline value+label anywhere in the text.
  for (const M of INLINE_METRICS) {
    M.re.lastIndex = 0;
    let m;
    while ((m = M.re.exec(text)) !== null) {
      const raw = m[1];
      const v = _toNum(raw);
      if (v == null) continue;
      const noun = M.nounFromMatch ? m[M.nounFromMatch].toLowerCase() : M.noun;
      const display = M.fmt
        ? M.fmt(_clean(raw))
        : M.keepRaw
        ? `${_clean(raw)} ${noun}`
        : `${_compactCount(v)} ${noun}`;
      consider(M.key, M.key === 'rating' ? v : v, display);
    }
  }

  // Emit in a stable, investor-legible order.
  const order = ['users', 'customers', 'supply', 'revenue', 'bookings', 'logos', 'rating', 'reviews'];
  return order.filter((k) => best[k]).map((k) => best[k].display);
}

function extractArtifacts(text, companyName) {
  const t = String(text || '');
  return {
    money: _matchAll(t, MONEY_RE).map((s) => s.replace(/\s+/g, '')),
    pct: _matchAll(t, PCT_RE),
    mult: _matchAll(t, MULT_RE).map((s) => s.replace(/\s+/g, '')),
    ratings: _matchAll(t, RATING_RE),
    counts: _matchAll(t, COUNT_RE),
    labeled: extractLabeledMetrics(t),
    channels: _matchAll(t, CHANNEL_RE),
    econ: _matchAll(t, ECON_RE),
    milestones: _matchAll(t, MILESTONE_RE),
    orgs: _orgs(t, companyName),
    hasText: _clean(t).length > 0,
    firstLine: _clean(t.split('\n')[0]).slice(0, 120),
  };
}

// Quantitative artifacts most useful as "what the slide shows". Correctly-
// labeled metrics come first; raw figures (ARR/%/x not caught as labeled blocks)
// fill in behind them.
function _quantEvidence(a) {
  const extra = _uniq([...a.money, ...a.ratings, ...a.pct, ...a.mult, ...a.counts]);
  return _uniq([...a.labeled, ...extra]).slice(0, 4);
}

// --- per-type grounding rules ------------------------------------------------
// Each rule returns { works?, missing?, rec? } strings (any may be null to keep
// the existing field). `references` are only concrete artifacts from THIS slide.
// Missing/rec asks are the diligence evidence most relevant to the type.

function _worksClause(label, evidence) {
  if (!evidence.length) return null;
  return `The ${label} slide cites ${_list(evidence)}.`;
}

// --- moat / defensibility (evaluated deck-wide, distinct from competition) ----
// Competition = who exists / positioning / why customers choose us.
// Moat        = why the advantage gets harder to copy as the company scales.
// Evidence for moat can live on Competition, Product, Traction, Business Model,
// GTM, or a standalone Moat slide — so it is assessed over the whole deck text.
// Durable = advantages that compound with scale. NB: patents (especially
// "pending") are NOT counted as durable here — an unproven patent of unstated
// scope is treated as a weak signal (surfaced separately via hasPatent).
const MOAT_DURABLE_RE =
  /\b(network (?:effect|densit)\w*|city[- ]level liquidity|liquidity|fill[- ]?rate|match[- ]?rate|repeat (?:transaction|booking|purchase|usage|customer)s?|buyer retention|supplier retention|retention|cohort\w*|switching cost\w*|proprietary data|exclusive (?:supply|partnership)\w*|supply lock[- ]?in|lock[- ]?in)\b/gi;
const MOAT_WEAK_RE = /\b(first[- ]mover|first to market|being first|head start|coverage|ratings?|reviews?)\b/gi;

function assessMoat(deckText, ctx = {}) {
  const t = String(deckText || '');
  const durable = _uniq((t.match(MOAT_DURABLE_RE) || []).map((x) => _clean(x).toLowerCase()));
  const weak = _uniq((t.match(MOAT_WEAK_RE) || []).map((x) => _clean(x).toLowerCase()));
  const hasPatent = /\bpatent/i.test(t);
  // addressed: ≥2 durable signals; scattered: exactly 1; weak: none.
  let status = 'weak';
  if (durable.length >= 2) status = 'addressed';
  else if (durable.length === 1) status = 'scattered';
  const durableAsk = ctx.isMarketplace
    ? 'network density, city-level liquidity, fill/match rate, repeat transactions, buyer and supplier retention, switching costs, or proprietary data'
    : 'network effects, switching costs, proprietary data, or exclusive supply/partnerships';
  const restsOn = weak.length ? _list(weak.slice(0, 3)) : 'a current lead';
  const missing =
    `explain why the advantage is durable and compounds with scale — it rests on ${restsOn}` +
    `${hasPatent ? ' and patents pending' : ''}, not proven ${durableAsk}`;
  const rec = `show why the edge gets harder to copy as ${ctx.companyName || 'the company'} scales — ${durableAsk} — rather than ${restsOn}`;
  return { status, durable, weak, hasPatent, missing, rec };
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
  // Competition: who exists, how positioned, why customers choose us, and
  // whether the comparison names real competitors. The durability question is
  // handled by the deck-wide moat assessment (kept distinct).
  competition: (a, c) => {
    const st = String(c.slideText || '');
    const dims = _uniq(
      (st.match(/\b(coverage|traction|ratings?|reviews?|pricing|price|speed|selection|quality|breadth|features?)\b/gi) || []).map((x) => _clean(x).toLowerCase())
    );
    // Clean competitor names only — drop the company, generic placeholders,
    // platforms, and comparison-table data words. When names survive, list them;
    // otherwise flag that the deck uses generic placeholders.
    const BADORG = /\b(app|play|store|competitor|coverage|traction|rating|review|seed|round|retailer|consumer|google|apple|win|we|our)\b/i;
    const named = (a.orgs || []).filter(
      (o) => !BADORG.test(o) && o.toLowerCase() !== String(c.companyName || '').toLowerCase()
    );
    const genericCompetitors = /competitor\s*[0-9a-c]\b/i.test(st) || (named.length === 0 && /competitor/i.test(st));
    const mults = _uniq((a.mult || []).filter((x) => x !== '1x'));
    const bits = [];
    if (named.length) bits.push(`names ${_list(named.slice(0, 3))}`);
    if (dims.length) bits.push(`compares on ${_list(dims.slice(0, 4))}`);
    if (mults.length) bits.push(`claims ${_list(mults.slice(0, 2))}`);
    // Competition-only: who exists, positioning, why customers choose us.
    // Durability/moat is handled by the separate Moat/Defensibility section.
    return {
      works: bits.length ? `The Competition slide ${_list(bits)}.` : null,
      missing: genericCompetitors
        ? 'name the actual competitors instead of generic placeholders, and show how it positions against them and why customers choose it.'
        : 'make the head-to-head positioning explicit — the dimensions where it wins and why customers choose it over the named alternatives.',
      rec: genericCompetitors
        ? 'name the real competitors and show the head-to-head positioning and why customers choose it.'
        : 'sharpen the positioning against the named competitors — where it wins and why customers choose it.',
    };
  },
  // Standalone Moat/Defensibility slide (if the deck has one) — purely durability.
  moat: (a, c) => {
    const moat = c.moat || {};
    return {
      works: (moat.durable || []).length ? `Defensibility signals appear: ${_list(moat.durable.slice(0, 3))}.` : null,
      missing: (moat.missing || 'explain why the advantage compounds with scale') + '.',
      rec: (moat.rec || 'show why the edge gets harder to copy as the company scales') + '.',
    };
  },
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
// funding shares the ask rule.
TYPE_RULES.funding = TYPE_RULES.ask;

// --- display-copy cleanup (weak conditional phrasing → direct imperative) -----
// Removes hedges from user-facing recommendations/gaps WITHOUT adding any
// factual claim — it only makes the instruction direct.

const _STEM_IMP = {
  add: 'Add', includ: 'Include', show: 'Show', provid: 'Provide', highlight: 'Highlight',
  clarif: 'Clarify', explain: 'Explain', stat: 'State', demonstrat: 'Demonstrate',
};
function _impFromStem(stem) {
  return _STEM_IMP[stem.toLowerCase()] || stem.charAt(0).toUpperCase() + stem.slice(1);
}
function _cap1(s) {
  return s.replace(/^(\s*)([a-z])/, (m, w, c) => w + c.toUpperCase());
}

function cleanDisplayCopy(s) {
  if (typeof s !== 'string' || !s.trim()) return s;
  let t = s;
  // Inline/leading conditional hedges before an instruction.
  t = t.replace(/\b[Ii]f\s+(?:available|possible|applicable|true|any|present|needed|relevant|feasible|so)\b\s*,?\s*/g, '');
  t = t.replace(/\b[Ww]here\s+(?:available|possible|applicable)\b\s*,?\s*/g, '');
  // "may/might/could want to VERB …" → "VERB …"
  t = t.replace(/\b(?:you\s+)?(?:may|might|could|would)\s+(?:want|wish|like)\s+to\s+/gi, '');
  t = t.replace(/\bit\s+(?:would|could|may|might)\s+be\s+(?:helpful|useful|good|beneficial|valuable|worth(?:while)?)\s+to\s+/gi, '');
  // Sentence-initial "Consider adding X" / "Could include X" → imperative.
  t = t.replace(/^(\s*)[Cc]onsider(?:ing)?\s+(add|includ|show|provid|highlight|clarif|explain|stat|demonstrat)(?:ing|e|y|ify)?\b/, (m, w, st) => w + _impFromStem(st));
  t = t.replace(/^(\s*)(?:could|may|might|should|would)\s+(include|add|show|provide|highlight|clarify|explain|state)\b/i, (m, w, v) => w + v.charAt(0).toUpperCase() + v.slice(1));
  // Tidy spacing/punctuation and capitalize the first letter.
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
  return _cap1(t);
}

const _cleanStr = (v) => (typeof v === 'string' ? cleanDisplayCopy(v) : v);
const _cleanArr = (a) => (Array.isArray(a) ? a.map(_cleanStr) : a);

/**
 * Final display-copy pass over the user-facing report_v2 fields. Mutates in
 * place. Deck_synthesis is intentionally left untouched.
 */
function cleanReportCopy(v2) {
  if (!v2 || typeof v2 !== 'object') return v2;
  for (const s of v2.slide_level_feedback || []) {
    s.what_works = _cleanStr(s.what_works);
    s.what_is_missing = _cleanStr(s.what_is_missing);
    s.recommended_improvement = _cleanStr(s.recommended_improvement);
  }
  const df = v2.dashboard_feedback || {};
  const dfk = df.deck_feedback || {};
  for (const k of ['completeness', 'clarity', 'brevity', 'flow']) {
    const d = dfk[k];
    if (!d) continue;
    d.what_needs_help = _cleanStr(d.what_needs_help);
    d.recommended_changes = _cleanArr(d.recommended_changes);
  }
  if (dfk.flow) {
    for (const a of ['sequencing_notes', 'redundancy_or_repetition', 'misplaced_or_scattered_evidence', 'suggested_moves_or_cuts']) {
      dfk.flow[a] = _cleanArr(dfk.flow[a]);
    }
  }
  for (const s of df.slide_feedback || []) {
    s.what_works = _cleanStr(s.what_works);
    s.what_needs_help = _cleanStr(s.what_needs_help);
    s.recommended_changes = _cleanArr(s.recommended_changes);
  }
  if (df.deck_score) {
    df.deck_score.investors_will_question = _cleanArr(df.deck_score.investors_will_question);
    df.deck_score.what_could_make_investors_pass = _cleanArr(df.deck_score.what_could_make_investors_pass);
    df.deck_score.investors_will_like = _cleanArr(df.deck_score.investors_will_like);
  }
  return v2;
}

// --- Moat / Defensibility as a required investor topic -----------------------
// Moat is a required investor topic. If the deck has a dedicated Moat slide OR
// explicitly answers the durability question (≥2 durable signals), it is treated
// as addressed. Otherwise a synthetic "missing section" feedback item is built so
// the report surfaces it in the slide-feedback list (never buried in Competition).
//
// Returns { item, recommendedBullets } or null (moat is addressed). `item`
// matches the slide_level_feedback shape; slide_number is null.
function buildMissingMoatSection(params = {}) {
  const slides = Array.isArray(params.slides) ? params.slides : [];
  const companyName = params.companyName || (params.investmentCase && params.investmentCase.company_name) || null;
  const isMarketplace = !!(params.investmentCase && params.investmentCase.detected && params.investmentCase.detected.is_marketplace);

  const hasMoatSlide = slides.some((s) => _normType(s && (s.inferred_type || s.type)) === 'moat');
  if (hasMoatSlide) return null; // a dedicated Moat slide already answers it

  const deckText = slides.map((s) => String((s && s.extracted_text) || '')).join('\n');
  const moat = assessMoat(deckText, { companyName, isMarketplace });
  // Only a genuinely weak moat (no durable signals) is "missing". Scattered or
  // addressed durability is surfaced as answered/scattered by buildInvestorTopics.
  if (moat.status !== 'weak') return null;

  const company = companyName || 'the company';
  const hasTraction = slides.some((s) => _normType(s && (s.inferred_type || s.type)) === 'traction');
  const evidence = _uniq([...(hasTraction ? ['traction'] : []), ...(moat.weak || [])]);
  if (moat.hasPatent) evidence.push('patents pending');
  const relatedEvidence = evidence.length ? _list(evidence) : 'some related signals';
  const durable = isMarketplace
    ? 'network density, city-level liquidity, repeat booking, detailer/supplier retention, switching costs, supply relationships, CAC advantage, proprietary data, or patent scope'
    : 'network effects, switching costs, proprietary data, exclusive supply/partnerships, CAC advantage, or patent scope';

  const item = {
    slide_number: null,
    slide_title_or_section: 'Moat',
    investor_decision: 'Whether the advantage becomes harder to copy as the company scales.',
    assessment: 'Missing',
    what_works: `The deck has some related evidence — ${relatedEvidence} — but these are not organized into a durable moat argument.`,
    what_is_missing: `The deck does not yet explain why ${company} becomes harder to copy as it scales.`,
    recommended_improvement: `Add a Moat / Defensibility slide that names the durable advantage (${durable}) and connects it to the named competitors and likely fast followers.`,
    issue_type: 'Substance',
  };
  const recommendedBullets = [
    'Add a Moat slide.',
    `Explain the durable advantage: ${durable}.`,
    'Connect the moat to named competitors and likely fast followers.',
  ];
  return { item, recommendedBullets };
}

// --- investor-topic-first feedback -------------------------------------------
// PitchDeckCheck evaluates every deck against a FIXED set of investor topics in
// a preferred investor-readiness sequence. buildInvestorTopics reshapes the
// per-slide feedback into one card per topic (in this order), merging multi-slide
// topics, marking absent topics as F/Missing, and recording where each answer
// came from. Shape-preserving: each item is still a slide_feedback-shaped object
// with additive topic_* fields.
const INVESTOR_TOPICS = [
  { key: 'cover', short: 'Cover', full: 'Cover', types: ['cover'] },
  { key: 'team', short: 'Team', full: 'Team', types: ['team'] },
  { key: 'problem', short: 'Problem', full: 'Problem', types: ['problem'] },
  { key: 'solution', short: 'Solution', full: 'Solution', types: ['solution'] },
  { key: 'product', short: 'Product', full: 'Product', types: ['product'] },
  { key: 'market', short: 'Market', full: 'Market', types: ['market'] },
  { key: 'traction', short: 'Traction', full: 'Traction', types: ['traction'] },
  { key: 'business_model', short: 'Business Model', full: 'Business Model', types: ['business_model'] },
  { key: 'competition', short: 'Competition', full: 'Competition', types: ['competition'] },
  { key: 'moat', short: 'Moat', full: 'Moat / Defensibility', types: ['moat'] },
  { key: 'go_to_market', short: 'Go-to-Market', full: 'Go-to-Market', types: ['go_to_market'] },
  { key: 'roadmap', short: 'Roadmap', full: 'Roadmap / Milestones', types: ['roadmap'] },
  { key: 'financials', short: 'Financials', full: 'Financials', types: ['financials'] },
  { key: 'ask', short: 'Ask', full: 'Ask', types: ['ask', 'funding'] },
  { key: 'contact', short: 'Contact', full: 'Contact', types: ['contact'] },
];
const _GRADE_RANK = { A: 5, B: 4, C: 3, D: 2, F: 1 };

// Product-owned investor question shown as "What's the investor thinking for
// this topic?". Company name and supply-side noun are interpolated (never
// hardcoded to one deck).
const TOPIC_INVESTOR_QUESTION = {
  moat: (c) => `What makes ${c.company} harder to copy as it scales?`,
  competition: (c) => `Why would customers choose ${c.company} instead of existing alternatives?`,
  traction: () => 'Is this real demand, or just early signups?',
  business_model: (c) => `Can ${c.company} turn each transaction into an attractive, scalable business?`,
  go_to_market: (c) => `Can ${c.company} acquire both consumers and ${c.supplyPlural} repeatedly and efficiently?`,
  financials: (c) => `What has to be true for ${c.company} to reach these projections?`,
  ask: (c) => `What does this round buy, and what milestone does it get ${c.company} to?`,
};
const _MOAT_WEAK_TEST = new RegExp(MOAT_WEAK_RE.source, 'i');
const _MOAT_DURABLE_TEST = new RegExp(MOAT_DURABLE_RE.source, 'i');

function _titleToType() {
  const inv = {};
  for (const [k, v] of Object.entries(TYPE_DISPLAY_NAMES)) {
    const key = _clean(v).toLowerCase();
    if (!(key in inv)) inv[key] = _normType(k);
  }
  return inv;
}
const _TITLE_TO_TYPE = _titleToType();

// Build a two-sided (consumer + supply) product-workflow summary from the raw
// product slide text. Returns null when no workflow evidence is present (so
// Product can fall back to other proof rather than leading with patents).
// Generic — the supply-side noun is detected from the deck, not hardcoded.
function _productWorkflowSummary(slides) {
  const t = (slides || [])
    .filter((s) => _normType(s && (s.inferred_type || s.type)) === 'product')
    .map((s) => String((s && s.extracted_text) || ''))
    .join('\n');
  if (!t.trim()) return null;

  const supMatch = t.match(/\b(detailers?|hosts?|providers?|suppliers?|sellers?|drivers?|merchants?|vendors?|renters?|shoppers?)\b/i);
  const supply = supMatch ? supMatch[1].toLowerCase().replace(/s$/, '') : null;

  // Consumer / demand side.
  const consumer = [];
  if (/\b(browse|search|discover|find|explore)\b/i.test(t)) consumer.push(supply ? `browse ${supply}s` : 'browse the marketplace');
  if (/\b(compare|reviews?|ratings?|prices?|pricing)\b/i.test(t)) consumer.push('compare reviews and prices');
  const canBook = /\b(book|schedule|reserve|order|request)\b/i.test(t);
  const canPay = /\b(pay|payment|checkout|charge)\b/i.test(t);
  if (canBook && canPay) consumer.push('book and pay');
  else if (canBook) consumer.push('book');
  else if (canPay) consumer.push('pay');

  // Supply / provider side.
  const supplyActs = [];
  if (/\b(profile|manage|onboard|sign\s?up)\b/i.test(t)) supplyActs.push('manage profiles');
  if (/\b(accept|jobs?|requests?|gigs?)\b/i.test(t)) supplyActs.push('accept jobs');
  if (/\b(earnings?|payouts?|income|track|revenue)\b/i.test(t)) supplyActs.push('track earnings');

  const parts = [];
  if (consumer.length) parts.push(`consumers can ${consumer.join(', ')}`);
  if (supplyActs.length) parts.push(`${supply ? `${supply}s` : 'providers'} can ${_list(supplyActs)}`);
  if (!parts.length) return null;
  return parts.length === 2
    ? `The deck shows both sides of the product: ${parts.join('; ')}.`
    : `The deck shows the product: ${parts[0]}.`;
}

function buildInvestorTopics(params = {}) {
  const slideFeedback = Array.isArray(params.slideFeedback) ? params.slideFeedback : [];
  const slides = Array.isArray(params.slides) ? params.slides : [];
  const companyName = params.companyName || (params.investmentCase && params.investmentCase.company_name) || null;
  const isMarketplace = !!(params.investmentCase && params.investmentCase.detected && params.investmentCase.detected.is_marketplace);
  const supplyLabel = params.supplyLabel || null;

  const typeByNum = {};
  for (const s of slides) if (s && s.slide_number != null) typeByNum[s.slide_number] = _normType(s.inferred_type || s.type);
  const entryType = (e) => {
    if (_clean(e.title).toLowerCase() === 'moat') return 'moat';
    return typeByNum[e.slide_number] || _TITLE_TO_TYPE[_clean(e.title).toLowerCase()] || 'other';
  };
  const bestOf = (arr) => arr.slice().sort((a, b) => (_GRADE_RANK[b.grade] || 0) - (_GRADE_RANK[a.grade] || 0))[0];
  const srcLabel = (nums) => (nums.length === 0 ? 'No dedicated section' : nums.length === 1 ? `Slide ${nums[0]}` : `Slides ${nums[0]}–${nums[nums.length - 1]}`);

  // Areas where moat-related evidence appears (for a missing/scattered moat).
  const moatFoundIn = () => {
    const labels = [];
    for (const t of ['product', 'competition', 'traction', 'business_model', 'go_to_market']) {
      const sl = slides.find((s) => _normType(s && (s.inferred_type || s.type)) === t);
      const txt = sl ? String(sl.extracted_text || '') : '';
      if (txt && (_MOAT_WEAK_TEST.test(txt) || _MOAT_DURABLE_TEST.test(txt) || /patent/i.test(txt))) {
        labels.push(TYPE_DISPLAY_NAMES[t] || t);
      }
    }
    return labels;
  };

  const topics = [];
  INVESTOR_TOPICS.forEach((topic, i) => {
    const recPos = i + 1;
    const matches = slideFeedback.filter((e) => topic.types.includes(entryType(e)));
    const nums = _uniq(matches.map((m) => m.slide_number).filter((n) => typeof n === 'number' && n > 0)).sort((a, b) => a - b);

    if (matches.length) {
      const primary = bestOf(matches);
      const isMoatMissing = topic.key === 'moat' && !nums.length; // synthetic weak-moat item

      // Product leads with workflow/product proof, not defensibility. Prefer a
      // two-sided (consumer + supply) workflow summary built from the product
      // slide text; otherwise fall back to the model copy with patent/moat
      // sentences stripped, so durability language stays in the Moat topic.
      let whatWorks = primary.what_works;
      if (topic.key === 'product') {
        const twoSided = _productWorkflowSummary(slides);
        if (twoSided) {
          whatWorks = twoSided;
        } else {
          const patentRe = /\b(patent|defensib|moat|proprietary)/i;
          const stripPatent = (txt) =>
            String(txt || '')
              .split(/(?<=[.!?])\s+/)
              .map((s) => s.trim())
              .filter((s) => s && !patentRe.test(s))
              .join(' ');
          const parts = _uniq(matches.map((m) => stripPatent(m.what_works)).filter(Boolean));
          if (parts.length) whatWorks = parts.join(' ');
        }
      }

      topics.push({
        ...primary,
        title: topic.short,
        topic_key: topic.key,
        what_works: whatWorks,
        source_slides: nums,
        source_label: srcLabel(nums),
        evidence_status: isMoatMissing ? 'missing' : nums.length > 1 ? 'multiple' : 'dedicated',
        ...(topic.key === 'moat' ? { evidence_found_in: moatFoundIn() } : {}),
        actual_position: nums.length ? nums[0] : null,
        recommended_position: recPos,
        recommended_changes: _uniq(matches.flatMap((m) => m.recommended_changes || [])).slice(0, 4),
        evidence_found: _uniq(matches.flatMap((m) => m.evidence_found || [])),
        evidence_missing: _uniq(matches.flatMap((m) => m.evidence_missing || [])),
      });
      return;
    }

    // Absent topic. Moat gets special treatment (scattered vs truly missing).
    if (topic.key === 'moat') {
      const moat = assessMoat(slides.map((s) => String((s && s.extracted_text) || '')).join('\n'), { companyName, isMarketplace });
      const scattered = moat.status !== 'weak'; // durability shown, just not consolidated
      const foundIn = moatFoundIn();
      topics.push({
        slide_number: 0, title: topic.short, topic_key: topic.key,
        grade: scattered ? 'C' : 'F', assessment: scattered ? 'Partially answered' : 'Missing',
        investor_decision: 'Whether the advantage becomes harder to copy as the company scales.',
        what_works: scattered ? 'The deck shows durability signals across slides, but they are not consolidated into one moat argument.' : '',
        what_needs_help: scattered
          ? `${companyName || 'The deck'} shows some durability but has no dedicated Moat / Defensibility section.`
          : `The deck does not yet explain why ${companyName || 'the company'} becomes harder to copy as it scales.`,
        recommended_changes: [scattered ? 'Consolidate the durability evidence into one Moat / Defensibility section.' : 'Add a Moat / Defensibility slide.'],
        evidence_found: [], evidence_missing: [], related_deck_issue: '',
        source_slides: [], source_label: 'No dedicated section',
        evidence_status: scattered ? 'scattered' : 'missing',
        evidence_found_in: foundIn, actual_position: null, recommended_position: recPos,
      });
      return;
    }

    // Any other required topic with no slide → F / Missing.
    topics.push({
      slide_number: 0, title: topic.short, topic_key: topic.key,
      grade: 'F', assessment: 'Missing',
      investor_decision: '', what_works: '',
      what_needs_help: `The deck does not include a dedicated ${topic.full} section.`,
      recommended_changes: [`Add a ${topic.full} section that answers its core investor question.`],
      evidence_found: [], evidence_missing: [], related_deck_issue: '',
      source_slides: [], source_label: 'No dedicated section',
      evidence_status: 'missing', actual_position: null, recommended_position: recPos,
    });
  });

  // Flow note: compare submitted order to the preferred sequence (concise, one note).
  // Apply the product-owned investor question per topic (company + supply-side
  // noun interpolated).
  const _company = companyName || 'the company';
  const _supplyPlural = supplyLabel ? (supplyLabel.endsWith('s') ? supplyLabel : `${supplyLabel}s`) : 'providers';
  for (const t of topics) {
    const q = TOPIC_INVESTOR_QUESTION[t.topic_key];
    if (q) t.investor_decision = q({ company: _company, supplyPlural: _supplyPlural });
  }

  const byKey = {};
  for (const t of topics) byKey[t.topic_key] = t;
  let flowNote = null;
  const trac = byKey.traction;
  if (trac && trac.actual_position) {
    const earlier = ['business_model', 'competition'].some((k) => byKey[k] && byKey[k].actual_position && byKey[k].actual_position < trac.actual_position);
    if (earlier) {
      flowNote =
        'Your deck orders topics differently from the sequence that tends to work best for most investors: Traction appears late. Strong traction usually lands best soon after Problem/Solution, because it turns the opportunity from assertion into evidence. An exceptional team or exceptional traction can justify leading with that evidence, but the deck should make that sequencing choice deliberately.';
    }
  }
  return { topics, flowNote };
}

// --- distinct roles across Overall / Deck Feedback / Investor Topics ---------
// The same underlying gap (defensibility / moat) is otherwise surfaced with
// IDENTICAL copy in the Overall highest-leverage focus, the Deck Feedback
// Completeness recommendations, and the Competition topic. Keep the gap in each
// section but rewrite it to the section's role, and keep the topic-specific fix
// in the Moat topic only.
//   Overall         = executive diagnosis / highest-leverage priority
//   Deck Feedback   = the cross-deck pattern
//   Investor Topics = the topic-specific fix (Moat owns durability; Competition
//                     stays about competitors + positioning)
const MOAT_REC_RE =
  /\b(defensib|moat|network (?:effect|densit)|switching cost|proprietary (?:data|technolog)|supply lock|first[- ]mover|barriers? to entry|durable (?:advantage|defensib|moat)|compounding (?:moat|advantage))/i;

// Company name is interpolated (renders "Gleamr's advantage" for Gleamr) so the
// line is never hardcoded to one deck.
const _roleMoatExecutive = (company) =>
  `Your highest-leverage fix is defensibility: show why ${company}'s advantage compounds with scale — through retention, marketplace liquidity, switching costs, or proprietary data — not just first-mover status.`;
const _ROLE_MOAT_PATTERN =
  'Carry one durability thread across the deck (retention → marketplace liquidity → switching costs) so defensibility reads as a pattern, not a single-slide afterthought.';
const _ROLE_COMPETITION_DEFAULT =
  'Name the actual competitors and make the head-to-head positioning explicit — the dimensions where you win and why customers choose you.';

// --- near-duplicate recommendation cleanup -----------------------------------
// _uniq only drops EXACT duplicates; recommendations often repeat with slightly
// different wording (e.g. two "combine the product walkthroughs …" lines). This
// collapses near-duplicates within a single section by token overlap, and
// canonicalizes the product-walkthrough recommendation to one clear version.
const _REC_STOP = new Set(
  'the a an and or to of for with that unless each add adds added include includes show shows state states clarify explain its it your you in on at by as is are this these those so not just more into where any e g eg vs versus one two both such don t do not consider'.split(
    ' '
  )
);
function _recSig(s) {
  return _uniq(
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && w.length > 2 && !_REC_STOP.has(w))
  );
}
function _jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  let inter = 0;
  for (const x of a) if (B.has(x)) inter++;
  return inter / (a.length + b.length - inter);
}
function _canonicalizeRec(r, supplyLabel) {
  if (/\bcombine\b[^.]*\bwalkthroughs?\b/i.test(r) || /\bwalkthroughs?\b[^.]*\bcombine\b/i.test(r)) {
    const supply = (supplyLabel || 'supply-side').replace(/s$/i, ''); // singular adjective
    return `Combine the consumer and ${supply} product walkthroughs unless each adds distinct investor proof.`;
  }
  return r;
}
function dedupeRecommendations(arr, supplyLabel) {
  const out = [];
  const sigs = [];
  for (const raw of (arr || []).filter((x) => x && String(x).trim())) {
    const r = _canonicalizeRec(String(raw).trim(), supplyLabel);
    const sig = _recSig(r);
    let dup = false;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === r || _jaccard(sigs[i], sig) >= 0.6) { dup = true; break; }
    }
    if (!dup) { out.push(r); sigs.push(sig); }
  }
  return out;
}

// Apply near-duplicate cleanup to every user-facing recommendation list.
function cleanupRecommendations(v2, supplyLabel) {
  const df = v2 && v2.dashboard_feedback;
  if (!df) return v2;
  const deckFb = df.deck_feedback || {};
  for (const k of ['completeness', 'clarity', 'brevity', 'flow']) {
    const d = deckFb[k];
    if (d && Array.isArray(d.recommended_changes)) d.recommended_changes = dedupeRecommendations(d.recommended_changes, supplyLabel);
  }
  for (const t of df.slide_feedback || []) {
    if (Array.isArray(t.recommended_changes)) t.recommended_changes = dedupeRecommendations(t.recommended_changes, supplyLabel);
  }
  const ds = df.deck_score || {};
  for (const key of ['investors_will_like', 'investors_will_question', 'what_could_make_investors_pass']) {
    if (Array.isArray(ds[key])) ds[key] = dedupeRecommendations(ds[key], supplyLabel);
  }
  return v2;
}

function enforceRecommendationRoles(v2) {
  const df = v2 && v2.dashboard_feedback;
  if (!df) return v2;
  const topics = df.slide_feedback || [];
  const deckFb = df.deck_feedback || {};
  const ds = df.deck_score || {};

  // OVERALL: the highest-leverage focus, when it's the moat gap, reads as an
  // executive priority rather than a slide fix.
  if (ds.highest_leverage_revision_focus && MOAT_REC_RE.test(ds.highest_leverage_revision_focus)) {
    const company = ds.title && ds.title !== 'Deck Score' ? ds.title : 'the company';
    ds.highest_leverage_revision_focus = _roleMoatExecutive(company);
  }

  // DECK FEEDBACK (Completeness): moat-themed recs collapse to one cross-deck
  // PATTERN line (deduped) instead of repeating the topic fix.
  const completeness = deckFb.completeness;
  if (completeness && Array.isArray(completeness.recommended_changes)) {
    completeness.recommended_changes = _uniq(
      completeness.recommended_changes.map((r) => (MOAT_REC_RE.test(r) ? _ROLE_MOAT_PATTERN : r))
    );
  }

  // INVESTOR TOPICS — Competition stays about competitors/positioning; the moat
  // fix belongs to the Moat topic, so strip moat-themed recs from Competition.
  const competition = topics.find((t) => t && (t.topic_key === 'competition' || t.title === 'Competition'));
  if (competition && Array.isArray(competition.recommended_changes)) {
    const kept = competition.recommended_changes.filter((r) => !MOAT_REC_RE.test(r));
    competition.recommended_changes = kept.length ? _uniq(kept) : [_ROLE_COMPETITION_DEFAULT];
  }
  // (The Moat topic keeps its topic-specific durability fix unchanged.)

  return v2;
}

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

  // Deck-wide moat/defensibility assessment (evidence can live on any slide).
  const isMarketplace = !!(
    params.investmentCase &&
    params.investmentCase.detected &&
    params.investmentCase.detected.is_marketplace
  );
  const deckText = slides.map((s) => String((s && s.extracted_text) || '')).join('\n');
  const moat = assessMoat(deckText, { companyName, isMarketplace });

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
    const g = rule(art, { supplyLabel, companyName, label, slideText: text, moat }) || {};

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
  buildMissingMoatSection,
  buildInvestorTopics,
  enforceRecommendationRoles,
  cleanupRecommendations,
  INVESTOR_TOPICS,
  cleanReportCopy,
  cleanDisplayCopy,
  // exported for tests
  extractArtifacts,
  extractLabeledMetrics,
  assessMoat,
  _isGeneric,
  TYPE_RULES,
};
