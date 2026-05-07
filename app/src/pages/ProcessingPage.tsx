import { useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useReportPolling } from '../hooks/useReportPolling'
import { ProcessingStatus } from '../components/LoadingSpinner'
import { getReportPath, ROUTES } from '../lib/routes'

export function ProcessingPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token')
  const navigate = useNavigate()

  const {
    status,
    processingStatus,
    slideCount,
    errorMessage,
    startPolling,
  } = useReportPolling({
    onReportReady: () => {
      // Navigate to report page when ready
      if (deckId && accessToken) {
        navigate(getReportPath(deckId, accessToken), { replace: true })
      }
    },
  })

  useEffect(() => {
    if (deckId && accessToken) {
      startPolling(deckId, accessToken)
    }
  }, [deckId, accessToken, startPolling])

  // Handle missing credentials
  if (!deckId || !accessToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-500 mb-6">
            This link appears to be invalid or expired.
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

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Processing Failed
          </h1>
          <p className="text-gray-500 mb-6">
            {errorMessage || 'Something went wrong while processing your deck.'}
          </p>
          <button
            onClick={() => navigate(ROUTES.UPLOAD)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Timeout state
  if (status === 'timeout') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Still Processing
          </h1>
          <p className="text-gray-500 mb-6">
            Your deck is taking longer than expected to process. Please check back shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Check Status
          </button>
        </div>
      </div>
    )
  }

  // Processing state
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="bg-white rounded-xl shadow-sm p-12 max-w-md w-full">
        <ProcessingStatus
          status={processingStatus}
          slideCount={slideCount}
        />
        <p className="mt-6 text-xs text-gray-400 text-center">
          This page will automatically update when your report is ready.
        </p>
      </div>
    </div>
  )
}
