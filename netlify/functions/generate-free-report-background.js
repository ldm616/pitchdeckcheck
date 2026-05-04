const { getSupabaseClient, verifyDeckAccess, setDeckStatus } = require('./lib/supabase')
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

  // Verify deck is analyzed
  const { data: deckStatus } = await supabase
    .from('decks')
    .select('processing_status')
    .eq('id', deck_id)
    .single()

  if (!deckStatus || !['analyzed', 'ready', 'generating_free'].includes(deckStatus.processing_status)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Deck must be analyzed before generating report' }),
    }
  }

  console.log(`Starting free report generation for deck ${deck_id}`)

  const result = await generateFreeReport(supabase, deck_id)

  if (result.success) {
    await setDeckStatus(supabase, deck_id, 'ready', null)
    console.log(`Free report ready for deck ${deck_id}: grade ${result.overallGrade}`)
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
    console.error(`Free report failed for deck ${deck_id}:`, result.error)
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
