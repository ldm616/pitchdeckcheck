import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react'

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'timeout'
type DeleteStatus = 'idle' | 'deleting' | 'success' | 'error'

interface UploadResult {
  deck_id: string
  access_token: string
}

interface DeckStatusResult {
  deck_id: string
  processing_status: string
  processing_error: string | null
  slide_count: number
  analyzed_slide_count: number
}

interface DeleteResult {
  ok: boolean
  deck_id?: string
  deleted?: {
    deck_pdfs: number
    slide_images: number
    db_rows: {
      slides: number
      reports: number
      payments: number
      events: number
      decks: number
    }
  }
  error?: string
}

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SESSION_KEY = 'pdc_authenticated'
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [slideCount, setSlideCount] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const pollStartTimeRef = useRef<number | null>(null)

  // Admin delete state
  const [showAdmin, setShowAdmin] = useState(false)
  const [deleteDeckId, setDeleteDeckId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>('idle')
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const authenticated = sessionStorage.getItem(SESSION_KEY)
    if (authenticated === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    pollStartTimeRef.current = null
  }

  const pollDeckStatus = async (deckId: string, accessToken: string): Promise<DeckStatusResult | null> => {
    try {
      const response = await fetch('/.netlify/functions/get-deck-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, access_token: accessToken }),
      })

      if (!response.ok) {
        return null
      }

      const data: DeckStatusResult = await response.json()
      return data
    } catch {
      return null
    }
  }

  const startPolling = (deckId: string, accessToken: string) => {
    stopPolling()
    pollStartTimeRef.current = Date.now()

    // Set timeout for 10 minutes
    timeoutRef.current = window.setTimeout(() => {
      stopPolling()
      setStatus('timeout')
    }, TIMEOUT_MS)

    pollIntervalRef.current = window.setInterval(async () => {
      const statusData = await pollDeckStatus(deckId, accessToken)

      if (!statusData) {
        return
      }

      // Update processing status for UI
      setProcessingStatus(statusData.processing_status)

      if (statusData.processing_status === 'analyzed') {
        stopPolling()
        setSlideCount(statusData.slide_count)
        setStatus('success')
      } else if (statusData.processing_status === 'failed') {
        stopPolling()
        setErrorMessage(statusData.processing_error || 'Processing failed')
        setStatus('error')
      }
      // For extracting, extracted, analyzing - continue polling
    }, POLL_INTERVAL_MS)
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return

    setCheckingPassword(true)
    setPasswordError('')

    try {
      const response = await fetch('/.netlify/functions/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        setIsAuthenticated(true)
      } else {
        setPasswordError(data.error || 'Invalid password')
      }
    } catch (err) {
      console.error('Password verification error:', err)
      setPasswordError('Failed to verify password')
    } finally {
      setCheckingPassword(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !email) return

    setStatus('uploading')
    setSlideCount(null)
    setErrorMessage(null)
    setProcessingStatus(null)
    stopPolling()

    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('file', file)

      const uploadResponse = await fetch('/.netlify/functions/upload-deck', {
        method: 'POST',
        body: formData,
      })

      const uploadData: UploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        console.error('Upload error:', uploadData)
        throw new Error('Upload failed')
      }

      // Switch to processing state and start polling immediately
      setStatus('processing')
      setProcessingStatus('extracting')

      // Start polling before triggering background processing
      startPolling(uploadData.deck_id, uploadData.access_token)

      // Fire and forget - trigger background processing
      fetch('/.netlify/functions/extract-analyze-slides-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: uploadData.deck_id,
          access_token: uploadData.access_token,
        }),
      }).catch((err) => {
        console.error('Background processing trigger error:', err)
        // Don't fail - polling will detect the actual status
      })
    } catch (err) {
      console.error('Error:', err)
      stopPolling()
      setStatus('error')
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === 'application/pdf') {
      setFile(selected)
    } else {
      setFile(null)
    }
  }

  const handleDeleteDeck = async (e: FormEvent) => {
    e.preventDefault()
    if (!deleteDeckId || !adminPassword) return

    setDeleteStatus('deleting')
    setDeleteError('')
    setDeleteResult(null)

    try {
      const response = await fetch('/.netlify/functions/delete-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deleteDeckId,
          admin_password: adminPassword,
        }),
      })

      const data: DeleteResult = await response.json()

      if (response.ok && data.ok) {
        setDeleteResult(data)
        setDeleteStatus('success')
        setDeleteDeckId('')
      } else {
        setDeleteError(data.error || 'Delete failed')
        setDeleteStatus('error')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setDeleteError('Failed to delete deck')
      setDeleteStatus('error')
    }
  }

  const isProcessing = status === 'uploading' || status === 'processing'
  const isDisabled = isProcessing || !file || !email

  const getStatusText = () => {
    if (status === 'uploading') {
      return 'Uploading deck...'
    }
    if (status === 'processing') {
      if (processingStatus === 'extracting') {
        return 'Extracting slides...'
      }
      if (processingStatus === 'extracted' || processingStatus === 'analyzing') {
        return 'Analyzing slides...'
      }
      return 'Processing...'
    }
    return 'Upload Deck'
  }

  // Password gate
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#f8f9fa',
          fontFamily,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            padding: '40px 32px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 8px 0',
              }}
            >
              Pitch Deck Check
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0,
              }}
            >
              Enter password to continue
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={checkingPassword}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '15px',
                  fontFamily,
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: checkingPassword ? '#f3f4f6' : '#ffffff',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={checkingPassword || !password}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: '15px',
                fontWeight: 500,
                fontFamily,
                color: '#ffffff',
                backgroundColor: checkingPassword || !password ? '#9ca3af' : '#2563eb',
                border: 'none',
                borderRadius: '8px',
                cursor: checkingPassword || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {checkingPassword ? 'Checking...' : 'Enter'}
            </button>
          </form>

          {passwordError && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#dc2626',
                }}
              >
                {passwordError}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main upload form
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '50px 24px 24px',
        backgroundColor: '#f8f9fa',
        fontFamily,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          padding: '40px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 12px 0',
              letterSpacing: '-0.025em',
            }}
          >
            Pitch Deck Check
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Upload your pitch deck to get an investor-readiness review.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '15px',
                fontFamily,
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: isProcessing ? '#f3f4f6' : '#ffffff',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="file"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Pitch deck (PDF)
            </label>
            <div
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <input
                id="file"
                type="file"
                name="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                disabled={isProcessing}
                style={{
                  fontSize: '14px',
                  fontFamily,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
              />
              {file && (
                <p
                  style={{
                    marginTop: '8px',
                    marginBottom: 0,
                    fontSize: '13px',
                    color: '#059669',
                  }}
                >
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily,
              color: '#ffffff',
              backgroundColor: isDisabled ? '#9ca3af' : '#2563eb',
              border: 'none',
              borderRadius: '8px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {getStatusText()}
          </button>
        </form>

        {status === 'error' && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#dc2626',
              }}
            >
              {errorMessage || 'Processing failed. Please try again.'}
            </p>
          </div>
        )}

        {status === 'timeout' && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px 16px',
              backgroundColor: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#a16207',
              }}
            >
              Still processing. Check back shortly.
            </p>
          </div>
        )}

        {status === 'success' && slideCount !== null && (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '15px',
                color: '#374151',
              }}
            >
              Extracted and analyzed {slideCount} slides
            </p>
          </div>
        )}

        {/* Admin footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            {showAdmin ? 'Hide Admin' : 'Admin'}
          </button>
        </div>

        {showAdmin && (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <p
              style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
              }}
            >
              Delete Deck
            </p>
            <form onSubmit={handleDeleteDeck}>
              <input
                type="text"
                value={deleteDeckId}
                onChange={(e) => setDeleteDeckId(e.target.value)}
                placeholder="Deck ID (UUID)"
                required
                disabled={deleteStatus === 'deleting'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  fontFamily,
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Admin Password"
                required
                disabled={deleteStatus === 'deleting'}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  fontFamily,
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={deleteStatus === 'deleting' || !deleteDeckId || !adminPassword}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily,
                  color: '#ffffff',
                  backgroundColor:
                    deleteStatus === 'deleting' || !deleteDeckId || !adminPassword
                      ? '#9ca3af'
                      : '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    deleteStatus === 'deleting' || !deleteDeckId || !adminPassword
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {deleteStatus === 'deleting' ? 'Deleting...' : 'Delete Deck'}
              </button>
            </form>

            {deleteError && (
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#dc2626' }}>
                {deleteError}
              </p>
            )}

            {deleteStatus === 'success' && deleteResult && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#166534' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>Deleted successfully:</p>
                <p style={{ margin: 0 }}>
                  Files: {deleteResult.deleted?.deck_pdfs || 0} PDF, {deleteResult.deleted?.slide_images || 0} images
                </p>
                <p style={{ margin: 0 }}>
                  Rows: {deleteResult.deleted?.db_rows.slides || 0} slides, {deleteResult.deleted?.db_rows.decks || 0} deck
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
