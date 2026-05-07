import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../lib/routes'
import { FounderHeader } from '../components/FounderHeader'
import { ContactModal } from '../components/ContactModal'

export function HomePage() {
  const [showContact, setShowContact] = useState(false)

  return (
    <div className="flex flex-col flex-1">
      <FounderHeader />

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-lg">
          {/* Hero headline */}
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight mb-4 text-center">
            Is your pitch deck ready for investors?
          </h1>

          {/* Supporting sentence */}
          <p className="text-lg text-gray-500 leading-relaxed mb-8 text-center max-w-md mx-auto">
            Get clear, non-generic feedback on your pitch deck in under 2 minutes.
          </p>

          {/* CTA */}
          <div className="text-center mb-8">
            <Link
              to={ROUTES.UPLOAD}
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Check my deck for free
            </Link>
          </div>

          {/* Value props - left aligned */}
          <ul className="text-sm text-gray-600 space-y-2 mb-8 max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <span className="text-gray-400">✓</span>
              Investor-style feedback in under 2 minutes
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">✓</span>
              Free — no signup required
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">✓</span>
              Private report link sent to your email
            </li>
          </ul>

          {/* Trust line */}
          <p className="text-xs text-gray-400 text-center">
            Your deck is private and used only to generate your report.
          </p>
        </div>
      </main>

      {/* Footer - understated */}
      <footer className="py-6 text-center">
        <button
          type="button"
          onClick={() => setShowContact(true)}
          className="text-[11px] text-gray-300 hover:text-gray-400 transition-colors"
        >
          Contact
        </button>
        <span className="text-[11px] text-gray-200 mx-2">·</span>
        <Link
          to={ROUTES.ADMIN}
          className="text-[11px] text-gray-300 hover:text-gray-400 transition-colors"
        >
          Admin
        </Link>
      </footer>

      <ContactModal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />
    </div>
  )
}
