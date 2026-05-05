#!/usr/bin/env node

/**
 * Seed rubric questions into the database.
 *
 * This script reads the current rubric from rubrics.js and seeds it into
 * the rubric_versions and rubric_questions tables in Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-rubrics.js
 *
 * Or with npm:
 *   npm run seed:rubrics
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Import rubrics from the source of truth
const rubricsPath = path.join(__dirname, '../netlify/functions/lib/rubrics.js')
const { RUBRIC_VERSION, RUBRICS } = require(rubricsPath)

async function main() {
  console.log('='.repeat(60))
  console.log('Rubric Seed Script')
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

  // Step 1: Upsert the rubric version
  console.log(`Step 1: Upserting rubric version: ${RUBRIC_VERSION}`)

  const { data: versionData, error: versionError } = await supabase
    .from('rubric_versions')
    .upsert(
      {
        version_key: RUBRIC_VERSION,
        description: 'Rubric question set from rubrics.js',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'version_key',
      }
    )
    .select()

  if (versionError) {
    console.error('Error upserting rubric version:', versionError.message)
    process.exit(1)
  }

  console.log(`  Rubric version upserted: ${RUBRIC_VERSION}`)

  // Step 2: Set all other versions to inactive
  console.log()
  console.log('Step 2: Setting other versions to inactive')

  const { data: deactivatedData, error: deactivateError } = await supabase
    .from('rubric_versions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .neq('version_key', RUBRIC_VERSION)
    .select()

  if (deactivateError) {
    console.error('Error deactivating other versions:', deactivateError.message)
    // Continue anyway - this is not fatal
  } else {
    const deactivatedCount = deactivatedData?.length || 0
    console.log(`  Deactivated ${deactivatedCount} other version(s)`)
  }

  // Step 3: Upsert all questions
  console.log()
  console.log('Step 3: Upserting rubric questions')

  const slideTypes = Object.keys(RUBRICS)
  let totalQuestions = 0
  let upsertedQuestions = 0

  for (const slideType of slideTypes) {
    const questions = RUBRICS[slideType]

    for (const q of questions) {
      totalQuestions++

      const { error: questionError } = await supabase.from('rubric_questions').upsert(
        {
          version_key: RUBRIC_VERSION,
          question_key: q.id,
          slide_type: slideType,
          question: q.question,
          weight: q.weight,
          importance: q.importance,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'version_key,question_key',
        }
      )

      if (questionError) {
        console.error(`  Error upserting question ${q.id}:`, questionError.message)
      } else {
        upsertedQuestions++
      }
    }
  }

  console.log(`  Upserted ${upsertedQuestions}/${totalQuestions} questions`)

  // Step 4: Verification
  console.log()
  console.log('='.repeat(60))
  console.log('Verification')
  console.log('='.repeat(60))

  // Get active version
  const { data: activeVersion, error: activeError } = await supabase
    .from('rubric_versions')
    .select('version_key, is_active, created_at, updated_at')
    .eq('is_active', true)
    .single()

  if (activeError) {
    console.error('Error fetching active version:', activeError.message)
  } else {
    console.log()
    console.log('Active rubric version:')
    console.log(`  version_key: ${activeVersion.version_key}`)
    console.log(`  is_active: ${activeVersion.is_active}`)
    console.log(`  updated_at: ${activeVersion.updated_at}`)
  }

  // Count questions by slide type
  const { data: questionCounts, error: countError } = await supabase
    .from('rubric_questions')
    .select('slide_type')
    .eq('version_key', RUBRIC_VERSION)

  if (countError) {
    console.error('Error counting questions:', countError.message)
  } else {
    // Group by slide type
    const countsByType = {}
    for (const row of questionCounts) {
      countsByType[row.slide_type] = (countsByType[row.slide_type] || 0) + 1
    }

    console.log()
    console.log('Questions in database:')
    console.log(`  Total: ${questionCounts.length}`)
    console.log(`  Slide types: ${Object.keys(countsByType).length}`)
    console.log()
    console.log('By slide type:')
    for (const [type, count] of Object.entries(countsByType).sort()) {
      console.log(`  ${type}: ${count}`)
    }
  }

  // Compare with source
  console.log()
  console.log('Source comparison:')
  console.log(`  rubrics.js version: ${RUBRIC_VERSION}`)
  console.log(`  rubrics.js slide types: ${slideTypes.length}`)
  console.log(`  rubrics.js total questions: ${totalQuestions}`)

  // Summary
  console.log()
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log()
  console.log(`Rubric version: ${RUBRIC_VERSION}`)
  console.log(`Questions upserted: ${upsertedQuestions}`)
  console.log(`Slide types covered: ${slideTypes.length}`)
  console.log(`Active version: ${activeVersion?.version_key || 'unknown'}`)
  console.log()

  if (upsertedQuestions === totalQuestions) {
    console.log('Seed completed successfully.')
  } else {
    console.log(`Warning: Only ${upsertedQuestions}/${totalQuestions} questions were upserted.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
