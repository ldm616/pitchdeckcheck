import type { Handler } from '@netlify/functions'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createCanvas, Canvas, SKRSContext2D } from '@napi-rs/canvas'

// Use legacy build for Node.js compatibility
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

const TARGET_WIDTH = 1600

interface RequestBody {
  deck_id: string
  access_token: string
}

interface SlideInfo {
  slide_number: number
  image_path: string
}

interface CanvasContext {
  canvas: Canvas
  context: SKRSContext2D
}

// Custom canvas factory for pdfjs-dist using @napi-rs/canvas
class NodeCanvasFactory {
  create(width: number, height: number): CanvasContext {
    const canvas = createCanvas(width, height)
    const context = canvas.getContext('2d')
    return { canvas, context }
  }

  reset(canvasAndContext: CanvasContext, width: number, height: number) {
    canvasAndContext.canvas.width = width
    canvasAndContext.canvas.height = height
  }

  destroy(canvasAndContext: CanvasContext) {
    // No explicit cleanup needed for @napi-rs/canvas
  }
}

async function setDeckStatus(
  supabase: SupabaseClient,
  deckId: string,
  status: string,
  error: string | null = null,
  slideCount: number | null = null
) {
  const update: Record<string, unknown> = {
    processing_status: status,
    processing_error: error,
  }
  if (slideCount !== null) {
    update.slide_count = slideCount
  }
  await supabase.from('decks').update(update).eq('id', deckId)
}

async function cleanupExistingSlides(supabase: SupabaseClient, deckId: string) {
  // Delete existing slide rows
  await supabase.from('slides').delete().eq('deck_id', deckId)

  // List and delete existing slide images
  const { data: existingFiles } = await supabase.storage
    .from('slide-images')
    .list(deckId)

  if (existingFiles && existingFiles.length > 0) {
    const filePaths = existingFiles.map((f) => `${deckId}/${f.name}`)
    await supabase.storage.from('slide-images').remove(filePaths)
  }
}

function padNumber(num: number, size: number): string {
  return String(num).padStart(size, '0')
}

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Check environment variables
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

  // Parse request body
  let body: RequestBody
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

  // Verify deck exists and access_token matches
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

  // Set status to extracting
  await setDeckStatus(supabase, deck_id, 'extracting', null)

  try {
    // Download PDF from storage
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

    // Convert blob to array buffer
    const pdfBuffer = await pdfData.arrayBuffer()
    const pdfUint8Array = new Uint8Array(pdfBuffer)

    // Load PDF document
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

    // Cleanup existing slides (idempotent)
    await cleanupExistingSlides(supabase, deck_id)

    const slides: SlideInfo[] = []
    const canvasFactory = new NodeCanvasFactory()

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)

      // Calculate scale to achieve target width
      const originalViewport = page.getViewport({ scale: 1 })
      const scale = TARGET_WIDTH / originalViewport.width
      const viewport = page.getViewport({ scale })

      // Create canvas
      const canvasAndContext = canvasFactory.create(
        Math.floor(viewport.width),
        Math.floor(viewport.height)
      )

      // Render page to canvas
      // Cast context to any because pdfjs expects browser CanvasRenderingContext2D
      // but @napi-rs/canvas provides SKRSContext2D which is compatible at runtime
      await page.render({
        canvasContext: canvasAndContext.context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise

      // Export to PNG buffer
      const pngBuffer = canvasAndContext.canvas.toBuffer('image/png')

      // Generate filename
      const slideNumber = pageNum
      const filename = `slide-${padNumber(slideNumber, 3)}.png`
      const imagePath = `${deck_id}/${filename}`

      // Upload to storage
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

      // Insert slide row
      const { error: insertError } = await supabase.from('slides').insert({
        deck_id,
        slide_number: slideNumber,
        image_path: imagePath,
        extracted_text: null,
        inferred_type: null,
      })

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

      // Cleanup canvas
      canvasFactory.destroy(canvasAndContext)
    }

    // Update deck with slide count and status
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
