import { Link } from 'react-router-dom'
import { ROUTES } from '../lib/routes'

export function HomePage() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg text-center">
          {/* Product label */}
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-5">
            Pitch Deck Check
          </p>

          {/* Hero headline */}
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight leading-tight mb-4">
            Is your pitch deck ready for investors?
          </h1>

          {/* Supporting sentence */}
          <p className="text-lg text-gray-500 leading-relaxed mb-6">
            Get clear, non-generic feedback on your pitch deck in under 2 minutes.
          </p>

          {/* CTA */}
          <Link
            to={ROUTES.UPLOAD}
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors mb-12"
          >
            Get free deck feedback
          </Link>

          {/* Bullets */}
          <ul className="text-sm text-gray-500 space-y-1.5 mb-12">
            <li>Overall deck quality</li>
            <li>Clarity, flow, and completeness</li>
            <li>Slide-by-slide investor feedback</li>
          </ul>

          {/* Trust line */}
          <p className="text-xs text-gray-400">
            Your deck is private and used only to generate your report.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <Link
          to={ROUTES.ADMIN}
          className="text-xs text-gray-400 hover:text-gray-500"
        >
          Admin
        </Link>
      </footer>
    </div>
  )
}
