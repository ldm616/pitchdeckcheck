import type {
  UploadResult,
  DeckStatusResult,
  GetReportResult,
  ReportContent,
  SlideData,
  DeleteResult,
  ReportListItem,
  CalibrationDeck,
} from './types'

const SESSION_PASSWORD_KEY = 'pdc_admin_pw'

// Get stored admin password from session storage
function getAdminPassword(): string {
  return sessionStorage.getItem(SESSION_PASSWORD_KEY) || ''
}

// Verify admin password
export async function verifyPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('/.netlify/functions/verify-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return response.json()
}

// Upload a deck
export async function uploadDeck(file: File, email?: string, signal?: AbortSignal): Promise<UploadResult> {
  const formData = new FormData()
  if (email) {
    formData.append('email', email)
  }
  formData.append('file', file)

  const response = await fetch('/.netlify/functions/upload-deck', {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  return response.json()
}

// Trigger background processing
export async function triggerBackgroundProcessing(deckId: string, accessToken: string): Promise<void> {
  await fetch('/.netlify/functions/extract-analyze-slides-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id: deckId,
      access_token: accessToken,
    }),
  })
}

// Get deck status (for polling)
export async function getDeckStatus(
  deckId: string,
  auth: { access_token: string } | { admin_password: string }
): Promise<DeckStatusResult | null> {
  try {
    const response = await fetch('/.netlify/functions/get-deck-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck_id: deckId, ...auth }),
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  }
}

// Get full report by deck_id + access_token (legacy)
export async function getReport(
  deckId: string,
  accessToken: string
): Promise<{ content: ReportContent; slides: SlideData[]; report_created_at?: string; report_code?: string } | null> {
  try {
    const response = await fetch('/.netlify/functions/get-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck_id: deckId, access_token: accessToken }),
    })

    if (!response.ok) {
      return null
    }

    const data: GetReportResult = await response.json()
    if (data.status === 'ready' && data.content) {
      return {
        content: data.content,
        slides: data.slides || [],
        report_created_at: data.report_created_at,
        report_code: data.report_code,
      }
    }
    return null
  } catch {
    return null
  }
}

// Get full report by report code
export async function getReportByCode(
  reportCode: string
): Promise<{ content: ReportContent; slides: SlideData[]; report_created_at?: string; report_code?: string } | null> {
  try {
    const response = await fetch('/.netlify/functions/get-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_code: reportCode }),
    })

    if (!response.ok) {
      return null
    }

    const data: GetReportResult = await response.json()
    if (data.status === 'ready' && data.content) {
      return {
        content: data.content,
        slides: data.slides || [],
        report_created_at: data.report_created_at,
        report_code: data.report_code,
      }
    }
    return null
  } catch {
    return null
  }
}

// Delete a deck (admin only)
export async function deleteDeck(deckId: string): Promise<DeleteResult> {
  const response = await fetch('/.netlify/functions/delete-deck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deck_id: deckId,
      admin_password: getAdminPassword(),
    }),
  })

  return response.json()
}

// Trigger report regeneration (admin only)
export async function triggerReportRegeneration(deckId: string): Promise<void> {
  await fetch('/.netlify/functions/generate-report-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-evaluation-architecture': 'v3',
    },
    body: JSON.stringify({
      deck_id: deckId,
      admin_password: getAdminPassword(),
    }),
  })
}

// Get all reports (admin only)
export async function getReportsList(): Promise<{ ok: boolean; reports?: ReportListItem[]; error?: string }> {
  const response = await fetch('/.netlify/functions/get-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_password: getAdminPassword(),
    }),
  })

  return response.json()
}

// Get calibration decks (admin only)
export async function getCalibrationDecks(): Promise<{ ok: boolean; decks?: CalibrationDeck[]; error?: string }> {
  const response = await fetch('/.netlify/functions/get-calibration-decks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_password: getAdminPassword(),
    }),
  })

  return response.json()
}

// Upsert calibration deck (admin only)
export async function upsertCalibrationDeck(deck: {
  id: string
  company: string
  archetype: string
  stage: string
  era: string
  year: number
  expected_grade_range: string[]
  strengths: string[]
  known_weaknesses: string[]
  must_not_happen: string[]
  notes: string | null
  active: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('/.netlify/functions/upsert-calibration-deck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_password: getAdminPassword(),
      deck,
    }),
  })

  return response.json()
}

// Delete calibration deck (admin only)
export async function deleteCalibrationDeck(deckId: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('/.netlify/functions/delete-calibration-deck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_password: getAdminPassword(),
      deck_id: deckId,
    }),
  })

  return response.json()
}

// Send private report link via email
export async function sendReportLink(
  deckId: string,
  accessToken: string,
  email: string
): Promise<{ ok: boolean; error?: string; fallback_url?: string }> {
  try {
    const response = await fetch('/.netlify/functions/send-report-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deck_id: deckId,
        access_token: accessToken,
        email,
      }),
    })

    return response.json()
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

// Send contact form email
export async function sendContactEmail(
  name: string,
  email: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/.netlify/functions/send-contact-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })

    return response.json()
  } catch {
    return { ok: false, error: 'Network error' }
  }
}
