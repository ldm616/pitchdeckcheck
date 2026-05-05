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

// ============================================================
// Deck Context Inference
// ============================================================

/**
 * Universal rule categories that always apply to v3 evaluations.
 */
const UNIVERSAL_CATEGORIES = [
  'core_calibration',
  'core',
  'language_rules',
  'language',
  'guardrail',
  'evidence',
  'suggestions',
  'general_evidence',
  'modern_seed_deck',
]

/**
 * Conditional categories with their detection signals.
 * Each category has keywords to look for in deck content.
 */
const CONDITIONAL_CATEGORIES = {
  sparse_high_signal_deck: {
    displayName: 'Sparse Deck',
    // Detected by deck structure analysis, not keywords
    structuralDetection: true,
  },
  marketplace: {
    displayName: 'Marketplace',
    keywords: [
      'marketplace', 'two-sided', 'buyers and sellers', 'supply and demand',
      'liquidity', 'transaction fee', 'take rate', 'gmv', 'gross merchandise',
      'matching', 'platform connecting', 'connects buyers', 'connects sellers',
      'listing', 'booking', 'commission',
    ],
  },
  local_services_marketplace: {
    displayName: 'Local Services',
    keywords: [
      'local service', 'home service', 'on-demand', 'gig economy', 'tasker',
      'service provider', 'handyman', 'cleaning', 'delivery', 'courier',
      'local market', 'neighborhood', 'hyperlocal', 'same-day',
    ],
  },
  consumer_network: {
    displayName: 'Consumer/Network',
    keywords: [
      'social', 'community', 'user-generated', 'viral', 'network effect',
      'consumer app', 'mobile app', 'engagement', 'dau', 'mau', 'daily active',
      'monthly active', 'retention', 'sharing', 'invite', 'referral',
      'content creator', 'influencer', 'follower',
    ],
  },
  saas: {
    displayName: 'SaaS',
    keywords: [
      'saas', 'software as a service', 'subscription', 'mrr', 'arr',
      'recurring revenue', 'churn', 'net revenue retention', 'nrr',
      'enterprise', 'smb', 'seats', 'per user', 'monthly fee', 'annual contract',
      'acv', 'ltv', 'cac', 'payback', 'expansion revenue', 'upsell',
      'b2b software', 'cloud platform', 'dashboard', 'analytics platform',
    ],
  },
  infrastructure_developer: {
    displayName: 'Infrastructure/Developer',
    keywords: [
      'api', 'sdk', 'developer', 'infrastructure', 'devtool', 'dev tool',
      'open source', 'github', 'integration', 'backend', 'middleware',
      'database', 'cloud infrastructure', 'serverless', 'microservice',
      'ci/cd', 'deployment', 'orchestration', 'kubernetes', 'docker',
      'developer experience', 'dx', 'documentation', 'developer adoption',
    ],
  },
}

/**
 * Infer deck context from slide content.
 * Analyzes slide text and types to determine relevant rule categories.
 *
 * @param {Object[]} slides - Array of slide objects with extracted_text and inferred_type
 * @param {Object} options - Additional options
 * @returns {Object} - Deck context classification with categories and reasons
 */
function inferDeckContext(slides, options = {}) {
  const result = {
    included_categories: [...UNIVERSAL_CATEGORIES],
    excluded_categories: [],
    category_reasons: {},
    deck_signals: {
      is_sparse: false,
      detected_models: [],
      keyword_matches: {},
    },
  }

  // Combine all slide text for analysis
  const allText = slides
    .map((s) => (s.extracted_text || '').toLowerCase())
    .join(' ')

  // Get slide types present
  const slideTypes = slides.map((s) => s.inferred_type).filter(Boolean)

  // Check for sparse deck (fewer than 8 substantive slides or limited text)
  const substantiveSlides = slides.filter((s) => {
    const text = s.extracted_text || ''
    const type = s.inferred_type || ''
    // Exclude cover, contact, appendix from substantive count
    const isSubstantive = !['cover', 'contact', 'appendix', 'other'].includes(type)
    const hasContent = text.length > 50
    return isSubstantive && hasContent
  })

  const avgTextLength = slides.reduce((sum, s) => sum + (s.extracted_text || '').length, 0) / Math.max(slides.length, 1)

  if (substantiveSlides.length < 8 || avgTextLength < 200) {
    result.deck_signals.is_sparse = true
    result.included_categories.push('sparse_high_signal_deck')
    result.category_reasons['sparse_high_signal_deck'] = `Detected sparse deck: ${substantiveSlides.length} substantive slides, avg ${Math.round(avgTextLength)} chars/slide`
  } else {
    result.excluded_categories.push('sparse_high_signal_deck')
    result.category_reasons['sparse_high_signal_deck'] = `Not sparse: ${substantiveSlides.length} substantive slides, avg ${Math.round(avgTextLength)} chars/slide`
  }

  // Check each conditional category for keyword matches
  for (const [categoryKey, categoryConfig] of Object.entries(CONDITIONAL_CATEGORIES)) {
    // Skip sparse_high_signal_deck (handled above via structural detection)
    if (categoryConfig.structuralDetection) continue

    const keywords = categoryConfig.keywords || []
    const matches = []

    for (const keyword of keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        matches.push(keyword)
      }
    }

    result.deck_signals.keyword_matches[categoryKey] = matches

    // Include category if we have 2+ keyword matches (stronger signal)
    if (matches.length >= 2) {
      result.included_categories.push(categoryKey)
      result.deck_signals.detected_models.push(categoryConfig.displayName)
      result.category_reasons[categoryKey] = `Detected ${categoryConfig.displayName}: matched keywords [${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}]`
    } else if (matches.length === 1) {
      // Weak signal - still exclude but note the match
      result.excluded_categories.push(categoryKey)
      result.category_reasons[categoryKey] = `Weak signal for ${categoryConfig.displayName}: only 1 keyword match [${matches[0]}]`
    } else {
      result.excluded_categories.push(categoryKey)
      result.category_reasons[categoryKey] = `No ${categoryConfig.displayName} signals detected`
    }
  }

  // Deduplicate included categories
  result.included_categories = [...new Set(result.included_categories)]

  return result
}

/**
 * Filter rules based on inferred deck context.
 * Only includes rules whose category matches the inferred context.
 *
 * @param {Object[]} rules - Array of rule objects with metadata.category
 * @param {Object} deckContext - Deck context from inferDeckContext()
 * @returns {Object} - Filtered rules and debug info
 */
function filterRulesByContext(rules, deckContext) {
  if (!rules || rules.length === 0) {
    return {
      filteredRules: [],
      all_rules_count: 0,
      injected_rules_count: 0,
      filtered_out_count: 0,
      rules_by_category: {},
    }
  }

  const includedCategories = new Set(deckContext.included_categories.map((c) => c.toLowerCase()))
  const rulesByCategory = {}
  const filteredRules = []
  const filteredOutRules = []

  for (const rule of rules) {
    // Get rule category from metadata or rule_key prefix
    const category = (
      rule.metadata?.category ||
      rule.category ||
      rule.rule_key?.split('_').slice(0, -1).join('_') ||
      'general'
    ).toLowerCase()

    // Track rules by category for debug
    if (!rulesByCategory[category]) {
      rulesByCategory[category] = { included: 0, excluded: 0 }
    }

    // Check if this rule's category is included
    const categoryIncluded = includedCategories.has(category) ||
      // Also check if any included category is a prefix/suffix match
      [...includedCategories].some((inc) => category.includes(inc) || inc.includes(category))

    if (categoryIncluded) {
      filteredRules.push(rule)
      rulesByCategory[category].included++
    } else {
      filteredOutRules.push(rule)
      rulesByCategory[category].excluded++
    }
  }

  return {
    filteredRules,
    all_rules_count: rules.length,
    injected_rules_count: filteredRules.length,
    filtered_out_count: filteredOutRules.length,
    rules_by_category: rulesByCategory,
  }
}

/**
 * Apply deck context filtering to evaluation context.
 * Filters rules based on inferred deck context and updates evalContext.
 *
 * @param {Object} evalContext - Evaluation context from loadEvaluationContext
 * @param {Object[]} slides - Array of slide objects
 * @returns {Object} - Updated evalContext with filtered rules and context debug info
 */
function applyDeckContextFiltering(evalContext, slides) {
  if (!evalContext || !evalContext.rulePack) {
    return {
      ...evalContext,
      deckContext: null,
      contextFilteringApplied: false,
    }
  }

  // Infer deck context from slides
  const deckContext = inferDeckContext(slides)

  // Filter rules based on context
  const filterResult = filterRulesByContext(evalContext.rulePack.rules, deckContext)

  // Create filtered rule pack
  const filteredRulePack = {
    ...evalContext.rulePack,
    rules: filterResult.filteredRules,
    ruleCount: filterResult.injected_rules_count,
    // Preserve original counts for debug
    originalRuleCount: evalContext.rulePack.ruleCount,
    // Recompute aggregations for filtered rules
    ruleKeys: filterResult.filteredRules.map((r) => r.rule_key),
    ruleTypeCounts: {},
    categoryCounts: {},
  }

  // Recompute type and category counts for filtered rules
  for (const rule of filterResult.filteredRules) {
    const ruleType = rule.rule_type || 'general'
    filteredRulePack.ruleTypeCounts[ruleType] = (filteredRulePack.ruleTypeCounts[ruleType] || 0) + 1

    const category = rule.metadata?.category || rule.rule_key?.split('_')[0] || 'general'
    filteredRulePack.categoryCounts[category] = (filteredRulePack.categoryCounts[category] || 0) + 1
  }

  // Build context debug info
  const contextDebug = {
    deck_context_classification: {
      is_sparse: deckContext.deck_signals.is_sparse,
      detected_models: deckContext.deck_signals.detected_models,
    },
    included_rule_categories: deckContext.included_categories,
    excluded_rule_categories: deckContext.excluded_categories,
    category_reasons: deckContext.category_reasons,
    all_rules_loaded_count: filterResult.all_rules_count,
    injected_rules_count: filterResult.injected_rules_count,
    filtered_out_count: filterResult.filtered_out_count,
    rules_by_category: filterResult.rules_by_category,
  }

  console.log(`[v3] Context filtering: ${filterResult.injected_rules_count}/${filterResult.all_rules_count} rules injected`)
  console.log(`[v3] Included categories: ${deckContext.included_categories.join(', ')}`)
  if (deckContext.deck_signals.detected_models.length > 0) {
    console.log(`[v3] Detected models: ${deckContext.deck_signals.detected_models.join(', ')}`)
  }

  return {
    ...evalContext,
    rulePack: filteredRulePack,
    deckContext: contextDebug,
    contextFilteringApplied: true,
  }
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

  // Deck context inference and rule filtering
  inferDeckContext,
  filterRulesByContext,
  applyDeckContextFiltering,

  // Formatting helpers
  formatRulesForPrompt,
}
