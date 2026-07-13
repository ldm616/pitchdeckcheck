import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Download, Copy, Loader2 } from 'lucide-react'
import { getReport, getReportByCode, isAdmin } from '../lib/api'
import { ROUTES } from '../lib/routes'
import { FounderHeader } from '../components/FounderHeader'
import { FounderFooter } from '../components/FounderFooter'
import { ContactModal } from '../components/ContactModal'
import {
  ReportHeader,
  WhatInvestorsBelieve,
  WhatStillFeelsUnproven,
  InvestorQuestions,
  QualityBreakdown,
  SlideFeedback,
  SaveReportSection,
  V2Report,
} from '../components/report'
import type { ReportContent, SlideData } from '../lib/types'

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

// TODO: Before founder launch, remove short-code (report_code) access entirely.
// Reports should ONLY be accessible via the secure deck_id + access_token URL.
// Short codes are guessable and pose a security risk for confidential pitch decks.

export function ReportPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportContent | null>(null)
  const [slides, setSlides] = useState<SlideData[]>([])
  const [reportCreatedAt, setReportCreatedAt] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(false)
  // Admin-only: transient "Copied" state for the copy-report affordance.
  const [copied, setCopied] = useState(false)
  // Track secure credentials for email save flow
  const [secureCredentials, setSecureCredentials] = useState<{
    deckId: string
    accessToken: string
  } | null>(null)

  useEffect(() => {
    async function fetchReportData() {
      if (!deckId) {
        setError('Invalid link')
        setLoading(false)
        return
      }

      try {
        let data

        // Smart detection: UUID with token = secure lookup, short code = insecure lookup
        if (isUUID(deckId) && accessToken) {
          // Secure: deck_id + access_token (long unguessable token)
          data = await getReport(deckId, accessToken)
          // Store secure credentials for email save flow
          if (data) {
            setSecureCredentials({ deckId, accessToken })
          }
        } else if (!isUUID(deckId)) {
          // Insecure: report_code lookup (short guessable code)
          // TODO: Remove this access method before founder launch
          data = await getReportByCode(deckId)
          // No secure credentials available via this path
        } else {
          // UUID without token - invalid
          setError('Invalid link')
          setLoading(false)
          return
        }

        if (data) {
          setReport(data.content)
          setSlides(data.slides)
          setReportCreatedAt(data.report_created_at || null)
        } else {
          setError('Report not found')
        }
      } catch (err) {
        console.error('Failed to fetch report:', err)
        setError('Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [deckId, accessToken])

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="bg-white rounded-xl shadow-sm p-12 max-w-md w-full flex flex-col items-center">
            {/* Small lucide loading icon, pulsing once per second */}
            <Loader2 className="w-6 h-6 text-gray-400 animate-[pulse_1s_ease-in-out_infinite]" />
            <p className="mt-4 text-gray-500">Loading your report...</p>
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  // Error state - calm, minimal, private
  if (error || !report) {
    return (
      <div className="flex flex-col flex-1">
        {/* Header - matches FounderHeader styling */}
        <header className="py-6 text-center">
          <Link to={ROUTES.HOME} className="hover:text-gray-500 transition-colors">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Pitch Deck Check
            </span>
          </Link>
        </header>

        {/* Card positioned slightly higher */}
        <main className="flex-1 flex flex-col items-center px-6 pt-8 sm:pt-16">
          <div className="bg-white rounded-xl shadow-sm px-8 py-10 max-w-[440px] w-full text-center">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-3">
              This report is no longer available
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              The link may be invalid, expired, or no longer active.
            </p>
            <button
              onClick={() => navigate(ROUTES.UPLOAD)}
              className="px-6 py-3 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Check another deck
            </button>
            <p className="mt-5 text-xs text-gray-400">
              Reports are private and accessible only through valid links.
            </p>
          </div>

          {/* Contact link - subtle, positioned below */}
          <div className="mt-auto pb-8 pt-12">
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
            >
              Contact
            </button>
          </div>
        </main>

        <ContactModal
          isOpen={showContact}
          onClose={() => setShowContact(false)}
        />
      </div>
    )
  }

  // Download the report as a PDF via the browser's native print-to-PDF.
  // No PDF dependency/backend is required; the report container is styled so
  // the button itself is hidden from the printed output.
  const handleDownload = () => window.print()

  // Admin-only: copy the entire report content (as JSON) to the clipboard for
  // inspecting/sharing the artifact-based output.
  const handleCopyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy report failed:', err)
    }
  }

  const buttonClass =
    'print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors'

  // Actions pinned to the report container's upper-right. The Copy button is
  // admin-only; Download is available to everyone. Copy confirms via a
  // disappearing "Report copied" toast (see below).
  const reportActions = (
    <>
      <div className="print:hidden absolute top-4 right-4 flex items-center gap-2">
        {isAdmin() && (
          <button
            type="button"
            onClick={handleCopyReport}
            className={buttonClass}
            aria-label="Copy entire report to clipboard"
            title="Copy report"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleDownload}
          className={buttonClass}
          aria-label="Download report as PDF"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
      {copied && (
        <div
          role="status"
          className="print:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg"
        >
          Report copied
        </div>
      )}
    </>
  )

  // Prefer the new V2 report when present; otherwise fall back to the existing
  // V1 rendering path below (unchanged). Old stored reports keep working.
  const reportV2 = report.report_v2
  if (reportV2) {
    return (
      <div className="flex flex-col flex-1 bg-monarch-canvas">
        {/* Sticky, full-width report header — same text/link as the home page
            header, darker + semibold, pinned to the top of the screen. */}
        <header className="sticky top-0 z-40 w-full bg-white border-b border-monarch-border py-4 text-center">
          <span className="text-sm font-semibold text-monarch-ink uppercase tracking-wide">
            Pitch Deck Check
          </span>
          <a
            href="https://pitchdeckcoach.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1 text-[12px] text-monarch-sub hover:text-monarch-ink transition-colors"
          >
            By Malcolm Lewis · Creator of the Sequoia pitch deck template
          </a>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative max-w-screen-2xl mx-auto">
            {reportActions}
            <V2Report report={reportV2} />

            {secureCredentials && (
              <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
                <SaveReportSection
                  deckId={secureCredentials.deckId}
                  accessToken={secureCredentials.accessToken}
                />
              </div>
            )}
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  const v1Report = report.v1_report

  // No V1 report - show basic info
  if (!v1Report) {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 px-6 pb-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">
                Your Report
              </h1>
              <p className="text-gray-500 mb-6">
                Grade: {report.overall_grade}
              </p>
              <p className="text-gray-700">{report.summary}</p>
              <div className="mt-8">
                <Link
                  to={ROUTES.UPLOAD}
                  className="text-gray-900 hover:text-gray-700 text-sm font-medium"
                >
                  Check another deck
                </Link>
              </div>
            </div>
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  // Full V1 report
  return (
    <div className="flex flex-col flex-1">
      <FounderHeader />

      <main className="flex-1 px-6 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-white rounded-xl shadow-sm p-8 sm:p-10">
            {reportActions}
            {/* 1. Overall Investor Readout */}
            <ReportHeader
              report={v1Report}
              slideCount={slides.length || v1Report.slides?.length || 0}
              reportCreatedAt={reportCreatedAt}
            />

            {secureCredentials && (
              <SaveReportSection
                deckId={secureCredentials.deckId}
                accessToken={secureCredentials.accessToken}
              />
            )}

            {/* 2. What Investors Believe */}
            <WhatInvestorsBelieve beliefs={v1Report.what_investors_believe || []} />

            {/* 3. What Still Feels Unproven */}
            <WhatStillFeelsUnproven concerns={v1Report.what_still_feels_unproven || []} />

            {/* 4. Investor Questions */}
            <InvestorQuestions questions={v1Report.investor_questions} />

            {/* 5. Quality Dimensions (secondary) */}
            <QualityBreakdown dimensions={v1Report.quality_dimensions} />

            {/* 6. Slide Feedback (collapsed by default) */}
            <SlideFeedback
              details={v1Report.slides}
              slideImages={slides}
            />
          </div>
        </div>
      </main>

      <FounderFooter />
    </div>
  )
}
