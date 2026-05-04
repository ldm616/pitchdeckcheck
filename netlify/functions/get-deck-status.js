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

  const { deck_id, access_token } = body

  if (!deck_id || !access_token) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'deck_id and access_token are required' }),
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

  if (deck.access_token !== access_token) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid access token' }),
    }
  }

  const { count: analyzedCount, error: countError } = await supabase
    .from('slides')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deck_id)
    .not('extracted_text', 'is', null)

  if (countError) {
    console.error('Slide count error:', countError)
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
    }),
  }
}
