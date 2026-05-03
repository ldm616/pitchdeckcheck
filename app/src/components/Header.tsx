import { Link } from 'react-router-dom'
import { ROUTES } from '../lib/routes'

export function Header() {
  return (
    <header className="border-b border-navy-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <span className="text-xl font-semibold text-navy-900">
              Pitch Deck Check
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to={ROUTES.UPLOAD}
              className="text-sm font-medium text-navy-600 hover:text-navy-900 transition-colors"
            >
              Check My Deck
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
