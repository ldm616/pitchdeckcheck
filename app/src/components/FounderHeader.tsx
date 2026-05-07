import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../lib/routes'

export function FounderHeader() {
  const location = useLocation()
  const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/'

  const content = (
    <span className="text-sm font-medium text-gray-400 uppercase tracking-wide">
      Pitch Deck Check
    </span>
  )

  return (
    <header className="py-6 text-center">
      {isHomePage ? (
        content
      ) : (
        <Link to={ROUTES.HOME} className="hover:text-gray-500 transition-colors">
          {content}
        </Link>
      )}
    </header>
  )
}
