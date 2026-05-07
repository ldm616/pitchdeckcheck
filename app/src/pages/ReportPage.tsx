import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { getReport } from '../lib/api'
import { ROUTES } from '../lib/routes'
import { LoadingSpinner } from '../components/LoadingSpinner'
import {
  ReportHeader,
  QualityBreakdown,
  TopStrengths,
  TopImprovements,
  NarrativeFlow,
  SlideSummaryTable,
  SlideDetails,
} from '../components/report'
import type { ReportContent, SlideData } from '../lib/types'

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

  useEffect(() => {
    async function fetchReportData() {
      if (!deckId || !accessToken) {
        setError('Invalid link')
        setLoading(false)
        return
      }

      try {
        const data = await getReport(deckId, accessToken)
        if (data) {
          setReport(data.content)
          setSlides(data.slides)
          setReportCreatedAt(data.report_created_at || null)
        } else {
          setError('Report not found or still processing')
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
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm p-12 max-w-md w-full flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Loading your report...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !report) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            {error || 'Report Not Found'}
          </h1>
          <p className="text-gray-500 mb-6">
            This report may have been deleted or the link may be invalid.
          </p>
          <button
            onClick={() => navigate(ROUTES.UPLOAD)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Upload a New Deck
          </button>
        </div>
      </div>
    )
  }

  const v1Report = report.v1_report

  // No V1 report - show basic info
  if (!v1Report) {
    return (
      <div className="py-8 px-6">
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
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Upload another deck
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full V1 report
  return (
    <div className="py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-10">
          <ReportHeader
            report={v1Report}
            slideCount={slides.length || v1Report.slide_summary?.length || 0}
            reportCreatedAt={reportCreatedAt}
          />

          <QualityBreakdown dimensions={v1Report.quality_dimensions} />

          <TopStrengths strengths={v1Report.top_strengths} />

          <TopImprovements improvements={v1Report.top_improvements} />

          <NarrativeFlow narrativeFlow={v1Report.narrative_flow} />

          <SlideSummaryTable slides={v1Report.slide_summary} />

          <SlideDetails slides={v1Report.slides} slideImages={slides} />

          {/* Footer with upload link */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link
              to={ROUTES.UPLOAD}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Upload another deck
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
