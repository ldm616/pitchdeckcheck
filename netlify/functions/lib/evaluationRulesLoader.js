/**
 * Evaluation Rules Loader (v3 Architecture)
 *
 * Fetches evaluation rule packs, rules, and prompt versions from Supabase.
 * Used when EVALUATION_ARCHITECTURE=v3 is set.
 *
 * This is READ-ONLY and does not modify any evaluation behavior yet.
 * It provides the foundation for context-aware evaluation in v3.
 */

const { EVALUATION_RULE_PACKS, RULE_PACK_VERSION } = require('./evaluationRulePacks')

/**
 * Get the current evaluation architecture from environment.
 * @returns {'v2' | 'v3'} - Current architecture version
 */
function getEvaluationArchitecture() {
  const arch = process.env.EVALUATION_ARCHITECTURE || 'v2'
  return arch === 'v3' ? 'v3' : 'v2'
}

/**
 * Check if v3 architecture is enabled.
 * @returns {boolean}
 */
function isV3Enabled() {
  return getEvaluationArchitecture() === 'v3'
}

/**
 * Fetch the active rule pack from Supabase.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} packKey - Rule pack key (e.g., 'modern_seed_deck', 'marketplace')
 * @returns {Promise<Object|null>} - Rule pack with metadata and rules, or null on error
 */
async function fetchRulePack(supabase, packKey) {
  try {
    // Fetch the rule pack metadata
    const { data: pack, error: packError } = await supabase
      .from('evaluation_rule_packs')
      .select('*')
      .eq('pack_key', packKey)
      .eq('status', 'active')
      .single()

    if (packError || !pack) {
      console.log(`[v3] Rule pack '${packKey}' not found or not active`)
      return null
    }

    // Fetch rules for this pack, ordered by priority
    const { data: rules, error: rulesError } = await supabase
      .from('evaluation_rules')
      .select('*')
      .eq('rule_pack_id', pack.id)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (rulesError) {
      console.error(`[v3] Error fetching rules for pack '${packKey}':`, rulesError.message)
      return null
    }

    return {
      id: pack.id,
      packKey: pack.pack_key,
      name: pack.name,
      description: pack.description,
      version: pack.version,
      status: pack.status,
      rules: rules || [],
      ruleCount: rules?.length || 0,
      source: 'supabase',
    }
  } catch (err) {
    console.error(`[v3] Exception fetching rule pack '${packKey}':`, err.message)
    return null
  }
}

/**
 * Fetch all active rule packs from Supabase.
 *
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object[]>} - Array of rule packs with their rules
 */
async function fetchAllRulePacks(supabase) {
  try {
    const { data: packs, error: packsError } = await supabase
      .from('evaluation_rule_packs')
      .select('*')
      .eq('status', 'active')
      .order('pack_key', { ascending: true })

    if (packsError || !packs) {
      console.error('[v3] Error fetching rule packs:', packsError?.message)
      return []
    }

    // Fetch rules for all packs
    const packIds = packs.map((p) => p.id)
    const { data: allRules, error: rulesError } = await supabase
      .from('evaluation_rules')
      .select('*')
      .in('rule_pack_id', packIds)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (rulesError) {
      console.error('[v3] Error fetching rules:', rulesError.message)
    }

    // Group rules by pack
    const rulesByPack = {}
    for (const rule of allRules || []) {
      if (!rulesByPack[rule.rule_pack_id]) {
        rulesByPack[rule.rule_pack_id] = []
      }
      rulesByPack[rule.rule_pack_id].push(rule)
    }

    return packs.map((pack) => ({
      id: pack.id,
      packKey: pack.pack_key,
      name: pack.name,
      description: pack.description,
      version: pack.version,
      status: pack.status,
      rules: rulesByPack[pack.id] || [],
      ruleCount: rulesByPack[pack.id]?.length || 0,
      source: 'supabase',
    }))
  } catch (err) {
    console.error('[v3] Exception fetching all rule packs:', err.message)
    return []
  }
}

/**
 * Fetch the active prompt version from Supabase.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} promptType - Prompt type (e.g., 'rubric_eval', 'thesis_eval')
 * @returns {Promise<Object|null>} - Prompt version data, or null on error
 */
async function fetchPromptVersion(supabase, promptType = 'rubric_eval') {
  try {
    const { data: prompt, error } = await supabase
      .from('evaluation_prompt_versions')
      .select('*')
      .eq('prompt_type', promptType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !prompt) {
      console.log(`[v3] Prompt version '${promptType}' not found or not active`)
      return null
    }

    return {
      id: prompt.id,
      promptType: prompt.prompt_type,
      version: prompt.version,
      content: prompt.content,
      status: prompt.status,
      source: 'supabase',
    }
  } catch (err) {
    console.error(`[v3] Exception fetching prompt version '${promptType}':`, err.message)
    return null
  }
}

/**
 * Get fallback rule pack from hardcoded definitions.
 *
 * @param {string} packKey - Rule pack key
 * @returns {Object|null} - Hardcoded rule pack or null if not found
 */
function getFallbackRulePack(packKey) {
  const pack = EVALUATION_RULE_PACKS[packKey]
  if (!pack) {
    return null
  }

  return {
    packKey,
    name: pack.name,
    description: pack.description,
    version: RULE_PACK_VERSION,
    rules: pack.rules.map((rule, idx) => ({
      rule_text: rule,
      priority: idx + 1,
    })),
    ruleCount: pack.rules.length,
    source: 'hardcoded_fallback',
  }
}

/**
 * Load evaluation context for a deck.
 *
 * This is the main entry point for v3 rule loading.
 * Returns the appropriate rule pack and prompt version based on context.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} options - Loading options
 * @param {string} options.packKey - Rule pack key to load
 * @param {boolean} options.loadPrompt - Whether to load prompt version
 * @returns {Promise<Object>} - Evaluation context with rulePack, promptVersion, and metadata
 */
async function loadEvaluationContext(supabase, options = {}) {
  const architecture = getEvaluationArchitecture()
  const { packKey = 'modern_seed_deck', loadPrompt = false } = options

  const result = {
    architecture,
    packKey,
    rulePack: null,
    promptVersion: null,
    fallbackUsed: false,
    fallbackReason: null,
  }

  // If v2, return early with no v3 data loaded
  if (architecture !== 'v3') {
    console.log(`[eval] Architecture: v2 (default) - v3 rules not loaded`)
    return result
  }

  console.log(`[eval] Architecture: v3 - loading rule pack '${packKey}'`)

  // Try to load from Supabase
  const rulePack = await fetchRulePack(supabase, packKey)

  if (rulePack) {
    result.rulePack = rulePack
    console.log(`[v3] Loaded rule pack '${packKey}' from Supabase (${rulePack.ruleCount} rules, version: ${rulePack.version})`)
  } else {
    // Fall back to hardcoded rules
    const fallback = getFallbackRulePack(packKey)
    if (fallback) {
      result.rulePack = fallback
      result.fallbackUsed = true
      result.fallbackReason = 'supabase_load_failed'
      console.log(`[v3] Using fallback rule pack '${packKey}' (hardcoded, ${fallback.ruleCount} rules)`)
    } else {
      result.fallbackUsed = true
      result.fallbackReason = 'pack_not_found'
      console.log(`[v3] Rule pack '${packKey}' not found in Supabase or fallback`)
    }
  }

  // Optionally load prompt version
  if (loadPrompt) {
    const promptVersion = await fetchPromptVersion(supabase, 'rubric_eval')
    if (promptVersion) {
      result.promptVersion = promptVersion
      console.log(`[v3] Loaded prompt version '${promptVersion.version}' from Supabase`)
    } else {
      console.log(`[v3] Using hardcoded prompt (no Supabase version found)`)
    }
  }

  return result
}

/**
 * Detect the appropriate rule pack based on deck characteristics.
 *
 * This is a placeholder for future context detection logic.
 * Currently returns 'modern_seed_deck' as default.
 *
 * @param {Object} deckContext - Deck context (slides, types, etc.)
 * @returns {string} - Recommended rule pack key
 */
function detectRulePack(deckContext = {}) {
  // Future: analyze deck to detect business model, stage, etc.
  // For now, return default
  return 'modern_seed_deck'
}

/**
 * Format rules for prompt injection (future use).
 *
 * @param {Object} rulePack - Rule pack with rules array
 * @returns {string} - Formatted rules text for prompt
 */
function formatRulesForPrompt(rulePack) {
  if (!rulePack || !rulePack.rules || rulePack.rules.length === 0) {
    return ''
  }

  const ruleLines = rulePack.rules.map((r) => {
    const text = r.rule_text || r
    return `- ${text}`
  })

  return `
CONTEXT-SPECIFIC RULES (${rulePack.name}):
${ruleLines.join('\n')}
`
}

module.exports = {
  // Architecture detection
  getEvaluationArchitecture,
  isV3Enabled,

  // Rule pack loading
  fetchRulePack,
  fetchAllRulePacks,
  getFallbackRulePack,

  // Prompt version loading
  fetchPromptVersion,

  // Main entry point
  loadEvaluationContext,

  // Context detection (placeholder)
  detectRulePack,

  // Formatting helpers
  formatRulesForPrompt,
}
