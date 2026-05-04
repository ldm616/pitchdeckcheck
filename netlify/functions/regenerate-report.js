const { getSupabaseClient, setDeckStatus } = require('./lib/supabase')

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

  // Get deck with access_token
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, access_token, processing_status')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck not found' }),
    }
  }

  // Set status to generating_free so polling can track progress
  await setDeckStatus(supabase, deck_id, 'generating_free', null)

  // Return credentials for polling - frontend will trigger background function
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      deck_id,
      access_token: deck.access_token,
    }),
  }
}
