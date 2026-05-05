#!/usr/bin/env node

/**
 * Seed canonical investor patterns into the database.
 *
 * This script reads patterns from canonicalPatterns.js and seeds them into
 * the patterns, pattern_sources, and pattern_rubric_map tables in Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-patterns.js
 *
 * Or with npm:
 *   npm run seed:patterns
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')

// Import patterns from the source of truth
const patternsPath = path.join(__dirname, '../netlify/functions/lib/canonicalPatterns.js')
const { PATTERN_VERSION, CANONICAL_PATTERNS } = require(patternsPath)

async function main() {
  console.log('='.repeat(60))
  console.log('Pattern Seed Script')
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

  // Step 1: Load valid question keys from rubric_questions
  console.log('Step 1: Loading valid question keys from rubric_questions')

  const { data: rubricQuestions, error: rubricError } = await supabase
    .from('rubric_questions')
    .select('question_key, slide_type')

  if (rubricError) {
    console.error('Error fetching rubric questions:', rubricError.message)
    process.exit(1)
  }

  const validQuestionKeys = new Set(rubricQuestions.map((q) => q.question_key))
  console.log(`  Found ${validQuestionKeys.size} valid question keys`)
  console.log()

  // Track statistics
  let patternsUpserted = 0
  let sourcesInserted = 0
  let mappingsInserted = 0
  let invalidMappingsSkipped = 0
  const invalidMappings = []

  // Step 2: Process each pattern
  console.log(`Step 2: Processing ${CANONICAL_PATTERNS.length} patterns`)
  console.log()

  for (const pattern of CANONICAL_PATTERNS) {
    console.log(`  Processing: ${pattern.pattern_key}`)

    // Upsert pattern
    const { data: patternData, error: patternError } = await supabase
      .from('patterns')
      .upsert(
        {
          pattern_key: pattern.pattern_key,
          name: pattern.name,
          description: pattern.description,
          category: pattern.category,
          version: PATTERN_VERSION,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'pattern_key',
        }
      )
      .select()
      .single()

    if (patternError) {
      console.error(`    Error upserting pattern: ${patternError.message}`)
      continue
    }

    patternsUpserted++
    const patternId = patternData.id

    // Delete existing sources for this pattern
    const { error: deleteSourcesError } = await supabase
      .from('pattern_sources')
      .delete()
      .eq('pattern_id', patternId)

    if (deleteSourcesError) {
      console.error(`    Error deleting existing sources: ${deleteSourcesError.message}`)
    }

    // Insert sources
    if (pattern.sources && pattern.sources.length > 0) {
      const sourcesToInsert = pattern.sources.map((s) => ({
        pattern_id: patternId,
        source: s.source,
        excerpt: s.excerpt,
      }))

      const { data: insertedSources, error: sourcesError } = await supabase
        .from('pattern_sources')
        .insert(sourcesToInsert)
        .select()

      if (sourcesError) {
        console.error(`    Error inserting sources: ${sourcesError.message}`)
      } else {
        sourcesInserted += insertedSources.length
        console.log(`    Inserted ${insertedSources.length} sources`)
      }
    }

    // Delete existing mappings for this pattern
    const { error: deleteMappingsError } = await supabase
      .from('pattern_rubric_map')
      .delete()
      .eq('pattern_id', patternId)

    if (deleteMappingsError) {
      console.error(`    Error deleting existing mappings: ${deleteMappingsError.message}`)
    }

    // Insert mappings (with validation)
    if (pattern.rubric_mappings && pattern.rubric_mappings.length > 0) {
      const validMappings = []
      const skippedMappings = []

      for (const mapping of pattern.rubric_mappings) {
        if (validQuestionKeys.has(mapping.question_key)) {
          validMappings.push({
            pattern_id: patternId,
            question_key: mapping.question_key,
            strength: mapping.strength,
          })
        } else {
          skippedMappings.push(mapping.question_key)
          invalidMappings.push({
            pattern_key: pattern.pattern_key,
            question_key: mapping.question_key,
          })
        }
      }

      if (skippedMappings.length > 0) {
        console.warn(`    Warning: Invalid question keys: ${skippedMappings.join(', ')}`)
        invalidMappingsSkipped += skippedMappings.length
      }

      if (validMappings.length > 0) {
        const { data: insertedMappings, error: mappingsError } = await supabase
          .from('pattern_rubric_map')
          .insert(validMappings)
          .select()

        if (mappingsError) {
          console.error(`    Error inserting mappings: ${mappingsError.message}`)
        } else {
          mappingsInserted += insertedMappings.length
          console.log(`    Inserted ${insertedMappings.length} mappings`)
        }
      }
    }
  }

  // Step 3: Verification
  console.log()
  console.log('='.repeat(60))
  console.log('Verification')
  console.log('='.repeat(60))
  console.log()

  // Count patterns
  const { data: patternCount, error: patternCountError } = await supabase
    .from('patterns')
    .select('id', { count: 'exact' })
    .eq('version', PATTERN_VERSION)

  if (!patternCountError) {
    console.log(`Patterns in database (version ${PATTERN_VERSION}): ${patternCount.length}`)
  }

  // Count sources
  const { data: sourceCount, error: sourceCountError } = await supabase
    .from('pattern_sources')
    .select('id', { count: 'exact' })

  if (!sourceCountError) {
    console.log(`Total pattern sources: ${sourceCount.length}`)
  }

  // Count mappings
  const { data: mappingCount, error: mappingCountError } = await supabase
    .from('pattern_rubric_map')
    .select('id', { count: 'exact' })

  if (!mappingCountError) {
    console.log(`Total pattern-rubric mappings: ${mappingCount.length}`)
  }

  // Summary
  console.log()
  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log()
  console.log(`Pattern version: ${PATTERN_VERSION}`)
  console.log(`Patterns upserted: ${patternsUpserted}`)
  console.log(`Sources inserted: ${sourcesInserted}`)
  console.log(`Mappings inserted: ${mappingsInserted}`)
  console.log(`Invalid mappings skipped: ${invalidMappingsSkipped}`)

  if (invalidMappings.length > 0) {
    console.log()
    console.log('Invalid mappings (question_key not found in rubric_questions):')
    for (const invalid of invalidMappings) {
      console.log(`  ${invalid.pattern_key} -> ${invalid.question_key}`)
    }
  }

  console.log()

  if (patternsUpserted === CANONICAL_PATTERNS.length && invalidMappingsSkipped === 0) {
    console.log('Seed completed successfully.')
  } else if (patternsUpserted === CANONICAL_PATTERNS.length && invalidMappingsSkipped > 0) {
    console.log('Seed completed with warnings (some mappings skipped).')
  } else {
    console.log(`Warning: Only ${patternsUpserted}/${CANONICAL_PATTERNS.length} patterns were upserted.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
