import { useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { useReportPolling } from '../hooks/useReportPolling'
import { getReportPath, ROUTES } from '../lib/routes'

type Stage = 'extracting' | 'analyzing' | 'generating'

function getStageFromStatus(processingStatus: string | null): Stage {
  if (!processingStatus || processingStatus === 'extracting') {
    return 'extracting'
  }
  if (processingStatus === 'extracted' || processingStatus === 'analyzing') {
    return 'analyzing'
  }
  // analyzed, generating_free, ready
  return 'generating'
}

function StageItem({
  label,
  state
}: {
  label: string
  state: 'pending' | 'active' | 'complete'
}) {
  return (
    <li className="flex items-center gap-3">
      {state === 'complete' && (
        <Check className="w-4 h-4 text-gray-900" strokeWidth={2.5} />
      )}
      {state === 'active' && (
        <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
      )}
      {state === 'pending' && (
        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      )}
      <span className={state === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
        {label}
      </span>
    </li>
  )
}

export function ProcessingPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token')
  const navigate = useNavigate()

  const {
    status,
    processingStatus,
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
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
            Invalid Link
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            This link appears to be invalid or expired.
          </p>
          <button
            onClick={() => navigate(ROUTES.UPLOAD)}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Check a deck
          </button>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
            Processing Failed
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {errorMessage || 'Something went wrong while processing your deck.'}
          </p>
          <button
            onClick={() => navigate(ROUTES.UPLOAD)}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Timeout state
  if (status === 'timeout') {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
            Still Processing
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Your deck is taking longer than expected. Please check back shortly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Check Status
          </button>
        </div>
      </div>
    )
  }

  // Processing state with stages
  const currentStage = getStageFromStatus(processingStatus)

  const getState = (stage: Stage): 'pending' | 'active' | 'complete' => {
    const order: Stage[] = ['extracting', 'analyzing', 'generating']
    const currentIndex = order.indexOf(currentStage)
    const stageIndex = order.indexOf(stage)

    if (stageIndex < currentIndex) return 'complete'
    if (stageIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
          Pitch Deck Check
        </p>

        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-8">
          Analyzing your deck
        </h1>

        <ul className="inline-flex flex-col items-start gap-4 text-sm mb-10">
          <StageItem label="Extracting slides" state={getState('extracting')} />
          <StageItem label="Analyzing slides" state={getState('analyzing')} />
          <StageItem label="Generating report" state={getState('generating')} />
        </ul>

        <p className="text-xs text-gray-400">
          This page will update automatically when your report is ready.
        </p>
      </div>
    </div>
  )
}
