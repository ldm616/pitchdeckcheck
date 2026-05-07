import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { getReport, getReportByCode } from '../lib/api'
import { ROUTES } from '../lib/routes'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { FounderHeader } from '../components/FounderHeader'
import { FounderFooter } from '../components/FounderFooter'
import {
  ReportHeader,
  QualityBreakdown,
  InvestorQuestions,
  SlideFeedback,
  SaveReportSection,
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
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading your report...</p>
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  // Error state
  if (error || !report) {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">
              Report not found
            </h1>
            <p className="text-gray-500 mb-6">
              This link may have expired or the report doesn't exist.
            </p>
            <button
              onClick={() => navigate(ROUTES.UPLOAD)}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              Check a deck
            </button>
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
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-10">
            <ReportHeader
              report={v1Report}
              slideCount={slides.length || v1Report.slide_summary?.length || 0}
              reportCreatedAt={reportCreatedAt}
            />

            {secureCredentials && (
              <SaveReportSection
                deckId={secureCredentials.deckId}
                accessToken={secureCredentials.accessToken}
              />
            )}

            <QualityBreakdown dimensions={v1Report.quality_dimensions} />

            <InvestorQuestions questions={v1Report.investor_questions} />

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
