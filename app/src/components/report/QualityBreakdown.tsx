import { getGradeBorderClass } from '../GradeBadge'
import type { V1QualityDimensions, DimensionKey } from '../../lib/types'

interface QualityBreakdownProps {
  dimensions: V1QualityDimensions
}

export function QualityBreakdown({ dimensions }: QualityBreakdownProps) {
  const dimensionKeys: DimensionKey[] = ['clarity', 'brevity', 'flow', 'completeness']

  return (
    <div className="mb-14">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Quality Breakdown
      </h2>
      <div className="space-y-4">
        {dimensionKeys.map((dim) => {
          const dimension = dimensions[dim]

          return (
            <div
              key={dim}
              className={`pl-4 py-3 border-l-2 ${getGradeBorderClass(dimension.grade)}`}
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {dim}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {dimension.grade}
                </span>
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
