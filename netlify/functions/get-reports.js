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

  const { admin_password } = body

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

  // Fetch reports with deck info, ordered by created_at desc
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select(`
      id,
      deck_id,
      report_type,
      status,
      overall_grade,
      created_at,
      decks (
        id,
        email,
        original_filename,
        slide_count,
        access_token,
        created_at
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (reportsError) {
    console.error('Reports lookup error:', reportsError)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch reports' }),
    }
  }

  // Transform to flat structure
  const transformedReports = (reports || []).map((report) => ({
    id: report.id,
    deck_id: report.deck_id,
    report_type: report.report_type,
    status: report.status,
    overall_grade: report.overall_grade,
    report_created_at: report.created_at,
    deck_created_at: report.decks?.created_at || null,
    email: report.decks?.email || null,
    original_filename: report.decks?.original_filename || null,
    slide_count: report.decks?.slide_count || null,
    access_token: report.decks?.access_token || null,
  }))

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      reports: transformedReports,
    }),
  }
}
