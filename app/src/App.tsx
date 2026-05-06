import { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from 'react'

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'timeout'
type AdminView = 'upload' | 'reports'

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
  title?: string
  detail?: string
  question?: string
  score?: number
  assessment?: string
  slide_type?: string
}

interface ReportIssue {
  title?: string
  detail?: string
  priority?: 'high' | 'medium' | 'low'
  question?: string
  score?: number
  assessment?: string
  gap?: string
  slide_type?: string
}

interface ReportSlideNote {
  slide_number: number
  inferred_type: string
  grade: string
  note?: string
  normalized_score?: number
}

interface SlideQuestion {
  question: string
  score: number
  assessment: string
  gap: string
  investor_impact: string
  fix: string
  confidence: 'high' | 'medium' | 'low'
}

interface FullReportSlide {
  slide_number: number
  type: string
  grade: string
  normalized_score: number
  weighted_score?: number
  max_score?: number
  questions: SlideQuestion[]
}

interface ThesisElement {
  question: string
  score: number
  assessment: string
  gaps: string
  verdict: string
}

interface InvestmentThesis {
  why_this_market: ThesisElement
  why_this_product: ThesisElement
  why_this_team: ThesisElement
  why_now: ThesisElement
}

// V3 Debug output structure
interface V3DebugOutput {
  generated_at?: string
  architecture?: Record<string, unknown>
  deck_context?: Record<string, unknown>
  rule_injection?: Record<string, unknown>
  prompts?: Record<string, unknown>
  scoring?: Record<string, unknown>
  signal_override?: Record<string, unknown>
  slide_evaluations?: Array<Record<string, unknown>>
  thesis_evaluation?: Record<string, unknown>
}

interface ReportContent {
  // Common fields
  overall_grade: string
  summary: string
  deck_score?: number
  report_version?: string
  rubric_version?: string

  // Investment thesis (deck-level)
  investment_thesis?: InvestmentThesis

  // Full report format
  slides?: FullReportSlide[]

  // Free report format (legacy)
  strengths?: ReportStrength[]
  biggest_issues?: ReportIssue[]
  slide_notes?: ReportSlideNote[]
  upgrade_teaser?: {
    title: string
    bullets: string[]
  }

  // V3 debug output (admin only)
  debug?: V3DebugOutput
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
  report_created_at?: string
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
  report_created_at: string
  deck_created_at: string | null
  email: string | null
  original_filename: string | null
  slide_count: number | null
  access_token: string | null
}

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SESSION_KEY = 'pdc_authenticated'
const SESSION_PASSWORD_KEY = 'pdc_admin_pw'
const EVAL_ARCH_KEY = 'evaluation_architecture'
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

type EvalArchitecture = 'v2' | 'v3'

export default function App() {
  // Check for admin mode via URL param (user must already be authenticated)
  const isAdmin = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.has('admin')
  }, [])

  const [adminView, setAdminView] = useState<AdminView>('reports')
  const [reportsList, setReportsList] = useState<ReportListItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Dev-only: Evaluation architecture toggle (v2/v3)
  const [evalArch, setEvalArch] = useState<EvalArchitecture>(() => {
    const stored = localStorage.getItem(EVAL_ARCH_KEY)
    return stored === 'v3' ? 'v3' : 'v2'
  })

  const handleEvalArchToggle = (arch: EvalArchitecture) => {
    setEvalArch(arch)
    localStorage.setItem(EVAL_ARCH_KEY, arch)
  }

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
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [hoveredSlideNumber, setHoveredSlideNumber] = useState<number | null>(null)
  const [debugExpanded, setDebugExpanded] = useState(false)

  // Store credentials for fetching report
  const deckCredentialsRef = useRef<{ deckId: string; accessToken: string } | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const pollStartTimeRef = useRef<number | null>(null)

  // Regen polling refs
  const regenPollIntervalRef = useRef<number | null>(null)
  const regenTimeoutRef = useRef<number | null>(null)

  // Admin action state (for delete/regenerate on reports)
  const [actionDeckId, setActionDeckId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'delete' | 'regenerate' | null>(null)
  const [actionError, setActionError] = useState('')
  const [regenProgress, setRegenProgress] = useState<string | null>(null)

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

  const pollDeckStatus = async (
    deckId: string,
    auth: { access_token: string } | { admin_password: string }
  ): Promise<DeckStatusResult | null> => {
    try {
      const response = await fetch('/.netlify/functions/get-deck-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck_id: deckId, ...auth }),
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

  const fetchReport = async (deckId: string, accessToken: string): Promise<{ content: ReportContent; slides: SlideData[]; report_created_at?: string } | null> => {
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
      const statusData = await pollDeckStatus(deckId, { access_token: accessToken })

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
          setReportCreatedAt(reportData.report_created_at || null)
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
        sessionStorage.setItem(SESSION_PASSWORD_KEY, password)
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

  const handleDeleteReport = async (deckId: string) => {
    if (!confirm('Delete this deck and all associated data? This cannot be undone.')) {
      return
    }

    setActionDeckId(deckId)
    setActionType('delete')
    setActionError('')

    try {
      const response = await fetch('/.netlify/functions/delete-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_id: deckId,
          admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
        }),
      })

      const data: DeleteResult = await response.json()

      if (response.ok && data.ok) {
        // Remove from list
        setReportsList((prev) => prev.filter((r) => r.deck_id !== deckId))
      } else {
        setActionError(data.error || 'Delete failed')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setActionError('Failed to delete deck')
    } finally {
      setActionDeckId(null)
      setActionType(null)
    }
  }

  const stopRegenPolling = () => {
    if (regenPollIntervalRef.current) {
      clearInterval(regenPollIntervalRef.current)
      regenPollIntervalRef.current = null
    }
    if (regenTimeoutRef.current) {
      clearTimeout(regenTimeoutRef.current)
      regenTimeoutRef.current = null
    }
  }

  const startRegenPolling = (deckId: string) => {
    stopRegenPolling()

    // Update report status in list to show generating
    setReportsList((prev) =>
      prev.map((r) =>
        r.deck_id === deckId ? { ...r, status: 'generating' } : r
      )
    )
    setRegenProgress('Generating report...')

    // Set timeout for 5 minutes
    regenTimeoutRef.current = window.setTimeout(() => {
      stopRegenPolling()
      setActionError('Regeneration timed out')
      setActionDeckId(null)
      setActionType(null)
      setRegenProgress(null)
    }, 5 * 60 * 1000)

    const adminPassword = sessionStorage.getItem(SESSION_PASSWORD_KEY) || ''

    regenPollIntervalRef.current = window.setInterval(async () => {
      const statusData = await pollDeckStatus(deckId, { admin_password: adminPassword })

      if (!statusData) {
        return
      }

      // Update progress display
      if (statusData.processing_status === 'generating_free') {
        setRegenProgress('Generating report...')
      }

      if (statusData.processing_status === 'ready' && statusData.report?.status === 'ready') {
        stopRegenPolling()
        // Update report in list with new grade and current timestamp
        const now = new Date().toISOString()
        setReportsList((prev) =>
          prev.map((r) =>
            r.deck_id === deckId
              ? { ...r, status: 'ready', overall_grade: statusData.report?.overall_grade || r.overall_grade, report_created_at: now }
              : r
          )
        )
        setActionDeckId(null)
        setActionType(null)
        setRegenProgress(null)
      } else if (statusData.processing_status === 'failed') {
        stopRegenPolling()
        setActionError(statusData.processing_error || 'Regeneration failed')
        setReportsList((prev) =>
          prev.map((r) =>
            r.deck_id === deckId ? { ...r, status: 'failed' } : r
          )
        )
        setActionDeckId(null)
        setActionType(null)
        setRegenProgress(null)
      }
    }, POLL_INTERVAL_MS)
  }

  const handleRegenerateReport = async (deckId: string) => {
    setActionDeckId(deckId)
    setActionType('regenerate')
    setActionError('')
    setRegenProgress('Starting...')

    // Start polling immediately
    startRegenPolling(deckId)

    // Trigger background regeneration (fire and forget)
    // Background function returns 202 immediately, runs in background
    fetch('/.netlify/functions/generate-report-background', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-evaluation-architecture': evalArch,
      },
      body: JSON.stringify({
        deck_id: deckId,
        admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
      }),
    }).catch((err) => {
      console.error('Background regen trigger error:', err)
      setActionError('Failed to trigger regeneration')
      setActionDeckId(null)
      setActionType(null)
      setRegenProgress(null)
    })
  }

  const fetchReportsList = async () => {
    setReportsLoading(true)
    setReportsError('')

    try {
      const response = await fetch('/.netlify/functions/get-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
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

  // Fetch reports list when admin view is 'reports' and user is authenticated
  useEffect(() => {
    if (isAuthenticated && isAdmin && adminView === 'reports') {
      fetchReportsList()
    }
  }, [isAuthenticated, isAdmin, adminView])

  const handleViewReport = async (item: ReportListItem) => {
    if (!item.access_token) {
      setReportsError('Missing access token for this report')
      return
    }

    // Fetch the full report and display it
    const reportData = await fetchReport(item.deck_id, item.access_token)
    if (reportData) {
      setReport(reportData.content)
      setReportCreatedAt(reportData.report_created_at || null)
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
    if (isAdmin) return '900px' // Consistent width for admin views
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
              alignItems: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.025em',
              }}
            >
              Pitch Deck Check
            </h1>
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
              }}
            >
              <button
                onClick={() => {
                  setAdminView('upload')
                  // Reset report state to show the upload form
                  setReport(null)
                  setStatus('idle')
                  setSlides([])
                  setSlideCount(null)
                }}
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
            </div>
            {/* Dev toggle: Evaluation architecture v2/v3 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontFamily,
              }}
            >
              <span style={{ color: '#9ca3af' }}>Eval:</span>
              <button
                onClick={() => handleEvalArchToggle('v2')}
                style={{
                  background: evalArch === 'v2' ? '#e5e7eb' : 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontFamily,
                  color: evalArch === 'v2' ? '#111827' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: evalArch === 'v2' ? 600 : 400,
                }}
              >
                v2
              </button>
              <button
                onClick={() => handleEvalArchToggle('v3')}
                style={{
                  background: evalArch === 'v3' ? '#dbeafe' : 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontFamily,
                  color: evalArch === 'v3' ? '#1d4ed8' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: evalArch === 'v3' ? 600 : 400,
                }}
              >
                v3
              </button>
            </div>
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
              {/* Hide header and form when viewing a report in admin mode */}
              {!(isAdmin && showingReport) && (
                <>
                  <div style={{ textAlign: isAdmin ? 'left' : 'center', marginBottom: '32px' }}>
                    <h1
                      style={{
                        fontSize: isAdmin ? '20px' : '28px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: isAdmin ? '0 0 8px 0' : '0 0 12px 0',
                        letterSpacing: '-0.025em',
                      }}
                    >
                      {isAdmin ? 'Upload Deck' : 'Pitch Deck Check'}
                    </h1>
                    <p
                      style={{
                        fontSize: isAdmin ? '14px' : '15px',
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
                </>
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
                  {report.deck_score && (
                    <span style={{ marginLeft: '8px', fontWeight: 500 }}>
                      ({report.deck_score.toFixed(2)}/5.0)
                    </span>
                  )}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                  {slideCount || report.slides?.length || 0} slides analyzed
                  {report.report_version && (
                    <span style={{ marginLeft: '8px' }}>• {report.report_version}</span>
                  )}
                  {reportCreatedAt && (
                    <span style={{ marginLeft: '8px' }}>
                      • {new Date(reportCreatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      {new Date(reportCreatedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  )}
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

            {/* Investment Thesis */}
            {report.investment_thesis && (
              <div style={{ marginBottom: '32px' }}>
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  Investment Thesis
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                  How well the deck answers core investor questions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(report.investment_thesis).map(([key, thesis]) => {
                    const thesisElement = thesis as ThesisElement
                    const label = key === 'why_this_market' ? 'Why This Market?'
                      : key === 'why_this_product' ? 'Why This Product?'
                      : key === 'why_this_team' ? 'Why This Team?'
                      : 'Why Now?'

                    return (
                      <div
                        key={key}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Thesis Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            backgroundColor: thesisElement.score >= 4 ? '#f0fdf4'
                              : thesisElement.score <= 2 ? '#fef2f2'
                              : '#fffbeb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: thesisElement.score >= 4 ? '#22c55e'
                                : thesisElement.score <= 2 ? '#ef4444'
                                : '#eab308',
                              color: '#ffffff',
                            }}
                          >
                            {thesisElement.score}/5
                          </span>
                        </div>

                        {/* Thesis Content */}
                        <div style={{ padding: '14px 16px' }}>
                          {/* Verdict */}
                          <div style={{ marginBottom: '12px' }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 500,
                                color: thesisElement.score >= 4 ? '#166534'
                                  : thesisElement.score <= 2 ? '#991b1b'
                                  : '#92400e',
                                lineHeight: 1.5,
                              }}
                            >
                              {thesisElement.verdict}
                            </p>
                          </div>

                          {/* Assessment */}
                          <div style={{ marginBottom: '10px' }}>
                            <p style={{ margin: '0 0 3px 0', fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>
                              Evidence
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                              {thesisElement.assessment}
                            </p>
                          </div>

                          {/* Gaps */}
                          {thesisElement.gaps && thesisElement.gaps !== 'None - thesis is well-supported' && (
                            <div>
                              <p style={{ margin: '0 0 3px 0', fontSize: '11px', fontWeight: 500, color: '#dc2626', textTransform: 'uppercase' }}>
                                Gaps
                              </p>
                              <p style={{ margin: 0, fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                                {thesisElement.gaps}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full Report: Slide-by-Slide with Questions */}
            {report.slides && report.slides.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  Slide-by-Slide Analysis
                </h3>
                {report.slides.map((slide) => {
                  const slideData = slides.find(s => s.slide_number === slide.slide_number)
                  const imageUrl = slideData?.image_url

                  return (
                    <div
                      key={slide.slide_number}
                      style={{
                        marginBottom: '20px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Slide Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          backgroundColor: '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{ flexShrink: 0, width: '80px' }}
                          onMouseEnter={() => imageUrl && setHoveredSlideNumber(slide.slide_number)}
                          onMouseLeave={() => setHoveredSlideNumber(null)}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`Slide ${slide.slide_number}`}
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
                                backgroundColor: '#e5e7eb',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: '#9ca3af',
                              }}
                            >
                              No image
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                              Slide {slide.slide_number}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: '#e5e7eb',
                                color: '#4b5563',
                              }}
                            >
                              {slide.type}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color:
                                  slide.grade === 'A' ? '#22c55e'
                                    : slide.grade === 'B' ? '#84cc16'
                                    : slide.grade === 'C' ? '#eab308'
                                    : slide.grade === 'D' ? '#f97316'
                                    : '#ef4444',
                              }}
                            >
                              Grade: {slide.grade}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              ({(slide.normalized_score * 100).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Questions */}
                      <div style={{ padding: '12px 16px' }}>
                        {slide.questions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            style={{
                              padding: '12px',
                              marginBottom: qIdx < slide.questions.length - 1 ? '12px' : 0,
                              backgroundColor: q.score >= 4 ? '#f0fdf4' : q.score <= 2 ? '#fef2f2' : '#fffbeb',
                              border: `1px solid ${q.score >= 4 ? '#bbf7d0' : q.score <= 2 ? '#fecaca' : '#fde68a'}`,
                              borderRadius: '6px',
                            }}
                          >
                            {/* Question header with score */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#111827', flex: 1 }}>
                                {q.question}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: q.score >= 4 ? '#22c55e' : q.score <= 2 ? '#ef4444' : '#eab308',
                                    color: '#ffffff',
                                  }}
                                >
                                  {q.score}/5
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    backgroundColor: q.confidence === 'high' ? '#dcfce7' : q.confidence === 'low' ? '#fee2e2' : '#fef3c7',
                                    color: q.confidence === 'high' ? '#166534' : q.confidence === 'low' ? '#991b1b' : '#92400e',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {q.confidence}
                                </span>
                              </div>
                            </div>

                            {/* Assessment */}
                            <div style={{ marginBottom: '8px' }}>
                              <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>
                                Assessment
                              </p>
                              <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
                                {q.assessment}
                              </p>
                            </div>

                            {/* Gap */}
                            {q.gap && q.gap !== 'None - fully addressed' && (
                              <div style={{ marginBottom: '8px' }}>
                                <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 500, color: '#dc2626', textTransform: 'uppercase' }}>
                                  Gap
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                                  {q.gap}
                                </p>
                              </div>
                            )}

                            {/* Investor Impact */}
                            {q.investor_impact && q.investor_impact !== 'None - this area is well-addressed' && (
                              <div style={{ marginBottom: '8px' }}>
                                <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 500, color: '#7c3aed', textTransform: 'uppercase' }}>
                                  Investor Impact
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#6d28d9', lineHeight: 1.5 }}>
                                  {q.investor_impact}
                                </p>
                              </div>
                            )}

                            {/* Fix */}
                            {q.fix && q.fix !== 'None needed' && (
                              <div>
                                <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 500, color: '#2563eb', textTransform: 'uppercase' }}>
                                  How to Fix
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#1d4ed8', lineHeight: 1.5 }}>
                                  {q.fix}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Free Report: Strengths (legacy format) */}
            {report.strengths && report.strengths.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
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
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500, color: '#166534' }}>
                      {strength.title || strength.question}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#15803d', lineHeight: 1.5 }}>
                      {strength.detail || strength.assessment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Free Report: Biggest Issues (legacy format) */}
            {report.biggest_issues && report.biggest_issues.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Biggest Issues
                </h3>
                {report.biggest_issues.map((issue, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: issue.priority === 'high' ? '#fef2f2' : issue.priority === 'medium' ? '#fffbeb' : '#f9fafb',
                      border: `1px solid ${issue.priority === 'high' ? '#fecaca' : issue.priority === 'medium' ? '#fde68a' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: issue.priority === 'high' ? '#991b1b' : issue.priority === 'medium' ? '#92400e' : '#374151' }}>
                        {issue.title || issue.question}
                      </p>
                      {issue.priority && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            backgroundColor: issue.priority === 'high' ? '#fee2e2' : issue.priority === 'medium' ? '#fef3c7' : '#f3f4f6',
                            color: issue.priority === 'high' ? '#dc2626' : issue.priority === 'medium' ? '#d97706' : '#6b7280',
                          }}
                        >
                          {issue.priority}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: issue.priority === 'high' ? '#b91c1c' : issue.priority === 'medium' ? '#b45309' : '#4b5563' }}>
                      {issue.detail || issue.assessment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Free Report: Slide Notes (legacy format) */}
            {report.slide_notes && report.slide_notes.length > 0 && !report.slides && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Slide-by-Slide Notes
                </h3>
                {report.slide_notes.map((note, idx) => {
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
                      <div
                        style={{ flexShrink: 0, width: '120px' }}
                        onMouseEnter={() => imageUrl && setHoveredSlideNumber(note.slide_number)}
                        onMouseLeave={() => setHoveredSlideNumber(null)}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`Slide ${note.slide_number}`}
                            style={{ width: '100%', height: 'auto', borderRadius: '4px', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                          />
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#f3f4f6', borderRadius: '4px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '4px' }}>Slide image unavailable</span>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Slide {note.slide_number}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '3px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>{note.inferred_type}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: note.grade === 'A' ? '#22c55e' : note.grade === 'B' ? '#84cc16' : note.grade === 'C' ? '#eab308' : note.grade === 'D' ? '#f97316' : '#ef4444' }}>{note.grade}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', lineHeight: 1.5 }}>{note.note}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Upgrade Teaser (only for free reports) */}
            {report.upgrade_teaser && (
              <div style={{ padding: '20px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#1e40af' }}>
                  {report.upgrade_teaser.title}
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {report.upgrade_teaser.bullets.map((bullet, idx) => (
                    <li key={idx} style={{ fontSize: '14px', color: '#1d4ed8', marginBottom: '6px', lineHeight: 1.4 }}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* V3 Debug Output (admin only - show if admin password is set or ?admin mode) */}
            {(isAdmin || sessionStorage.getItem(SESSION_PASSWORD_KEY)) && report.debug && (
              <div style={{ marginTop: '32px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  onClick={() => setDebugExpanded(!debugExpanded)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                  }}
                >
                  <span>V3 Debug Output</span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {debugExpanded ? '▼' : '▶'}
                  </span>
                </button>

                {debugExpanded && (
                  <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
                    {/* Architecture */}
                    {report.debug.architecture && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Architecture
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '200px',
                        }}>
                          {JSON.stringify(report.debug.architecture, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Deck Context */}
                    {report.debug.deck_context && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Deck Context Classification
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '300px',
                        }}>
                          {JSON.stringify(report.debug.deck_context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Rule Injection */}
                    {report.debug.rule_injection && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Rule Injection
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '300px',
                        }}>
                          {JSON.stringify(report.debug.rule_injection, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Prompts */}
                    {report.debug.prompts && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Prompts
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '400px',
                        }}>
                          {JSON.stringify(report.debug.prompts, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Scoring (V3 blended scoring debug) */}
                    {report.debug.scoring && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          V3 Scoring
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '400px',
                        }}>
                          {JSON.stringify(report.debug.scoring, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Signal Override */}
                    {report.debug.signal_override && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                          Signal Override {report.debug.signal_override.signal_override_executed ? '(ACTIVE)' : '(INACTIVE)'}
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '500px',
                        }}>
                          {JSON.stringify(report.debug.signal_override, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Slide Evaluations */}
                    {report.debug.slide_evaluations && report.debug.slide_evaluations.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Slide Evaluations ({report.debug.slide_evaluations.length} slides)
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '400px',
                        }}>
                          {JSON.stringify(report.debug.slide_evaluations, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Thesis Evaluation */}
                    {report.debug.thesis_evaluation && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#111827', textTransform: 'uppercase' }}>
                          Thesis Evaluation
                        </h4>
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          backgroundColor: '#1f2937',
                          color: '#f9fafb',
                          borderRadius: '6px',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          overflow: 'auto',
                          maxHeight: '300px',
                        }}>
                          {JSON.stringify(report.debug.thesis_evaluation, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Generated timestamp */}
                    {report.debug.generated_at && (
                      <p style={{ margin: '16px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                        Debug generated: {new Date(report.debug.generated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
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

              {(reportsError || actionError) && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>
                    {reportsError || actionError}
                  </p>
                </div>
              )}

              {!reportsLoading && reportsList.length === 0 && !reportsError && !actionError && (
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
                                actionDeckId === item.deck_id && actionType === 'regenerate'
                                  ? '#fef3c7'
                                  : item.status === 'ready'
                                    ? '#dcfce7'
                                    : item.status === 'failed'
                                      ? '#fef2f2'
                                      : '#f3f4f6',
                              color:
                                actionDeckId === item.deck_id && actionType === 'regenerate'
                                  ? '#92400e'
                                  : item.status === 'ready'
                                    ? '#166534'
                                    : item.status === 'failed'
                                      ? '#dc2626'
                                      : '#6b7280',
                            }}
                          >
                            {actionDeckId === item.deck_id && actionType === 'regenerate'
                              ? regenProgress || 'Regenerating...'
                              : item.status}
                          </span>

                          <span
                            style={{
                              fontSize: '11px',
                              color: '#9ca3af',
                              minWidth: '160px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                            }}
                          >
                            <span>
                              Uploaded:{' '}
                              {item.deck_created_at
                                ? `${new Date(item.deck_created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })} ${new Date(item.deck_created_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}`
                                : '—'}
                            </span>
                            <span>
                              Report:{' '}
                              {new Date(item.report_created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {new Date(item.report_created_at).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRegenerateReport(item.deck_id)
                            }}
                            disabled={actionDeckId === item.deck_id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '4px 8px',
                              background: 'none',
                              border: 'none',
                              cursor: actionDeckId === item.deck_id ? 'not-allowed' : 'pointer',
                              // Don't fade during regeneration - keep full opacity so blue stays vibrant
                              opacity: actionDeckId === item.deck_id && actionType !== 'regenerate' ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (actionDeckId !== item.deck_id) {
                                const svg = e.currentTarget.querySelector('svg')
                                const label = e.currentTarget.querySelector('span')
                                if (svg) svg.style.color = '#2563eb'
                                if (label) label.style.color = '#2563eb'
                              }
                            }}
                            onMouseLeave={(e) => {
                              // Don't reset colors if regenerating - keep blue
                              if (actionDeckId === item.deck_id && actionType === 'regenerate') {
                                return
                              }
                              const svg = e.currentTarget.querySelector('svg')
                              const label = e.currentTarget.querySelector('span')
                              if (svg) svg.style.color = '#9ca3af'
                              if (label) label.style.color = '#9ca3af'
                            }}
                          >
                            <div
                              style={{
                                animation: actionDeckId === item.deck_id && actionType === 'regenerate'
                                  ? 'pulse-slow 1s ease-in-out infinite'
                                  : 'none',
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  color: actionDeckId === item.deck_id && actionType === 'regenerate'
                                    ? '#2563eb'
                                    : '#9ca3af',
                                  transition: 'color 0.15s',
                                }}
                              >
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                              </svg>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                color: actionDeckId === item.deck_id && actionType === 'regenerate'
                                  ? '#2563eb'
                                  : '#9ca3af',
                                transition: 'color 0.15s',
                              }}
                            >
                              {actionDeckId === item.deck_id && actionType === 'regenerate'
                                ? 'Working...'
                                : 'Regen'}
                            </span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteReport(item.deck_id)
                            }}
                            disabled={actionDeckId === item.deck_id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '4px 8px',
                              background: 'none',
                              border: 'none',
                              cursor: actionDeckId === item.deck_id ? 'not-allowed' : 'pointer',
                              opacity: actionDeckId === item.deck_id ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (actionDeckId !== item.deck_id) {
                                const svg = e.currentTarget.querySelector('svg')
                                const label = e.currentTarget.querySelector('span')
                                if (svg) svg.style.color = '#dc2626'
                                if (label) label.style.color = '#dc2626'
                              }
                            }}
                            onMouseLeave={(e) => {
                              const svg = e.currentTarget.querySelector('svg')
                              const label = e.currentTarget.querySelector('span')
                              if (svg) svg.style.color = '#9ca3af'
                              if (label) label.style.color = '#9ca3af'
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ color: '#9ca3af', transition: 'color 0.15s' }}
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#9ca3af',
                                transition: 'color 0.15s',
                              }}
                            >
                              {actionDeckId === item.deck_id && actionType === 'delete'
                                ? 'Deleting...'
                                : 'Delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
