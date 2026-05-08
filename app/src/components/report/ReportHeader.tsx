import { GradeWithAccent } from '../GradeBadge'
import type { V1Report } from '../../lib/types'

interface ReportHeaderProps {
  report: V1Report
  slideCount: number
  reportCreatedAt?: string | null
}

export function ReportHeader({ report, slideCount, reportCreatedAt }: ReportHeaderProps) {
  // Support both new (investor_readout) and legacy (synthesis) field names
  const readout = report.overall.investor_readout || report.overall.synthesis || ''

  return (
    <div className="mb-8">
      {/* Grade and metadata */}
      <div className="flex items-center gap-5 mb-5">
        <GradeWithAccent grade={report.overall.grade} size="lg" />
        <p className="text-sm text-gray-400">
          {slideCount || report.slides?.length || 0} slides
          {reportCreatedAt && (
            <span className="ml-1">
              · {new Date(reportCreatedAt).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
        </p>
      </div>

      {/* Overall Investor Readout */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
          Overall Investor Readout
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {readout}
        </p>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {report.overall.positioning_note}
      </p>
    </div>
  )
}
