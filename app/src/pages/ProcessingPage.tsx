import { useEffect, useCallback, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Check, Loader2 } from 'lucide-react'
import { useReportPolling } from '../hooks/useReportPolling'
import { getReportPath, ROUTES } from '../lib/routes'
import { FounderHeader } from '../components/FounderHeader'
import { FounderFooter } from '../components/FounderFooter'

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
    <li className={
      state === 'active'
        ? 'text-gray-900'
        : state === 'complete'
          ? 'text-gray-500'
          : 'text-gray-300'
    }>
      <span className="inline-block w-5 text-center mr-1">
        {state === 'complete' && (
          <Check className="w-4 h-4 inline -mt-0.5" strokeWidth={2.5} />
        )}
        {state === 'active' && (
          <Loader2 className="w-4 h-4 inline -mt-0.5 animate-spin" strokeWidth={2.5} />
        )}
      </span>
      {label}
    </li>
  )
}

export function ProcessingPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const [searchParams] = useSearchParams()
  const accessToken = searchParams.get('token')
  const navigate = useNavigate()

  const handleReportReady = useCallback(() => {
    if (deckId && accessToken) {
      navigate(getReportPath(deckId, accessToken), { replace: true })
    }
  }, [deckId, accessToken, navigate])

  const {
    status,
    processingStatus,
    errorMessage,
    startPolling,
    stopPolling,
  } = useReportPolling({
    onReportReady: handleReportReady,
  })

  // Elapsed time timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (deckId && accessToken) {
      startPolling(deckId, accessToken)
    }
  }, [deckId, accessToken, startPolling])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleCancel = () => {
    stopPolling()
    navigate(ROUTES.UPLOAD)
  }

  // Handle missing credentials
  if (!deckId || !accessToken) {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
              Invalid Link
            </h1>
            <p className="text-base text-gray-500 mb-8">
              This link appears to be invalid or expired.
            </p>
            <button
              onClick={() => navigate(ROUTES.UPLOAD)}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Check a deck
            </button>
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
              Processing Failed
            </h1>
            <p className="text-base text-gray-500 mb-8">
              {errorMessage || 'Something went wrong while processing your deck.'}
            </p>
            <button
              onClick={() => navigate(ROUTES.UPLOAD)}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </main>
        <FounderFooter />
      </div>
    )
  }

  // Timeout state
  if (status === 'timeout') {
    return (
      <div className="flex flex-col flex-1">
        <FounderHeader />
        <main className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-4">
              Still Processing
            </h1>
            <p className="text-base text-gray-500 mb-8">
              Your deck is taking longer than expected. Please check back shortly.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Check Status
            </button>
          </div>
        </main>
        <FounderFooter />
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
    <div className="flex flex-col flex-1">
      <FounderHeader />

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-10">
            Analyzing your deck
          </h1>

          <ul className="text-sm space-y-1.5 mb-12">
            <StageItem label="Extracting slides" state={getState('extracting')} />
            <StageItem label="Analyzing slides" state={getState('analyzing')} />
            <StageItem label="Generating report" state={getState('generating')} />
          </ul>

          <p className="text-xs text-gray-400 mb-2">
            {formatTime(elapsedSeconds)}
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </main>

      <FounderFooter />
    </div>
  )
}
