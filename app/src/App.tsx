import { Routes, Route } from 'react-router-dom'
import { ROUTES } from './lib/routes'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { ProcessingPage } from './pages/ProcessingPage'
import { ReportPage } from './pages/ReportPage'
import { AdminApp } from './pages/admin/AdminApp'

export default function App() {
  return (
    <Routes>
      {/* Founder-facing routes with persistent header */}
      <Route element={<Layout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.UPLOAD} element={<UploadPage />} />
        <Route path={ROUTES.PROCESSING} element={<ProcessingPage />} />
        <Route path={ROUTES.REPORT} element={<ReportPage />} />
        {/* Catch-all redirect to home */}
        <Route path="*" element={<HomePage />} />
      </Route>

      {/* Admin route without shared header */}
      <Route path={ROUTES.ADMIN} element={<AdminApp />} />
    </Routes>
  )
}
