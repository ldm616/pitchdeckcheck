import { useState, useRef, useCallback, useEffect } from 'react'
import { getDeckStatus, getReport } from '../lib/api'
import type { ReportContent, SlideData, Status } from '../lib/types'

const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

interface UseReportPollingOptions {
  onReportReady?: (data: {
    content: ReportContent
    slides: SlideData[]
    report_created_at?: string
  }) => void
  onError?: (error: string | null) => void
  onStatusChange?: (status: Status) => void
}

interface UseReportPollingReturn {
  status: Status
  processingStatus: string | null
  slideCount: number | null
  report: ReportContent | null
  slides: SlideData[]
  reportCreatedAt: string | null
  errorMessage: string | null
  startPolling: (deckId: string, accessToken: string) => void
  stopPolling: () => void
  reset: () => void
}

export function useReportPolling(options: UseReportPollingOptions = {}): UseReportPollingReturn {
  const { onReportReady, onError, onStatusChange } = options

  const [status, setStatus] = useState<Status>('idle')
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [slideCount, setSlideCount] = useState<number | null>(null)
  const [report, setReport] = useState<ReportContent | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // Cleanup on unmount
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

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setProcessingStatus(null)
    setSlideCount(null)
    setReport(null)
    setSlides([])
    setReportCreatedAt(null)
    setErrorMessage(null)
  }, [stopPolling])

  const startPolling = useCallback((deckId: string, accessToken: string) => {
    // Stop any existing polling
    stopPolling()

    // Set initial processing state
    setStatus('processing')
    setProcessingStatus('extracting')
    onStatusChange?.('processing')

    // Set timeout for 10 minutes
    timeoutRef.current = window.setTimeout(() => {
      stopPolling()
      setStatus('timeout')
      onStatusChange?.('timeout')
    }, TIMEOUT_MS)

    // Start polling
    pollIntervalRef.current = window.setInterval(async () => {
      const statusData = await getDeckStatus(deckId, { access_token: accessToken })

      if (!statusData) {
        return
      }

      // Update processing status for UI
      setProcessingStatus(statusData.processing_status)
      setSlideCount(statusData.slide_count)

      if (statusData.processing_status === 'ready') {
        stopPolling()
        // Fetch the full report with slides
        const reportData = await getReport(deckId, accessToken)
        if (reportData) {
          setReport(reportData.content)
          setReportCreatedAt(reportData.report_created_at || null)
          setSlides(reportData.slides)
          onReportReady?.(reportData)
        }
        setStatus('success')
        onStatusChange?.('success')
      } else if (statusData.processing_status === 'failed') {
        stopPolling()
        const error = statusData.processing_error || 'Processing failed'
        setErrorMessage(error)
        onError?.(error)
        setStatus('error')
        onStatusChange?.('error')
      }
      // For extracting, extracted, analyzing, generating_free - continue polling
    }, POLL_INTERVAL_MS)
  }, [stopPolling, onReportReady, onError, onStatusChange])

  return {
    status,
    processingStatus,
    slideCount,
    report,
    slides,
    reportCreatedAt,
    errorMessage,
    startPolling,
    stopPolling,
    reset,
  }
}

// Helper to get user-friendly status text
export function getStatusText(status: Status, processingStatus: string | null): string {
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
