const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function setDeckStatus(supabase, deckId, status, error = null, slideCount = null) {
  const update = {
    processing_status: status,
    processing_error: error,
  }
  if (slideCount !== null) {
    update.slide_count = slideCount
  }
  await supabase.from('decks').update(update).eq('id', deckId)
}

async function verifyDeckAccess(supabase, deckId, accessToken) {
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, file_path, access_token')
    .eq('id', deckId)
    .single()

  if (deckError || !deck) {
    return { valid: false, error: 'Deck not found', deck: null }
  }

  if (deck.access_token !== accessToken) {
    return { valid: false, error: 'Invalid access token', deck: null }
  }

  return { valid: true, error: null, deck }
}

async function verifyReportCode(supabase, reportCode) {
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, file_path, report_code')
    .eq('report_code', reportCode)
    .single()

  if (deckError || !deck) {
    return { valid: false, error: 'Report not found', deck: null }
  }

  return { valid: true, error: null, deck }
}

module.exports = {
  getSupabaseClient,
  setDeckStatus,
  verifyDeckAccess,
  verifyReportCode,
}
