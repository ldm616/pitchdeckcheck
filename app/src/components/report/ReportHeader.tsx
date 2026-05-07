import { GradeBadge } from '../GradeBadge'
import type { V1Report } from '../../lib/types'

interface ReportHeaderProps {
  report: V1Report
  slideCount: number
  reportCreatedAt?: string | null
}

export function ReportHeader({ report, slideCount, reportCreatedAt }: ReportHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <GradeBadge grade={report.overall.grade} size="lg" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Deck Quality Score
          </h2>
          <p className="text-sm text-gray-500">
            {slideCount || report.slide_summary?.length || 0} slides analyzed
            {reportCreatedAt && (
              <span className="ml-2">
                {new Date(reportCreatedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="p-5 bg-slate-50 rounded-xl border-l-4 border-blue-500">
        <p className="text-gray-800 leading-relaxed">
          {report.overall.synthesis}
        </p>
      </div>

      <p className="mt-3 text-xs text-gray-400 italic">
        {report.overall.positioning_note}
      </p>
    </div>
  )
}
