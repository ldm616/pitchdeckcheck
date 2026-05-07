import { Link } from 'react-router-dom'
import { BarChart3, Target, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { ROUTES } from '../lib/routes'

export function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex items-start justify-center pt-20 pb-12 px-6">
        <div className="w-full max-w-xl text-center">
          {/* Hero */}
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
            Is your pitch deck ready for investors?
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8">
            Upload your deck and get free, instant feedback on clarity, brevity, flow, and completeness — so you know what to fix before sending it to investors.
          </p>

          {/* CTA Button */}
          <Link
            to={ROUTES.UPLOAD}
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 mb-12"
          >
            Get free deck feedback
          </Link>

          {/* What you'll get */}
          <div className="bg-white rounded-2xl p-8 shadow-sm text-left mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              What you'll get
            </h2>
            <div className="flex flex-col gap-3.5">
              {[
                { Icon: BarChart3, text: 'Overall deck quality score' },
                { Icon: Target, text: 'Clarity, brevity, flow, and completeness breakdown' },
                { Icon: CheckCircle2, text: 'Top strengths and improvement priorities' },
                { Icon: FileText, text: 'Slide-by-slide feedback you can act on' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <item.Icon className="w-5 h-5 text-blue-600 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supporting copy */}
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            See where your deck is clear, where investors may lose conviction, and which fixes would make the biggest difference.
          </p>

          {/* Trust/privacy */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Your deck is used only to generate your report.</span>
          </div>
        </div>
      </main>

      {/* Footer with admin link */}
      <footer className="py-6 text-center">
        <Link
          to={ROUTES.ADMIN}
          className="text-xs text-gray-400 hover:text-gray-500"
        >
          Admin
        </Link>
      </footer>
    </div>
  )
}
