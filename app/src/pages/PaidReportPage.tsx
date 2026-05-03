import { useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { ROUTES } from '../lib/routes'

export function PaidReportPage() {
  const { deckId } = useParams<{ deckId: string }>()

  return (
    <div className="py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-navy-900">
            Full Fix Plan
          </h1>
          <p className="mt-4 text-lg text-navy-600">
            Deck ID: {deckId}
          </p>
        </div>

        {/* Placeholder paid report content */}
        <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-8 text-center">
          <p className="text-navy-700 font-medium">
            Paid Report
          </p>
          <p className="mt-4 text-navy-600">
            Your full fix plan with exact improvements, suggested wording, and investor-backed examples will appear here.
          </p>
          <p className="mt-4 text-sm text-navy-500">
            Payment integration coming soon.
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
