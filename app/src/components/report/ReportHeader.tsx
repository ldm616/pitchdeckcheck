import { GradeBadge } from '../GradeBadge'
import type { V1Report } from '../../lib/types'

interface ReportHeaderProps {
  report: V1Report
  slideCount: number
  reportCreatedAt?: string | null
}

export function ReportHeader({ report, slideCount, reportCreatedAt }: ReportHeaderProps) {
  return (
    <div className="mb-12">
      {/* Title */}
      <h1 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
        Deck Quality Report
      </h1>

      {/* Grade and metadata */}
      <div className="flex items-baseline gap-4 mb-8">
        <GradeBadge grade={report.overall.grade} size="lg" />
        <p className="text-sm text-gray-500">
          {slideCount || report.slide_summary?.length || 0} slides
          {reportCreatedAt && (
            <span className="ml-1">
              · {new Date(reportCreatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </p>
      </div>

      {/* Overall Assessment */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Overall Assessment
        </h2>
        <p className="text-base text-gray-700 leading-relaxed">
          {report.overall.synthesis}
        </p>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        {report.overall.positioning_note}
      </p>
    </div>
  )
}
