import { GradeDot } from '../GradeBadge'
import type { V1QualityDimensions, DimensionKey } from '../../lib/types'

interface QualityBreakdownProps {
  dimensions: V1QualityDimensions
}

export function QualityBreakdown({ dimensions }: QualityBreakdownProps) {
  const dimensionKeys: DimensionKey[] = ['clarity', 'brevity', 'flow', 'completeness']

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        Quality Breakdown
      </h2>
      <div className="space-y-3">
        {dimensionKeys.map((dim) => {
          const dimension = dimensions[dim]

          return (
            <div
              key={dim}
              className="py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {dim}
                </span>
                <div className="flex items-center gap-1.5">
                  <GradeDot grade={dimension.grade} />
                  <span className="text-sm font-medium text-gray-500">
                    {dimension.grade}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {dimension.diagnostic}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
