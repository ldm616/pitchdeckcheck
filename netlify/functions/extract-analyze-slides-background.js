const { getSupabaseClient, verifyDeckAccess, setDeckStatus } = require('./lib/supabase')
const { extractSlides } = require('./lib/extractSlides')
const { analyzeSlides } = require('./lib/analyzeSlides')
const { generateFullReport } = require('./lib/generateFreeReport')

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

  // Run extraction
  console.log(`Starting extraction for deck ${deck_id}`)
  const extractResult = await extractSlides(supabase, deck_id, deck.file_path)

  if (!extractResult.success) {
    console.error(`Extraction failed for deck ${deck_id}:`, extractResult.error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        deck_id,
        error: extractResult.error,
      }),
    }
  }

  console.log(`Extraction complete for deck ${deck_id}: ${extractResult.slideCount} slides`)

  // Run analysis
  console.log(`Starting analysis for deck ${deck_id}`)
  const analyzeResult = await analyzeSlides(supabase, deck_id)

  if (!analyzeResult.success) {
    console.error(`Analysis failed for deck ${deck_id}:`, analyzeResult.error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        deck_id,
        error: analyzeResult.error,
      }),
    }
  }

  console.log(`Analysis complete for deck ${deck_id}: ${analyzeResult.analyzedCount} slides analyzed`)

  // Generate full report (also derives free report)
  console.log(`Starting report generation for deck ${deck_id}`)
  const reportResult = await generateFullReport(supabase, deck_id)

  if (!reportResult.success) {
    console.error(`Report generation failed for deck ${deck_id}:`, reportResult.error)
    await setDeckStatus(supabase, deck_id, 'failed', reportResult.error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        deck_id,
        error: reportResult.error,
      }),
    }
  }

  console.log(`Report ready for deck ${deck_id}: grade ${reportResult.overallGrade}`)

  // Set final status to ready
  await setDeckStatus(supabase, deck_id, 'ready', null)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      deck_id,
      slide_count: extractResult.slideCount,
      analyzed_count: analyzeResult.analyzedCount,
      report_id: reportResult.reportId,
      overall_grade: reportResult.overallGrade,
    }),
  }
}
