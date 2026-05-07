import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { ROUTES } from '../lib/routes'

export function Layout() {
  const location = useLocation()
  const isHomePage = location.pathname === ROUTES.HOME

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {!isHomePage && <Header />}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
