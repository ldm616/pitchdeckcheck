import { useState, useEffect, FormEvent, ChangeEvent, useRef, useMemo } from 'react'
import { BarChart3, Target, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'

type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'timeout'
type AdminView = 'upload' | 'reports' | 'calibration'

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

// V1 Founder-Facing Report Types
interface V1QualityDimension {
  grade: string
  diagnostic: string
  description: string
}

interface V1QualityDimensions {
  clarity: V1QualityDimension
  brevity: V1QualityDimension
  flow: V1QualityDimension
  completeness: V1QualityDimension
}

interface V1Strength {
  strength: string
  slide_type: string
}

interface V1Improvement {
  improvement: string
  context: string
  slide_type: string
}

interface V1NarrativeSequence {
  slides: string
  description: string
  investor_reaction: string
}

interface V1NarrativeFlow {
  strongest_sequence: V1NarrativeSequence
  weakest_sequence: V1NarrativeSequence
}

interface V1SlideSummary {
  slide_number: number
  type: string
  grade: string
  key_takeaway: string
}

interface V1SlideDetail {
  slide_number: number
  type: string
  grade: string
  what_works: string
  biggest_gap: string
  highest_impact_improvement: string
}

interface V1Report {
  report_version: string
  overall: {
    grade: string
    score: number
    synthesis: string
    positioning_note: string
  }
  quality_dimensions: V1QualityDimensions
  top_strengths: V1Strength[]
  top_improvements: V1Improvement[]
  narrative_flow: V1NarrativeFlow
  slide_summary: V1SlideSummary[]
  slides: V1SlideDetail[]
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

  // V1 founder-facing report
  v1_report?: V1Report

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

interface CalibrationDeck {
  id: string
  company: string
  archetype: string
  era: string | null
  stage: string
  year: number | null
  deck_file: string | null
  expected_grade_range: string[] | null
  strengths: string[]
  known_weaknesses: string[]
  must_not_happen: string[]
  notes: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

interface CalibrationFormData {
  id: string
  company: string
  archetype: string
  stage: string
  era: string
  year: number
  expected_grade_min: string
  expected_grade_max: string
  strengths: string
  known_weaknesses: string
  must_not_happen: string
  notes: string
  active: boolean
}

const ARCHETYPES = [
  { value: 'consumer_network', label: 'Consumer Network' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'local_marketplace', label: 'Local Marketplace' },
  { value: 'saas', label: 'SaaS' },
  { value: 'developer_tools', label: 'Developer Tools' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'ai_application', label: 'AI Application' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'biotech', label: 'Biotech' },
  { value: 'hardtech', label: 'Hardtech' },
  { value: 'enterprise_ai', label: 'Enterprise AI' },
  { value: 'consumer_ai', label: 'Consumer AI' },
]

const STAGES = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
]

const ERAS = [
  { value: 'sparse_classic', label: 'Sparse Classic (pre-2015)' },
  { value: 'modern', label: 'Modern (2015+)' },
]

const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E']

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SESSION_KEY = 'pdc_authenticated'
const SESSION_PASSWORD_KEY = 'pdc_admin_pw'
const ADMIN_MODE_KEY = 'pdc_admin_mode'
const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

// Quality dimension definitions for founder-facing display
const DIMENSION_DEFINITIONS = {
  clarity: 'How clearly the deck explains what the company does, who it serves, why the problem matters, and why the solution is compelling.',
  brevity: 'How efficiently the deck communicates the story without unnecessary density, repetition, or distracting detail.',
  flow: 'How well the slides build logically from one idea to the next, creating a coherent investor narrative.',
  completeness: 'How well the deck answers the key questions an investor needs answered at this stage.',
}

export default function App() {
  // Check for admin mode via URL param or localStorage
  const isAdmin = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const hasAdminParam = params.has('admin') || params.get('admin') === '1'

    // If URL has admin param, store in localStorage
    if (hasAdminParam) {
      localStorage.setItem(ADMIN_MODE_KEY, 'true')
      return true
    }

    // Check localStorage for existing admin mode
    return localStorage.getItem(ADMIN_MODE_KEY) === 'true'
  }, [])

  const [adminView, setAdminView] = useState<AdminView>('upload')
  const [reportsList, setReportsList] = useState<ReportListItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Calibration deck form state
  const [calibrationDecks, setCalibrationDecks] = useState<CalibrationDeck[]>([])
  const [calibrationLoading, setCalibrationLoading] = useState(false)
  const [calibrationError, setCalibrationError] = useState('')
  const [showCalibrationForm, setShowCalibrationForm] = useState(false)
  const [editingDeck, setEditingDeck] = useState<CalibrationDeck | null>(null)
  const [calibrationFormData, setCalibrationFormData] = useState<CalibrationFormData>({
    id: '',
    company: '',
    archetype: 'saas',
    stage: 'seed',
    era: 'modern',
    year: new Date().getFullYear(),
    expected_grade_min: 'C',
    expected_grade_max: 'B',
    strengths: '',
    known_weaknesses: '',
    must_not_happen: '',
    notes: '',
    active: true,
  })
  const [calibrationSaving, setCalibrationSaving] = useState(false)

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
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

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

  // Track mobile viewport for responsive layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
        'x-evaluation-architecture': 'v3',
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

  const fetchCalibrationDecks = async () => {
    setCalibrationLoading(true)
    setCalibrationError('')

    try {
      const response = await fetch('/.netlify/functions/get-calibration-decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
        }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        setCalibrationDecks(data.decks || [])
      } else {
        setCalibrationError(data.error || 'Failed to fetch calibration decks')
      }
    } catch (err) {
      console.error('Fetch calibration decks error:', err)
      setCalibrationError('Failed to fetch calibration decks')
    } finally {
      setCalibrationLoading(false)
    }
  }

  const resetCalibrationForm = () => {
    setCalibrationFormData({
      id: '',
      company: '',
      archetype: 'saas',
      stage: 'seed',
      era: 'modern',
      year: new Date().getFullYear(),
      expected_grade_min: 'C',
      expected_grade_max: 'B',
      strengths: '',
      known_weaknesses: '',
      must_not_happen: '',
      notes: '',
      active: true,
    })
    setEditingDeck(null)
    setShowCalibrationForm(false)
  }

  const handleEditCalibrationDeck = (deck: CalibrationDeck) => {
    setEditingDeck(deck)
    setCalibrationFormData({
      id: deck.id,
      company: deck.company,
      archetype: deck.archetype,
      stage: deck.stage,
      era: deck.era || 'modern',
      year: deck.year || new Date().getFullYear(),
      expected_grade_min: deck.expected_grade_range?.[0] || 'C',
      expected_grade_max: deck.expected_grade_range?.[1] || 'B',
      strengths: deck.strengths.join('\n'),
      known_weaknesses: deck.known_weaknesses.join('\n'),
      must_not_happen: deck.must_not_happen.join('\n'),
      notes: deck.notes || '',
      active: deck.active,
    })
    setShowCalibrationForm(true)
  }

  const handleSaveCalibrationDeck = async (e: FormEvent) => {
    e.preventDefault()
    setCalibrationSaving(true)
    setCalibrationError('')

    try {
      // Generate ID from company name if new
      const id = calibrationFormData.id ||
        calibrationFormData.company.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + calibrationFormData.archetype

      const payload = {
        admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
        deck: {
          id,
          company: calibrationFormData.company,
          archetype: calibrationFormData.archetype,
          stage: calibrationFormData.stage,
          era: calibrationFormData.era,
          year: calibrationFormData.year,
          expected_grade_range: [calibrationFormData.expected_grade_min, calibrationFormData.expected_grade_max],
          strengths: calibrationFormData.strengths.split('\n').map(s => s.trim()).filter(Boolean),
          known_weaknesses: calibrationFormData.known_weaknesses.split('\n').map(s => s.trim()).filter(Boolean),
          must_not_happen: calibrationFormData.must_not_happen.split('\n').map(s => s.trim()).filter(Boolean),
          notes: calibrationFormData.notes || null,
          active: calibrationFormData.active,
        },
      }

      const response = await fetch('/.netlify/functions/upsert-calibration-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        resetCalibrationForm()
        fetchCalibrationDecks()
      } else {
        setCalibrationError(data.error || 'Failed to save calibration deck')
      }
    } catch (err) {
      console.error('Save calibration deck error:', err)
      setCalibrationError('Failed to save calibration deck')
    } finally {
      setCalibrationSaving(false)
    }
  }

  const handleDeleteCalibrationDeck = async (deckId: string) => {
    if (!confirm(`Delete calibration deck "${deckId}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/.netlify/functions/delete-calibration-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_password: sessionStorage.getItem(SESSION_PASSWORD_KEY) || '',
          deck_id: deckId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        fetchCalibrationDecks()
      } else {
        setCalibrationError(data.error || 'Failed to delete calibration deck')
      }
    } catch (err) {
      console.error('Delete calibration deck error:', err)
      setCalibrationError('Failed to delete calibration deck')
    }
  }

  // Fetch reports list when admin view is 'reports' and user is authenticated
  useEffect(() => {
    if (isAuthenticated && isAdmin && adminView === 'reports') {
      fetchReportsList()
    }
  }, [isAuthenticated, isAdmin, adminView])

  // Fetch calibration decks when admin view is 'calibration' and user is authenticated
  useEffect(() => {
    if (isAuthenticated && isAdmin && adminView === 'calibration') {
      fetchCalibrationDecks()
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
        return 'Generating your report...'
      }
      return 'Processing...'
    }
    return 'Upload Deck'
  }

  // Password gate - only for admin mode
  if (isAdmin && !isAuthenticated) {
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
              Admin Access
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0,
              }}
            >
              Enter admin password to continue
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
    if (adminView === 'reports') return '900px' // Wide for reports list
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
      {/* Admin Header - simplified, just shows All Reports link */}
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
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '4px',
                }}
              >
                Admin
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              {adminView === 'reports' ? (
                <button
                  onClick={() => {
                    setAdminView('upload')
                    setReport(null)
                    setStatus('idle')
                    setSlides([])
                    setSlideCount(null)
                    setShowLanding(true)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily,
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                >
                  ← Back to Upload
                </button>
              ) : (
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
                    color: '#2563eb',
                    cursor: 'pointer',
                  }}
                >
                  View All Reports →
                </button>
              )}
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
          padding: adminView === 'reports' ? '32px 24px 24px' : showLanding && status === 'idle' ? '80px 24px 24px' : '50px 24px 24px',
        }}
      >
        {/* Landing Page - shown to founders and admins (when in upload view) */}
        {(!isAdmin || adminView === 'upload') && showLanding && status === 'idle' && (
          <div style={{ width: '100%', maxWidth: '640px', textAlign: 'center' }}>
            {/* Hero */}
            <h1
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 16px 0',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Is your pitch deck ready for investors?
            </h1>
            <p
              style={{
                fontSize: '18px',
                color: '#6b7280',
                margin: '0 0 32px 0',
                lineHeight: 1.6,
              }}
            >
              Upload your deck and get free, instant feedback on clarity, brevity, flow, and completeness — so you know what to fix before sending it to investors.
            </p>

            {/* CTA Button */}
            <button
              onClick={() => setShowLanding(false)}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                marginBottom: '48px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              }}
            >
              Get free deck feedback
            </button>

            {/* What you'll get */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                textAlign: 'left',
                marginBottom: '32px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 20px 0',
                }}
              >
                What you'll get
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { Icon: BarChart3, text: 'Overall deck quality score' },
                  { Icon: Target, text: 'Clarity, brevity, flow, and completeness breakdown' },
                  { Icon: CheckCircle2, text: 'Top strengths and improvement priorities' },
                  { Icon: FileText, text: 'Slide-by-slide feedback you can act on' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.Icon size={20} color="#2563eb" strokeWidth={2} />
                    <span style={{ fontSize: '15px', color: '#374151' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supporting copy */}
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 24px 0',
                lineHeight: 1.6,
              }}
            >
              See where your deck is clear, where investors may lose conviction, and which fixes would make the biggest difference.
            </p>

            {/* Trust/privacy */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#9ca3af',
              }}
            >
              <ShieldCheck size={14} strokeWidth={2} />
              <span>Your deck is used only to generate your report.</span>
            </div>
          </div>
        )}

        {/* Upload Form & Report View */}
        {(adminView === 'reports' || !showLanding || status !== 'idle') && (
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
                  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {/* Back link to landing */}
                    <button
                      onClick={() => setShowLanding(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '13px',
                        color: '#6b7280',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ← Back
                    </button>
                    <h1
                      style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#111827',
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.025em',
                      }}
                    >
                      Upload Your Pitch Deck
                    </h1>
                    <p
                      style={{
                        fontSize: '15px',
                        color: '#6b7280',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      Get your deck quality report in under 2 minutes.
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
                marginBottom: '4px',
              }}
            >
              Email
            </label>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 6px 0' }}>
              We'll use this to save your private report link so you can return to it later.
            </p>
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

          {/* Secondary reassurance */}
          {status === 'idle' && (
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              Your report is saved privately and linked to your email so you can come back later.
            </p>
          )}
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
            {/* V1 Report Display */}
            {report.v1_report ? (
              <>
                {/* 1. Overall Deck Quality */}
                <div style={{ marginBottom: '32px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        backgroundColor:
                          report.v1_report.overall.grade.startsWith('A') ? '#22c55e'
                            : report.v1_report.overall.grade.startsWith('B') ? '#84cc16'
                            : report.v1_report.overall.grade.startsWith('C') ? '#eab308'
                            : report.v1_report.overall.grade.startsWith('D') ? '#f97316'
                            : '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {report.v1_report.overall.grade}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                        Deck Quality Score
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                        {slideCount || report.v1_report.slide_summary?.length || 0} slides analyzed
                        {reportCreatedAt && (
                          <span style={{ marginLeft: '8px' }}>
                            • {new Date(reportCreatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Synthesis */}
                  <div
                    style={{
                      padding: '20px 24px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      borderLeft: '4px solid #3b82f6',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '15px', color: '#1e293b', lineHeight: 1.8 }}>
                      {report.v1_report.overall.synthesis}
                    </p>
                  </div>

                  {/* Positioning note */}
                  <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                    {report.v1_report.overall.positioning_note}
                  </p>
                </div>

                {/* 2. Quality Dimensions */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    Quality Breakdown
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
                    {(['clarity', 'brevity', 'flow', 'completeness'] as const).map((dim) => {
                      const dimension = report.v1_report!.quality_dimensions[dim]
                      const isExpanded = expandedDimension === dim
                      return (
                        <div
                          key={dim}
                          style={{
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                              {dim}
                            </span>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                padding: '2px 10px',
                                borderRadius: '6px',
                                backgroundColor:
                                  dimension.grade.startsWith('A') ? '#dcfce7'
                                    : dimension.grade.startsWith('B') ? '#ecfccb'
                                    : dimension.grade.startsWith('C') ? '#fef9c3'
                                    : '#fee2e2',
                                color:
                                  dimension.grade.startsWith('A') ? '#166534'
                                    : dimension.grade.startsWith('B') ? '#3f6212'
                                    : dimension.grade.startsWith('C') ? '#854d0e'
                                    : '#991b1b',
                              }}
                            >
                              {dimension.grade}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
                            {dimension.diagnostic}
                          </p>
                          <button
                            onClick={() => setExpandedDimension(isExpanded ? null : dim)}
                            style={{
                              marginTop: '8px',
                              padding: 0,
                              border: 'none',
                              background: 'none',
                              fontSize: '12px',
                              color: '#6b7280',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {isExpanded ? 'Show less' : 'What does this mean?'}
                          </button>
                          {isExpanded && (
                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: 1.5, fontStyle: 'italic' }}>
                              {DIMENSION_DEFINITIONS[dim]}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Top Strengths */}
                {report.v1_report.top_strengths && report.v1_report.top_strengths.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      Top Strengths
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {report.v1_report.top_strengths.map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '14px 16px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '8px',
                            borderLeft: '3px solid #22c55e',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '14px', color: '#166534', lineHeight: 1.6 }}>
                            {s.strength}
                          </p>
                          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                            {s.slide_type}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Top Improvement Priorities */}
                {report.v1_report.top_improvements && report.v1_report.top_improvements.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      Top Improvement Priorities
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {report.v1_report.top_improvements.map((imp, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '14px 16px',
                            backgroundColor: '#fffbeb',
                            borderRadius: '8px',
                            borderLeft: '3px solid #f59e0b',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '14px', color: '#92400e', lineHeight: 1.6, fontWeight: 500 }}>
                            {idx + 1}. {imp.improvement}
                          </p>
                          {imp.context && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#78716c', lineHeight: 1.5 }}>
                              {imp.context}
                            </p>
                          )}
                          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                            {imp.slide_type}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Narrative Flow */}
                {report.v1_report.narrative_flow && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      Narrative Flow
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px' }}>
                      {/* Strongest Sequence */}
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#f0fdf4',
                          borderRadius: '10px',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                          Strongest Sequence
                        </p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#14532d' }}>
                          {report.v1_report.narrative_flow.strongest_sequence.slides}
                        </p>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                          {report.v1_report.narrative_flow.strongest_sequence.description}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#4ade80', fontStyle: 'italic' }}>
                          {report.v1_report.narrative_flow.strongest_sequence.investor_reaction}
                        </p>
                      </div>

                      {/* Weakest Sequence */}
                      <div
                        style={{
                          padding: '16px',
                          backgroundColor: '#fef2f2',
                          borderRadius: '10px',
                          border: '1px solid #fecaca',
                        }}
                      >
                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase' }}>
                          Needs Work
                        </p>
                        <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: '#7f1d1d' }}>
                          {report.v1_report.narrative_flow.weakest_sequence.slides}
                        </p>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                          {report.v1_report.narrative_flow.weakest_sequence.description}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#f87171', fontStyle: 'italic' }}>
                          {report.v1_report.narrative_flow.weakest_sequence.investor_reaction}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Slide Summary Table */}
                {report.v1_report.slide_summary && report.v1_report.slide_summary.length > 0 && (
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      Slide Summary
                    </h3>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '480px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Slide</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Grade</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Key Takeaway</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.v1_report.slide_summary.map((slide, idx) => (
                            <tr key={slide.slide_number} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>{slide.slide_number}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>{slide.type}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color:
                                      slide.grade.startsWith('A') ? '#22c55e'
                                        : slide.grade.startsWith('B') ? '#84cc16'
                                        : slide.grade.startsWith('C') ? '#eab308'
                                        : slide.grade.startsWith('D') ? '#f97316'
                                        : '#ef4444',
                                  }}
                                >
                                  {slide.grade}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#4b5563', lineHeight: 1.4 }}>{slide.key_takeaway}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. Slide Details */}
                {report.v1_report.slides && report.v1_report.slides.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      Slide Details
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {report.v1_report.slides.map((slide) => {
                        const slideData = slides.find(s => s.slide_number === slide.slide_number)
                        const imageUrl = slideData?.image_url

                        return (
                          <div
                            key={slide.slide_number}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '10px',
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
                              {imageUrl && (
                                <div
                                  style={{ flexShrink: 0, width: '64px' }}
                                  onMouseEnter={() => setHoveredSlideNumber(slide.slide_number)}
                                  onMouseLeave={() => setHoveredSlideNumber(null)}
                                >
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
                                </div>
                              )}

                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                                    Slide {slide.slide_number} — {slide.type}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor:
                                        slide.grade.startsWith('A') ? '#dcfce7'
                                          : slide.grade.startsWith('B') ? '#ecfccb'
                                          : slide.grade.startsWith('C') ? '#fef9c3'
                                          : '#fee2e2',
                                      color:
                                        slide.grade.startsWith('A') ? '#166534'
                                          : slide.grade.startsWith('B') ? '#3f6212'
                                          : slide.grade.startsWith('C') ? '#854d0e'
                                          : '#991b1b',
                                    }}
                                  >
                                    {slide.grade}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Slide Content */}
                            <div style={{ padding: '16px' }}>
                              {/* What Works */}
                              <div style={{ marginBottom: '14px' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#166534', textTransform: 'uppercase' }}>
                                  What Works
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                                  {slide.what_works}
                                </p>
                              </div>

                              {/* Biggest Gap */}
                              {slide.biggest_gap && slide.biggest_gap !== 'No significant gaps identified.' && (
                                <div style={{ marginBottom: '14px' }}>
                                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>
                                    Biggest Gap
                                  </p>
                                  <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                                    {slide.biggest_gap}
                                  </p>
                                </div>
                              )}

                              {/* Highest-Impact Improvement */}
                              {slide.highest_impact_improvement && slide.highest_impact_improvement !== 'No specific improvements needed.' && (
                                <div>
                                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
                                    Highest-Impact Improvement
                                  </p>
                                  <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                                    {slide.highest_impact_improvement}
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
              </>
            ) : (
              /* Fallback: Original Report Display */
              <>
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
                      {isAdmin && report.deck_score && (
                        <span style={{ marginLeft: '8px', fontWeight: 500 }}>
                          ({report.deck_score.toFixed(2)}/5.0)
                        </span>
                      )}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                      {slideCount || report.slides?.length || 0} slides analyzed
                      {isAdmin && report.report_version && (
                        <span style={{ marginLeft: '8px' }}>• {report.report_version}</span>
                      )}
                      {reportCreatedAt && (
                        <span style={{ marginLeft: '8px' }}>
                          • {new Date(reportCreatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
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
              </>
            )}

            {/* Investment Thesis (admin only) */}
            {isAdmin && report.investment_thesis && (
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

            {/* Full Report: Slide-by-Slide with Questions (admin only) */}
            {isAdmin && report.slides && report.slides.length > 0 && (
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

            {/* Free Report: Strengths (legacy format, admin only) */}
            {isAdmin && report.strengths && report.strengths.length > 0 && (
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

            {/* Free Report: Biggest Issues (legacy format, admin only) */}
            {isAdmin && report.biggest_issues && report.biggest_issues.length > 0 && (
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

            {/* Free Report: Slide Notes (legacy format, admin only) */}
            {isAdmin && report.slide_notes && report.slide_notes.length > 0 && !report.slides && (
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

            {/* Upgrade Teaser (only for free reports, admin only) */}
            {isAdmin && report.upgrade_teaser && (
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

            {/* V3 Debug Output (admin only) */}
            {isAdmin && report.debug && (
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

          {/* Calibration View - Admin only */}
          {isAdmin && adminView === 'calibration' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#111827',
                    margin: 0,
                  }}
                >
                  Calibration Decks
                </h2>
                <button
                  onClick={() => {
                    resetCalibrationForm()
                    setShowCalibrationForm(true)
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  + Add Deck
                </button>
              </div>

              {calibrationError && (
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
                    {calibrationError}
                  </p>
                </div>
              )}

              {/* Add/Edit Form */}
              {showCalibrationForm && (
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '20px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                    {editingDeck ? `Edit: ${editingDeck.company}` : 'Add Calibration Deck'}
                  </h3>
                  <form onSubmit={handleSaveCalibrationDeck}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={calibrationFormData.company}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCalibrationFormData({ ...calibrationFormData, company: e.target.value })}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Archetype *
                        </label>
                        <select
                          value={calibrationFormData.archetype}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCalibrationFormData({ ...calibrationFormData, archetype: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {ARCHETYPES.map((a) => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Stage
                        </label>
                        <select
                          value={calibrationFormData.stage}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCalibrationFormData({ ...calibrationFormData, stage: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Era
                        </label>
                        <select
                          value={calibrationFormData.era}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCalibrationFormData({ ...calibrationFormData, era: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {ERAS.map((e) => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Year
                        </label>
                        <input
                          type="number"
                          value={calibrationFormData.year}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCalibrationFormData({ ...calibrationFormData, year: parseInt(e.target.value) || 2024 })}
                          min={1990}
                          max={2030}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={calibrationFormData.active}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCalibrationFormData({ ...calibrationFormData, active: e.target.checked })}
                          />
                          Active
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Expected Grade Min
                        </label>
                        <select
                          value={calibrationFormData.expected_grade_min}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCalibrationFormData({ ...calibrationFormData, expected_grade_min: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {GRADES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                          Expected Grade Max
                        </label>
                        <select
                          value={calibrationFormData.expected_grade_max}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => setCalibrationFormData({ ...calibrationFormData, expected_grade_max: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '14px',
                            fontFamily,
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {GRADES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Strengths (one per line)
                      </label>
                      <textarea
                        value={calibrationFormData.strengths}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCalibrationFormData({ ...calibrationFormData, strengths: e.target.value })}
                        placeholder="e.g., Clear viral growth mechanism&#10;Strong team background in video/media"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '14px',
                          fontFamily,
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Known Weaknesses (one per line)
                      </label>
                      <textarea
                        value={calibrationFormData.known_weaknesses}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCalibrationFormData({ ...calibrationFormData, known_weaknesses: e.target.value })}
                        placeholder="e.g., Missing detailed revenue model&#10;Competition slide is sparse"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '14px',
                          fontFamily,
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Must Not Happen (one per line)
                      </label>
                      <textarea
                        value={calibrationFormData.must_not_happen}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCalibrationFormData({ ...calibrationFormData, must_not_happen: e.target.value })}
                        placeholder="e.g., Grade below C&#10;Missing mention of viral coefficient"
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '14px',
                          fontFamily,
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                        Notes
                      </label>
                      <textarea
                        value={calibrationFormData.notes}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCalibrationFormData({ ...calibrationFormData, notes: e.target.value })}
                        placeholder="Any additional notes..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '14px',
                          fontFamily,
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="submit"
                        disabled={calibrationSaving}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily,
                          backgroundColor: calibrationSaving ? '#9ca3af' : '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: calibrationSaving ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {calibrationSaving ? 'Saving...' : (editingDeck ? 'Update Deck' : 'Add Deck')}
                      </button>
                      <button
                        type="button"
                        onClick={resetCalibrationForm}
                        style={{
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily,
                          backgroundColor: '#ffffff',
                          color: '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Deck List */}
              {calibrationLoading && (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading calibration decks...</p>
              )}

              {!calibrationLoading && calibrationDecks.length === 0 && !calibrationError && (
                <p style={{ color: '#6b7280', fontSize: '14px' }}>No calibration decks found. Add one to get started.</p>
              )}

              {calibrationDecks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {calibrationDecks.map((deck) => (
                    <div
                      key={deck.id}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: deck.active ? '#ffffff' : '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        opacity: deck.active ? 1 : 0.7,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                              {deck.company}
                            </span>
                            {!deck.active && (
                              <span style={{ fontSize: '11px', padding: '1px 6px', backgroundColor: '#f3f4f6', borderRadius: '3px', color: '#6b7280' }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                            <span>{ARCHETYPES.find(a => a.value === deck.archetype)?.label || deck.archetype}</span>
                            <span>{STAGES.find(s => s.value === deck.stage)?.label || deck.stage}</span>
                            {deck.year && <span>{deck.year}</span>}
                            {deck.expected_grade_range && (
                              <span style={{ color: '#2563eb' }}>
                                Expected: {deck.expected_grade_range[0]}–{deck.expected_grade_range[1]}
                              </span>
                            )}
                          </div>
                          {(deck.strengths.length > 0 || deck.known_weaknesses.length > 0) && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                              {deck.strengths.length > 0 && (
                                <div>Strengths: {deck.strengths.length} items</div>
                              )}
                              {deck.known_weaknesses.length > 0 && (
                                <div>Weaknesses: {deck.known_weaknesses.length} items</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditCalibrationDeck(deck)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontFamily,
                              backgroundColor: '#ffffff',
                              color: '#374151',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCalibrationDeck(deck.id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              fontFamily,
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Delete
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
        )}
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
