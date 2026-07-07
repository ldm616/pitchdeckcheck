/**
 * Artifact-grounded slide evaluator (Milestone 1)
 *
 * Builds the slide-evaluation SYSTEM PROMPT from the product-owned artifacts
 * (model/01_section_question_map.md + model/scoring-rubric.md) instead of the
 * generic hardcoded RUBRIC_EVAL_PROMPT / DB v3 prompt.
 *
 * DEFAULT EVALUATION PATH:
 *   - This is the primary/default slide evaluator. Legacy v2/v3 prompts remain
 *     only as an internal emergency dead-path (EVALUATION_ARCHITECTURE env var).
 *   - Preserves the existing answers[] output schema exactly
 *     (question_id, score, assessment, gap, investor_impact, fix, confidence),
 *     so computeSlideScore, guardrails, and the canonical report are unaffected.
 *   - Preserves rubrics.js question ids/weights (they are the questions the
 *     model must answer; the artifact section supplies the investor lens).
 *   - If the slide type has no artifact section, or artifacts cannot be read,
 *     buildArtifactSlidePrompt() returns null so the caller falls back to the
 *     existing v2/v3 prompt.
 *
 * No LLM/network calls here — this only reads bundled markdown and returns a
 * prompt string. No v1 dependency.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARTIFACT_ARCHITECTURE = 'artifact';

// Slide inferred-type keys -> section headers in 01_section_question_map.md.
// Types without an entry (roadmap, contact, vision, appendix, other,
// investment_highlights, ...) have no artifact support and fall back.
const TYPE_TO_SECTION_HEADER = {
  cover: 'Cover',
  problem: 'Problem',
  solution: 'Solution',
  product: 'Product',
  why_now: 'Why Now',
  market: 'Market',
  market_opportunity: 'Market',
  business_model: 'Business Model',
  go_to_market: 'GTM',
  traction: 'Traction',
  competition: 'Competition',
  moat: 'Moat',
  team: 'Team',
  financials: 'Financials',
  ask: 'Ask',
  funding: 'Ask',
};

// --- artifact file access (small safe shim; does not modify the /lib loader) --

// Try several candidate roots so this resolves whether cwd is the repo root
// (Netlify functions + local scripts) or a subdirectory.
function _readArtifact(relPath) {
  const roots = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
    path.resolve(__dirname, '..', '..', '..', '..'),
  ];
  for (const root of roots) {
    const abs = path.join(root, relPath);
    try {
      if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
    } catch (_) {
      /* try next root */
    }
  }
  return null;
}

// --- section-map parsing (cached) ---------------------------------------------

let _sectionCache = null; // Map(headerLower -> section spec)

function _parseSectionMap(md) {
  const sections = new Map();
  if (!md) return sections;

  // Split into "## Header" blocks.
  const blocks = md.split(/\n(?=##\s+)/);
  for (const block of blocks) {
    const headerMatch = block.match(/^##\s+(.+?)\s*$/m);
    if (!headerMatch) continue;
    const header = headerMatch[1].trim();

    const spec = {
      header,
      primary_question: '',
      secondary_questions: [],
      visual_criterion: '',
      diagnostic_framing: '',
      fix_triggers: '',
    };

    const lines = block.split('\n');
    let collectingSecondary = false;
    for (const raw of lines) {
      const line = raw.trim();
      let m;
      if ((m = line.match(/^Primary question:\s*(.+)$/i))) {
        spec.primary_question = m[1].trim();
        collectingSecondary = false;
      } else if (/^Secondary questions:/i.test(line)) {
        collectingSecondary = true;
      } else if (collectingSecondary && line.startsWith('- ')) {
        spec.secondary_questions.push(line.slice(2).trim());
      } else if ((m = line.match(/visual criterion:\s*(.+)$/i))) {
        spec.visual_criterion = m[1].trim();
        collectingSecondary = false;
      } else if ((m = line.match(/^Free diagnostic framing:\s*(.+)$/i))) {
        spec.diagnostic_framing = m[1].trim();
        collectingSecondary = false;
      } else if ((m = line.match(/^Paid fix triggers:\s*(.+)$/i))) {
        spec.fix_triggers = m[1].trim();
        collectingSecondary = false;
      } else if (line === '') {
        collectingSecondary = false;
      }
    }

    if (spec.primary_question) sections.set(header.toLowerCase(), spec);
  }
  return sections;
}

function _getSections() {
  if (_sectionCache) return _sectionCache;
  const md = _readArtifact('model/01_section_question_map.md');
  _sectionCache = _parseSectionMap(md);
  return _sectionCache;
}

/**
 * Look up the artifact section spec for a slide inferred-type. Returns null when
 * the type has no artifact section (caller should fall back).
 */
function getArtifactSectionForType(slideType) {
  const header = TYPE_TO_SECTION_HEADER[String(slideType || '').toLowerCase()];
  if (!header) return null;
  const sections = _getSections();
  return sections.get(header.toLowerCase()) || null;
}

function hasArtifactSupport(slideType) {
  return getArtifactSectionForType(slideType) !== null;
}

// --- scoring expectations (cached) --------------------------------------------

let _scoringCache = null;

// Extract "N = Label" score-band lines from scoring-rubric.md when available.
function _extractScoreBands(md) {
  if (!md) return null;
  const bands = new Map();
  const re = /(?:^|\n)\s*[-*]?\s*([0-5])\s*[=:–—-]\s*([A-Za-z][^\n]*)/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const n = m[1];
    if (!bands.has(n)) bands.set(n, m[2].trim().replace(/[.;].*$/, '').trim());
  }
  return bands.size >= 3 ? bands : null;
}

function _getScoringExpectations() {
  if (_scoringCache) return _scoringCache;
  const md = _readArtifact('model/scoring-rubric.md');
  const bands = _extractScoreBands(md);
  // Fall back to the artifact's standard 1–5 band labels if extraction fails.
  const fallback = new Map([
    ['5', 'Excellent'],
    ['4', 'Strong'],
    ['3', 'Adequate'],
    ['2', 'Weak'],
    ['1', 'Very Weak'],
  ]);
  const use = bands || fallback;
  const lines = ['5', '4', '3', '2', '1']
    .filter((n) => use.has(n))
    .map((n) => `  ${n} = ${use.get(n)}`)
    .join('\n');
  _scoringCache = `Score each investor question 0–5 (integer):
${lines}
  0 = the question is not addressed at all
Reward specificity, credible evidence, and timing. Do not over-penalize a sparse
early-stage deck for missing late-stage polish; penalize only gaps that materially
block an investment judgment.`;
  return _scoringCache;
}

// --- prompt builder -----------------------------------------------------------

/**
 * Build the artifact-grounded system prompt for a slide type.
 * @param {string} slideType inferred type key (e.g. 'business_model')
 * @param {Array<{question_id?:string,id?:string,question:string}>} rubricQuestions
 *   the rubric questions (with ids) the model must answer — preserved verbatim.
 * @returns {string|null} system prompt, or null if no artifact support / read fail.
 */
function buildArtifactSlidePrompt(slideType, rubricQuestions) {
  let section;
  try {
    section = getArtifactSectionForType(slideType);
  } catch (_) {
    return null;
  }
  if (!section) return null;

  const secondary = section.secondary_questions.length
    ? section.secondary_questions.map((q) => `- ${q}`).join('\n')
    : '- (none listed)';

  const rubricList = (rubricQuestions || [])
    .map((q) => `- ${q.question_id || q.id}: ${q.question}`)
    .join('\n');

  const visualLine = section.visual_criterion
    ? `\nVisual criterion: ${section.visual_criterion}`
    : '';

  return `You are an expert venture investor evaluating ONE slide of a startup pitch deck.

You judge investor SIGNAL QUALITY — specificity, credibility, and evidence — not slide polish. Evaluate in two layers: (1) is this topic answered anywhere in the deck, and (2) does this specific slide contribute what it should?

FRAMEWORK SECTION: ${section.header}
Primary investor question: ${section.primary_question}
Secondary diagnostic questions:
${secondary}${visualLine}
Diagnostic framing: ${section.diagnostic_framing}
What a stronger answer would add: ${section.fix_triggers}

${_getScoringExpectations()}

INVESTOR QUESTIONS TO ANSWER (answer every one, keyed by its question_id):
${rubricList}

Use the primary and secondary questions above as the investor lens when scoring each question_id and writing each field.

Return STRICT JSON only, in this exact shape:
{
  "answers": [
    {
      "question_id": "<one of the ids above>",
      "score": 0,
      "assessment": "what the slide/deck actually shows for this question",
      "gap": "the specific missing proof, or 'None - criterion met'",
      "investor_impact": "the specific investment judgment affected (direct language; avoid 'may', 'might', 'could', 'raises questions')",
      "fix": "the concrete addition that would close the gap (use conditional 'If available...', 'If true...')",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
- Provide exactly one answer object per question_id listed above.
- score is an integer 0–5; do not use 0 or 1 if relevant content exists.
- Do not mention pattern names or internal rule names in the output.
- Output valid JSON with a top-level "answers" array and nothing else.`;
}

// Reset caches (used by tests).
function _resetArtifactCaches() {
  _sectionCache = null;
  _scoringCache = null;
}

module.exports = {
  ARTIFACT_ARCHITECTURE,
  TYPE_TO_SECTION_HEADER,
  getArtifactSectionForType,
  hasArtifactSupport,
  buildArtifactSlidePrompt,
  _parseSectionMap,
  _resetArtifactCaches,
};
