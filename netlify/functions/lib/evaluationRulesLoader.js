/**
 * Evaluation Rules Loader (v3 Architecture)
 *
 * Fetches evaluation rule packs, rules, and prompt versions from Supabase.
 * Used when EVALUATION_ARCHITECTURE=v3 is set.
 *
 * This is READ-ONLY and does not modify any evaluation behavior yet.
 * It provides the foundation for context-aware evaluation in v3.
 *
 * Schema (actual Supabase tables):
 * - evaluation_rule_packs: version_key, name, description, status, is_active, architecture_version, report_version
 * - evaluation_rules: rule_pack_id, rule_key, rule_type, slide_type, question_key, title, instruction, weight, priority, is_required, is_active
 * - evaluation_prompt_versions: rule_pack_id, prompt_key, prompt_type, version_key, title, prompt_text, status, is_active
 */

const { EVALUATION_RULE_PACKS, RULE_PACK_VERSION } = require('./evaluationRulePacks')

// Default v3 rule pack version to load
const DEFAULT_V3_VERSION_KEY = 'v3.0.0-draft'

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
 * Fetch a rule pack from Supabase by version_key.
 *
 * When EVALUATION_ARCHITECTURE=v3, we load the pack even if is_active=false
 * to support testing draft rule packs.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} versionKey - Rule pack version key (e.g., 'v3.0.0-draft')
 * @param {boolean} allowInactive - If true, load even if is_active=false (for v3 testing)
 * @returns {Promise<Object|null>} - Rule pack with metadata and rules, or null on error
 */
async function fetchRulePack(supabase, versionKey = DEFAULT_V3_VERSION_KEY, allowInactive = false) {
  try {
    // Fetch the rule pack metadata by version_key
    // When allowInactive=true (v3 mode), we don't filter by is_active
    let query = supabase
      .from('evaluation_rule_packs')
      .select('*')
      .eq('version_key', versionKey)

    if (!allowInactive) {
      query = query.eq('is_active', true)
    }

    const { data: pack, error: packError } = await query.single()

    if (packError || !pack) {
      console.log(`[v3] Rule pack '${versionKey}' not found${allowInactive ? '' : ' or not active'}`)
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
      console.error(`[v3] Error fetching rules for pack '${versionKey}':`, rulesError.message)
      return null
    }

    // Compute rule aggregations for debug output
    const ruleList = rules || []
    const ruleKeys = ruleList.map((r) => r.rule_key)
    const ruleTypeCounts = {}
    const categoryCounts = {}

    for (const rule of ruleList) {
      // Count by rule_type
      const ruleType = rule.rule_type || 'general'
      ruleTypeCounts[ruleType] = (ruleTypeCounts[ruleType] || 0) + 1

      // Count by category (derived from rule_key prefix or slide_type)
      const category = rule.slide_type || rule.rule_key?.split('_')[0] || 'general'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    }

    return {
      id: pack.id,
      packKey: pack.pack_key || pack.name?.toLowerCase().replace(/\s+/g, '_'),
      versionKey: pack.version_key,
      name: pack.name,
      description: pack.description,
      status: pack.status,
      isActive: pack.is_active,
      architectureVersion: pack.architecture_version,
      reportVersion: pack.report_version,
      metadata: pack.metadata,
      rules: ruleList,
      ruleCount: ruleList.length,
      ruleKeys,
      ruleTypeCounts,
      categoryCounts,
      source: 'supabase',
    }
  } catch (err) {
    console.error(`[v3] Exception fetching rule pack '${versionKey}':`, err.message)
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
      .eq('is_active', true)
      .order('version_key', { ascending: true })

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
      versionKey: pack.version_key,
      name: pack.name,
      description: pack.description,
      status: pack.status,
      isActive: pack.is_active,
      architectureVersion: pack.architecture_version,
      reportVersion: pack.report_version,
      metadata: pack.metadata,
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
 * Fetch prompt versions for a rule pack from Supabase.
 *
 * When allowInactive=true (v3 mode), we load prompts even if is_active=false
 * to support testing draft prompts.
 *
 * @param {Object} supabase - Supabase client
 * @param {string} rulePackId - Rule pack ID
 * @param {Object} options - Fetch options
 * @param {string} options.promptType - Optional prompt type filter (e.g., 'slide_analysis', 'deck_analysis')
 * @param {boolean} options.allowInactive - If true, load even if is_active=false (for v3 testing)
 * @returns {Promise<Object[]>} - Array of prompt versions, or empty array on error
 */
async function fetchPromptVersions(supabase, rulePackId, options = {}) {
  const { promptType = null, allowInactive = false } = options

  try {
    let query = supabase
      .from('evaluation_prompt_versions')
      .select('*')
      .eq('rule_pack_id', rulePackId)
      .order('created_at', { ascending: false })

    if (!allowInactive) {
      query = query.eq('is_active', true)
    }

    if (promptType) {
      query = query.eq('prompt_type', promptType)
    }

    const { data: prompts, error } = await query

    if (error || !prompts) {
      console.log(`[v3] No prompt versions found for rule pack ${rulePackId}`)
      return []
    }

    return prompts.map((prompt) => ({
      id: prompt.id,
      rulePackId: prompt.rule_pack_id,
      promptKey: prompt.prompt_key,
      promptType: prompt.prompt_type,
      versionKey: prompt.version_key,
      title: prompt.title,
      promptText: prompt.prompt_text,
      status: prompt.status,
      isActive: prompt.is_active,
      metadata: prompt.metadata,
      source: 'supabase',
    }))
  } catch (err) {
    console.error(`[v3] Exception fetching prompt versions:`, err.message)
    return []
  }
}

/**
 * Get a specific prompt by type from loaded prompt versions.
 *
 * @param {Object[]} promptVersions - Array of prompt version objects
 * @param {string} promptType - Prompt type to find (e.g., 'slide_analysis', 'deck_analysis')
 * @returns {Object|null} - Prompt version or null if not found
 */
function getPromptByType(promptVersions, promptType) {
  if (!promptVersions || promptVersions.length === 0) {
    return null
  }
  return promptVersions.find((p) => p.promptType === promptType) || null
}

/**
 * Get fallback rule pack from hardcoded definitions.
 *
 * @param {string} packKey - Rule pack key (from hardcoded EVALUATION_RULE_PACKS)
 * @returns {Object|null} - Hardcoded rule pack or null if not found
 */
function getFallbackRulePack(packKey) {
  const pack = EVALUATION_RULE_PACKS[packKey]
  if (!pack) {
    return null
  }

  const ruleList = pack.rules.map((rule, idx) => ({
    rule_key: `fallback_rule_${idx + 1}`,
    rule_type: 'general',
    title: `Rule ${idx + 1}`,
    instruction: rule,
    priority: idx + 1,
    is_active: true,
  }))

  return {
    packKey,
    versionKey: RULE_PACK_VERSION,
    name: pack.name,
    description: pack.description,
    status: 'fallback',
    isActive: true,
    architectureVersion: 'v2',
    reportVersion: null,
    rules: ruleList,
    ruleCount: ruleList.length,
    ruleKeys: ruleList.map((r) => r.rule_key),
    ruleTypeCounts: { general: ruleList.length },
    categoryCounts: { general: ruleList.length },
    source: 'hardcoded_fallback',
  }
}

/**
 * Load evaluation context for a deck.
 *
 * This is the main entry point for v3 rule loading.
 * Returns the appropriate rule pack and prompt versions based on context.
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} options - Loading options
 * @param {string} options.versionKey - Rule pack version key to load (default: v3.0.0-draft)
 * @param {string} options.fallbackPackKey - Hardcoded pack key to use as fallback
 * @param {boolean} options.loadPrompts - Whether to load prompt versions
 * @param {string} options.architectureOverride - Override architecture detection (e.g., from header)
 * @returns {Promise<Object>} - Evaluation context with rulePack, promptVersions, and metadata
 */
async function loadEvaluationContext(supabase, options = {}) {
  const {
    versionKey = DEFAULT_V3_VERSION_KEY,
    fallbackPackKey = 'modern_seed_deck',
    loadPrompts = false,
    architectureOverride = null,
  } = options

  // Use override if provided, otherwise check env
  const architecture = architectureOverride || getEvaluationArchitecture()

  const result = {
    architecture,
    versionKey,
    rulePack: null,
    promptVersions: [],
    promptVersionCount: 0,
    fallbackUsed: false,
    fallbackReason: null,
  }

  // If v2, return early with no v3 data loaded
  if (architecture !== 'v3') {
    console.log(`[eval] Architecture: v2 (default) - v3 rules not loaded`)
    return result
  }

  console.log(`[eval] Architecture: v3 - loading rule pack '${versionKey}'`)

  // Try to load from Supabase
  // For v3, allow loading inactive packs (draft mode)
  const rulePack = await fetchRulePack(supabase, versionKey, true)

  if (rulePack) {
    result.rulePack = rulePack

    // Load prompt versions if requested
    // For v3, allow loading inactive prompts (draft mode)
    if (loadPrompts) {
      const promptVersions = await fetchPromptVersions(supabase, rulePack.id, { allowInactive: true })
      result.promptVersions = promptVersions
      result.promptVersionCount = promptVersions.length
    }

    // Diagnostic log
    console.log(`[v3] ┌─────────────────────────────────────────`)
    console.log(`[v3] │ Evaluation Context Loaded`)
    console.log(`[v3] │ Architecture: ${architecture}`)
    console.log(`[v3] │ Rule Pack: ${rulePack.versionKey}`)
    console.log(`[v3] │ Name: ${rulePack.name}`)
    console.log(`[v3] │ Rules: ${rulePack.ruleCount}`)
    console.log(`[v3] │ Prompts: ${result.promptVersionCount}`)
    console.log(`[v3] │ Source: ${rulePack.source}`)
    console.log(`[v3] └─────────────────────────────────────────`)
  } else {
    // Fall back to hardcoded rules
    const fallback = getFallbackRulePack(fallbackPackKey)
    if (fallback) {
      result.rulePack = fallback
      result.fallbackUsed = true
      result.fallbackReason = 'supabase_load_failed'

      // Diagnostic log for fallback
      console.log(`[v3] ┌─────────────────────────────────────────`)
      console.log(`[v3] │ Evaluation Context (FALLBACK)`)
      console.log(`[v3] │ Architecture: ${architecture}`)
      console.log(`[v3] │ Rule Pack: ${fallback.versionKey}`)
      console.log(`[v3] │ Name: ${fallback.name}`)
      console.log(`[v3] │ Rules: ${fallback.ruleCount}`)
      console.log(`[v3] │ Prompts: 0 (hardcoded prompt used)`)
      console.log(`[v3] │ Source: ${fallback.source}`)
      console.log(`[v3] │ Fallback Reason: ${result.fallbackReason}`)
      console.log(`[v3] └─────────────────────────────────────────`)
    } else {
      result.fallbackUsed = true
      result.fallbackReason = 'pack_not_found'
      console.log(`[v3] Rule pack '${versionKey}' not found in Supabase, fallback '${fallbackPackKey}' also not found`)
    }
  }

  return result
}

/**
 * Detect the appropriate rule pack based on deck characteristics.
 *
 * This is a placeholder for future context detection logic.
 * Currently returns the default v3 version key.
 *
 * @param {Object} deckContext - Deck context (slides, types, etc.)
 * @returns {string} - Recommended rule pack version key
 */
function detectRulePack(deckContext = {}) {
  // Future: analyze deck to detect business model, stage, etc.
  // For now, return default v3 version
  return DEFAULT_V3_VERSION_KEY
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
    // Use instruction field (actual schema) or fallback to rule_text or string
    const text = r.instruction || r.rule_text || r
    const title = r.title ? `${r.title}: ` : ''
    return `- ${title}${text}`
  })

  return `
CONTEXT-SPECIFIC RULES (${rulePack.name}):
${ruleLines.join('\n')}
`
}

module.exports = {
  // Constants
  DEFAULT_V3_VERSION_KEY,

  // Architecture detection
  getEvaluationArchitecture,
  isV3Enabled,

  // Rule pack loading
  fetchRulePack,
  fetchAllRulePacks,
  getFallbackRulePack,

  // Prompt version loading
  fetchPromptVersions,
  getPromptByType,

  // Main entry point
  loadEvaluationContext,

  // Context detection (placeholder)
  detectRulePack,

  // Formatting helpers
  formatRulesForPrompt,
}
