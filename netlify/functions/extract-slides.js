const { getSupabaseClient, verifyDeckAccess } = require('./lib/supabase')
const { extractSlides } = require('./lib/extractSlides')

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

  const { valid, error: accessError, deck } = await verifyDeckAccess(supabase, deck_id, access_token)

  if (!valid) {
    const statusCode = accessError === 'Deck not found' ? 404 : 403
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: accessError }),
    }
  }

  const result = await extractSlides(supabase, deck_id, deck.file_path)

  if (!result.success) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: result.error }),
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id,
      slide_count: result.slideCount,
      slides: result.slides,
    }),
  }
}
