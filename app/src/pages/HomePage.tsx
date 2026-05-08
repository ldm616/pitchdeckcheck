import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../lib/routes'
import { ContactModal } from '../components/ContactModal'

export function HomePage() {
  const [showContact, setShowContact] = useState(false)

  return (
    <div className="flex flex-col flex-1">
      {/* Header with trust line */}
      <header className="py-6 text-center">
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Pitch Deck Check
        </span>
        <a
          href="https://pitchdeckcoach.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
        >
          By Malcolm Lewis · Creator of the Sequoia pitch deck template
        </a>
      </header>

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
              Check your deck for free
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
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <button
          type="button"
          onClick={() => setShowContact(true)}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          Contact
        </button>
        <span className="text-xs text-gray-300 mx-2">·</span>
        <Link
          to={ROUTES.ADMIN}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
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
