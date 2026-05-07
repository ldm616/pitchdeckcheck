import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../lib/routes'

export function Header() {
  const location = useLocation()
  const isHomePage = location.pathname === ROUTES.HOME

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to={ROUTES.HOME} className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">
              Pitch Deck Check
            </span>
            {!isHomePage && (
              <span className="hidden sm:block text-sm text-gray-400 font-normal">
                Is your pitch deck ready for investors?
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
