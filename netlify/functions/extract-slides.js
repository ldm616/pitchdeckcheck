const { createClient } = require('@supabase/supabase-js')
const { createCanvas } = require('@napi-rs/canvas')

const TARGET_WIDTH = 1600

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    return { canvas, context }
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }

  destroy(canvasAndContext) {
    // No explicit cleanup needed for @napi-rs/canvas
  }
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

async function cleanupExistingSlides(supabase, deckId) {
  await supabase.from('slides').delete().eq('deck_id', deckId)

  const { data: existingFiles } = await supabase.storage
    .from('slide-images')
    .list(deckId)

  if (existingFiles && existingFiles.length > 0) {
    const filePaths = existingFiles.map((f) => `${deckId}/${f.name}`)
    await supabase.storage.from('slide-images').remove(filePaths)
  }
}

function padNumber(num, size) {
  return String(num).padStart(size, '0')
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
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

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('id, file_path, access_token')
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

  await setDeckStatus(supabase, deck_id, 'extracting', null)

  try {
    // Dynamic import for ESM-only pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('deck-pdfs')
      .download(deck.file_path)

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError)
      await setDeckStatus(supabase, deck_id, 'failed', 'Failed to download PDF')
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to download PDF' }),
      }
    }

    const pdfBuffer = await pdfData.arrayBuffer()
    const pdfUint8Array = new Uint8Array(pdfBuffer)

    const loadingTask = pdfjsLib.getDocument({
      data: pdfUint8Array,
      useSystemFonts: true,
    })

    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages

    if (numPages === 0) {
      await setDeckStatus(supabase, deck_id, 'failed', 'PDF has no pages')
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'PDF has no pages' }),
      }
    }

    await cleanupExistingSlides(supabase, deck_id)

    const slides = []
    const canvasFactory = new NodeCanvasFactory()

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)

      const originalViewport = page.getViewport({ scale: 1 })
      const scale = TARGET_WIDTH / originalViewport.width
      const viewport = page.getViewport({ scale })

      const canvasAndContext = canvasFactory.create(
        Math.floor(viewport.width),
        Math.floor(viewport.height)
      )

      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
      }).promise

      const pngBuffer = canvasAndContext.canvas.toBuffer('image/png')

      const slideNumber = pageNum
      const filename = 'slide-' + padNumber(slideNumber, 3) + '.png'
      const imagePath = deck_id + '/' + filename

      console.log('Uploading slide:', { slideNumber, filename, imagePath })

      const { error: uploadError } = await supabase.storage
        .from('slide-images')
        .upload(imagePath, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Failed to upload slide ${slideNumber}:`, uploadError)
        await setDeckStatus(supabase, deck_id, 'failed', `Failed to upload slide ${slideNumber}`)
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Failed to upload slide ${slideNumber}` }),
        }
      }

      const slideRow = {
        deck_id: deck_id,
        slide_number: slideNumber,
        image_path: imagePath,
        extracted_text: null,
        inferred_type: null,
      }

      console.log('Inserting slide row:', slideRow)

      const { error: insertError } = await supabase.from('slides').insert(slideRow)

      if (insertError) {
        console.error(`Failed to insert slide ${slideNumber}:`, insertError)
        await setDeckStatus(supabase, deck_id, 'failed', `Failed to save slide ${slideNumber}`)
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Failed to save slide ${slideNumber}` }),
        }
      }

      slides.push({
        slide_number: slideNumber,
        image_path: imagePath,
      })

      canvasFactory.destroy(canvasAndContext)
    }

    await setDeckStatus(supabase, deck_id, 'extracted', null, numPages)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deck_id,
        slide_count: numPages,
        slides,
      }),
    }
  } catch (err) {
    console.error('Extraction error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during extraction'
    await setDeckStatus(supabase, deck_id, 'failed', errorMessage)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to extract slides' }),
    }
  }
}
