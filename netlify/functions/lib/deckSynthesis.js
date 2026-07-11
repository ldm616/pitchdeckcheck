/**
 * Deck-Level Synthesis (report_v2.deck_synthesis)
 *
 * Diagnoses the deck as a single investor argument rather than a list of slide
 * scores. It is a DETERMINISTIC, additive reshaping of evidence the pipeline has
 * ALREADY computed — the same discipline used by deriveQuestion(),
 * deriveBelieve(), and _buildPriorityImprovements():
 *
 *   - No LLM calls, no external I/O.
 *   - Grounds every item in already-computed signals: investmentCase.detected
 *     flags, investmentCase.market_validation, investmentCase.funding_terms,
 *     the per-slide rubric questions (assessment / gap / fix), and the built
 *     slide_level_feedback (titles + what_is_missing).
 *   - Never invents numbers: figures are only surfaced when they literally
 *     appear in the extracted deck text or in already-extracted direct signals.
 *   - Stays silent (empty array) when the evidence does not support a category.
 *
 * Anti-generic guardrail: every recommended_fix / recommendation is filtered
 * through _passesSpecificity(). Bare-generic advice ("add more metrics",
 * "improve flow", "strengthen evidence", …) is dropped; each surviving item
 * names the concrete thing to add / change / remove / move / resequence.
 *
 * Output shape (report_v2.deck_synthesis) — exact field names:
 *   {
 *     investor_objections: [{ issue, why_it_matters, evidence_found[],
 *                             evidence_missing[], affected_slides[], recommended_fix }],
 *     metric_ambiguities: [{ term_or_claim, why_unclear, affected_slides[], recommended_fix }],
 *     sequencing_issues: [{ issue, why_it_matters, affected_slides[], recommended_fix }],
 *     redundancy_or_low_value_content: [{ issue, why_it_matters, affected_slides[], recommended_fix }],
 *     scattered_or_misplaced_evidence: [{ issue, current_location[], better_location[], recommended_fix }],
 *     restructuring_recommendations: [{ recommendation, rationale, affected_slides[] }],
 *   }
 */

'use strict';

// Self-contained type vocabulary (mirrors reportV2Assembler.TYPE_DISPLAY_NAMES).
// Kept local to avoid a require cycle with the canonical/patterns modules.
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
  product_roadmap: 'Product Roadmap',
  vision: 'Vision',
  contact: 'Contact',
  appendix: 'Appendix',
  other: 'Other',
};

function _normType(t) {
  const k = String(t || '').toLowerCase().trim();
  if (k === 'market_opportunity') return 'market';
  if (k === 'product_roadmap') return 'roadmap';
  return k;
}

// --- generic-language guardrail ----------------------------------------------
// Recommendations that match these (and carry no concrete anchor) are dropped.
const GENERIC_RE =
  /^(add more metrics|provide more detail|clarify differentiation|strengthen(?:\s+the)?\s+evidence|improve(?:\s+the)?\s+flow|make it (?:more )?concise|be more specific|add more data|show more proof)\.?$/i;

// A recommendation is specific when it names a concrete artifact: a directive
// verb tied to an object, a named metric, a slide name, or a literal number.
const SPECIFIC_VERB_RE =
  /\b(define|separate|name|show|move|bridge|consolidate|localize|localise|tie|split|distinguish|state|precede|combine|replace|report|break out|add .+ (?:to|next to|near|before|after)|place .+ (?:before|after|near))\b/i;
const SPECIFIC_NOUN_RE =
  /\b(cac|payback|ltv|retention|repeat (?:booking|purchase|usage|transaction)|cohort|churn|gmv|take[\s-]?rate|run[\s-]?rate|arr|mrr|denominator|milestones?|use of funds|liquidity|network (?:effect|density)|switching costs?|active (?:users?|buyers?|sellers?)|transacting|paying|conversion|channel|burn|operating bridge|moat|patent|city|per[\s-]?market|serviceable)\b/i;
const NUMBER_RE = /(\$\s?\d|\b\d+(?:\.\d+)?\s?(?:x|%|k|m|mm|bn|b|million|billion)\b)/i;

function _passesSpecificity(text) {
  const t = String(text || '').trim();
  if (t.length < 12) return false;
  if (GENERIC_RE.test(t)) return false;
  return SPECIFIC_VERB_RE.test(t) || SPECIFIC_NOUN_RE.test(t) || NUMBER_RE.test(t);
}

// --- text / evidence helpers --------------------------------------------------

const MONEY = '\\$\\s?\\d[\\d,]*(?:\\.\\d+)?\\s?(?:k|m|mm|bn|b|billion|million|thousand)?';

function _clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// Aggregate all text the pipeline already produced/extracted for grounding.
function _deckText(fullReport, slides) {
  const parts = [];
  for (const s of slides || []) {
    if (s && s.extracted_text) parts.push(String(s.extracted_text));
  }
  for (const s of (fullReport && fullReport.slides) || []) {
    for (const q of (s && s.questions) || []) {
      if (q) parts.push(`${q.assessment || ''} ${q.gap || ''} ${q.fix || ''}`);
    }
  }
  return parts.join('\n');
}

// Build a joined index of every slide: number, normalized type, display title,
// and the already-generated "what is missing" note. Titles come from the built
// slide_level_feedback so affected_slides reference real section names.
function _buildSlideIndex(fullReport, slideFeedback) {
  const feedbackByNum = {};
  for (const f of slideFeedback || []) {
    if (f && f.slide_number != null) feedbackByNum[f.slide_number] = f;
  }
  const idx = [];
  for (const s of (fullReport && fullReport.slides) || []) {
    const type = _normType(s.type);
    const f = feedbackByNum[s.slide_number] || {};
    idx.push({
      num: typeof s.slide_number === 'number' ? s.slide_number : null,
      type,
      title: f.slide_title_or_section || TYPE_DISPLAY_NAMES[type] || 'Section',
      missing: f.what_is_missing || '',
      grade: s.grade || null,
    });
  }
  idx.sort((a, b) => (a.num || 0) - (b.num || 0));
  return idx;
}

function _slidesOfType(index, types) {
  const set = new Set(types);
  return index.filter((e) => set.has(e.type));
}

function _labels(entries) {
  return entries
    .filter((e) => e && e.num != null)
    .map((e) => `${e.num}: ${e.title}`);
}

function _joinList(arr) {
  const a = (arr || []).filter(Boolean);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}

function _dedupeBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

// Extract a run-rate figure and a distinct projection/target figure when both
// literally appear. Returns { runRate, target } (null when not stated).
function _extractRunRateAndTarget(text, directSignals) {
  let runRate = null;
  for (const sig of directSignals || []) {
    if (/run[\s-]?rate|ARR|MRR/i.test(sig)) {
      const m = sig.match(new RegExp(MONEY, 'i'));
      if (m) {
        runRate = m[0].replace(/\s+/g, '');
        break;
      }
    }
  }
  if (!runRate) {
    const m = text.match(new RegExp(`(${MONEY})\\s+(?:revenue\\s+)?run[\\s-]?rate`, 'i'));
    if (m) runRate = m[1].replace(/\s+/g, '');
  }
  let target = null;
  const tm =
    text.match(new RegExp(`(?:target(?:ing)?|projected?|reach|grow to|by\\s+20\\d\\d[^.]{0,20})\\D{0,20}(${MONEY})`, 'i')) ||
    text.match(new RegExp(`(${MONEY})\\s+(?:target|by\\s+20\\d\\d|projected|goal|in\\s+revenue)`, 'i'));
  if (tm) {
    const t = tm[1].replace(/\s+/g, '');
    if (t !== runRate) target = t;
  }
  return { runRate, target };
}

// --- category builders --------------------------------------------------------
// Each builder returns an array of grounded, specific items. Conditions fire off
// already-computed signals; phrasing follows the product-owned specification.

function _investorObjections(ctx) {
  const { flags, index, text, mv, funding } = ctx;
  const out = [];

  const tractionSlides = _slidesOfType(index, ['traction']);
  const competitiveSlides = _slidesOfType(index, ['competition', 'moat']);
  const gtmSlides = _slidesOfType(index, ['go_to_market']);
  const bizSlides = _slidesOfType(index, ['business_model']);
  const finSlides = _slidesOfType(index, ['financials']);
  const askSlides = _slidesOfType(index, ['ask', 'funding']);
  const marketSlides = _slidesOfType(index, ['market']);
  const directSignals = (mv && mv.direct_signals) || [];

  const hasPatent = /\bpatent/i.test(text);
  const hasRatings = directSignals.some((s) => /star|review/i.test(s));

  // Defensibility beyond first-mover / coverage / ratings / patents pending.
  if (flags.is_marketplace || competitiveSlides.length > 0) {
    const found = [];
    if (hasPatent) found.push('Patents pending are referenced.');
    if (hasRatings) found.push('App ratings/reviews are cited as an advantage.');
    out.push({
      issue: 'Defensibility rests on first-mover advantage, coverage, ratings, and patents pending rather than a compounding moat.',
      why_it_matters:
        'A fast follower with capital can copy coverage and ratings; investors need a moat that strengthens with scale before underwriting durability.',
      evidence_found: found,
      evidence_missing: [
        'Network effects or supply/demand density that compounds with each market',
        'Retention or switching costs that make the position hard to unseat',
      ],
      affected_slides: _labels([...competitiveSlides, ..._slidesOfType(index, ['product', 'traction'])]),
      recommended_fix:
        'Show what compounds defensibility — retention, repeat transactions, network density, or switching costs — beyond first-mover advantage, coverage, ratings, and patents pending.',
    });
  }

  // Retention / repeat usage vs cumulative signups.
  if (!flags.has_retention_data && (directSignals.length > 0 || tractionSlides.length > 0)) {
    out.push({
      issue: 'Traction is shown as cumulative signups, not retention or repeat usage.',
      why_it_matters:
        'Cumulative totals can grow while the business leaks users; retention is what proves durable demand for a marketplace.',
      evidence_found: directSignals.map((s) => _clean(s)).filter(Boolean),
      evidence_missing: [
        'Repeat-booking / repeat-purchase rate',
        'Monthly active vs cumulative signups',
        'Cohort retention over time',
      ],
      affected_slides: _labels(tractionSlides),
      recommended_fix:
        'Add retention and repeat-usage cohorts (repeat-booking rate and monthly active vs cumulative signups) next to Traction.',
    });
  }

  // City-level marketplace liquidity.
  if (flags.is_marketplace) {
    out.push({
      issue: 'Marketplace liquidity is presented as global totals, not per-city health.',
      why_it_matters:
        'Marketplaces succeed or fail city by city; blended totals hide whether any single market has real liquidity.',
      evidence_found: [],
      evidence_missing: [
        'Active buyers and sellers per city',
        'Match / fill rate',
        'Repeat transaction density per market',
      ],
      affected_slides: _labels([...tractionSlides, ...bizSlides]),
      recommended_fix:
        'Show marketplace liquidity by city — active buyers and sellers, match/fill rate, and repeat transaction density in your lead market.',
    });
  }

  // CAC / payback and scalable acquisition.
  if (flags.has_gtm_channels && !flags.has_cac_economics) {
    out.push({
      issue: 'Growth is claimed without acquisition economics (CAC, payback, channel efficiency).',
      why_it_matters:
        'Without CAC and payback, investors cannot tell whether growth is efficient or bought, or whether it scales.',
      evidence_found: [],
      evidence_missing: ['CAC', 'Payback period', 'Conversion by channel', 'Channel efficiency'],
      affected_slides: _labels([...gtmSlides, ...bizSlides]),
      recommended_fix:
        'Show CAC, payback, conversion, and channel efficiency for one or two validated channels.',
    });
  }

  // Financial bridge from current run rate to the projected target.
  if (finSlides.length > 0 && flags.has_market_size_claim) {
    const { runRate, target } = _extractRunRateAndTarget(text, directSignals);
    const from = runRate || 'the current run rate';
    const to = target || 'the projected revenue target';
    out.push({
      issue: `The financials jump from ${from} to ${to} without an operating bridge.`,
      why_it_matters:
        'A projection with no operating bridge reads as a hope, not a plan investors can diligence.',
      evidence_found: runRate ? [`Current run rate: ${runRate}.`] : [],
      evidence_missing: [
        'Transaction volume and take-rate assumptions',
        'Active users/detailers and repeat rate',
        'CAC/payback, burn, and city-expansion assumptions',
      ],
      affected_slides: _labels(finSlides),
      recommended_fix: `Bridge ${from} to ${to} using transaction volume, take rate, active users/detailers, repeat rate, CAC/payback, burn, and city-expansion assumptions.`,
    });
  }

  // Use-of-funds / milestone bridge.
  if (askSlides.length > 0) {
    const uofMissing = askSlides.some((s) => /use of funds|milestone|runway|what the round|hires?/i.test(s.missing));
    if (uofMissing || !flags.has_cac_economics) {
      out.push({
        issue: 'The raise is not tied to specific milestones the round should reach.',
        why_it_matters:
          'Investors fund the next milestone, not a number; an unbridged ask makes it hard to judge whether the raise is sized right.',
        evidence_found: funding && funding.raise ? [`Stated raise: ${funding.raise}.`] : [],
        evidence_missing: [
          'What the round buys (hires, markets, product)',
          'The metrics the round should reach before the next raise',
        ],
        affected_slides: _labels(askSlides),
        recommended_fix:
          'Tie the raise to specific milestones — what the round buys (hires, markets, product) and the metrics it should reach before the next round.',
      });
    }
  }

  return out;
}

function _metricAmbiguities(ctx) {
  const { text, index, mv } = ctx;
  const out = [];
  const directSignals = (mv && mv.direct_signals) || [];
  const supplyMatch = text.match(/\b(detailers|hosts|providers|suppliers|merchants|sellers|drivers|vendors)\b/i);
  const supplyWord = supplyMatch ? supplyMatch[1].toLowerCase() : null;

  const usersSlides = _slidesOfType(index, ['traction', 'business_model']);
  const marketSlides = _slidesOfType(index, ['market']);
  const compSlides = _slidesOfType(index, ['competition', 'moat', 'product']);

  // users vs active vs paying/transacting.
  if (/\busers?\b/i.test(text) || directSignals.some((s) => /users?/i.test(s))) {
    out.push({
      term_or_claim: '"Users" is reported as a single number.',
      why_unclear:
        'Registered, active, and paying/transacting users imply very different businesses, and the deck does not separate them.',
      affected_slides: _labels(usersSlides),
      recommended_fix: 'Define users as registered, active, or transacting customers, and report each separately.',
    });
  }

  // supply-side counts (detailers) vs active/approved/job-completing.
  if (supplyWord) {
    out.push({
      term_or_claim: `"${supplyWord}" count is not qualified.`,
      why_unclear: `Total ${supplyWord} is not the same as active, approved, or job-completing ${supplyWord}, which is what drives supply.`,
      affected_slides: _labels(usersSlides),
      recommended_fix: `Distinguish total ${supplyWord} from active, approved, and job-completing ${supplyWord}.`,
    });
  }

  // revenue run rate vs quarterly vs GMV / platform revenue.
  if (/run[\s-]?rate|revenue|gmv/i.test(text)) {
    out.push({
      term_or_claim: 'Revenue figures mix run-rate, period revenue, and GMV.',
      why_unclear:
        'Run-rate, quarterly revenue, and GMV (gross vs platform net) are different numbers; presented together they overstate scale.',
      affected_slides: _labels([..._slidesOfType(index, ['traction', 'business_model', 'financials'])]),
      recommended_fix: 'Separate GMV, net platform revenue, and run-rate claims, and state the take rate that connects them.',
    });
  }

  // "Nx" coverage / traction multiples without a denominator.
  const multiple = text.match(/\b(\d+(?:\.\d+)?)\s?x\b/i);
  if (multiple) {
    out.push({
      term_or_claim: `A "${multiple[1]}x" multiple is claimed without a stated baseline.`,
      why_unclear: `"${multiple[1]}x coverage/traction" is meaningless without the denominator it multiplies.`,
      affected_slides: _labels([...marketSlides, ..._slidesOfType(index, ['traction'])]),
      recommended_fix: `State the denominator behind every multiple (e.g., ${multiple[1]}x coverage relative to what baseline).`,
    });
  }

  // Large market claim: GMV vs serviceable GMV vs platform revenue.
  const bigMarket = text.match(new RegExp(`(${MONEY})\\s*(?:market|tam|opportunity)`, 'i'));
  if (bigMarket || /\b(tam|sam|som|market size)\b/i.test(text)) {
    const size = bigMarket ? bigMarket[1].replace(/\s+/g, '') : 'the market-size';
    out.push({
      term_or_claim: `The ${size} market claim does not state what it measures.`,
      why_unclear:
        'Total GMV, serviceable GMV, and platform revenue differ by orders of magnitude; the headline number needs a definition.',
      affected_slides: _labels(marketSlides),
      recommended_fix: `Clarify whether the ${size} market is total GMV, serviceable GMV, or platform revenue.`,
    });
  }

  // Patents pending without scope/defensibility explanation.
  if (/\bpatents?\s+pending\b|\bpatent/i.test(text)) {
    out.push({
      term_or_claim: '"Patents pending" is cited without scope.',
      why_unclear: 'A pending patent of unstated scope tells investors nothing about real defensibility.',
      affected_slides: _labels(compSlides),
      recommended_fix: "Explain patent scope and how it creates real defensibility, or de-emphasize 'patents pending'.",
    });
  }

  return out;
}

function _sequencingIssues(ctx) {
  const { flags, index } = ctx;
  const out = [];
  const numbered = index.filter((e) => e.num != null);
  if (numbered.length === 0) return out;
  const maxNum = numbered[numbered.length - 1].num;
  const first = (types) => {
    const e = _slidesOfType(index, types)[0];
    return e ? e.num : null;
  };
  const tractionAt = first(['traction']);
  const marketAt = first(['market']);
  const gtmAt = first(['go_to_market']);
  const finAt = first(['financials']);

  // Traction arriving too late for a marketplace with strong claimed traction.
  if (tractionAt != null && maxNum && tractionAt > maxNum / 2) {
    const strong = _slidesOfType(index, ['traction']).some((e) => /^[AB]/.test(e.grade || ''));
    if (strong || flags.is_marketplace) {
      out.push({
        issue: `Traction appears late (slide ${tractionAt} of ${maxNum}).`,
        why_it_matters:
          'For a seed marketplace, traction is the strongest investable fact; burying it late weakens the whole narrative.',
        affected_slides: _labels(_slidesOfType(index, ['traction'])),
        recommended_fix: 'Move Traction earlier — right after Problem/Solution — so the strongest proof frames the deck.',
      });
    }
  }

  // Market sizing before enough marketplace-quality proof.
  if (marketAt != null && tractionAt != null && marketAt < tractionAt) {
    out.push({
      issue: `Market sizing (slide ${marketAt}) precedes traction proof (slide ${tractionAt}).`,
      why_it_matters:
        'A large market claim lands as assertion when it appears before the proof that the company can capture it.',
      affected_slides: _labels([..._slidesOfType(index, ['market']), ..._slidesOfType(index, ['traction'])]),
      recommended_fix: 'Place market sizing after marketplace-quality proof so the size claim rests on evidence, not assertion.',
    });
  }

  // GTM after traction but not explaining what drove existing growth.
  if (gtmAt != null && tractionAt != null && gtmAt > tractionAt) {
    const gtm = _slidesOfType(index, ['go_to_market'])[0];
    if (!flags.has_cac_economics || (gtm && /channel|growth|acquisition/i.test(gtm.missing))) {
      out.push({
        issue: 'Go-to-Market follows Traction but does not explain what drove the existing growth.',
        why_it_matters:
          'If the deck cannot attribute past growth to specific channels, projected growth is not yet credible.',
        affected_slides: _labels(_slidesOfType(index, ['go_to_market'])),
        recommended_fix: 'In Go-to-Market, explain what actually drove existing growth (which channels, at what CAC) before projecting new ones.',
      });
    }
  }

  // Financial projections without an operating bridge.
  if (finAt != null && !flags.has_cac_economics) {
    out.push({
      issue: 'Financial projections appear without an operating bridge from traction and GTM.',
      why_it_matters:
        'Projections disconnected from unit economics and acquisition read as top-down guesses.',
      affected_slides: _labels(_slidesOfType(index, ['financials'])),
      recommended_fix: 'Precede financial projections with an operating bridge from current traction and GTM efficiency (volume, take rate, CAC/payback, repeat rate).',
    });
  }

  return out;
}

function _redundancy(ctx) {
  const { text, index } = ctx;
  const out = [];

  // Repeated one-line positioning ("Uber for X", "Airbnb for Y") across slides.
  const posMatch = text.match(/\b(uber|airbnb|shopify|stripe)\s+for\s+[a-z][a-z\s-]{2,30}/gi);
  if (posMatch && posMatch.length >= 2) {
    out.push({
      issue: `The "${_clean(posMatch[0])}" positioning is repeated across multiple slides.`,
      why_it_matters: 'Repeating the tagline spends slide space that could carry proof.',
      affected_slides: [],
      recommended_fix: `State the "${_clean(posMatch[0])}" positioning once on the Cover/Solution, then replace the repeats with evidence.`,
    });
  }

  // Multiple product walkthrough slides that may not each earn a slide.
  const productSlides = _slidesOfType(index, ['product']);
  if (productSlides.length >= 2) {
    out.push({
      issue: `${productSlides.length} product/walkthrough slides may not each add unique investor proof.`,
      why_it_matters: 'Product walkthroughs that repeat UI without new proof dilute a seed deck.',
      affected_slides: _labels(productSlides),
      recommended_fix: 'Combine the product walkthroughs unless each adds distinct proof (e.g., consumer-side vs supply-side outcomes).',
    });
  }

  // GTM listing many tactics without validated-channel evidence.
  const gtm = _slidesOfType(index, ['go_to_market'])[0];
  if (gtm) {
    const channelHits = (text.match(/\b(seo|sem|paid ads|referral|influencer|partnerships?|content|email|events?|affiliates?|organic|social)\b/gi) || []).length;
    if (channelHits >= 4 && !ctx.flags.has_cac_economics) {
      out.push({
        issue: 'Go-to-Market lists many tactics without evidence of a validated channel.',
        why_it_matters: 'A long tactic list without proof reads as untested; one validated channel is worth more.',
        affected_slides: _labels([gtm]),
        recommended_fix: 'Cut the tactic list to the one or two channels with proven CAC/conversion, and show that evidence.',
      });
    }
  }

  // Roadmap that is operational rather than investor-critical.
  const roadmap = _slidesOfType(index, ['roadmap']);
  if (roadmap.length > 0) {
    out.push({
      issue: 'Roadmap detail reads as operational rather than investor-critical.',
      why_it_matters: 'Feature-level roadmaps rarely change an investment decision and crowd out proof.',
      affected_slides: _labels(roadmap),
      recommended_fix: 'Replace feature-level roadmap items with the two or three milestones that de-risk the next round.',
    });
  }

  return out;
}

function _scatteredEvidence(ctx) {
  const { flags, index } = ctx;
  const out = [];
  const competitive = _slidesOfType(index, ['competition', 'moat']);
  const product = _slidesOfType(index, ['product']);
  const traction = _slidesOfType(index, ['traction']);
  const gtm = _slidesOfType(index, ['go_to_market']);
  const biz = _slidesOfType(index, ['business_model']);
  const fin = _slidesOfType(index, ['financials']);

  // Defensibility scattered across Product / Competition / Traction.
  if (flags.is_marketplace || competitive.length > 0) {
    const locations = [...product, ...competitive, ...traction];
    if (locations.length >= 2) {
      out.push({
        issue: 'Defensibility evidence is scattered across Product, Competition, and Traction instead of forming one moat argument.',
        current_location: _labels(locations),
        better_location: _labels(competitive.length ? competitive : [{ num: null, title: 'a dedicated Moat/Defensibility slide' }]),
        recommended_fix: 'Consolidate defensibility evidence (retention, network density, switching costs) into one moat argument near Competition.',
      });
    }
  }

  // Marketplace health split across users / detailers / revenue, not localized.
  if (flags.is_marketplace) {
    out.push({
      issue: 'Marketplace health is split across user, supply, and revenue totals but never localized by city or repeat density.',
      current_location: _labels([...traction, ...biz]),
      better_location: _labels(traction.length ? traction : [{ num: null, title: 'Traction' }]),
      recommended_fix: 'Localize marketplace health by city (active buyers/sellers and repeat transaction density) instead of splitting global totals.',
    });
  }

  // CAC / payback absent where the growth story lives.
  if (flags.has_gtm_channels && !flags.has_cac_economics) {
    out.push({
      issue: 'CAC and payback are absent from Go-to-Market, Business Model, and Financials despite being central to the growth story.',
      current_location: [],
      better_location: _labels(gtm.length ? gtm : biz),
      recommended_fix: 'Add CAC and payback to Go-to-Market or Business Model, where the growth story lives.',
    });
  }

  // Retention absent from Traction.
  if (!flags.has_retention_data && traction.length > 0) {
    out.push({
      issue: 'Retention / repeat-use proof is absent from Traction despite being central to marketplace durability.',
      current_location: [],
      better_location: _labels(traction),
      recommended_fix: 'Add retention / repeat-use proof (repeat-booking rate, cohort retention) directly to Traction.',
    });
  }

  return out;
}

function _restructuring(ctx) {
  const { flags, index } = ctx;
  const out = [];
  const traction = _slidesOfType(index, ['traction']);
  const product = _slidesOfType(index, ['product']);
  const competitive = _slidesOfType(index, ['competition', 'moat']);
  const gtm = _slidesOfType(index, ['go_to_market']);
  const biz = _slidesOfType(index, ['business_model']);
  const fin = _slidesOfType(index, ['financials']);

  if (traction.length > 0) {
    const strong = traction.some((e) => /^[AB]/.test(e.grade || ''));
    if (strong || flags.is_marketplace) {
      out.push({
        recommendation: 'Move Traction earlier, immediately after Problem/Solution.',
        rationale: 'Traction is the strongest investable fact; leading with it frames every later claim as backed by evidence.',
        affected_slides: _labels(traction),
      });
    }
  }

  if (product.length >= 2) {
    out.push({
      recommendation: 'Combine the consumer and supply-side product walkthroughs unless each adds unique proof.',
      rationale: 'Two walkthroughs that repeat UI without new evidence spend slides a seed deck cannot afford.',
      affected_slides: _labels(product),
    });
  }

  if (flags.is_marketplace) {
    out.push({
      recommendation: 'Rework the post-traction section into a durability story: retention/liquidity → GTM efficiency → financial bridge.',
      rationale: 'After traction, investors want proof the business compounds; sequencing durability, efficiency, then the bridge answers that.',
      affected_slides: _labels([...traction, ...gtm, ...fin]),
    });
  }

  if (competitive.length > 0 || /\bpatent/i.test(ctx.text)) {
    out.push({
      recommendation: 'Move the moat/patent explanation next to Competition/Defensibility.',
      rationale: 'The defensibility argument only lands when it sits with the competitive comparison it answers.',
      affected_slides: _labels(competitive),
    });
  }

  if (!flags.has_retention_data && traction.length > 0) {
    out.push({
      recommendation: 'Move retention / repeat-use proof next to Traction.',
      rationale: 'Retention beside traction turns raw signups into evidence of durable demand.',
      affected_slides: _labels(traction),
    });
  }

  if (flags.has_gtm_channels && !flags.has_cac_economics) {
    out.push({
      recommendation: 'Move CAC/payback into Go-to-Market or Business Model.',
      rationale: 'Acquisition economics belong with the growth story they justify.',
      affected_slides: _labels(gtm.length ? gtm : biz),
    });
  }

  if (fin.length > 0) {
    out.push({
      recommendation: 'Add an operating bridge in Financials from current traction to the projected target.',
      rationale: 'The bridge is what makes projections diligenceable instead of aspirational.',
      affected_slides: _labels(fin),
    });
  }

  return out;
}

// Drop any item whose recommended_fix / recommendation fails the specificity
// guard, then dedupe. Applied uniformly to every category.
function _finalize(items, textKey, dedupeKey) {
  const kept = items.filter((it) => _passesSpecificity(it[textKey]));
  return _dedupeBy(kept, (it) => (it[dedupeKey] || it[textKey] || '').toLowerCase());
}

/**
 * Build report_v2.deck_synthesis from already-computed report/deck evidence.
 * Deterministic; never throws on missing data (returns empty arrays instead).
 *
 * @param {Object} ctx
 * @param {Object} ctx.fullReport     full_report (slides[] with rubric questions, investment_thesis)
 * @param {Object} ctx.investmentCase output of synthesizeInvestmentCase (detected flags, market_validation, funding_terms)
 * @param {Array}  ctx.slideFeedback  built report_v2.slide_level_feedback (for titles + what_is_missing)
 * @param {Array}  ctx.slides         raw analyzed slides (for extracted_text grounding)
 */
function buildDeckSynthesis(ctx = {}) {
  const fullReport = ctx.fullReport || {};
  const investmentCase = ctx.investmentCase || {};
  const slideFeedback = ctx.slideFeedback || [];
  const slides = ctx.slides || [];

  const flags = investmentCase.detected || {};
  const mv = investmentCase.market_validation || {};
  const funding = investmentCase.funding_terms || {};
  const text = _deckText(fullReport, slides);
  const index = _buildSlideIndex(fullReport, slideFeedback);

  const inner = { flags, index, text, mv, funding };

  return {
    investor_objections: _finalize(_investorObjections(inner), 'recommended_fix', 'issue'),
    metric_ambiguities: _finalize(_metricAmbiguities(inner), 'recommended_fix', 'term_or_claim'),
    sequencing_issues: _finalize(_sequencingIssues(inner), 'recommended_fix', 'issue'),
    redundancy_or_low_value_content: _finalize(_redundancy(inner), 'recommended_fix', 'issue'),
    scattered_or_misplaced_evidence: _finalize(_scatteredEvidence(inner), 'recommended_fix', 'issue'),
    restructuring_recommendations: _finalize(_restructuring(inner), 'recommendation', 'recommendation'),
  };
}

module.exports = {
  buildDeckSynthesis,
  // exported for tests
  _passesSpecificity,
  _buildSlideIndex,
};
