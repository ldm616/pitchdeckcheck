import type { Handler, HandlerEvent } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import Busboy from 'busboy'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Character set avoiding ambiguous: O, 0, I, 1, L
const REPORT_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateReportCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += REPORT_CODE_CHARS[Math.floor(Math.random() * REPORT_CODE_CHARS.length)]
  }
  return code
}

interface ParsedForm {
  email: string | null
  file: {
    buffer: Buffer
    filename: string
    mimeType: string
  } | null
}

function parseMultipartForm(event: HandlerEvent): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || ''

    if (!contentType.includes('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'))
      return
    }

    const result: ParsedForm = {
      email: null,
      file: null,
    }

    const buffers: Buffer[] = []
    let fileInfo: { filename: string; mimeType: string } | null = null
    let totalSize = 0

    const busboy = Busboy({
      headers: { 'content-type': contentType },
      limits: { fileSize: MAX_FILE_SIZE },
    })

    busboy.on('field', (name: string, value: string) => {
      if (name === 'email') {
        result.email = value
      }
    })

    busboy.on('file', (name: string, stream: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      if (name !== 'file') {
        stream.resume()
        return
      }

      fileInfo = {
        filename: info.filename,
        mimeType: info.mimeType,
      }

      stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length
        if (totalSize <= MAX_FILE_SIZE) {
          buffers.push(chunk)
        }
      })

      stream.on('limit', () => {
        reject(new Error('File size exceeds 50MB limit'))
      })
    })

    busboy.on('finish', () => {
      if (fileInfo && buffers.length > 0) {
        result.file = {
          buffer: Buffer.concat(buffers),
          filename: fileInfo.filename,
          mimeType: fileInfo.mimeType,
        }
      }
      resolve(result)
    })

    busboy.on('error', (err: Error) => {
      reject(err)
    })

    const body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : Buffer.from(event.body || '')

    busboy.end(body)
  })
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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

  // Parse multipart form
  let parsed: ParsedForm
  try {
    parsed = await parseMultipartForm(event)
  } catch (err) {
    console.error('Form parsing error:', err)
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to parse form data' }),
    }
  }

  // Validate email only if provided
  if (parsed.email && !validateEmail(parsed.email)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid email format' }),
    }
  }

  // Validate file
  if (!parsed.file) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'PDF file is required' }),
    }
  }

  if (parsed.file.mimeType !== 'application/pdf') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Only PDF files are allowed' }),
    }
  }

  if (parsed.file.buffer.length > MAX_FILE_SIZE) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'File size exceeds 50MB limit' }),
    }
  }

  // Generate IDs
  const deckId = randomUUID()
  const accessToken = randomUUID()
  const reportCode = generateReportCode()
  const filePath = `${deckId}/original.pdf`

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('deck-pdfs')
    .upload(filePath, parsed.file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to upload file' }),
    }
  }

  // Insert record into database
  const { error: insertError } = await supabase
    .from('decks')
    .insert({
      id: deckId,
      email: parsed.email || null,
      access_token: accessToken,
      report_code: reportCode,
      file_path: filePath,
      original_filename: parsed.file.filename,
      file_size_bytes: parsed.file.buffer.length,
      processing_status: 'uploaded',
    })

  if (insertError) {
    console.error('Database insert error:', insertError)

    // Rollback: delete uploaded file
    const { error: deleteError } = await supabase.storage
      .from('deck-pdfs')
      .remove([filePath])

    if (deleteError) {
      console.error('Failed to rollback storage upload:', deleteError)
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to create deck record' }),
    }
  }

  // Success
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id: deckId,
      access_token: accessToken,
      report_code: reportCode,
    }),
  }
}
