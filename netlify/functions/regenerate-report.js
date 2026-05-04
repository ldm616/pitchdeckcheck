const { getSupabaseClient } = require('./lib/supabase')
const { generateFreeReport } = require('./lib/generateFreeReport')

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

  // Verify deck exists
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck not found' }),
    }
  }

  // Regenerate the report
  const result = await generateFreeReport(supabase, deck_id)

  if (!result.success) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: result.error || 'Failed to regenerate report' }),
    }
  }

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
}
