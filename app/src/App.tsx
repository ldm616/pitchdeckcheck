import { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from 'react'

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'timeout'
type DeleteStatus = 'idle' | 'deleting' | 'success' | 'error'
type AdminView = 'upload' | 'reports' | 'delete'

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
  report: {
    status: string
    overall_grade: string | null
  } | null
}

interface ReportStrength {
  title: string
  detail: string
}

interface ReportIssue {
  title: string
  detail: string
  priority: 'high' | 'medium' | 'low'
}

interface ReportSlideNote {
  slide_number: number
  inferred_type: string
  grade: string
  note: string
}

interface ReportContent {
  overall_grade: string
  summary: string
  strengths: ReportStrength[]
  biggest_issues: ReportIssue[]
  slide_notes: ReportSlideNote[]
  upgrade_teaser: {
    title: string
    bullets: string[]
  }
}

interface SlideData {
  slide_number: number
  image_path: string | null
  image_url: string | null
  inferred_type: string
}

interface GetReportResult {
  deck_id: string
  report_type: string
  status: string
  overall_grade?: string
  content?: ReportContent
  generation_error?: string
  slides?: SlideData[]
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

interface ReportListItem {
  id: string
  deck_id: string
  report_type: string
  status: string
  overall_grade: string | null
  created_at: string
  email: string | null
  original_filename: string | null
  slide_count: number | null
  access_token: string | null
}

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SESSION_KEY = 'pdc_authenticated'
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export default function App() {
  // Check for admin mode via URL param
  const isAdmin = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const adminToken = params.get('admin')
    const expectedToken = import.meta.env.ADMIN_PASSWORD
    return adminToken !== null && adminToken === expectedToken
  }, [])

  const [adminView, setAdminView] = useState<AdminView>('upload')
  const [reportsList, setReportsList] = useState<ReportListItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

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
  const [report, setReport] = useState<ReportContent | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [hoveredSlideNumber, setHoveredSlideNumber] = useState<number | null>(null)

  // Store credentials for fetching report
  const deckCredentialsRef = useRef<{ deckId: string; accessToken: string } | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const pollStartTimeRef = useRef<number | null>(null)

  // Admin delete state
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

  const fetchReport = async (deckId: string, accessToken: string): Promise<{ content: ReportContent; slides: SlideData[] } | null> => {
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
        }
      }
      return null
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
      setSlideCount(statusData.slide_count)

      if (statusData.processing_status === 'ready') {
        stopPolling()
        // Fetch the full report with slides
        const reportData = await fetchReport(deckId, accessToken)
        if (reportData) {
          setReport(reportData.content)
          setSlides(reportData.slides)
        }
        setStatus('success')
      } else if (statusData.processing_status === 'failed') {
        stopPolling()
        setErrorMessage(statusData.processing_error || 'Processing failed')
        setStatus('error')
      }
      // For extracting, extracted, analyzing, generating_free - continue polling
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
    setReport(null)
    setSlides([])
    setHoveredSlideNumber(null)
    deckCredentialsRef.current = null
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

  const fetchReportsList = async () => {
    setReportsLoading(true)
    setReportsError('')

    try {
      const response = await fetch('/.netlify/functions/get-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_password: import.meta.env.ADMIN_PASSWORD,
        }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        setReportsList(data.reports || [])
      } else {
        setReportsError(data.error || 'Failed to fetch reports')
      }
    } catch (err) {
      console.error('Fetch reports error:', err)
      setReportsError('Failed to fetch reports')
    } finally {
      setReportsLoading(false)
    }
  }

  const handleViewReport = async (item: ReportListItem) => {
    if (!item.access_token) {
      setReportsError('Missing access token for this report')
      return
    }

    // Fetch the full report and display it
    const reportData = await fetchReport(item.deck_id, item.access_token)
    if (reportData) {
      setReport(reportData.content)
      setSlides(reportData.slides)
      setSlideCount(item.slide_count)
      setStatus('success')
      setAdminView('upload') // Switch to upload view to show report
    } else {
      setReportsError('Failed to load report')
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
      if (processingStatus === 'analyzed' || processingStatus === 'generating_free') {
        return 'Generating your free report...'
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

  // Determine if we're showing the report (wider layout)
  const showingReport = status === 'success' && report

  // Determine max width based on view and content
  const getMaxWidth = () => {
    if (adminView === 'reports') return '900px'
    if (showingReport) return '720px'
    return '440px'
  }

  // Main layout
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
        fontFamily,
      }}
    >
      {/* Admin Header */}
      {isAdmin && (
        <div
          style={{
            width: '100%',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
          }}
        >
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              padding: '12px 24px',
              display: 'flex',
              gap: '24px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <button
              onClick={() => setAdminView('upload')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: adminView === 'upload' ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                textDecoration: adminView === 'upload' ? 'underline' : 'none',
              }}
            >
              Upload
            </button>
            <button
              onClick={() => {
                setAdminView('reports')
                fetchReportsList()
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: adminView === 'reports' ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                textDecoration: adminView === 'reports' ? 'underline' : 'none',
              }}
            >
              Reports
            </button>
            <button
              onClick={() => setAdminView('delete')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: adminView === 'delete' ? '#dc2626' : '#6b7280',
                cursor: 'pointer',
                textDecoration: adminView === 'delete' ? 'underline' : 'none',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: isAdmin ? '32px 24px 24px' : '50px 24px 24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: getMaxWidth(),
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
            padding: showingReport || adminView === 'reports' ? '48px 40px' : '40px 32px',
            transition: 'max-width 0.3s ease, padding 0.3s ease',
          }}
        >
          {/* Upload View */}
          {(!isAdmin || adminView === 'upload') && (
            <>
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

        {status === 'success' && report && (
          <div style={{ marginTop: '24px' }}>
            {/* Overall Grade */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor:
                    report.overall_grade === 'A'
                      ? '#22c55e'
                      : report.overall_grade === 'B'
                        ? '#84cc16'
                        : report.overall_grade === 'C'
                          ? '#eab308'
                          : report.overall_grade === 'D'
                            ? '#f97316'
                            : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {report.overall_grade}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  Overall Grade
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                  {slideCount} slides analyzed
                </p>
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <p style={{ margin: 0, fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
                {report.summary}
              </p>
            </div>

            {/* Strengths */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Strengths
              </h3>
              {report.strengths.map((strength, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#166534',
                    }}
                  >
                    {strength.title}
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#15803d', lineHeight: 1.5 }}>
                    {strength.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Biggest Issues */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Biggest Issues
              </h3>
              {report.biggest_issues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    backgroundColor:
                      issue.priority === 'high'
                        ? '#fef2f2'
                        : issue.priority === 'medium'
                          ? '#fffbeb'
                          : '#f9fafb',
                    border: `1px solid ${
                      issue.priority === 'high'
                        ? '#fecaca'
                        : issue.priority === 'medium'
                          ? '#fde68a'
                          : '#e5e7eb'
                    }`,
                    borderRadius: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 500,
                        color:
                          issue.priority === 'high'
                            ? '#991b1b'
                            : issue.priority === 'medium'
                              ? '#92400e'
                              : '#374151',
                      }}
                    >
                      {issue.title}
                    </p>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        backgroundColor:
                          issue.priority === 'high'
                            ? '#fee2e2'
                            : issue.priority === 'medium'
                              ? '#fef3c7'
                              : '#f3f4f6',
                        color:
                          issue.priority === 'high'
                            ? '#dc2626'
                            : issue.priority === 'medium'
                              ? '#d97706'
                              : '#6b7280',
                      }}
                    >
                      {issue.priority}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      lineHeight: 1.5,
                      color:
                        issue.priority === 'high'
                          ? '#b91c1c'
                          : issue.priority === 'medium'
                            ? '#b45309'
                            : '#4b5563',
                    }}
                  >
                    {issue.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Slide Notes */}
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                Slide-by-Slide Notes
              </h3>
              {(!report.slide_notes || report.slide_notes.length === 0) ? (
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  No slide-specific notes available.
                </p>
              ) : (
                report.slide_notes.map((note, idx) => {
                  // Find matching slide data for image
                  const slideData = slides.find(s => s.slide_number === note.slide_number)
                  const imageUrl = slideData?.image_url

                  return (
                    <div
                      key={note.slide_number ?? idx}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '12px 16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: '120px',
                        }}
                        onMouseEnter={() => imageUrl && setHoveredSlideNumber(note.slide_number)}
                        onMouseLeave={() => setHoveredSlideNumber(null)}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`Slide ${note.slide_number}`}
                            style={{
                              width: '100%',
                              height: 'auto',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              cursor: 'pointer',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              aspectRatio: '16/9',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                textAlign: 'center',
                                padding: '4px',
                              }}
                            >
                              Slide image unavailable
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Note content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#6b7280',
                            }}
                          >
                            Slide {note.slide_number}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                            }}
                          >
                            {note.inferred_type}
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color:
                                note.grade === 'A'
                                  ? '#22c55e'
                                  : note.grade === 'B'
                                    ? '#84cc16'
                                    : note.grade === 'C'
                                      ? '#eab308'
                                      : note.grade === 'D'
                                        ? '#f97316'
                                        : '#ef4444',
                            }}
                          >
                            {note.grade}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>
                          {note.note}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Upgrade Teaser */}
            <div
              style={{
                padding: '20px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1e40af',
                }}
              >
                {report.upgrade_teaser.title}
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {report.upgrade_teaser.bullets.map((bullet, idx) => (
                  <li
                    key={idx}
                    style={{
                      fontSize: '14px',
                      color: '#1d4ed8',
                      marginBottom: '6px',
                      lineHeight: 1.4,
                    }}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

            </>
          )}

          {/* Reports View - Admin only */}
          {isAdmin && adminView === 'reports' && (
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 20px 0',
                }}
              >
                Reports
              </h2>

              {reportsLoading && (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading reports...</p>
              )}

              {reportsError && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>{reportsError}</p>
                </div>
              )}

              {!reportsLoading && reportsList.length === 0 && !reportsError && (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No reports found.</p>
              )}

              {reportsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reportsList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleViewReport(item)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p
                            style={{
                              margin: '0 0 4px 0',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: '#111827',
                            }}
                          >
                            {item.email || 'No email'}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              color: '#6b7280',
                            }}
                          >
                            {item.original_filename || 'Unknown file'} • {item.slide_count || 0} slides
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.overall_grade && (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                backgroundColor:
                                  item.overall_grade === 'A'
                                    ? '#22c55e'
                                    : item.overall_grade === 'B'
                                      ? '#84cc16'
                                      : item.overall_grade === 'C'
                                        ? '#eab308'
                                        : item.overall_grade === 'D'
                                          ? '#f97316'
                                          : '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#ffffff',
                              }}
                            >
                              {item.overall_grade}
                            </div>
                          )}

                          <span
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                item.status === 'ready' ? '#dcfce7' : '#f3f4f6',
                              color:
                                item.status === 'ready' ? '#166534' : '#6b7280',
                            }}
                          >
                            {item.status}
                          </span>

                          <span
                            style={{
                              fontSize: '12px',
                              color: '#9ca3af',
                            }}
                          >
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Delete View - Admin only */}
          {isAdmin && adminView === 'delete' && (
            <div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 20px 0',
                }}
              >
                Delete Deck
              </h2>

              <form onSubmit={handleDeleteDeck}>
                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor="delete-deck-id"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Deck ID (UUID)
                  </label>
                  <input
                    id="delete-deck-id"
                    type="text"
                    value={deleteDeckId}
                    onChange={(e) => setDeleteDeckId(e.target.value)}
                    placeholder="e.g. 12345678-1234-1234-1234-123456789abc"
                    required
                    disabled={deleteStatus === 'deleting'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '15px',
                      fontFamily,
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    htmlFor="delete-admin-password"
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Admin Password
                  </label>
                  <input
                    id="delete-admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                    disabled={deleteStatus === 'deleting'}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '15px',
                      fontFamily,
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={deleteStatus === 'deleting' || !deleteDeckId || !adminPassword}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    fontWeight: 500,
                    fontFamily,
                    color: '#ffffff',
                    backgroundColor:
                      deleteStatus === 'deleting' || !deleteDeckId || !adminPassword
                        ? '#9ca3af'
                        : '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
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
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>{deleteError}</p>
                </div>
              )}

              {deleteStatus === 'success' && deleteResult && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#166534',
                    }}
                  >
                    Deleted successfully
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#15803d' }}>
                    Files: {deleteResult.deleted?.deck_pdfs || 0} PDF, {deleteResult.deleted?.slide_images || 0} images
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#15803d' }}>
                    Rows: {deleteResult.deleted?.db_rows.slides || 0} slides, {deleteResult.deleted?.db_rows.decks || 0} deck
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover preview overlay */}
      {hoveredSlideNumber !== null && (() => {
        const slideData = slides.find(s => s.slide_number === hoveredSlideNumber)
        const imageUrl = slideData?.image_url
        if (!imageUrl) return null

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                maxWidth: '80vw',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <img
                src={imageUrl}
                alt={`Slide ${hoveredSlideNumber} preview`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(80vh - 40px)',
                  borderRadius: '8px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
              />
              <p
                style={{
                  marginTop: '12px',
                  fontSize: '14px',
                  color: '#ffffff',
                  fontFamily,
                }}
              >
                Slide {hoveredSlideNumber}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
