#!/usr/bin/env node
/**
 * Seed Calibration Decks to Supabase
 *
 * Reads from model/calibration/calibrationRegistry.json
 * and upserts to calibration_decks table in Supabase.
 *
 * Usage:
 *   node scripts/seedCalibrationDecks.js
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const REGISTRY_PATH = path.join(__dirname, '..', 'model/calibration/calibrationRegistry.json')

async function seedCalibrationDecks() {
  console.log('========================================')
  console.log('Seeding Calibration Decks')
  console.log('========================================')

  // Check env vars
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.log('Set these environment variables or create a .env file')
    process.exit(1)
  }

  // Load registry
  console.log(`Loading registry from: ${REGISTRY_PATH}`)

  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('ERROR: Registry file not found')
    process.exit(1)
  }

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'))
  const decks = registry.decks || []

  console.log(`Found ${decks.length} decks in registry`)

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check if table exists by trying to query it
  const { error: checkError } = await supabase
    .from('calibration_decks')
    .select('id')
    .limit(1)

  if (checkError) {
    console.error('ERROR: Could not access calibration_decks table')
    console.error('Error:', checkError.message)
    console.log('')
    console.log('The table may not exist. Create it with this SQL:')
    console.log('')
    console.log(`
CREATE TABLE calibration_decks (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  archetype TEXT NOT NULL,
  era TEXT,
  stage TEXT NOT NULL,
  year INTEGER,
  deck_file TEXT,
  expected_grade_range JSONB,
  strengths JSONB,
  known_weaknesses JSONB,
  must_not_happen JSONB,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calibration_runs (
  id TEXT PRIMARY KEY,
  architecture_version TEXT,
  prompt_version TEXT,
  rule_pack_version TEXT,
  git_commit TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  summary JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calibration_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES calibration_runs(id),
  deck_id TEXT NOT NULL REFERENCES calibration_decks(id),
  expected_grade_range JSONB,
  actual_grade TEXT,
  actual_score NUMERIC,
  within_expected_range BOOLEAN,
  slide_grades JSONB,
  inflation_flags JSONB,
  under_scoring_flags JSONB,
  generic_feedback_flags JSONB,
  signal_override_applied BOOLEAN,
  fixes_suppressed INTEGER,
  result_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE calibration_flags (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES calibration_runs(id),
  deck_id TEXT REFERENCES calibration_decks(id),
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  slide_number INTEGER,
  slide_type TEXT,
  description TEXT,
  expected_value TEXT,
  actual_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calibration_decks_archetype ON calibration_decks(archetype);
CREATE INDEX idx_calibration_decks_active ON calibration_decks(active);
CREATE INDEX idx_calibration_results_run_id ON calibration_results(run_id);
CREATE INDEX idx_calibration_results_deck_id ON calibration_results(deck_id);
CREATE INDEX idx_calibration_flags_run_id ON calibration_flags(run_id);
CREATE INDEX idx_calibration_flags_flag_type ON calibration_flags(flag_type);
    `)
    process.exit(1)
  }

  // Upsert each deck
  let successCount = 0
  let errorCount = 0

  for (const deck of decks) {
    console.log(`  Upserting: ${deck.company} (${deck.id})`)

    const record = {
      id: deck.id,
      company: deck.company,
      archetype: deck.archetype,
      era: deck.era || null,
      stage: deck.stage,
      year: deck.year || null,
      deck_file: deck.deck_file || null,
      expected_grade_range: deck.expected_grade_range || null,
      strengths: deck.strengths || [],
      known_weaknesses: deck.known_weaknesses || [],
      must_not_happen: deck.must_not_happen || [],
      notes: deck.notes || null,
      active: deck.active !== false,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('calibration_decks')
      .upsert(record, { onConflict: 'id' })

    if (error) {
      console.error(`    ERROR: ${error.message}`)
      errorCount++
    } else {
      console.log(`    OK`)
      successCount++
    }
  }

  console.log('')
  console.log('========================================')
  console.log(`Seeding complete`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log('========================================')

  // Also seed archetypes as a separate reference (optional)
  if (registry.archetypes) {
    console.log('')
    console.log('Archetype definitions available in registry:')
    for (const arch of registry.archetypes) {
      console.log(`  - ${arch.id}: ${arch.name}`)
    }
  }

  process.exit(errorCount > 0 ? 1 : 0)
}

// Run if called directly
if (require.main === module) {
  seedCalibrationDecks().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

module.exports = { seedCalibrationDecks }
