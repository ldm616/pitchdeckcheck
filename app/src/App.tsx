import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { FreeReportPage } from './pages/FreeReportPage'
import { PaidReportPage } from './pages/PaidReportPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ROUTES } from './lib/routes'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.UPLOAD} element={<UploadPage />} />
        <Route path={ROUTES.FREE_REPORT} element={<FreeReportPage />} />
        <Route path={ROUTES.PAID_REPORT} element={<PaidReportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
