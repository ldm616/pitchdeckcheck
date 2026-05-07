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
        <div className="w-full max-w-lg text-center">
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
            Check my deck for free
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
