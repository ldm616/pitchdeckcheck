import { Routes, Route } from 'react-router-dom'
import { ROUTES } from './lib/routes'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { ProcessingPage } from './pages/ProcessingPage'
import { ReportPage } from './pages/ReportPage'
import { AdminApp } from './pages/admin/AdminApp'

export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.UPLOAD} element={<UploadPage />} />
      <Route path={ROUTES.PROCESSING} element={<ProcessingPage />} />
      <Route path={ROUTES.REPORT} element={<ReportPage />} />
      <Route path={ROUTES.ADMIN} element={<AdminApp />} />
      {/* Catch-all redirect to home */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
