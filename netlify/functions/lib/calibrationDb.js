/**
 * Calibration Database Client
 *
 * Primary persistence layer for calibration data.
 * Uses Supabase tables:
 * - calibration_decks
 * - calibration_runs
 * - calibration_results
 * - calibration_flags
 *
 * Falls back to local JSON if DB unavailable.
 */

const { getSupabaseClient } = require('./supabase')
const fs = require('fs')
const path = require('path')

const LOCAL_REGISTRY_PATH = path.join(__dirname, '../../..', 'model/calibration/calibrationRegistry.json')
const LOCAL_RESULTS_PATH = path.join(__dirname, '../../..', 'model/calibration/results')

// =============================================================================
// CALIBRATION DECKS
// =============================================================================

/**
 * Get all active calibration decks from DB, fallback to local JSON.
 */
async function getCalibrationDecks(options = {}) {
  const { activeOnly = true, archetype = null } = options

  try {
    const supabase = getSupabaseClient()

    let query = supabase
      .from('calibration_decks')
      .select('*')
      .order('company', { ascending: true })

    if (activeOnly) {
      query = query.eq('active', true)
    }

    if (archetype) {
      query = query.eq('archetype', archetype)
    }

    const { data, error } = await query

    if (error) {
      console.log('[calibration-db] DB error, falling back to local:', error.message)
      return getLocalCalibrationDecks(options)
    }

    if (!data || data.length === 0) {
      console.log('[calibration-db] No decks in DB, falling back to local')
      return getLocalCalibrationDecks(options)
    }

    console.log(`[calibration-db] Loaded ${data.length} calibration decks from DB`)
    return data

  } catch (err) {
    console.log('[calibration-db] DB unavailable, falling back to local:', err.message)
    return getLocalCalibrationDecks(options)
  }
}

/**
 * Get calibration decks from local JSON file.
 */
function getLocalCalibrationDecks(options = {}) {
  const { activeOnly = true, archetype = null } = options

  try {
    const registry = JSON.parse(fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8'))
    let decks = registry.decks || []

    if (activeOnly) {
      decks = decks.filter(d => d.active !== false)
    }

    if (archetype) {
      decks = decks.filter(d => d.archetype === archetype)
    }

    console.log(`[calibration-db] Loaded ${decks.length} calibration decks from local JSON`)
    return decks

  } catch (err) {
    console.error('[calibration-db] Failed to load local registry:', err.message)
    return []
  }
}

/**
 * Get a single calibration deck by ID.
 */
async function getCalibrationDeck(deckId) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_decks')
      .select('*')
      .eq('id', deckId)
      .single()

    if (error || !data) {
      return getLocalCalibrationDeck(deckId)
    }

    return data

  } catch (err) {
    return getLocalCalibrationDeck(deckId)
  }
}

function getLocalCalibrationDeck(deckId) {
  try {
    const registry = JSON.parse(fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8'))
    return registry.decks.find(d => d.id === deckId) || null
  } catch (err) {
    return null
  }
}

/**
 * Upsert a calibration deck to DB.
 */
async function upsertCalibrationDeck(deck) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_decks')
      .upsert(deck, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[calibration-db] Failed to upsert deck:', error.message)
      return null
    }

    return data

  } catch (err) {
    console.error('[calibration-db] DB unavailable for upsert:', err.message)
    return null
  }
}

// =============================================================================
// CALIBRATION RUNS
// =============================================================================

/**
 * Create a new calibration run.
 */
async function createCalibrationRun(runData) {
  try {
    const supabase = getSupabaseClient()

    const run = {
      id: runData.id || generateUUID(),
      architecture_version: runData.architecture_version || 'v4',
      prompt_version: runData.prompt_version || 'unknown',
      rule_pack_version: runData.rule_pack_version || 'unknown',
      git_commit: runData.git_commit || null,
      status: 'running',
      started_at: new Date().toISOString(),
      completed_at: null,
      summary: null,
      ...runData
    }

    const { data, error } = await supabase
      .from('calibration_runs')
      .insert(run)
      .select()
      .single()

    if (error) {
      console.error('[calibration-db] Failed to create run:', error.message)
      return { ...run, _local: true }
    }

    console.log(`[calibration-db] Created calibration run: ${data.id}`)
    return data

  } catch (err) {
    console.error('[calibration-db] DB unavailable for run creation:', err.message)
    const run = {
      id: runData.id || generateUUID(),
      status: 'running',
      started_at: new Date().toISOString(),
      _local: true,
      ...runData
    }
    return run
  }
}

/**
 * Update calibration run status and summary.
 */
async function updateCalibrationRun(runId, updates) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_runs')
      .update(updates)
      .eq('id', runId)
      .select()
      .single()

    if (error) {
      console.error('[calibration-db] Failed to update run:', error.message)
      return null
    }

    return data

  } catch (err) {
    console.error('[calibration-db] DB unavailable for run update:', err.message)
    return null
  }
}

/**
 * Complete a calibration run with final summary.
 */
async function completeCalibrationRun(runId, summary) {
  return updateCalibrationRun(runId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    summary
  })
}

/**
 * Get recent calibration runs.
 */
async function getRecentRuns(limit = 10) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[calibration-db] Failed to get runs:', error.message)
      return []
    }

    return data

  } catch (err) {
    return []
  }
}

// =============================================================================
// CALIBRATION RESULTS
// =============================================================================

/**
 * Store evaluation result for a deck in a calibration run.
 */
async function storeCalibrationResult(result) {
  try {
    const supabase = getSupabaseClient()

    const record = {
      id: result.id || generateUUID(),
      run_id: result.run_id,
      deck_id: result.deck_id,
      expected_grade_range: result.expected_grade_range,
      actual_grade: result.actual_grade,
      actual_score: result.actual_score,
      within_expected_range: result.within_expected_range,
      slide_grades: result.slide_grades,
      inflation_flags: result.inflation_flags || [],
      under_scoring_flags: result.under_scoring_flags || [],
      generic_feedback_flags: result.generic_feedback_flags || [],
      signal_override_applied: result.signal_override_applied,
      fixes_suppressed: result.fixes_suppressed,
      result_summary: result.result_summary || {},
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('calibration_results')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[calibration-db] Failed to store result:', error.message)
      // Store locally as fallback
      storeLocalResult(record)
      return { ...record, _local: true }
    }

    return data

  } catch (err) {
    console.error('[calibration-db] DB unavailable for result storage:', err.message)
    const record = { ...result, _local: true }
    storeLocalResult(record)
    return record
  }
}

function storeLocalResult(result) {
  try {
    const resultsDir = LOCAL_RESULTS_PATH
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    const filename = `${result.run_id}_${result.deck_id}.json`
    const filepath = path.join(resultsDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2))
    console.log(`[calibration-db] Stored result locally: ${filename}`)
  } catch (err) {
    console.error('[calibration-db] Failed to store local result:', err.message)
  }
}

/**
 * Get results for a calibration run.
 */
async function getRunResults(runId) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_results')
      .select('*')
      .eq('run_id', runId)
      .order('deck_id', { ascending: true })

    if (error) {
      console.error('[calibration-db] Failed to get results:', error.message)
      return getLocalRunResults(runId)
    }

    return data || []

  } catch (err) {
    return getLocalRunResults(runId)
  }
}

function getLocalRunResults(runId) {
  try {
    const resultsDir = LOCAL_RESULTS_PATH
    if (!fs.existsSync(resultsDir)) return []

    const files = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith(runId) && f.endsWith('.json'))

    return files.map(f => {
      const content = fs.readFileSync(path.join(resultsDir, f), 'utf8')
      return JSON.parse(content)
    })
  } catch (err) {
    return []
  }
}

// =============================================================================
// CALIBRATION FLAGS
// =============================================================================

/**
 * Store a calibration flag (QA failure).
 */
async function storeCalibrationFlag(flag) {
  try {
    const supabase = getSupabaseClient()

    const record = {
      id: flag.id || generateUUID(),
      run_id: flag.run_id,
      deck_id: flag.deck_id,
      flag_type: flag.flag_type,
      severity: flag.severity || 'warning',
      slide_number: flag.slide_number || null,
      slide_type: flag.slide_type || null,
      description: flag.description,
      expected_value: flag.expected_value || null,
      actual_value: flag.actual_value || null,
      metadata: flag.metadata || {},
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('calibration_flags')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[calibration-db] Failed to store flag:', error.message)
      return { ...record, _local: true }
    }

    return data

  } catch (err) {
    console.error('[calibration-db] DB unavailable for flag storage:', err.message)
    return { ...flag, _local: true }
  }
}

/**
 * Get flags for a calibration run.
 */
async function getRunFlags(runId) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_flags')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[calibration-db] Failed to get flags:', error.message)
      return []
    }

    return data || []

  } catch (err) {
    return []
  }
}

/**
 * Get flags by type across runs.
 */
async function getFlagsByType(flagType, limit = 100) {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('calibration_flags')
      .select('*')
      .eq('flag_type', flagType)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data || []

  } catch (err) {
    return []
  }
}

// =============================================================================
// ARCHETYPE HELPERS
// =============================================================================

/**
 * Get archetype configuration from registry.
 */
function getArchetypeConfig(archetypeId) {
  try {
    const registry = JSON.parse(fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8'))
    return registry.archetypes.find(a => a.id === archetypeId) || null
  } catch (err) {
    return null
  }
}

/**
 * Get all archetype configurations.
 */
function getAllArchetypes() {
  try {
    const registry = JSON.parse(fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8'))
    return registry.archetypes || []
  } catch (err) {
    return []
  }
}

/**
 * Get stage configuration.
 */
function getStageConfig(stageId) {
  try {
    const registry = JSON.parse(fs.readFileSync(LOCAL_REGISTRY_PATH, 'utf8'))
    return registry.stages.find(s => s.id === stageId) || null
  } catch (err) {
    return null
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Decks
  getCalibrationDecks,
  getLocalCalibrationDecks,
  getCalibrationDeck,
  upsertCalibrationDeck,

  // Runs
  createCalibrationRun,
  updateCalibrationRun,
  completeCalibrationRun,
  getRecentRuns,

  // Results
  storeCalibrationResult,
  getRunResults,

  // Flags
  storeCalibrationFlag,
  getRunFlags,
  getFlagsByType,

  // Archetypes
  getArchetypeConfig,
  getAllArchetypes,
  getStageConfig,

  // Utils
  generateUUID,
}
