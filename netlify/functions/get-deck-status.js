/**
 * Get deck processing status for polling.
 *
 * Accepts either:
 * - access_token (for user polling their own deck)
 * - admin_password (for admin polling any deck)
 */
const { getSupabaseClient } = require('./lib/supabase')

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

  const { deck_id, access_token, admin_password } = body

  if (!deck_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'deck_id is required' }),
    }
  }

  // Must provide either access_token or admin_password
  if (!access_token && !admin_password) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'access_token or admin_password is required' }),
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

  // Fetch deck
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, access_token, processing_status, processing_error, slide_count')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    console.error('Deck lookup error:', deckError)
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck not found' }),
    }
  }

  // Verify authorization
  if (admin_password) {
    // Admin auth
    const expectedPassword = process.env.ADMIN_PASSWORD
    if (!expectedPassword || admin_password !== expectedPassword) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid admin password' }),
      }
    }
  } else if (access_token) {
    // User auth
    if (deck.access_token !== access_token) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid access token' }),
      }
    }
  }

  // Count analyzed slides
  const { count: analyzedCount, error: countError } = await supabase
    .from('slides')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deck_id)
    .not('extracted_text', 'is', null)

  if (countError) {
    console.error('Slide count error:', countError)
  }

  // Fetch latest report status
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('status, overall_grade')
    .eq('deck_id', deck_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (reportError && reportError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" - that's OK
    console.error('Report lookup error:', reportError)
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id: deck.id,
      processing_status: deck.processing_status,
      processing_error: deck.processing_error,
      slide_count: deck.slide_count,
      analyzed_slide_count: analyzedCount || 0,
      report: report
        ? {
            status: report.status,
            overall_grade: report.overall_grade,
          }
        : null,
    }),
  }
}
