import { Button } from '../components/Button'
import { ROUTES } from '../lib/routes'

export function UploadPage() {
  return (
    <div className="py-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-navy-900">
            Upload Your Pitch Deck
          </h1>
          <p className="mt-4 text-lg text-navy-600">
            Upload a PDF of your pitch deck to get your free investor-readiness score.
          </p>
        </div>

        {/* Placeholder upload area */}
        <div className="border-2 border-dashed border-navy-200 rounded-xl p-12 text-center bg-navy-50">
          <div className="space-y-4">
            <div className="text-navy-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-navy-700 font-medium">
                Drag and drop your PDF here
              </p>
              <p className="text-sm text-navy-500 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-navy-400">
              PDF up to 50MB
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-navy-500">
          Upload functionality coming soon.
        </p>

        <div className="mt-8 text-center">
          <Button href={ROUTES.HOME} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
