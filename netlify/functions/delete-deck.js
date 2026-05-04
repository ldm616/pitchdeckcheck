const { createClient } = require('@supabase/supabase-js')

async function deleteStorageFolder(supabase, bucket, folderPath) {
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folderPath)

  if (listError) {
    console.error(`Error listing ${bucket}/${folderPath}:`, listError)
    return 0
  }

  if (!files || files.length === 0) {
    return 0
  }

  const filePaths = files.map((f) => folderPath + '/' + f.name)

  const { error: removeError } = await supabase.storage
    .from(bucket)
    .remove(filePaths)

  if (removeError) {
    console.error(`Error removing files from ${bucket}/${folderPath}:`, removeError)
    return 0
  }

  return files.length
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    }
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable not set')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Server configuration error' }),
    }
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Server configuration error' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
    }
  }

  const { deck_id, admin_password } = body

  if (!deck_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'deck_id is required' }),
    }
  }

  if (!admin_password) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'admin_password is required' }),
    }
  }

  if (admin_password !== adminPassword) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Invalid admin password' }),
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Verify deck exists
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id')
    .eq('id', deck_id)
    .single()

  if (deckError || !deck) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Deck not found' }),
    }
  }

  const deleted = {
    deck_pdfs: 0,
    slide_images: 0,
    db_rows: {
      slides: 0,
      reports: 0,
      payments: 0,
      events: 0,
      decks: 0,
    },
  }

  // Delete storage files
  deleted.deck_pdfs = await deleteStorageFolder(supabase, 'deck-pdfs', deck_id)
  deleted.slide_images = await deleteStorageFolder(supabase, 'slide-images', deck_id)

  // Delete DB rows in order to avoid foreign key errors
  // slides
  const { count: slidesCount } = await supabase
    .from('slides')
    .delete({ count: 'exact' })
    .eq('deck_id', deck_id)
  deleted.db_rows.slides = slidesCount || 0

  // reports
  const { count: reportsCount } = await supabase
    .from('reports')
    .delete({ count: 'exact' })
    .eq('deck_id', deck_id)
  deleted.db_rows.reports = reportsCount || 0

  // payments
  const { count: paymentsCount } = await supabase
    .from('payments')
    .delete({ count: 'exact' })
    .eq('deck_id', deck_id)
  deleted.db_rows.payments = paymentsCount || 0

  // events
  const { count: eventsCount } = await supabase
    .from('events')
    .delete({ count: 'exact' })
    .eq('deck_id', deck_id)
  deleted.db_rows.events = eventsCount || 0

  // decks
  const { count: decksCount } = await supabase
    .from('decks')
    .delete({ count: 'exact' })
    .eq('id', deck_id)
  deleted.db_rows.decks = decksCount || 0

  console.log('Deleted deck:', { deck_id, deleted })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      deck_id,
      deleted,
    }),
  }
}
