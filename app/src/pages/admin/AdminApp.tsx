import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  verifyPassword,
  getReportsList,
  getReport,
  deleteDeck,
  triggerReportRegeneration,
  getDeckStatus,
  getCalibrationDecks,
  upsertCalibrationDeck,
  deleteCalibrationDeck,
} from '../../lib/api'
import { ROUTES } from '../../lib/routes'
import type {
  ReportListItem,
  CalibrationDeck,
  CalibrationFormData,
  ReportContent,
} from '../../lib/types'
import { ARCHETYPES, STAGES, ERAS, GRADES } from '../../lib/types'

type AdminView = 'upload' | 'reports' | 'calibration'

const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SESSION_KEY = 'pdc_authenticated'
const SESSION_PASSWORD_KEY = 'pdc_admin_pw'
const ADMIN_MODE_KEY = 'pdc_admin_mode'
const POLL_INTERVAL_MS = 2000

export function AdminApp() {
  const navigate = useNavigate()

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)

  // Admin view state
  const [adminView, setAdminView] = useState<AdminView>('reports')

  // Reports state
  const [reportsList, setReportsList] = useState<ReportListItem[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Report viewing state
  const [report, setReport] = useState<ReportContent | null>(null)
  const [slideCount, setSlideCount] = useState<number | null>(null)
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState(false)

  // Admin action state
  const [actionDeckId, setActionDeckId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'delete' | 'regenerate' | null>(null)
  const [actionError, setActionError] = useState('')
  const [regenProgress, setRegenProgress] = useState<string | null>(null)

  // Bulk selection state
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Calibration state
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

  // Regen polling refs
  const regenPollIntervalRef = useRef<number | null>(null)
  const regenTimeoutRef = useRef<number | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem(SESSION_KEY)
    if (authenticated === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (regenPollIntervalRef.current) {
        clearInterval(regenPollIntervalRef.current)
      }
      if (regenTimeoutRef.current) {
        clearTimeout(regenTimeoutRef.current)
      }
    }
  }, [])

  // Fetch reports when view is 'reports' and authenticated
  useEffect(() => {
    if (isAuthenticated && adminView === 'reports') {
      fetchReportsList()
    }
  }, [isAuthenticated, adminView])

  // Fetch calibration decks when view is 'calibration' and authenticated
  useEffect(() => {
    if (isAuthenticated && adminView === 'calibration') {
      fetchCalibrationDecksList()
    }
  }, [isAuthenticated, adminView])

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return

    setCheckingPassword(true)
    setPasswordError('')

    try {
      const result = await verifyPassword(password)

      if (result.ok) {
        sessionStorage.setItem(SESSION_KEY, 'true')
        sessionStorage.setItem(SESSION_PASSWORD_KEY, password)
        localStorage.setItem(ADMIN_MODE_KEY, 'true')
        setIsAuthenticated(true)
      } else {
        setPasswordError(result.error || 'Invalid password')
      }
    } catch (err) {
      console.error('Password verification error:', err)
      setPasswordError('Failed to verify password')
    } finally {
      setCheckingPassword(false)
    }
  }

  const fetchReportsList = async () => {
    setReportsLoading(true)
    setReportsError('')

    try {
      const result = await getReportsList()
      if (result.ok && result.reports) {
        setReportsList(result.reports)
      } else {
        setReportsError(result.error || 'Failed to fetch reports')
      }
    } catch (err) {
      console.error('Fetch reports error:', err)
      setReportsError('Failed to fetch reports')
    } finally {
      setReportsLoading(false)
    }
  }

  const fetchCalibrationDecksList = async () => {
    setCalibrationLoading(true)
    setCalibrationError('')

    try {
      const result = await getCalibrationDecks()
      if (result.ok && result.decks) {
        setCalibrationDecks(result.decks)
      } else {
        setCalibrationError(result.error || 'Failed to fetch calibration decks')
      }
    } catch (err) {
      console.error('Fetch calibration decks error:', err)
      setCalibrationError('Failed to fetch calibration decks')
    } finally {
      setCalibrationLoading(false)
    }
  }

  const handleViewReport = async (item: ReportListItem) => {
    if (!item.access_token) {
      setReportsError('Missing access token for this report')
      return
    }

    const reportData = await getReport(item.deck_id, item.access_token)
    if (reportData) {
      setReport(reportData.content)
      setReportCreatedAt(reportData.report_created_at || null)
      setSlideCount(item.slide_count)
      setViewingReport(true)
    } else {
      setReportsError('Failed to load report')
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
      const result = await deleteDeck(deckId)

      if (result.ok) {
        setReportsList((prev) => prev.filter((r) => r.deck_id !== deckId))
      } else {
        setActionError(result.error || 'Delete failed')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setActionError('Failed to delete deck')
    } finally {
      setActionDeckId(null)
      setActionType(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDeckIds.size === 0) return
    if (!confirm(`Delete ${selectedDeckIds.size} deck(s) and all associated data? This cannot be undone.`)) {
      return
    }

    setBulkDeleting(true)
    setActionError('')

    try {
      for (const deckId of selectedDeckIds) {
        await deleteDeck(deckId)
      }
      setReportsList((prev) => prev.filter((r) => !selectedDeckIds.has(r.deck_id)))
      setSelectedDeckIds(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
      setActionError('Some deletes failed')
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedDeckIds.size === reportsList.length) {
      setSelectedDeckIds(new Set())
    } else {
      setSelectedDeckIds(new Set(reportsList.map(r => r.deck_id)))
    }
  }

  const toggleSelectDeck = (deckId: string) => {
    const newSet = new Set(selectedDeckIds)
    if (newSet.has(deckId)) {
      newSet.delete(deckId)
    } else {
      newSet.add(deckId)
    }
    setSelectedDeckIds(newSet)
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

    setReportsList((prev) =>
      prev.map((r) =>
        r.deck_id === deckId ? { ...r, status: 'generating' } : r
      )
    )
    setRegenProgress('Generating report...')

    regenTimeoutRef.current = window.setTimeout(() => {
      stopRegenPolling()
      setActionError('Regeneration timed out')
      setActionDeckId(null)
      setActionType(null)
      setRegenProgress(null)
    }, 5 * 60 * 1000)

    const adminPassword = sessionStorage.getItem(SESSION_PASSWORD_KEY) || ''

    regenPollIntervalRef.current = window.setInterval(async () => {
      const statusData = await getDeckStatus(deckId, { admin_password: adminPassword })

      if (!statusData) {
        return
      }

      if (statusData.processing_status === 'generating_free') {
        setRegenProgress('Generating report...')
      }

      if (statusData.processing_status === 'ready' && statusData.report?.status === 'ready') {
        stopRegenPolling()
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

    startRegenPolling(deckId)

    triggerReportRegeneration(deckId).catch((err) => {
      console.error('Background regen trigger error:', err)
      setActionError('Failed to trigger regeneration')
      setActionDeckId(null)
      setActionType(null)
      setRegenProgress(null)
    })
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
      const id = calibrationFormData.id ||
        calibrationFormData.company.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + calibrationFormData.archetype

      const result = await upsertCalibrationDeck({
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
      })

      if (result.ok) {
        resetCalibrationForm()
        fetchCalibrationDecksList()
      } else {
        setCalibrationError(result.error || 'Failed to save calibration deck')
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
      const result = await deleteCalibrationDeck(deckId)

      if (result.ok) {
        fetchCalibrationDecksList()
      } else {
        setCalibrationError(result.error || 'Failed to delete calibration deck')
      }
    } catch (err) {
      console.error('Delete calibration deck error:', err)
      setCalibrationError('Failed to delete calibration deck')
    }
  }

  // Admin login screen
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

  // Viewing a specific report
  if (viewingReport && report) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8f9fa',
          fontFamily,
        }}
      >
        {/* Admin Header */}
        <div
          style={{
            width: '100%',
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
            <h1
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#9ca3af',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Admin
            </h1>
            <button
              onClick={() => {
                setViewingReport(false)
                setReport(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Back to Reports
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div style={{ padding: '32px 24px' }}>
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '48px 40px',
            }}
          >
            {/* Simple report display for admin - uses same data */}
            {(() => {
              const grade = report.overall_grade || report.v1_report?.overall.grade || '?'
              const gradeColor = grade.startsWith('A') ? '#22c55e'
                : grade.startsWith('B') ? '#84cc16'
                : grade.startsWith('C') ? '#eab308'
                : grade.startsWith('D') ? '#f97316'
                : '#ef4444'

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: gradeColor,
                    }}
                  />
                  <span style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
                    {grade}
                  </span>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>
                    {slideCount || 0} slides
                    {reportCreatedAt && ` · ${new Date(reportCreatedAt).toLocaleDateString()}`}
                  </span>
                </div>
              )
            })()}

            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#374151', lineHeight: 1.7 }}>
                {report.summary || report.v1_report?.overall.synthesis || 'No summary available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main admin dashboard
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily,
      }}
    >
      {/* Admin Header */}
      <div
        style={{
          width: '100%',
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
          <h1
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#9ca3af',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Admin
          </h1>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setAdminView('reports')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: adminView === 'reports' ? '#111827' : '#6b7280',
                cursor: 'pointer',
                textDecoration: adminView === 'reports' ? 'underline' : 'none',
              }}
            >
              Reports
            </button>
            <button
              onClick={() => setAdminView('calibration')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: adminView === 'calibration' ? '#111827' : '#6b7280',
                cursor: 'pointer',
                textDecoration: adminView === 'calibration' ? 'underline' : 'none',
              }}
            >
              Calibration
            </button>
            <button
              onClick={() => navigate(ROUTES.HOME)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '14px',
                fontWeight: 500,
                fontFamily,
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '32px 24px' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '32px',
          }}
        >
          {/* Reports View */}
          {adminView === 'reports' && (
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
                  Reports
                </h2>
                {selectedDeckIds.size > 1 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontFamily,
                      backgroundColor: '#ffffff',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                      opacity: bulkDeleting ? 0.5 : 1,
                    }}
                  >
                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedDeckIds.size} selected`}
                  </button>
                )}
              </div>

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
                  {/* Select all header - only show when at least 2 are selected */}
                  {selectedDeckIds.size >= 2 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                      <input
                        type="checkbox"
                        checked={selectedDeckIds.size === reportsList.length}
                        onChange={toggleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {selectedDeckIds.size === reportsList.length ? 'Deselect all' : 'Select all'}
                      </span>
                    </div>
                  )}

                  {reportsList.map((item) => {
                    const gradeColor = item.overall_grade?.startsWith('A') ? '#22c55e'
                      : item.overall_grade?.startsWith('B') ? '#84cc16'
                      : item.overall_grade?.startsWith('C') ? '#eab308'
                      : item.overall_grade?.startsWith('D') ? '#f97316'
                      : '#ef4444'

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: selectedDeckIds.has(item.deck_id) ? '#f9fafb' : '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          transition: 'background-color 0.15s',
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
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '200px' }}>
                            <input
                              type="checkbox"
                              checked={selectedDeckIds.has(item.deck_id)}
                              onChange={() => toggleSelectDeck(item.deck_id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                marginTop: '2px',
                                accentColor: selectedDeckIds.has(item.deck_id) ? undefined : '#d1d5db',
                              }}
                            />
                            <div
                              onClick={() => handleViewReport(item)}
                              style={{ cursor: 'pointer', flex: 1 }}
                            >
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
                                {item.original_filename || 'Unknown file'} · {item.slide_count || 0} slides
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {item.overall_grade && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: gradeColor,
                                  }}
                                />
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                                  {item.overall_grade}
                                </span>
                              </div>
                            )}

                            <span
                              style={{
                                fontSize: '12px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f3f4f6',
                                color: '#6b7280',
                              }}
                            >
                              {actionDeckId === item.deck_id && actionType === 'regenerate'
                                ? regenProgress || 'Regenerating...'
                                : item.status}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRegenerateReport(item.deck_id)
                              }}
                              disabled={actionDeckId === item.deck_id}
                              style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontFamily,
                                backgroundColor: '#ffffff',
                                color: '#6b7280',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: actionDeckId === item.deck_id ? 'not-allowed' : 'pointer',
                                opacity: actionDeckId === item.deck_id ? 0.5 : 1,
                              }}
                            >
                              Regen
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteReport(item.deck_id)
                              }}
                              disabled={actionDeckId === item.deck_id}
                              style={{
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontFamily,
                                backgroundColor: '#ffffff',
                                color: '#6b7280',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: actionDeckId === item.deck_id ? 'not-allowed' : 'pointer',
                                opacity: actionDeckId === item.deck_id ? 0.5 : 1,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Calibration View */}
          {adminView === 'calibration' && (
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
                        placeholder="e.g., Clear viral growth mechanism"
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
                        placeholder="e.g., Missing detailed revenue model"
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
                        placeholder="e.g., Grade below C"
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
                                Expected: {deck.expected_grade_range[0]}-{deck.expected_grade_range[1]}
                              </span>
                            )}
                          </div>
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
      </div>
    </div>
  )
}
