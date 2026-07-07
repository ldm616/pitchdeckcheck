/**
 * Generate (or regenerate) report for an existing analyzed deck.
 *
 * This is a background function (15-minute timeout) that:
 * 1. Verifies admin password
 * 2. Validates deck exists and is analyzed
 * 3. Generates full report (deletes existing, creates new)
 * 4. Sets final status
 *
 * Returns 202 immediately (background function behavior).
 * Frontend should poll get-deck-status with admin_password to track progress.
 */
const { getSupabaseClient, setDeckStatus } = require('./lib/supabase')
const { generateFullReport } = require('./lib/reportGenerator')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const { deck_id, admin_password } = body

  // Report generation uses the artifact-native evaluator (the backend default).
  // No architecture switching from the client.

  if (!deck_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'deck_id is required' }),
    }
  }

  // Verify admin password
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedPassword || admin_password !== expectedPassword) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid admin password' }),
    }
  }

  let supabase
  try {
    supabase = getSupabaseClient()
  } catch (err) {
    console.error('Supabase client error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  // Verify deck exists and is analyzed
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, processing_status')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck not found' }),
    }
  }

  if (!['analyzed', 'ready', 'failed'].includes(deck.processing_status)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck must be analyzed before regenerating report' }),
    }
  }

  console.log(`Starting report regeneration for deck ${deck_id}`)

  // Generate full report (artifact-native evaluator by default).
  const result = await generateFullReport(supabase, deck_id)

  if (result.success) {
    await setDeckStatus(supabase, deck_id, 'ready', null)
    console.log(`Report regenerated for deck ${deck_id}: grade ${result.overallGrade}`)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        deck_id,
        report_id: result.reportId,
        overall_grade: result.overallGrade,
      }),
    }
  } else {
    await setDeckStatus(supabase, deck_id, 'failed', result.error)
    console.error(`Report regeneration failed for deck ${deck_id}:`, result.error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        deck_id,
        error: result.error,
      }),
    }
  }
}
