const { getSupabaseClient, verifyDeckAccess } = require('./lib/supabase')

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

  const { valid, error: accessError } = await verifyDeckAccess(supabase, deck_id, access_token)

  if (!valid) {
    const statusCode = accessError === 'Deck not found' ? 404 : 403
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: accessError }),
    }
  }

  // Fetch latest free report for this deck
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_type, status, overall_grade, content, generation_error, created_at')
    .eq('deck_id', deck_id)
    .eq('report_type', 'free')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (reportError) {
    if (reportError.code === 'PGRST116') {
      // No rows returned
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No report found for this deck' }),
      }
    }
    console.error('Report lookup error:', reportError)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch report' }),
    }
  }

  // If report is not ready, return status
  if (report.status !== 'ready') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deck_id,
        report_type: report.report_type,
        status: report.status,
        generation_error: report.generation_error,
      }),
    }
  }

  // Report is ready - return full content
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id,
      report_type: report.report_type,
      status: report.status,
      overall_grade: report.overall_grade,
      content: report.content,
    }),
  }
}
