const { getSupabaseClient, verifyDeckAccess, verifyReportCode } = require('./lib/supabase')

// Signed URL expiration: 1 hour
const SIGNED_URL_EXPIRATION_SECONDS = 3600

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

  const { deck_id, access_token, report_code } = body

  // Support both lookup methods:
  // 1. report_code (new, simpler)
  // 2. deck_id + access_token (legacy, backward compatible)
  if (!report_code && (!deck_id || !access_token)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'report_code or deck_id+access_token required' }),
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

  // Verify access and get deck_id
  let deckId
  let deckReportCode
  if (report_code) {
    // Lookup by report code
    const { valid, error: codeError, deck } = await verifyReportCode(supabase, report_code)
    if (!valid) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: codeError }),
      }
    }
    deckId = deck.id
    deckReportCode = deck.report_code
  } else {
    // Legacy lookup by deck_id + access_token
    const { valid, error: accessError } = await verifyDeckAccess(supabase, deck_id, access_token)
    if (!valid) {
      const statusCode = accessError === 'Deck not found' ? 404 : 403
      return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: accessError }),
      }
    }
    deckId = deck_id
    // Fetch report_code for legacy lookups
    const { data: deckData } = await supabase
      .from('decks')
      .select('report_code')
      .eq('id', deck_id)
      .single()
    deckReportCode = deckData?.report_code
  }

  // Fetch latest free report for this deck
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_type, status, overall_grade, content, generation_error, created_at')
    .eq('deck_id', deckId)
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
        deck_id: deckId,
        report_code: deckReportCode,
        report_type: report.report_type,
        status: report.status,
        generation_error: report.generation_error,
      }),
    }
  }

  // Report is ready - fetch slides with image paths
  const { data: slides, error: slidesError } = await supabase
    .from('slides')
    .select('slide_number, image_path, inferred_type')
    .eq('deck_id', deckId)
    .order('slide_number', { ascending: true })

  if (slidesError) {
    console.error('Slides lookup error:', slidesError)
    // Continue without slides - don't fail the whole request
  }

  // Generate signed URLs for each slide image
  const slidesWithUrls = []
  if (slides && slides.length > 0) {
    for (const slide of slides) {
      let image_url = null

      if (slide.image_path) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('slide-images')
          .createSignedUrl(slide.image_path, SIGNED_URL_EXPIRATION_SECONDS)

        if (signedUrlError) {
          console.error(`Failed to generate signed URL for slide ${slide.slide_number}:`, signedUrlError)
        } else {
          image_url = signedUrlData.signedUrl
        }
      }

      slidesWithUrls.push({
        slide_number: slide.slide_number,
        image_path: slide.image_path,
        image_url,
        inferred_type: slide.inferred_type,
      })
    }
  }

  // Return full_report for admin review (includes fixes, confidence, full question breakdown)
  // Falls back to free_report or raw content for legacy reports
  const reportContent = report.content?.full_report || report.content?.free_report || report.content

  // Include v1_report if present (founder-facing format)
  if (report.content?.v1_report) {
    reportContent.v1_report = report.content.v1_report
  }

  // Include v3 debug data if present (for admin viewing)
  if (report.content?.debug) {
    reportContent.debug = report.content.debug
  }

  // Return full report content with slides
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id: deckId,
      report_code: deckReportCode,
      report_type: report.report_type,
      status: report.status,
      overall_grade: report.overall_grade,
      report_created_at: report.created_at,
      content: reportContent,
      slides: slidesWithUrls,
    }),
  }
}
