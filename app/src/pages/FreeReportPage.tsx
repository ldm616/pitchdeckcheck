import { useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ROUTES } from '../lib/routes'

export function FreeReportPage() {
  const { deckId } = useParams<{ deckId: string }>()

  return (
    <div className="py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-navy-900">
            Free Investor-Readiness Report
          </h1>
          <p className="mt-4 text-lg text-navy-600">
            Deck ID: {deckId}
          </p>
        </div>

        {/* Placeholder report content */}
        <div className="bg-navy-50 rounded-xl p-8 text-center">
          <p className="text-navy-600">
            Your free report will appear here after processing.
          </p>
          <p className="mt-4 text-sm text-navy-500">
            Report generation coming soon.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Button href={ROUTES.UPLOAD} variant="outline">
            Upload Another Deck
          </Button>
          <Button href={ROUTES.HOME}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
