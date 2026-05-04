const { createCanvas } = require('@napi-rs/canvas')
const { setDeckStatus } = require('./supabase')

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

/**
 * Extract slides from a PDF and upload to storage.
 * @param {object} supabase - Supabase client
 * @param {string} deckId - Deck ID
 * @param {string} filePath - Path to PDF in storage
 * @returns {Promise<{success: boolean, slideCount?: number, slides?: Array, error?: string}>}
 */
async function extractSlides(supabase, deckId, filePath) {
  await setDeckStatus(supabase, deckId, 'extracting', null)

  try {
    // Dynamic import for ESM-only pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('deck-pdfs')
      .download(filePath)

    if (downloadError || !pdfData) {
      console.error('PDF download error:', downloadError)
      await setDeckStatus(supabase, deckId, 'failed', 'Failed to download PDF')
      return { success: false, error: 'Failed to download PDF' }
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
      await setDeckStatus(supabase, deckId, 'failed', 'PDF has no pages')
      return { success: false, error: 'PDF has no pages' }
    }

    await cleanupExistingSlides(supabase, deckId)

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
      const imagePath = deckId + '/' + filename

      console.log('Uploading slide:', { slideNumber, filename, imagePath })

      const { error: uploadError } = await supabase.storage
        .from('slide-images')
        .upload(imagePath, pngBuffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Failed to upload slide ${slideNumber}:`, uploadError)
        await setDeckStatus(supabase, deckId, 'failed', `Failed to upload slide ${slideNumber}`)
        return { success: false, error: `Failed to upload slide ${slideNumber}` }
      }

      const slideRow = {
        deck_id: deckId,
        slide_number: slideNumber,
        image_path: imagePath,
        extracted_text: null,
        inferred_type: null,
      }

      console.log('Inserting slide row:', slideRow)

      const { error: insertError } = await supabase.from('slides').insert(slideRow)

      if (insertError) {
        console.error(`Failed to insert slide ${slideNumber}:`, insertError)
        await setDeckStatus(supabase, deckId, 'failed', `Failed to save slide ${slideNumber}`)
        return { success: false, error: `Failed to save slide ${slideNumber}` }
      }

      slides.push({
        slide_number: slideNumber,
        image_path: imagePath,
      })

      canvasFactory.destroy(canvasAndContext)
    }

    await setDeckStatus(supabase, deckId, 'extracted', null, numPages)

    return {
      success: true,
      slideCount: numPages,
      slides,
    }
  } catch (err) {
    console.error('Extraction error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during extraction'
    await setDeckStatus(supabase, deckId, 'failed', errorMessage)
    return { success: false, error: errorMessage }
  }
}

module.exports = {
  extractSlides,
}
