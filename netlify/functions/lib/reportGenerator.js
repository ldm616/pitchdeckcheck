/**
 * Report Generator
 *
 * ARCHITECTURE:
 * - generateFullReport() is the main generator that creates the full source-of-truth report
 * - deriveFreeReport() derives a limited free version from the full report
 *
 * The full report is the source of truth for all analysis.
 * The free report is a derived subset used for product packaging/monetization.
 *
 * Current optimization focus: full_report quality
 * - Detailed, insightful, actionable investor-grade feedback
 * - What is missing vs investor expectations
 * - Why each gap matters
 * - How to close each gap
 * - Investor reasoning patterns where relevant
 */

const OpenAI = require('openai')
const { setDeckStatus } = require('./supabase')
const {
  RUBRIC_VERSION,
  RUBRICS,
  SLIDE_WEIGHTS,
  computeSlideScore,
  computeDeckScore,
  computeDeckScoreV3,
  generateFallbackAnswers,
  sortByImportance,
  sortAnswersByImportance,
} = require('./rubrics')
const {
  loadEvaluationContext,
  getEvaluationArchitecture,
  detectRulePack,
  getPromptByType,
  formatRulesForPrompt,
  applyDeckContextFiltering,
} = require('./evaluationRulesLoader')
const { applySignalOverride } = require('./signalOverride')
// Deterministic Company Context stage inference (metadata; no scoring effect).
const { classifyCompanyContext } = require('./companyContextClassifier')
// Deterministic Investment Case synthesis (metadata; no scoring effect).
const { synthesizeInvestmentCase } = require('./investmentCaseSynthesizer')
// Canonical, artifact-based report engine. Builds the live report_v2 directly
// from rubric evaluations + company context + investment case — no v1_report.
const {
  buildCanonicalReport,
  buildCanonicalReportV2Sections,
} = require('./canonicalReport')
// Artifact-grounded slide evaluator — the default/primary evaluation path.
const { buildArtifactSlidePrompt } = require('./artifactEvaluator')
// Evaluation-failure guardrails: detect processing-error placeholder evaluations
// so infra failures never masquerade as legitimate deck weakness.
const {
  FAILED_ANALYSIS_MESSAGE,
  assessDeckFailure,
  stripForbiddenPlaceholders,
} = require('./evaluationFailure')

// A satisfied criterion ("None - criterion met" and variants) carries no real
// gap; such answers are normalized so downstream never treats them as missing.
const NO_GAP_ANSWER_RE = /^\s*none\b|criterion\s+(?:met|fully\s+met)|fully\s+met|no\s+gap|not\s+applicable|none\s+needed/i

// Report version for evaluation tracking (update when report structure/logic changes)
const REPORT_VERSION = 'report_v2.7'
const REPORT_VERSION_V3 = 'report_v3.0.0-draft'

// High-impact slide types for summary generation (ignore cover/contact)
const HIGH_IMPACT_TYPES = ['traction', 'market', 'team', 'problem', 'solution', 'business_model', 'financials', 'ask', 'go_to_market', 'product', 'competition']

/**
 * Deck-level investment thesis questions.
 * These evaluate the entire deck against core investor questions.
 */
const THESIS_QUESTIONS = {
  why_this_market: {
    question: 'Why is this the right market to pursue?',
    criteria: [
      'Is the market large enough for venture-scale outcomes?',
      'Is the market growing?',
      'Are there strong tailwinds or drivers?',
      'Is the pain urgent or economically meaningful?',
      'Is there evidence the opportunity is real and timely?',
    ],
    relevant_slides: ['market', 'problem', 'traction'],
  },
  why_this_product: {
    question: 'Why is this product likely to win?',
    criteria: [
      'Is the product significantly better than current alternatives?',
      'Is the value proposition clear and compelling?',
      'Are there current advantages competitors will find hard to copy?',
      'Are there future advantages or compounding moats?',
      'Is differentiation specific rather than generic?',
    ],
    relevant_slides: ['solution', 'product', 'competition'],
  },
  why_this_team: {
    question: 'Why is this the right team to build this?',
    criteria: [
      'Does the team have relevant domain expertise?',
      'Does the team have relevant product/technical expertise?',
      'Does the team have GTM or sales experience?',
      'Is there evidence of past success or credibility?',
      'Does team composition match what the business needs?',
    ],
    relevant_slides: ['team'],
  },
  why_now: {
    question: 'Why is now the right time for this?',
    criteria: [
      'Are there market or technology shifts creating this opportunity?',
      'Is there urgency or a window closing?',
      'Is there early traction validating timing?',
      'Are incumbents unable or unwilling to address this now?',
      'Is the market ready for this solution?',
    ],
    relevant_slides: ['problem', 'market', 'traction', 'solution'],
  },
}

/**
 * Prompt for deck-level investment thesis evaluation.
 */
const THESIS_EVAL_PROMPT = `You are an experienced early-stage startup investor evaluating a pitch deck at the thesis level. You are evaluating whether the FULL DECK answers the core investor questions that determine fundability.

This is NOT about individual slides. This is about whether the complete deck builds a convincing case for each thesis question.

For each thesis question, you must provide:
- score (0-5): How well the FULL DECK answers this question
- assessment: What evidence exists across the deck (be specific, cite slides)
- gaps: What is missing or unconvincing
- verdict: One-sentence investor takeaway

SCORING SCALE (0-5):
5 = Compelling answer with strong, specific evidence across the deck
4 = Good answer, minor gaps or areas that could be stronger
3 = Partial answer, meaningful gaps in the argument
2 = Weak answer, major gaps undermine the thesis
1 = Barely addressed across the deck
0 = Not addressed / no evidence found

SCORING DISCIPLINE:
- Most decks score 2-3 on thesis questions
- Score 5 is rare - requires exceptional evidence and clarity
- Evaluate the CUMULATIVE case across all slides, not individual slides
- A strong market slide with no traction is still a weak "why this market" answer

ASSESSMENT RULES:
- Reference specific slides and content
- Quote or paraphrase actual evidence when possible
- Be specific about what contributes to the thesis
- If evidence is scattered, note which slides contribute

GAP RULES:
- Identify what would make the thesis answer stronger
- Be specific about missing evidence or weak arguments
- If score is 5, gaps should be "None - thesis is well-supported"

VERDICT RULES:
- One sentence summary of how an investor would view this thesis element
- Be direct and honest
- Examples:
  - "The market opportunity is clear but timing justification is missing."
  - "Strong domain expertise but no evidence of GTM capability."
  - "Differentiation claims lack specificity - could apply to any competitor."

OUTPUT FORMAT:
Return ONLY valid JSON:

{
  "why_this_market": {
    "score": 3,
    "assessment": "The market slide (slide 4) shows a $2B TAM with growth projections. The problem slide (slide 2) establishes pain around manual processes. However, no bottom-up sizing or assumptions are visible.",
    "gaps": "Market size lacks supporting assumptions. No evidence of market timing or why this opportunity exists now vs. 5 years ago.",
    "verdict": "Market size is claimed but not defended - investors will question the methodology."
  },
  "why_this_product": {...},
  "why_this_team": {...},
  "why_now": {...}
}

REQUIREMENTS:
- Evaluate ALL four thesis questions
- Each must have: score, assessment, gaps, verdict
- Score must be integer 0-5
- Assessment must reference specific slides/content
- Be strict - most thesis elements score 2-3`

/**
 * Prompt for investor question evaluation with 0-5 scoring.
 * Each question gets: score, assessment, gap, investor_impact, fix, confidence.
 */
const RUBRIC_EVAL_PROMPT = `You are an expert venture investor evaluating a startup pitch deck.

Your job is to produce high-signal, non-generic, investor-grade analysis grounded in how real investors assess opportunities.

You are evaluating one slide, but you are also given broader deck context. Use both.

You are given:
- current slide number
- current slide type
- current slide extracted text
- full deck outline
- relevant rubric questions
- relevant investor reasoning patterns, if available

Investor reasoning patterns are internal calibration context derived from real investment memos. Use them to sharpen reasoning. Do not mention them, cite them, name them, or expose them.

---

## Core evaluation principle

Evaluate investor signal quality, not just modern pitch-deck completeness.

Do not treat missing modern metrics as automatically fatal if the deck clearly shows strong underlying investor signal.

Strong investor signal includes:
- clear problem
- simple solution
- strong why-now logic
- obvious behavior or infrastructure shift
- clear user pull or traction
- strong team-market fit
- clear competitive insight
- clear product insight

Penalize unclear thinking more than missing formatting.

---

## Sparse but high-signal deck rule

Some strong early decks are sparse.

If a deck is sparse but clearly communicates:
- what the company does
- why the problem matters
- why now
- why the solution is compelling
- why the team can execute
- evidence of early pull

Then do not over-penalize for lack of modern polish, full financials, CAC/LTV, or detailed GTM.

For sparse decks:
- reward clarity, insight, timing, and sharpness
- penalize only gaps that materially block investment judgment
- avoid checklist-style criticism

---

## Deck-aware evaluation rule

Evaluate each question in two layers:

1. Does the deck answer this investor question anywhere?
2. Does this specific slide appropriately contribute to answering it?

Do not penalize a slide for omitting detail that appears elsewhere in the deck.

If present elsewhere, say it is addressed elsewhere and reduce severity.

---

## Gap classification rule

Before writing any gap, classify it internally as one of:

1. slide_missing_but_present_elsewhere
2. weakly_supported_in_deck
3. truly_missing

Do not output these labels.

Reflect the classification in severity and tone.

---

## Pattern usage rule

Use investor reasoning patterns only when they naturally fit:
- company type
- business model
- slide content
- rubric question

Do not force patterns.

Patterns should sharpen reasoning, not distort it.

---

## Why-now rule

Treat the following as strong why-now evidence when visible:
- infrastructure adoption
- cost curves
- technology readiness
- platform shifts
- consumer behavior shifts
- regulatory or market structure changes
- new distribution mechanisms

If a slide shows a clear enabling change, score why-now/timing strongly even if it lacks numeric market sizing.

---

## Signal vs completeness rule

Do not downgrade purely because a deck lacks:
- CAC
- LTV
- detailed financials
- modern GTM plan
- polished design
- detailed market sizing

Downgrade only if the missing information blocks a real investor decision.

Example:
- Missing CAC in a modern paid-growth company is important.
- Missing CAC in a very early organic-growth consumer network is less important if traction or pull is otherwise visible.

---

## Investor impact rule

Every investor impact must answer:

"What specific investment judgment is blocked?"

Use direct language:
- "Investors cannot assess…"
- "Investors cannot determine…"
- "Investors cannot judge…"

Forbidden phrases:
- may
- might
- potentially
- could
- raises questions
- leaves questions
- this creates uncertainty

---

## Fix rule

Every fix must:
- directly close the gap
- be conditional
- specify the exact missing proof/input
- explain why that proof matters

Use:
- "If available…"
- "If true…"
- "If already tracked…"

Do not invent data or provide generic advice.

---

## Competition rule

When evaluating competition, assess:
- Are competitors identified?
- Are alternatives segmented by user/job?
- Are differentiators specific?
- Are advantages durable or easy to copy?

Do not treat first mover, ratings, or coverage as a moat unless persistence is explained.

---

## Cover/contact guardrail

For cover slides:
- If company name is visible, score company-name question 5.
- If tagline is present, score tagline question 5.
- Do not penalize cover slides for lacking detailed context.

For contact slides:
- If contact information is present, score contact question 5.

---

## Investment highlights rule

If slide type = investment_highlights:
- Do not evaluate normally
- Do not score
- Do not include in slide-by-slide analysis

---

## Scoring scale

5 = fully answers with strong visible signal
4 = strong answer, minor gaps
3 = partial answer, meaningful gaps
2 = weak answer, major gaps
1 = barely present
0 = absent

Rules:
- Do not use 0 or 1 if content exists.
- Do not assign low scores just because a sparse deck lacks modern details.
- Give credit for clear, concise, high-signal answers.

---

## Evidence discipline

Only use visible deck content and provided deck context.

Do not:
- invent metrics
- assume capabilities
- assume competitors
- assume traction quality beyond visible claims

If implied but not explicit, say "implied but not explicit."

---

## Confidence rule

high = clearly supported
medium = partially supported
low = sparse or ambiguous evidence

---

## Output format

Return strict JSON only:

{
  "answers": [
    {
      "question_id": "...",
      "score": 0,
      "assessment": "...",
      "gap": "...",
      "investor_impact": "...",
      "fix": "...",
      "confidence": "low"
    }
  ]
}

Rules:
- MUST include answers array
- Include all rubric questions
- No markdown
- No commentary outside JSON
- No pattern names
- Plain English
- Concise but specific

---

## No-gap rule

If score = 5:
- Gap: "None – criterion fully met"
- Investor Impact: "None – no investor friction"
- Fix: "None needed"

Never output:
- Unable to determine gap
- Unable to determine investor impact
- Unable to provide guidance

---

## Final self-check

Before returning:
- Did I evaluate signal, not just completeness?
- Did I avoid over-penalizing sparse but strong decks?
- Did I avoid forbidden phrases?
- Did every investor impact state a blocked judgment?
- Did every fix directly close the gap?
- Did I avoid hallucinating?
- Did I check if the deck answers this elsewhere?

If not, rewrite.`


/**
 * Fetch patterns relevant to a specific rubric question.
 * Returns array of pattern objects with name and description.
 */
async function getPatternsForQuestion(supabase, questionKey) {
  try {
    const { data, error } = await supabase
      .from('pattern_rubric_map')
      .select(`
        strength,
        patterns (
          id,
          pattern_key,
          name,
          description,
          category
        )
      `)
      .eq('question_key', questionKey)
      .order('strength', { ascending: false })

    if (error || !data) {
      return []
    }

    // Extract patterns and filter out nulls
    return data
      .map((d) => d.patterns)
      .filter(Boolean)
      .map((p) => ({
        name: p.name,
        description: p.description,
      }))
  } catch (err) {
    console.error(`Error fetching patterns for ${questionKey}:`, err.message)
    return []
  }
}

/**
 * Batch fetch patterns for multiple questions.
 * Returns a map of question_key -> patterns array.
 */
async function getPatternsForQuestions(supabase, questionKeys) {
  try {
    const { data, error } = await supabase
      .from('pattern_rubric_map')
      .select(`
        question_key,
        strength,
        patterns (
          id,
          pattern_key,
          name,
          description,
          category
        )
      `)
      .in('question_key', questionKeys)
      .order('strength', { ascending: false })

    if (error || !data) {
      return {}
    }

    // Group patterns by question_key
    const patternMap = {}
    for (const row of data) {
      if (!row.patterns) continue
      if (!patternMap[row.question_key]) {
        patternMap[row.question_key] = []
      }
      patternMap[row.question_key].push({
        name: row.patterns.name,
        description: row.patterns.description,
      })
    }

    return patternMap
  } catch (err) {
    console.error('Error fetching patterns batch:', err.message)
    return {}
  }
}

/**
 * Build compact deck outline for cross-slide context.
 * Keeps token usage low while providing enough context to avoid contradictions.
 */
function buildDeckOutline(slides) {
  return slides.map((s) => {
    // Truncate text to first 150 chars for context
    const textPreview = s.extracted_text
      ? s.extracted_text.slice(0, 150).replace(/\n/g, ' ').trim() + (s.extracted_text.length > 150 ? '...' : '')
      : '(empty)'
    return {
      slide: s.slide_number,
      type: s.inferred_type || 'other',
      preview: textPreview,
    }
  })
}

/**
 * Enforce phrase rules on investor_impact field.
 * Replaces awkward phrasing with clearer investor-centric language.
 *
 * Banned phrases (v3):
 * - "Investors cannot question" (nonsensical)
 * - "Investors cannot not" (double negative)
 * - "Investors cannot find it challenging" (awkward)
 * - "Investors cannot be concerned" (awkward)
 * - "Investors cannot doubt" (awkward)
 * - "Investors cannot overlook" (awkward)
 * - "Investors cannot receive" (nonsensical)
 *
 * Preferred alternatives:
 * - "Investors may question..."
 * - "Investors may not be able to..."
 * - "This may make it harder for investors to..."
 * - "This creates investor uncertainty around..."
 */
function enforcePhrasingRules(text) {
  if (!text) return text

  const forbiddenPatterns = [
    // Fix awkward "Investors cannot X" patterns
    { pattern: /investors cannot question/gi, replacement: 'Investors may question' },
    { pattern: /investors cannot not\b/gi, replacement: 'Investors may not be able to' },
    { pattern: /investors cannot find it challenging/gi, replacement: 'Investors may find it challenging' },
    { pattern: /investors cannot be concerned/gi, replacement: 'Investors may be concerned' },
    { pattern: /investors cannot doubt/gi, replacement: 'Investors may question' },
    { pattern: /investors cannot overlook/gi, replacement: 'Investors may overlook' },
    { pattern: /investors cannot receive/gi, replacement: 'Investors may not receive' },
    { pattern: /investors cannot see/gi, replacement: 'Investors may not see' },
    { pattern: /investors cannot understand/gi, replacement: 'Investors may struggle to understand' },
    { pattern: /investors cannot determine/gi, replacement: 'Investors may not be able to determine' },
    { pattern: /investors cannot assess/gi, replacement: 'Investors may not be able to assess' },
    { pattern: /investors cannot evaluate/gi, replacement: 'Investors may struggle to evaluate' },
    { pattern: /investors cannot judge/gi, replacement: 'Investors may struggle to judge' },
    { pattern: /investors cannot verify/gi, replacement: 'Investors may not be able to verify' },
    { pattern: /investors cannot confirm/gi, replacement: 'Investors may not be able to confirm' },

    // Fix vague patterns - now use clearer language
    { pattern: /this may\b/gi, replacement: 'This makes it harder for investors to' },
    { pattern: /this might\b/gi, replacement: 'This makes it harder for investors to' },
    { pattern: /this could\b/gi, replacement: 'This may make it harder for investors to' },
    { pattern: /this potentially\b/gi, replacement: 'This may make it harder for investors to' },

    // Fix "creates uncertainty" patterns
    { pattern: /this creates uncertainty/gi, replacement: 'This creates investor uncertainty around' },
    { pattern: /this creates investor uncertainty around around/gi, replacement: 'This creates investor uncertainty around' },

    // Fix question-raising patterns
    { pattern: /raises questions/gi, replacement: 'may cause investors to question' },
    { pattern: /leaves questions/gi, replacement: 'leaves investors uncertain about' },
    { pattern: /raises concerns/gi, replacement: 'may concern investors regarding' },
    { pattern: /leaves uncertainty/gi, replacement: 'creates investor uncertainty about' },

    // Clean up any double spaces created by replacements
    { pattern: /  +/g, replacement: ' ' },
  ]

  let result = text
  for (const { pattern, replacement } of forbiddenPatterns) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Apply phrase enforcement to all answers.
 */
function enforceAnswerPhrasing(answers) {
  return answers.map((a) => ({
    ...a,
    investor_impact: enforcePhrasingRules(a.investor_impact),
  }))
}

/**
 * Apply cover/contact scoring guardrails.
 *
 * For cover slides:
 * - If company name is visible (text length > 0), score company-name questions as 5
 * - If tagline is present, score tagline questions as 5
 *
 * For contact slides:
 * - If contact info is present, score contact questions as 5
 *
 * This ensures these simple slides aren't penalized for lacking detailed context.
 */
function applyCoverContactGuardrails(answers, slideType, extractedText) {
  if (!answers || answers.length === 0) return answers

  const hasContent = extractedText && extractedText.trim().length > 0

  if (slideType === 'cover' && hasContent) {
    return answers.map((a) => {
      const qLower = (a.question_id || '').toLowerCase()
      // Company name and tagline questions should get 5 if content exists
      if (qLower.includes('company') || qLower.includes('name') || qLower.includes('tagline') || qLower.includes('title')) {
        return {
          ...a,
          score: 5,
          assessment: 'Company name/tagline clearly visible on cover slide.',
          gap: 'None – criterion fully met',
          investor_impact: 'None – no investor friction',
          fix: 'None needed',
          confidence: 'high',
        }
      }
      return a
    })
  }

  if (slideType === 'contact' && hasContent) {
    return answers.map((a) => {
      const qLower = (a.question_id || '').toLowerCase()
      // Contact information questions should get 5 if content exists
      if (qLower.includes('contact') || qLower.includes('email') || qLower.includes('phone') || qLower.includes('info')) {
        return {
          ...a,
          score: 5,
          assessment: 'Contact information is present on contact slide.',
          gap: 'None – criterion fully met',
          investor_impact: 'None – no investor friction',
          fix: 'None needed',
          confidence: 'high',
        }
      }
      return a
    })
  }

  return answers
}

/**
 * Check if deck has strong core investor signals.
 *
 * Strong signal slides: problem, solution, team, traction
 * A slide has strong signal if average score >= 3.5
 *
 * Returns true if 3+ of these core signal slides are strong.
 */
function hasSparseHighSignal(slideEvaluations) {
  const SIGNAL_SLIDE_TYPES = ['problem', 'solution', 'team', 'traction']
  let strongSignalCount = 0

  for (const slide of slideEvaluations) {
    if (SIGNAL_SLIDE_TYPES.includes(slide.type)) {
      const scores = slide.questions.map((q) => q.score)
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      if (avgScore >= 3.5) {
        strongSignalCount++
      }
    }
  }

  return strongSignalCount >= 3
}

/**
 * Apply grade calibration cap with sparse-high-signal exception.
 *
 * If BOTH conditions are true:
 * - 3 or more core slides have average score < 3.0
 * - AND no slide (except traction or market) has score >= 4.5
 *
 * Then cap overall grade at B- (max 3.4/5 equivalent).
 *
 * EXCEPTION (sparse-high-signal calibration):
 * If deck has strong problem/solution/team/traction signals (3+ of these with avg >= 3.5),
 * do not allow missing modern detail (GTM, financials) alone to push grade below C+.
 */
function applyGradeCalibrationCap(deckScoreResult, slideEvaluations) {
  const CORE_SLIDE_TYPES = ['problem', 'solution', 'product', 'competition', 'business_model', 'go_to_market', 'financials']
  const EXEMPT_FROM_HIGH_SCORE_CHECK = ['traction', 'market']
  const GRADE_CAP_SCORE = 3.4
  const GRADE_CAP = 'B'
  const SPARSE_HIGH_SIGNAL_FLOOR_SCORE = 2.75 // C+ equivalent
  const SPARSE_HIGH_SIGNAL_FLOOR_GRADE = 'C'

  // Count core slides with average score < 3.0
  let weakCoreSlideCount = 0
  for (const slide of slideEvaluations) {
    if (CORE_SLIDE_TYPES.includes(slide.type)) {
      // Calculate average score from questions
      const scores = slide.questions.map((q) => q.score)
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      if (avgScore < 3.0) {
        weakCoreSlideCount++
      }
    }
  }

  // Check if any non-exempt slide has score >= 4.5
  let hasHighScoringSlide = false
  for (const slide of slideEvaluations) {
    if (!EXEMPT_FROM_HIGH_SCORE_CHECK.includes(slide.type)) {
      const scores = slide.questions.map((q) => q.score)
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      if (avgScore >= 4.5) {
        hasHighScoringSlide = true
        break
      }
    }
  }

  // Check for sparse-high-signal deck
  const isSparseHighSignal = hasSparseHighSignal(slideEvaluations)

  // Sparse-high-signal calibration: ensure floor of C+ even with weak modern slides
  if (isSparseHighSignal && deckScoreResult.deckScore < SPARSE_HIGH_SIGNAL_FLOOR_SCORE) {
    console.log(`Sparse-high-signal floor applied: lifting grade to C+ minimum`)
    return {
      ...deckScoreResult,
      deckScore: SPARSE_HIGH_SIGNAL_FLOOR_SCORE,
      overallGrade: SPARSE_HIGH_SIGNAL_FLOOR_GRADE,
      gradeCapped: false,
      sparseHighSignalFloor: true,
    }
  }

  // Apply cap if conditions met (but not for sparse-high-signal decks)
  if (weakCoreSlideCount >= 3 && !hasHighScoringSlide && !isSparseHighSignal) {
    console.log(`Grade cap applied: ${weakCoreSlideCount} weak core slides, no high-scoring non-exempt slides`)
    return {
      ...deckScoreResult,
      deckScore: Math.min(deckScoreResult.deckScore, GRADE_CAP_SCORE),
      overallGrade: deckScoreResult.deckScore > GRADE_CAP_SCORE ? GRADE_CAP : deckScoreResult.overallGrade,
      gradeCapped: true,
    }
  }

  return { ...deckScoreResult, gradeCapped: false }
}

/**
 * Evaluate a single slide against its investor questions with deck context.
 * Fetches relevant patterns to enhance gap/fix reasoning.
 *
 * When evalContext is provided (v3 mode), uses DB-loaded prompts if available.
 *
 * @param {Object} openai - OpenAI client
 * @param {Object} supabase - Supabase client
 * @param {Object} slide - Slide object with extracted_text, inferred_type, slide_number
 * @param {Object[]} rubric - Array of rubric questions for this slide type
 * @param {Object[]} deckOutline - Compact deck outline for cross-slide context
 * @param {Object|null} evalContext - v3 evaluation context with promptVersions (optional)
 */
async function evaluateSlide(openai, supabase, slide, rubric, deckOutline, evalContext = null, architecture = null) {
  // Sort questions by importance for display
  const sortedRubric = sortByImportance(rubric)

  // Fetch patterns for all questions in this rubric
  const questionKeys = sortedRubric.map((q) => q.id)
  const patternMap = await getPatternsForQuestions(supabase, questionKeys)

  // Build questions array with patterns
  const questions = sortedRubric.map((q) => {
    const patterns = patternMap[q.id] || []
    return {
      question_id: q.id,
      question: q.question,
      patterns: patterns.length > 0 ? patterns : undefined,
    }
  })

  // Build pattern context section if any patterns exist
  const hasPatterns = questions.some((q) => q.patterns && q.patterns.length > 0)
  let patternContext = ''
  if (hasPatterns) {
    patternContext = `

INVESTOR REASONING PATTERNS (use to improve gap/fix quality):
${questions
  .filter((q) => q.patterns && q.patterns.length > 0)
  .map((q) => {
    const patternList = q.patterns
      .map((p) => `  - ${p.name}: ${p.description}`)
      .join('\n')
    return `For "${q.question}":\n${patternList}`
  })
  .join('\n\n')}

Use these patterns to explain WHY gaps matter and HOW to address them. Do NOT mention pattern names in output.`
  }

  const userMessage = `CURRENT SLIDE:
Type: ${slide.inferred_type}
Number: ${slide.slide_number}

EXTRACTED TEXT:
${slide.extracted_text || '(No text extracted)'}

DECK OUTLINE (for cross-slide context):
${JSON.stringify(deckOutline, null, 2)}

INVESTOR QUESTIONS TO EVALUATE:
${JSON.stringify(
  questions.map((q) => ({ question_id: q.question_id, question: q.question })),
  null,
  2
)}${patternContext}

Evaluate each question. Include assessment, gap, investor_impact, fix, and confidence for each.`

  // PRIMARY PATH: build the system prompt from the product-owned section map
  // (artifact-native evaluation). This is the default for all slide types that
  // have an artifact section. Slides without a section (e.g. roadmap, contact)
  // fall back to the hardcoded prompt below.
  //
  // The legacy v2 (hardcoded) / v3 (DB prompt) paths are EMERGENCY dead-paths
  // only, selected via the EVALUATION_ARCHITECTURE env var.
  // TODO: retire the legacy v2/v3 prompt code once artifact is fully calibrated.
  let systemPrompt = RUBRIC_EVAL_PROMPT
  let promptSource = 'hardcoded'

  const legacyEmergency = architecture === 'v2' || architecture === 'v3'
  if (!legacyEmergency) {
    try {
      const artifactPrompt = buildArtifactSlidePrompt(slide.inferred_type, questions)
      if (artifactPrompt) {
        systemPrompt = artifactPrompt
        promptSource = 'artifact'
      }
    } catch (artifactErr) {
      console.error(`Artifact prompt build failed for slide ${slide.slide_number}:`, artifactErr.message)
    }
  }

  // Emergency v3 only: DB-loaded slide-analysis prompt.
  if (promptSource === 'hardcoded' && evalContext && evalContext.promptVersions && evalContext.promptVersions.length > 0) {
    const dbPrompt = getPromptByType(evalContext.promptVersions, 'slide_analysis')
    if (dbPrompt && dbPrompt.promptText) {
      systemPrompt = dbPrompt.promptText
      promptSource = 'database'
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)

    if (!Array.isArray(result.answers)) {
      throw new Error('Invalid answers array in response')
    }

    // Validate and normalize answers
    const validatedAnswers = result.answers.map((a) => {
      const score = Math.min(5, Math.max(0, Math.round(a.score) || 0))
      // Validate confidence - default based on score if invalid
      let confidence = a.confidence
      if (!['high', 'medium', 'low'].includes(confidence)) {
        confidence = score === 0 ? 'low' : score >= 4 ? 'high' : 'medium'
      }
      let gap = a.gap || 'Unable to determine gap.'
      let investorImpact = a.investor_impact || 'Unable to determine investor impact.'
      let fix = a.fix || 'Unable to provide guidance.'
      // Normalize "criterion met" answers so a satisfied criterion never carries
      // a stray optional fix or investor-impact that downstream could read as a
      // missing-evidence signal.
      if (NO_GAP_ANSWER_RE.test(gap)) {
        gap = 'None - criterion met'
        fix = 'None needed'
        investorImpact = 'None - no investor friction'
      }
      return {
        question_id: a.question_id,
        score,
        assessment: a.assessment || 'Unable to assess.',
        gap,
        investor_impact: investorImpact,
        fix,
        confidence,
      }
    })

    // Sort by importance
    const sortedAnswers = sortAnswersByImportance(validatedAnswers, rubric)

    // Apply phrase enforcement to investor_impact fields
    const enforcedAnswers = enforceAnswerPhrasing(sortedAnswers)

    // Apply cover/contact scoring guardrails
    const guardrailedAnswers = applyCoverContactGuardrails(
      enforcedAnswers,
      slide.inferred_type,
      slide.extracted_text
    )

    // Build debug info for v3
    const debug = evalContext ? {
      prompt_source: promptSource,
      system_prompt_preview: systemPrompt.slice(0, 1500) + (systemPrompt.length > 1500 ? '...' : ''),
      user_prompt_preview: userMessage.slice(0, 1000) + (userMessage.length > 1000 ? '...' : ''),
      system_prompt_length: systemPrompt.length,
      user_prompt_length: userMessage.length,
    } : null

    return { success: true, answers: guardrailedAnswers, debug }
  } catch (err) {
    console.error(`Slide ${slide.slide_number} evaluation error:`, err.message)
    return { success: false, answers: generateFallbackAnswers(rubric), debug: null }
  }
}

/**
 * Evaluate deck-level investment thesis questions.
 * Synthesizes evidence from all slides to answer core investor questions.
 *
 * When evalContext is provided (v3 mode), uses DB-loaded prompts if available.
 *
 * @param {Object} openai - OpenAI client
 * @param {Object[]} slides - Array of slide objects
 * @param {Object[]} slideEvaluations - Array of evaluated slide results
 * @param {Object|null} evalContext - v3 evaluation context with promptVersions (optional)
 */
async function evaluateInvestmentThesis(openai, slides, slideEvaluations, evalContext = null) {
  // Build comprehensive deck content for thesis evaluation
  const deckContent = slides.map((slide) => {
    const evaluation = slideEvaluations.find((e) => e.slide_number === slide.slide_number)
    return {
      slide_number: slide.slide_number,
      type: slide.inferred_type || 'other',
      extracted_text: slide.extracted_text || '(empty)',
      grade: evaluation?.grade || 'N/A',
    }
  })

  // Build thesis questions context
  const thesisContext = Object.entries(THESIS_QUESTIONS).map(([key, config]) => ({
    key,
    question: config.question,
    criteria: config.criteria,
    relevant_slides: config.relevant_slides,
  }))

  const userMessage = `FULL DECK CONTENT:
${deckContent.map((s) => `--- Slide ${s.slide_number} (${s.type}, Grade: ${s.grade}) ---
${s.extracted_text}
`).join('\n')}

THESIS QUESTIONS TO EVALUATE:
${JSON.stringify(thesisContext, null, 2)}

For each thesis question, evaluate how well the COMPLETE DECK answers it. Look across ALL relevant slides and synthesize the evidence.`

  // Determine which prompt to use: DB (v3) or hardcoded (v2)
  let systemPrompt = THESIS_EVAL_PROMPT
  let promptSource = 'hardcoded'

  if (evalContext && evalContext.promptVersions && evalContext.promptVersions.length > 0) {
    const dbPrompt = getPromptByType(evalContext.promptVersions, 'deck_analysis')
    if (dbPrompt && dbPrompt.promptText) {
      systemPrompt = dbPrompt.promptText
      promptSource = 'database'
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const result = JSON.parse(content)

    // Validate and normalize each thesis answer
    const thesis = {}
    for (const key of Object.keys(THESIS_QUESTIONS)) {
      const answer = result[key] || {}
      thesis[key] = {
        question: THESIS_QUESTIONS[key].question,
        score: Math.min(5, Math.max(0, Math.round(answer.score) || 0)),
        assessment: answer.assessment || 'Unable to evaluate thesis element.',
        gaps: answer.gaps || 'Unable to determine gaps.',
        verdict: answer.verdict || 'Unable to provide verdict.',
      }
    }

    // Build debug info for v3
    const debug = evalContext ? {
      prompt_source: promptSource,
      system_prompt_preview: systemPrompt.slice(0, 1500) + (systemPrompt.length > 1500 ? '...' : ''),
      user_prompt_preview: userMessage.slice(0, 1000) + (userMessage.length > 1000 ? '...' : ''),
      system_prompt_length: systemPrompt.length,
      user_prompt_length: userMessage.length,
    } : null

    return { success: true, thesis, debug }
  } catch (err) {
    console.error('Investment thesis evaluation error:', err.message)

    // Return fallback thesis
    const fallbackThesis = {}
    for (const key of Object.keys(THESIS_QUESTIONS)) {
      fallbackThesis[key] = {
        question: THESIS_QUESTIONS[key].question,
        score: 0,
        assessment: 'Evaluation failed due to processing error.',
        gaps: 'Unable to evaluate - please regenerate report.',
        verdict: 'Unable to assess this thesis element.',
      }
    }

    return { success: false, thesis: fallbackThesis, debug: null }
  }
}

/**
 * Generate recommended investment highlights based on deck strengths.
 * Returns 4-6 bullet points highlighting the strongest signals from the deck.
 *
 * Focus on high-impact slides (traction, market, team, problem, solution) where
 * the deck shows genuine strength (score >= 4 on important questions).
 */
// Caveat language that disqualifies a signal from the positive-only investment
// highlights. Caveats belong in gaps / priority improvements / questions.
const HIGHLIGHT_CAVEAT_RE = /\b(however|but|lacks?|missing|without|not provided|unclear|though|although)\b/i

// Weak "criterion satisfied" signals that are not investor-exciting highlights
// (product stage clear, name/tagline/contact present, assumptions visible, slide
// clarity/presentation). These get filtered out of the highlights.
const WEAK_HIGHLIGHT_RE = /\b(stage of the product|product stage|implicitly clear|company name|tagline|contact info|assumptions? (?:are |is )?(?:visible|shown|present)|clearly (?:presented|labeled|labelled|laid out|organized|organised|structured)|easy to (?:read|understand|follow)|well[- ](?:organized|organised|structured|laid out)|legible|readable|(?:is|are) present on the (?:cover|slide)|criterion (?:met|fully met))\b/i

function generateRecommendedInvestmentHighlights(slideEvaluations, investmentThesis) {
  const highlights = []

  // Priority order for investment highlights
  const priorityOrder = ['traction', 'market', 'team', 'problem', 'solution', 'business_model', 'product', 'competition']

  // Collect strong signals from slides
  for (const slideType of priorityOrder) {
    const slide = slideEvaluations.find((s) => s.type === slideType)
    if (!slide) continue

    // Find high-scoring questions (score >= 4) for this slide
    const strongQuestions = slide.questions.filter((q) => q.score >= 4 && q.confidence !== 'low')

    for (const q of strongQuestions) {
      // Extract key insight from assessment. Skip caveated statements and weak
      // "criterion satisfied" signals — highlights are positive investor signals.
      if (
        q.assessment &&
        q.assessment !== 'Not addressed in slide' &&
        !HIGHLIGHT_CAVEAT_RE.test(q.assessment) &&
        !WEAK_HIGHLIGHT_RE.test(q.assessment)
      ) {
        highlights.push({
          category: slideType,
          signal: q.assessment,
          score: q.score,
          source: 'slide',
        })
      }
    }
  }

  // Add strong thesis elements (score >= 4), positive-only.
  if (investmentThesis) {
    for (const [key, thesis] of Object.entries(investmentThesis)) {
      if (thesis.score >= 4 && thesis.verdict && !HIGHLIGHT_CAVEAT_RE.test(thesis.verdict) && !WEAK_HIGHLIGHT_RE.test(thesis.verdict)) {
        highlights.push({
          category: key.replace('why_', '').replace('_', ' '),
          signal: thesis.verdict,
          score: thesis.score,
          source: 'thesis',
        })
      }
    }
  }

  // Sort by score descending, then by priority order
  highlights.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const aPriority = priorityOrder.indexOf(a.category)
    const bPriority = priorityOrder.indexOf(b.category)
    return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority)
  })

  // Take top 4-6 highlights
  const topHighlights = highlights.slice(0, 6)

  // If we have fewer than 4 highlights, we don't have enough strong signals
  if (topHighlights.length < 4) {
    return {
      bullets: [],
      note: 'The deck does not have enough strong signals to generate recommended investment highlights. Focus on strengthening traction, market, team, and problem/solution slides first.',
    }
  }

  // Format as bullets with category labels
  const bullets = topHighlights.map((h) => ({
    category: h.category,
    text: h.signal,
  }))

  return {
    bullets,
    note: 'These highlights are based on the strongest signals found in the deck. Use them as a starting point for your investment highlights slide.',
  }
}

/**
 * Generate deterministic summary based on weighted slide scores.
 * Ignores cover/contact slides. Identifies strongest signal and main friction
 * from high-impact slides only.
 */
function generateDeterministicSummary(slideEvaluations, overallGrade, deckScore) {
  // Filter to high-impact slides only
  const impactSlides = slideEvaluations.filter(
    (s) => HIGH_IMPACT_TYPES.includes(s.type) && SLIDE_WEIGHTS[s.type] > 0
  )

  if (impactSlides.length === 0) {
    return `This deck received an overall grade of ${overallGrade}. The deck lacks standard investor slides (problem, solution, market, traction, team, etc.), making it difficult to assess investor-readiness.`
  }

  // Find strongest slide (highest normalized score among high-weight slides)
  const sortedByStrength = [...impactSlides].sort((a, b) => {
    const weightA = SLIDE_WEIGHTS[a.type] ?? 0.5
    const weightB = SLIDE_WEIGHTS[b.type] ?? 0.5
    // Sort by normalized score first, then by weight
    if (b.normalized_score !== a.normalized_score) {
      return b.normalized_score - a.normalized_score
    }
    return weightB - weightA
  })

  // Find weakest slide (lowest normalized score among high-weight slides)
  const sortedByWeakness = [...impactSlides].sort((a, b) => {
    const weightA = SLIDE_WEIGHTS[a.type] ?? 0.5
    const weightB = SLIDE_WEIGHTS[b.type] ?? 0.5
    // Sort by normalized score first (ascending), then by weight (descending for higher impact)
    if (a.normalized_score !== b.normalized_score) {
      return a.normalized_score - b.normalized_score
    }
    return weightB - weightA
  })

  const strongestSlide = sortedByStrength[0]
  const weakestSlide = sortedByWeakness[0]

  // Get the top-scoring question from strongest slide
  const strongQuestions = strongestSlide.questions.filter((q) => q.score >= 4)
  const strongSignal = strongQuestions.length > 0
    ? strongQuestions[0].assessment
    : `The ${strongestSlide.type} slide is relatively well-presented`

  // Get the lowest-scoring question from weakest slide
  const weakQuestions = weakestSlide.questions.filter((q) => q.score <= 2)
  const weakSignal = weakQuestions.length > 0
    ? weakQuestions[0].gap
    : `The ${weakestSlide.type} slide has gaps that need addressing`

  // Grade interpretation
  let gradeInterpretation
  if (overallGrade === 'A') {
    gradeInterpretation = 'investor-ready with strong fundamentals'
  } else if (overallGrade === 'B') {
    gradeInterpretation = 'solid but has specific gaps to address'
  } else if (overallGrade === 'C') {
    gradeInterpretation = 'partially developed with meaningful gaps'
  } else if (overallGrade === 'D') {
    gradeInterpretation = 'weak and needs significant work'
  } else {
    gradeInterpretation = 'incomplete and not ready for investor review'
  }

  // Build summary following the required format
  const summary = `The strongest positive signal is the ${strongestSlide.type} content: ${strongSignal}. The biggest investor friction is in the ${weakestSlide.type} slide: ${weakSignal}. Overall, the deck is ${gradeInterpretation} (${overallGrade}, ${deckScore.toFixed(2)}/5.0).`

  return summary
}

/**
 * Derive free report from the full report.
 *
 * The free report is a LIMITED SUBSET of the full report for product packaging.
 * It does NOT call OpenAI, rescore, or create independent feedback.
 *
 * Shows: question, score, assessment, gap, investor_impact
 * Hides: fix (reserved for paid report)
 *
 * @param {Object} fullReport - The complete full_report object
 * @returns {Object} - The derived free_report subset
 */
function deriveFreeReport(fullReport) {
  // Collect biggest issues (lowest scoring questions from high-weight slides)
  const allIssues = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue

    for (const q of slide.questions) {
      if (q.score <= 2) {
        allIssues.push({
          question: q.question,
          score: q.score,
          assessment: q.assessment,
          gap: q.gap,
          investor_impact: q.investor_impact,
          slide_type: slide.type,
          slide_number: slide.slide_number,
          slide_weight: weight,
        })
      }
    }
  }

  // Sort by slide weight (higher first), then by score (lower first)
  allIssues.sort((a, b) => {
    if (b.slide_weight !== a.slide_weight) return b.slide_weight - a.slide_weight
    return a.score - b.score
  })

  // Top 3 biggest issues
  const topIssues = allIssues.slice(0, 3).map((issue) => ({
    question: issue.question,
    score: issue.score,
    assessment: issue.assessment,
    gap: issue.gap,
    investor_impact: issue.investor_impact,
    slide_type: issue.slide_type,
    priority: issue.slide_weight >= 1.2 ? 'high' : issue.slide_weight >= 0.8 ? 'medium' : 'low',
  }))

  // Collect strengths (highest scoring questions from high-weight slides)
  const allStrengths = []
  for (const slide of fullReport.slides) {
    const weight = SLIDE_WEIGHTS[slide.type] ?? 0.5
    if (weight === 0) continue

    for (const q of slide.questions) {
      if (q.score >= 4) {
        allStrengths.push({
          question: q.question,
          score: q.score,
          assessment: q.assessment,
          slide_type: slide.type,
          slide_weight: weight,
        })
      }
    }
  }

  allStrengths.sort((a, b) => {
    if (b.slide_weight !== a.slide_weight) return b.slide_weight - a.slide_weight
    return b.score - a.score
  })

  const topStrengths = allStrengths.slice(0, 3).map((s) => ({
    question: s.question,
    score: s.score,
    assessment: s.assessment,
    slide_type: s.slide_type,
  }))

  // Slide notes: show investor_impact for low-scoring slides
  const slideNotes = fullReport.slides.map((slide) => {
    const lowScoring = slide.questions.filter((q) => q.score <= 2)
    const topGap = lowScoring[0]

    let note
    if (slide.grade === 'A') {
      note = 'Strong slide. Meets investor expectations.'
    } else if (slide.grade === 'B') {
      note = 'Good foundation. Minor gaps remain.'
    } else if (topGap) {
      // Include investor impact in the note for context
      note = topGap.investor_impact || topGap.gap
    } else {
      note = 'Needs improvement to meet investor expectations.'
    }

    return {
      slide_number: slide.slide_number,
      inferred_type: slide.type,
      grade: slide.grade,
      normalized_score: slide.normalized_score,
      note,
    }
  })

  return {
    overall_grade: fullReport.overall_grade,
    deck_score: fullReport.deck_score,
    summary: fullReport.summary,
    strengths: topStrengths,
    biggest_issues: topIssues,
    slide_notes: slideNotes,
    upgrade_teaser: {
      title: 'Unlock the full report',
      bullets: [
        'Specific fixes for every gap identified',
        'Full question-by-question scoring breakdown',
        'Prioritized action items by investor impact',
        'Detailed assessment and evidence for each criterion',
      ],
    },
  }
}

/**
 * Generate the full investor-grade report, then derive the free subset.
 *
 * This is the main report generator. It:
 * 1. Fetches deck and slides
 * 2. Evaluates each slide against investor questions (with pattern context)
 * 3. Computes deterministic scores
 * 4. Evaluates deck-level investment thesis
 * 5. Builds the full_report (source of truth)
 * 6. Derives the free_report (limited subset)
 * 7. Stores both in reports.content
 *
 * The full report optimizes for detailed, insightful, actionable investor-grade feedback.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} deckId - Deck UUID
 * @returns {Object} - { success, reportId, overallGrade } or { success: false, error }
 */
async function generateFullReport(supabase, deckId) {
  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY environment variable')
    return { success: false, error: 'Server configuration error' }
  }

  // Fetch deck
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, slide_count')
    .eq('id', deckId)
    .single()

  if (deckError || !deck) {
    console.error('Deck lookup error:', deckError)
    return { success: false, error: 'Deck not found' }
  }

  // Fetch slides
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('slide_number, extracted_text, inferred_type')
    .eq('deck_id', deckId)
    .order('slide_number', { ascending: true })

  if (slidesError) {
    console.error('Slides lookup error:', slidesError)
    return { success: false, error: 'Failed to fetch slides' }
  }

  if (!slides || slides.length === 0) {
    return { success: false, error: 'No slides found for this deck' }
  }

  // Update deck status
  await setDeckStatus(supabase, deckId, 'generating_free', null)

  // Delete all existing reports for this deck
  const { error: deleteError } = await supabase
    .from('reports')
    .delete()
    .eq('deck_id', deckId)

  if (deleteError) {
    console.error('Failed to delete existing reports:', deleteError)
    // Continue anyway - not fatal
  }

  // Create new report row
  const { data: newReport, error: insertError } = await supabase
    .from('reports')
    .insert({
      deck_id: deckId,
      report_type: 'free',
      status: 'generating',
    })
    .select('id')
    .single()

  if (insertError || !newReport) {
    console.error('Failed to create report row:', insertError)
    return { success: false, error: 'Failed to create report' }
  }
  const reportId = newReport.id

  console.log(`Generating report for deck ${deckId}, report ${reportId}`)

  try {
    const openai = new OpenAI.default({ apiKey: openaiKey })

    // Build deck outline for cross-slide context
    const deckOutline = buildDeckOutline(slides)

    // ===== V3 Architecture: Load evaluation context =====
    // Use override from request header if provided, otherwise fall back to env
    const evalArchitecture = getEvaluationArchitecture()
    const archSource = 'env'
    console.log(`[eval] Using architecture: ${evalArchitecture} (${archSource})`)

    // Artifact-native evaluation is the default (evalArchitecture === 'artifact').
    // The v2 (hardcoded prompt) and v3 (DB rule packs/prompts, below) paths are
    // EMERGENCY dead-paths only, reachable via the EVALUATION_ARCHITECTURE env
    // var — they are not client-selectable.
    // TODO: retire the legacy v2/v3 evaluator paths once artifact is calibrated.
    let evalContext = null
    if (evalArchitecture === 'v3') {
      // Detect appropriate rule pack version based on deck characteristics
      const detectedVersionKey = detectRulePack({ slides, deckOutline })

      // Load evaluation context (rule pack + prompt versions from DB)
      evalContext = await loadEvaluationContext(supabase, {
        versionKey: detectedVersionKey,
        fallbackPackKey: 'modern_seed_deck',
        loadPrompts: true, // Load DB prompts for v3
        architectureOverride: evalArchitecture, // Pass the resolved architecture
      })

      // Apply deck context filtering to inject only relevant rules
      if (evalContext && evalContext.rulePack) {
        evalContext = applyDeckContextFiltering(evalContext, slides)
      }

      // Log prompt sources for debugging
      if (evalContext.promptVersionCount > 0) {
        const slidePrompt = getPromptByType(evalContext.promptVersions, 'slide_analysis')
        const deckPrompt = getPromptByType(evalContext.promptVersions, 'deck_analysis')
        console.log(`[v3] Prompts loaded: slide_analysis=${slidePrompt ? 'DB' : 'hardcoded'}, deck_analysis=${deckPrompt ? 'DB' : 'hardcoded'}`)
      } else {
        console.log(`[v3] No DB prompts loaded - using hardcoded prompts`)
      }
    }
    // ===== End V3 Architecture block =====

    // Evaluate each slide
    const slideEvaluations = []
    const slideDebugInfo = [] // Collect debug info from each slide evaluation
    // Authoritative per-slide failure signal: slide_numbers whose evaluateSlide
    // call returned success:false (OpenAI error/timeout/parse failure). Unioned
    // downstream with placeholder-pattern detection for the failure guardrail.
    const evalFailedSlideNumbers = new Set()

    for (const slide of slides) {
      const slideType = slide.inferred_type || 'other'

      // Completely exclude investment_highlights from analysis and report
      // It's a summary slide that should not be evaluated or scored
      if (slideType === 'investment_highlights') {
        console.log(`Skipping slide ${slide.slide_number} (investment_highlights) - excluded from analysis`)
        continue
      }

      const rubric = RUBRICS[slideType] || RUBRICS.other

      console.log(`Evaluating slide ${slide.slide_number} (${slideType})...`)

      const result = await evaluateSlide(openai, supabase, slide, rubric, deckOutline, evalContext, evalArchitecture)
      const answers = result.answers

      // Record evaluation failure (fallback placeholders were returned).
      if (result.success === false) {
        evalFailedSlideNumbers.add(slide.slide_number)
      }

      // Capture debug info for v3
      if (result.debug && evalContext) {
        slideDebugInfo.push({
          slide_number: slide.slide_number,
          slide_type: slideType,
          ...result.debug,
        })
      }

      // Compute deterministic slide score (0-5 scale)
      const slideScoreResult = computeSlideScore(answers, rubric)

      // Build question array with full details
      const questionMap = {}
      for (const q of rubric) {
        questionMap[q.id] = q.question
      }

      const questions = answers.map((a) => ({
        question: questionMap[a.question_id] || a.question_id,
        score: a.score,
        assessment: a.assessment,
        gap: a.gap,
        investor_impact: a.investor_impact,
        fix: a.fix,
        confidence: a.confidence,
      }))

      slideEvaluations.push({
        slide_number: slide.slide_number,
        type: slideType,
        grade: slideScoreResult.grade,
        normalized_score: slideScoreResult.normalized,
        weighted_score: slideScoreResult.weightedScore,
        max_score: slideScoreResult.maxScore,
        questions,
      })
    }

    // ===== Evaluation-failure guardrail =====
    // Slide evaluations that fell back to processing-error placeholders are an
    // infrastructure failure, NOT investor critique. Detect them BEFORE any
    // scoring or synthesis so they can never masquerade as deck weakness.
    //   - major (>= MAJOR_FAILURE_RATIO of scored slides failed): do not build a
    //     normal report; return a failed-analysis state (existing 'failed' path).
    //   - partial (some failed): drop the failed slides so the rest score/synthesize
    //     normally; record reliability metadata for admin/diagnostics.
    const failureAssessment = assessDeckFailure(slideEvaluations, {
      knownFailedNumbers: evalFailedSlideNumbers,
    })
    console.log(
      `[eval-guardrail] scored=${failureAssessment.scoredCount} ` +
        `failed=${failureAssessment.failedCount} ` +
        `ratio=${failureAssessment.ratio} level=${failureAssessment.level}` +
        (failureAssessment.failedCount
          ? ` failed_slides=[${failureAssessment.failedSlideNumbers.join(', ')}]`
          : '')
    )

    if (failureAssessment.level === 'major') {
      // Major failure: refuse to publish a normal investor-readiness report.
      // Persist diagnostics for Admin/dev; surface a regenerate message to the
      // founder via the deck's existing 'failed' processing_status path.
      console.error(
        `[eval-guardrail] MAJOR evaluation failure for deck ${deckId} — ` +
          `${failureAssessment.failedCount}/${failureAssessment.scoredCount} slides failed. ` +
          `Not producing a scored report.`
      )
      await supabase
        .from('reports')
        .update({
          status: 'failed',
          generation_error: FAILED_ANALYSIS_MESSAGE,
          content: {
            analysis_failure: {
              reason: 'evaluation_failure',
              message: FAILED_ANALYSIS_MESSAGE,
              scored_slides: failureAssessment.scoredCount,
              failed_slides: failureAssessment.failedCount,
              failed_slide_numbers: failureAssessment.failedSlideNumbers,
              failure_ratio: failureAssessment.ratio,
              generated_at: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      return { success: false, error: FAILED_ANALYSIS_MESSAGE }
    }

    // Partial failure: exclude the failed slides from all scoring and synthesis
    // (mutating the const array's contents so every downstream reference sees the
    // filtered set). Their placeholder strings therefore never reach
    // slide_level_feedback, dashboard_feedback, investment_case,
    // priority_improvements, suggested_next_steps, or deck_synthesis.
    let analysisReliability = null
    if (failureAssessment.level === 'partial') {
      const failedSet = new Set(failureAssessment.failedSlideNumbers)
      const kept = slideEvaluations.filter((se) => !failedSet.has(se.slide_number))
      console.warn(
        `[eval-guardrail] PARTIAL evaluation failure for deck ${deckId} — ` +
          `excluding ${failureAssessment.failedCount} failed slide(s) ` +
          `[${failureAssessment.failedSlideNumbers.join(', ')}] from scoring/synthesis.`
      )
      slideEvaluations.length = 0
      slideEvaluations.push(...kept)
      analysisReliability = {
        status: 'partial',
        message:
          'Some slides could not be evaluated and were excluded from this analysis. Regenerate for a complete report.',
        scored_slides: failureAssessment.scoredCount,
        evaluated_slides: kept.length,
        failed_slides: failureAssessment.failedCount,
        failed_slide_numbers: failureAssessment.failedSlideNumbers,
        failure_ratio: failureAssessment.ratio,
      }
    }
    // ===== End evaluation-failure guardrail =====

    // ===== V3 Signal Override Layer =====
    // Post-rubric adjustment that detects when underlying investor signal
    // is stronger than raw rubric deductions imply
    let signalOverrideDebug = null
    let finalSlideEvaluations = slideEvaluations

    console.log(`[SIGNAL-OVERRIDE-INTEGRATION] evalArchitecture="${evalArchitecture}"`)

    // ALWAYS run signal override for v3 - force isSeedConsumerNetwork=true for now
    // to ensure fix suppression works while we verify the system
    if (evalArchitecture === 'v3') {
      console.log('[SIGNAL-OVERRIDE-INTEGRATION] Entering v3 signal override block')

      try {
        // For v3, always treat as seed consumer/network to enable fix suppression
        // This ensures CAC/LTV/retention/moat recommendations are suppressed
        const isSeedConsumerNetwork = true // Force enabled for v3

        console.log(`[SIGNAL-OVERRIDE-INTEGRATION] Calling applySignalOverride with ${slides.length} slides`)

        const overrideResult = applySignalOverride(slides, slideEvaluations, {
          isSeedConsumerNetwork,
        })

        console.log(`[SIGNAL-OVERRIDE-INTEGRATION] applySignalOverride returned:`)
        console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   adjustedEvaluations: ${overrideResult.adjustedEvaluations?.length || 'undefined'}`)
        console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   debug: ${overrideResult.debug ? 'PRESENT' : 'MISSING'}`)
        console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   totalLifted: ${overrideResult.totalLifted}`)
        console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   totalSuppressedFixes: ${overrideResult.totalSuppressedFixes}`)

        if (overrideResult.debug) {
          console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   debug.status: ${overrideResult.debug.status}`)
          console.log(`[SIGNAL-OVERRIDE-INTEGRATION]   debug.signal_override_executed: ${overrideResult.debug.signal_override_executed}`)
        }

        finalSlideEvaluations = overrideResult.adjustedEvaluations
        signalOverrideDebug = overrideResult.debug

        console.log(`[SIGNAL-OVERRIDE-INTEGRATION] signalOverrideDebug set: ${signalOverrideDebug ? 'YES' : 'NO'}`)
      } catch (err) {
        console.error('[SIGNAL-OVERRIDE-INTEGRATION] ERROR in signal override:', err)
        console.error('[SIGNAL-OVERRIDE-INTEGRATION] Stack:', err.stack)
        // Continue with original evaluations if signal override fails
        signalOverrideDebug = {
          error: true,
          error_message: err.message,
          error_stack: err.stack,
        }
      }
    } else {
      console.log('[SIGNAL-OVERRIDE-INTEGRATION] Skipping signal override (not v3)')
    }
    // ===== End V3 Signal Override Layer =====

    // Evaluate deck-level investment thesis first (needed for v3 scoring)
    // Use signal-adjusted evaluations for thesis context
    console.log('Evaluating investment thesis...')
    const thesisResult = await evaluateInvestmentThesis(openai, slides, finalSlideEvaluations, evalContext)
    const investmentThesis = thesisResult.thesis
    const thesisDebugInfo = thesisResult.debug

    // Log thesis scores
    const thesisScores = Object.entries(investmentThesis)
      .map(([k, v]) => `${k}=${v.score}`)
      .join(', ')
    console.log(`Thesis scores: ${thesisScores}`)

    // Compute deck-level score - use v3 scoring if in v3 architecture
    let rawDeckScoreResult
    let v3ScoringDebug = null

    if (evalArchitecture === 'v3') {
      // Determine if deck is seed-stage consumer/network based on inferred context
      const isSeedConsumerNetwork = evalContext?.deckContext?.inferred_contexts?.includes('consumer_network') ||
                                     evalContext?.deckContext?.inferred_contexts?.includes('marketplace')

      console.log(`[v3] Using blended scoring (seed_consumer=${isSeedConsumerNetwork})`)

      rawDeckScoreResult = computeDeckScoreV3(finalSlideEvaluations, investmentThesis, {
        isSeedConsumerNetwork,
      })

      // Capture v3 scoring debug info
      v3ScoringDebug = rawDeckScoreResult.debug
      delete rawDeckScoreResult.debug // Don't include in main result

      console.log(`[v3] v3ScoringDebug captured: ${v3ScoringDebug ? 'YES' : 'NO'}`)
      if (v3ScoringDebug) {
        console.log(`[v3] Slide component: ${v3ScoringDebug.slide_score_component.component_score}`)
        console.log(`[v3] Thesis component: ${v3ScoringDebug.thesis_score_component.component_score}`)
        console.log(`[v3] Blended score: ${v3ScoringDebug.blending.blended_score}`)
        console.log(`[v3] Final v3 score: ${v3ScoringDebug.final_score}`)
        if (v3ScoringDebug.thesis_lift.applied) {
          console.log(`[v3] Thesis lift applied: +${v3ScoringDebug.thesis_lift.lift_amount}`)
        }
      }
    } else {
      // Use standard v2 scoring
      rawDeckScoreResult = computeDeckScore(finalSlideEvaluations)
    }

    // Apply grade calibration cap if conditions met (applies to both v2 and v3)
    const deckScoreResult = applyGradeCalibrationCap(rawDeckScoreResult, finalSlideEvaluations)

    console.log(
      `Deck scoring: grade=${deckScoreResult.overallGrade}, ` +
        `score=${deckScoreResult.deckScore}, slides_used=${deckScoreResult.slideCountUsed}` +
        (deckScoreResult.gradeCapped ? ' (CAPPED)' : '') +
        (deckScoreResult.sparseHighSignalFloor ? ' (FLOOR APPLIED)' : '')
    )

    // Generate deterministic summary (no model call)
    const summary = generateDeterministicSummary(
      finalSlideEvaluations,
      deckScoreResult.overallGrade,
      deckScoreResult.deckScore
    )

    // Generate recommended investment highlights based on deck strengths
    const recommendedHighlights = generateRecommendedInvestmentHighlights(
      finalSlideEvaluations,
      investmentThesis
    )
    console.log(`Generated ${recommendedHighlights.bullets?.length || 0} recommended investment highlights`)

    // Build architecture metadata for tracking
    const architectureMetadata = {
      architecture_version: evalArchitecture,
      architecture_source: archSource,
      rule_pack_version_key: evalContext?.rulePack?.versionKey || null,
      prompt_source:
        evalArchitecture === 'artifact'
          ? 'artifact'
          : evalContext?.promptVersionCount > 0
          ? 'database'
          : 'hardcoded',
      all_rules_loaded_count: evalContext?.rulePack?.originalRuleCount || evalContext?.rulePack?.ruleCount || 0,
      injected_rules_count: evalContext?.rulePack?.ruleCount || 0,
      prompt_versions_loaded_count: evalContext?.promptVersionCount || 0,
      fallback_used: evalContext?.fallbackUsed || false,
      fallback_reason: evalContext?.fallbackReason || null,
      context_filtering_applied: evalContext?.contextFilteringApplied || false,
    }

    // Build v3 debug object with full diagnostic info
    let debugInfo = null
    console.log(`[v3 debug] Building debug info: arch=${evalArchitecture}, evalContext=${evalContext ? 'YES' : 'NO'}, v3ScoringDebug=${v3ScoringDebug ? 'YES' : 'NO'}`)

    if (evalArchitecture === 'v3') {
      // Build debug even if evalContext is partially missing
      // Build rule injection summary from evalContext (using optional chaining for safety)
      const ruleInjectionSummary = {
        rule_pack_key: evalContext?.rulePack?.packKey || null,
        rule_pack_version: evalContext?.rulePack?.versionKey || null,
        all_rules_loaded_count: evalContext?.rulePack?.originalRuleCount || evalContext?.rulePack?.ruleCount || 0,
        injected_rules_count: evalContext?.rulePack?.ruleCount || 0,
        rule_keys: evalContext?.rulePack?.ruleKeys || [],
        rule_type_counts: evalContext?.rulePack?.ruleTypeCounts || {},
        category_counts: evalContext?.rulePack?.categoryCounts || {},
      }

      // Include deck context classification if filtering was applied
      const deckContextDebug = evalContext?.deckContext || null

      // Build prompt info
      const slidePrompt = getPromptByType(evalContext?.promptVersions || [], 'slide_analysis')
      const deckPrompt = getPromptByType(evalContext?.promptVersions || [], 'deck_analysis')

      const promptInfo = {
        slide_analysis: slidePrompt ? {
          source: 'database',
          version_key: slidePrompt.versionKey || null,
          prompt_preview: slidePrompt.promptText?.slice(0, 2000) + (slidePrompt.promptText?.length > 2000 ? '...' : ''),
          prompt_length: slidePrompt.promptText?.length || 0,
        } : {
          source: 'hardcoded',
          prompt_preview: RUBRIC_EVAL_PROMPT.slice(0, 2000) + '...',
          prompt_length: RUBRIC_EVAL_PROMPT.length,
        },
        deck_analysis: deckPrompt ? {
          source: 'database',
          version_key: deckPrompt.versionKey || null,
          prompt_preview: deckPrompt.promptText?.slice(0, 2000) + (deckPrompt.promptText?.length > 2000 ? '...' : ''),
          prompt_length: deckPrompt.promptText?.length || 0,
        } : {
          source: 'hardcoded',
          prompt_preview: THESIS_EVAL_PROMPT.slice(0, 2000) + '...',
          prompt_length: THESIS_EVAL_PROMPT.length,
        },
      }

      console.log(`[DEBUG-BUILD] Building debugInfo object`)
      console.log(`[DEBUG-BUILD] signalOverrideDebug is: ${signalOverrideDebug ? 'PRESENT' : 'NULL'}`)
      console.log(`[DEBUG-BUILD] v3ScoringDebug is: ${v3ScoringDebug ? 'PRESENT' : 'NULL'}`)

      debugInfo = {
        generated_at: new Date().toISOString(),
        architecture: architectureMetadata,
        deck_context: deckContextDebug,
        rule_injection: ruleInjectionSummary,
        prompts: promptInfo,
        scoring: v3ScoringDebug,
        signal_override: signalOverrideDebug,
        slide_evaluations: slideDebugInfo,
        thesis_evaluation: thesisDebugInfo,
      }

      console.log(`[DEBUG-BUILD] debugInfo keys: ${Object.keys(debugInfo).join(', ')}`)
      console.log(`[DEBUG-BUILD] debugInfo.signal_override is: ${debugInfo.signal_override ? 'PRESENT' : 'NULL'}`)

      // Log signal override summary
      if (signalOverrideDebug) {
        console.log(`[v3 debug] Signal override debug attached: YES`)
        console.log(`[v3 debug]   - status: ${signalOverrideDebug.status}`)
        console.log(`[v3 debug]   - signal_override_executed: ${signalOverrideDebug.signal_override_executed}`)
        console.log(`[v3 debug]   - slides_lifted: ${signalOverrideDebug.summary?.slides_grade_lifted}`)
        console.log(`[v3 debug]   - fixes_suppressed: ${signalOverrideDebug.summary?.fixes_suppressed}`)
        console.log(`[v3 debug]   - deck_signal_strength: ${signalOverrideDebug.deck_signal_analysis?.overall_strength}`)
      } else {
        console.log(`[v3 debug] WARNING: signalOverrideDebug is null/undefined`)
      }
    }

    // Determine report version based on architecture
    const reportVersion = evalArchitecture === 'v3' ? REPORT_VERSION_V3 : REPORT_VERSION

    // Build full report
    const fullReport = {
      report_version: reportVersion,
      rubric_version: RUBRIC_VERSION,
      architecture: architectureMetadata,
      overall_grade: deckScoreResult.overallGrade,
      deck_score: deckScoreResult.deckScore,
      total_weight: deckScoreResult.totalWeight,
      slide_count_used: deckScoreResult.slideCountUsed,
      summary,
      investment_thesis: investmentThesis,
      recommended_investment_highlights: recommendedHighlights,
      slides: finalSlideEvaluations,
    }

    // Derive free report subset from full report
    const freeReport = deriveFreeReport(fullReport)

    // Store report content. The canonical engine (below) generates the live
    // founder-facing report_v2 directly from rubric evaluations + context +
    // investment case. The legacy V1 unified synthesis is no longer generated
    // or used as report intelligence.
    const reportContent = {
      full_report: fullReport,
      free_report: freeReport,
    }

    // Additive metadata: partial-failure reliability note (set only when some
    // slides failed evaluation and were excluded above). Data-only; not read by
    // scoring/grading and no dashboard UI change consumes it.
    if (analysisReliability) {
      reportContent.analysis_reliability = analysisReliability
    }

    // Additive metadata: deterministic Company Context stage inference.
    // Non-fatal — a failure here must never block report generation, and this
    // field is not read by scoring, grading, or the current frontend.
    let companyContext = null
    try {
      companyContext = classifyCompanyContext(slides)
      reportContent.company_context = companyContext
      console.log(
        `[company-context] detected="${companyContext.detected_context}" confidence=${companyContext.confidence}`
      )
    } catch (ccError) {
      console.error('[company-context] classification failed (non-fatal):', ccError.message)
    }

    // Additive metadata: deterministic Investment Case as Presented synthesis.
    // Derived from already-computed thesis scores, slide grades, and company
    // context. Non-fatal and read by nothing in the scoring/grading path.
    let investmentCase = null
    try {
      investmentCase = synthesizeInvestmentCase(
        { fullReport, slides, companyContext },
        {} // investor audience / raise not collected yet
      )
      reportContent.investment_case = investmentCase
      console.log(
        `[investment-case] opportunity=${investmentCase.opportunity_strength.label} ` +
          `execution=${investmentCase.execution_credibility.label} ` +
          `investor_fit=${investmentCase.investor_fit.label}`
      )
    } catch (icError) {
      console.error('[investment-case] synthesis failed (non-fatal):', icError.message)
    }

    // Canonical, artifact-based report engine. Builds the live report_v2
    // directly from rubric evaluations + company context + investment case —
    // no v1_report. Non-fatal: a failure here leaves full_report/free_report
    // intact so the request still succeeds.
    try {
      const canonical = buildCanonicalReport({
        fullReport,
        slides,
        companyContext,
        investmentCase,
      })
      reportContent.canonical = canonical
      reportContent.report_v2 = buildCanonicalReportV2Sections(canonical, {
        fullReport,
        companyContext,
        investmentCase,
        slides,
        generatedAt: new Date().toISOString(),
      })
      // Belt-and-suspenders: guarantee no processing-error placeholder string
      // survives into the user-facing report_v2. Upstream exclusion normally
      // makes this a no-op; it defends against any other fallback source (e.g.
      // thesis fallback) leaking a forbidden string into the founder view.
      const strippedCount = stripForbiddenPlaceholders(reportContent.report_v2)
      if (strippedCount > 0) {
        console.warn(
          `[eval-guardrail] stripped ${strippedCount} residual placeholder string(s) from report_v2`
        )
      }
      console.log(
        `[canonical] report built grade=${reportContent.report_v2.overall_grade.letter} ` +
          `topics=${canonical.topics.length} ` +
          `slides=${reportContent.report_v2.slide_level_feedback.length} ` +
          `priorities=${reportContent.report_v2.priority_improvements.length}`
      )
    } catch (canonicalError) {
      console.error('[canonical] report build failed (non-fatal):', canonicalError.message)
    }

    // Add debug info for v3 reports
    if (debugInfo) {
      reportContent.debug = debugInfo
      console.log(`[v3 debug] Debug info attached to report content`)
      console.log(`[v3 debug] Scoring included: ${debugInfo.scoring ? 'YES' : 'NO'}`)
      if (debugInfo.scoring) {
        console.log(`[v3 debug] Scoring keys: ${Object.keys(debugInfo.scoring).join(', ')}`)
      }
    } else {
      console.log(`[v3 debug] No debug info to attach (debugInfo is null/undefined)`)
    }

    // Update report row
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'ready',
        overall_grade: fullReport.overall_grade,
        content: reportContent,
        generation_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    if (updateError) {
      console.error('Failed to update report:', updateError)
      throw new Error('Failed to save report')
    }

    // Log final report generation summary
    console.log(`[eval] ┌─────────────────────────────────────────`)
    console.log(`[eval] │ Report Generated Successfully`)
    console.log(`[eval] │ Grade: ${fullReport.overall_grade}`)
    console.log(`[eval] │ Architecture: ${architectureMetadata.architecture_version}`)
    console.log(`[eval] │ Prompt source: ${architectureMetadata.prompt_source}`)
    if (evalArchitecture === 'v3') {
      console.log(`[eval] │ Rule pack: ${architectureMetadata.rule_pack_version_key || 'none'}`)
      console.log(`[eval] │ Rules injected: ${architectureMetadata.injected_rules_count}`)
      console.log(`[eval] │ Prompt versions: ${architectureMetadata.prompt_versions_loaded_count}`)
      if (v3ScoringDebug) {
        console.log(`[eval] │ Scoring: slide=${v3ScoringDebug.slide_score_component.component_score}, thesis=${v3ScoringDebug.thesis_score_component.component_score}`)
      }
    }
    console.log(`[eval] └─────────────────────────────────────────`)

    return {
      success: true,
      reportId,
      overallGrade: fullReport.overall_grade,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during report generation'
    console.error('Report generation failed:', errorMessage)

    await supabase
      .from('reports')
      .update({
        status: 'failed',
        generation_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)

    return { success: false, error: errorMessage }
  }
}

module.exports = {
  // Main generator - creates full report, derives free report, stores both
  generateFullReport,

  // Version for tracking report structure changes
  REPORT_VERSION,

  // Future: deriveFreeReport will use configurable filters to create
  // limited subsets from full_report for product packaging.
  // For now, it's called internally by generateFullReport.
}
