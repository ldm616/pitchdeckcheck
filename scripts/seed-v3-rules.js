#!/usr/bin/env node

/**
 * Seed v3 evaluation rules and prompts into the database.
 *
 * This script:
 * 1. Ensures the v3.0.0-draft rule pack exists
 * 2. Seeds evaluation rules from evaluationRulePacks.js
 * 3. Seeds prompt versions (rubric_eval, thesis_eval) with real prompt content
 *
 * Idempotent: Uses upsert to avoid duplicates.
 *
 * Valid rule_type values:
 * - slide_classification
 * - atomic_question
 * - scoring
 * - evidence
 * - strength
 * - gap
 * - suggestion
 * - report_summary
 * - guardrail
 * - calibration
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-v3-rules.js
 *
 * Or with npm:
 *   npm run seed:v3-rules
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Import rule packs from the source of truth
const rulePacksPath = path.join(__dirname, '../netlify/functions/lib/evaluationRulePacks.js')
const { RULE_PACK_VERSION, EVALUATION_RULE_PACKS } = require(rulePacksPath)

// v3 rule pack configuration
const V3_VERSION_KEY = 'v3.0.0-draft'
const V3_RULE_PACK = {
  version_key: V3_VERSION_KEY,
  name: 'V3 Evaluation Architecture (Draft)',
  description: 'Context-aware evaluation rules with signal-based scoring and deck-type detection.',
  status: 'draft',
  is_active: false, // Not active yet - still in development
  architecture_version: 'v3',
  report_version: 'report_v2.7',
  metadata: {
    source: 'evaluationRulePacks.js',
    seeded_at: new Date().toISOString(),
    rule_pack_version: RULE_PACK_VERSION,
  },
}

/**
 * Map rules to valid rule_type values based on their content.
 *
 * Valid types: scoring, evidence, guardrail, suggestion, calibration
 *
 * Mapping logic:
 * - "Reward", "Evaluate", scoring guidance → scoring
 * - "Look for", "Assess", "Check", evidence requirements → evidence
 * - "Do not", "avoid", anti-patterns → guardrail
 * - Connection/linking guidance → suggestion
 */
const RULE_DEFINITIONS = {
  modern_seed_deck: [
    { instruction: 'Reward credible investor signal, not completeness alone.', rule_type: 'scoring' },
    { instruction: 'Missing CAC or retention matters when growth depends on scaling efficiency.', rule_type: 'evidence' },
    { instruction: 'Financials should connect to traction and GTM.', rule_type: 'evidence' },
  ],
  sparse_high_signal_deck: [
    { instruction: 'Evaluate signal over completeness.', rule_type: 'scoring' },
    { instruction: 'Do not penalize missing CAC/LTV/financial detail if core idea is strong.', rule_type: 'guardrail' },
    { instruction: 'Reward clarity, timing, insight, simplicity.', rule_type: 'scoring' },
  ],
  marketplace: [
    { instruction: 'Evaluate supply and demand strength.', rule_type: 'evidence' },
    { instruction: 'Assess liquidity and trust.', rule_type: 'evidence' },
    { instruction: 'Check if advantages are durable.', rule_type: 'evidence' },
  ],
  local_services_marketplace: [
    { instruction: 'Assess trust and repeat usage.', rule_type: 'evidence' },
    { instruction: 'Do not apply SaaS or API logic unless present.', rule_type: 'guardrail' },
    { instruction: 'Coverage only matters if it compounds.', rule_type: 'scoring' },
  ],
  consumer_network: [
    { instruction: 'Look for network effects or user pull.', rule_type: 'evidence' },
    { instruction: 'Why-now can come from infrastructure shifts.', rule_type: 'evidence' },
    { instruction: 'Sparse traction can still be high-signal.', rule_type: 'scoring' },
  ],
  saas: [
    { instruction: 'Evaluate retention, CAC, expansion.', rule_type: 'evidence' },
    { instruction: 'Missing unit economics is meaningful.', rule_type: 'evidence' },
    { instruction: 'Link product value to revenue durability.', rule_type: 'suggestion' },
  ],
  infrastructure_developer: [
    { instruction: 'Evaluate complexity reduction.', rule_type: 'evidence' },
    { instruction: 'Check developer adoption.', rule_type: 'evidence' },
    { instruction: 'Assess commoditization risk.', rule_type: 'evidence' },
  ],
}

// Real prompt content from reportGenerator.js (v2.7)
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
- "Investors cannot assess..."
- "Investors cannot determine..."
- "Investors cannot judge..."

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
- "If available..."
- "If true..."
- "If already tracked..."

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
- Gap: "None - criterion fully met"
- Investor Impact: "None - no investor friction"
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

async function main() {
  console.log('='.repeat(60))
  console.log('V3 Evaluation Rules Seed Script')
  console.log('='.repeat(60))
  console.log()

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables')
    console.error('Required:')
    console.error('  SUPABASE_URL')
    console.error('  SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('Connected to Supabase')
  console.log()

  // ============================================================
  // Step 1: Ensure v3.0.0-draft rule pack exists
  // ============================================================
  console.log(`Step 1: Ensuring rule pack '${V3_VERSION_KEY}' exists`)

  const { data: existingPack, error: checkError } = await supabase
    .from('evaluation_rule_packs')
    .select('id, version_key, is_active')
    .eq('version_key', V3_VERSION_KEY)
    .maybeSingle()

  let rulePackId

  if (existingPack) {
    console.log(`  Rule pack already exists: ${existingPack.version_key}`)
    console.log(`  ID: ${existingPack.id}`)
    console.log(`  is_active: ${existingPack.is_active}`)
    rulePackId = existingPack.id

    // Update metadata
    const { error: updateError } = await supabase
      .from('evaluation_rule_packs')
      .update({
        metadata: V3_RULE_PACK.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rulePackId)

    if (updateError) {
      console.error('  Warning: Could not update metadata:', updateError.message)
    } else {
      console.log('  Metadata updated')
    }
  } else {
    // Create new rule pack
    const { data: newPack, error: insertError } = await supabase
      .from('evaluation_rule_packs')
      .insert(V3_RULE_PACK)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating rule pack:', insertError.message)
      process.exit(1)
    }

    rulePackId = newPack.id
    console.log(`  Created rule pack: ${V3_VERSION_KEY}`)
    console.log(`  ID: ${rulePackId}`)
  }

  // ============================================================
  // Step 2: Seed evaluation rules
  // ============================================================
  console.log()
  console.log('Step 2: Seeding evaluation rules')

  const contextKeys = Object.keys(RULE_DEFINITIONS)
  let totalRules = 0
  let upsertedRules = 0

  for (const contextKey of contextKeys) {
    const rules = RULE_DEFINITIONS[contextKey]
    const packInfo = EVALUATION_RULE_PACKS[contextKey]
    console.log(`  Processing context: ${contextKey} (${rules.length} rules)`)

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      totalRules++

      const ruleKey = `${contextKey}_rule_${i + 1}`
      const ruleData = {
        rule_pack_id: rulePackId,
        rule_key: ruleKey,
        rule_type: rule.rule_type, // Valid type: scoring, evidence, guardrail, suggestion
        slide_type: null, // These are context rules, not slide-specific
        question_key: null,
        title: `${packInfo.name} Rule ${i + 1}`,
        instruction: rule.instruction,
        weight: 1.0,
        priority: i + 1,
        is_required: false,
        is_active: true,
        metadata: {
          category: contextKey, // Business model/deck type context
          category_name: packInfo.name,
          category_description: packInfo.description,
        },
        updated_at: new Date().toISOString(),
      }

      // Check if rule exists
      const { data: existingRule } = await supabase
        .from('evaluation_rules')
        .select('id')
        .eq('rule_pack_id', rulePackId)
        .eq('rule_key', ruleKey)
        .maybeSingle()

      if (existingRule) {
        // Update existing
        const { error } = await supabase
          .from('evaluation_rules')
          .update(ruleData)
          .eq('id', existingRule.id)

        if (error) {
          console.error(`    Error updating rule ${ruleKey}:`, error.message)
        } else {
          upsertedRules++
        }
      } else {
        // Insert new
        const { error } = await supabase.from('evaluation_rules').insert(ruleData)

        if (error) {
          console.error(`    Error inserting rule ${ruleKey}:`, error.message)
        } else {
          upsertedRules++
        }
      }
    }
  }

  console.log(`  Upserted ${upsertedRules}/${totalRules} rules`)

  // ============================================================
  // Step 3: Seed prompt versions
  // ============================================================
  console.log()
  console.log('Step 3: Seeding prompt versions')

  const promptVersions = [
    {
      rule_pack_id: rulePackId,
      prompt_key: 'rubric_eval_v2.7',
      prompt_type: 'rubric_eval',
      version_key: 'v2.7',
      title: 'Rubric Evaluation Prompt (v2.7)',
      prompt_text: RUBRIC_EVAL_PROMPT,
      status: 'draft',
      is_active: false, // Not active - still using hardcoded prompt
      metadata: {
        source: 'reportGenerator.js',
        report_version: 'report_v2.7',
        seeded_at: new Date().toISOString(),
      },
    },
    {
      rule_pack_id: rulePackId,
      prompt_key: 'thesis_eval_v2.7',
      prompt_type: 'thesis_eval',
      version_key: 'v2.7',
      title: 'Thesis Evaluation Prompt (v2.7)',
      prompt_text: THESIS_EVAL_PROMPT,
      status: 'draft',
      is_active: false, // Not active - still using hardcoded prompt
      metadata: {
        source: 'reportGenerator.js',
        report_version: 'report_v2.7',
        seeded_at: new Date().toISOString(),
      },
    },
  ]

  let upsertedPrompts = 0

  for (const prompt of promptVersions) {
    // Check if prompt exists
    const { data: existingPrompt } = await supabase
      .from('evaluation_prompt_versions')
      .select('id')
      .eq('rule_pack_id', rulePackId)
      .eq('prompt_key', prompt.prompt_key)
      .maybeSingle()

    if (existingPrompt) {
      // Update existing
      const { error } = await supabase
        .from('evaluation_prompt_versions')
        .update({
          ...prompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPrompt.id)

      if (error) {
        console.error(`  Error updating prompt ${prompt.prompt_key}:`, error.message)
      } else {
        console.log(`  Updated: ${prompt.prompt_key}`)
        upsertedPrompts++
      }
    } else {
      // Insert new
      const { error } = await supabase.from('evaluation_prompt_versions').insert(prompt)

      if (error) {
        console.error(`  Error inserting prompt ${prompt.prompt_key}:`, error.message)
      } else {
        console.log(`  Created: ${prompt.prompt_key}`)
        upsertedPrompts++
      }
    }
  }

  console.log(`  Upserted ${upsertedPrompts}/${promptVersions.length} prompt versions`)

  // ============================================================
  // Verification
  // ============================================================
  console.log()
  console.log('='.repeat(60))
  console.log('Verification')
  console.log('='.repeat(60))

  // Count rules by rule_type
  const { data: rulesByType, error: ruleTypeError } = await supabase
    .from('evaluation_rules')
    .select('rule_type')
    .eq('rule_pack_id', rulePackId)

  if (!ruleTypeError && rulesByType) {
    const countsByType = {}
    for (const r of rulesByType) {
      countsByType[r.rule_type] = (countsByType[r.rule_type] || 0) + 1
    }

    console.log()
    console.log('Rules by rule_type:')
    for (const [type, count] of Object.entries(countsByType).sort()) {
      console.log(`  ${type}: ${count}`)
    }
  }

  // Count rules by category (from metadata)
  const { data: rulesWithMeta, error: metaError } = await supabase
    .from('evaluation_rules')
    .select('metadata')
    .eq('rule_pack_id', rulePackId)

  if (!metaError && rulesWithMeta) {
    const countsByCategory = {}
    for (const r of rulesWithMeta) {
      const category = r.metadata?.category || 'unknown'
      countsByCategory[category] = (countsByCategory[category] || 0) + 1
    }

    console.log()
    console.log('Rules by category (metadata.category):')
    for (const [cat, count] of Object.entries(countsByCategory).sort()) {
      console.log(`  ${cat}: ${count}`)
    }
  }

  // Count prompts
  const { data: promptCount, error: promptCountError } = await supabase
    .from('evaluation_prompt_versions')
    .select('prompt_type, prompt_key, is_active')
    .eq('rule_pack_id', rulePackId)

  if (!promptCountError && promptCount) {
    console.log()
    console.log('Prompt versions in database:')
    for (const p of promptCount) {
      console.log(`  ${p.prompt_key} (${p.prompt_type}) - is_active: ${p.is_active}`)
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log()
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log()
  console.log(`Rule pack: ${V3_VERSION_KEY}`)
  console.log(`Rule pack ID: ${rulePackId}`)
  console.log(`Rule pack is_active: false (intentionally not activated)`)
  console.log()
  console.log(`Rules seeded: ${upsertedRules}`)
  console.log(`Context categories: ${contextKeys.length}`)
  console.log(`Prompts seeded: ${upsertedPrompts}`)
  console.log()

  if (upsertedRules === totalRules && upsertedPrompts === promptVersions.length) {
    console.log('Seed completed successfully.')
    console.log()
    console.log('Next steps:')
    console.log('  1. Set EVALUATION_ARCHITECTURE=v3 to test loader')
    console.log('  2. Verify rules load correctly')
    console.log('  3. When ready, set is_active=true on rule pack')
  } else {
    console.log('Warning: Some items may not have been seeded correctly.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
