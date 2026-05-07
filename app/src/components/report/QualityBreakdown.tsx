import { GradeDot } from '../GradeBadge'
import type { V1QualityDimensions, DimensionKey } from '../../lib/types'

interface QualityBreakdownProps {
  dimensions: V1QualityDimensions
}

export function QualityBreakdown({ dimensions }: QualityBreakdownProps) {
  const dimensionKeys: DimensionKey[] = ['clarity', 'brevity', 'flow', 'completeness']

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        Quality Breakdown
      </h2>
      <div className="space-y-4">
        {dimensionKeys.map((dim) => {
          const dimension = dimensions[dim]

          return (
            <div key={dim}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {dim}:
                </span>
                <span className="flex items-center gap-[5px]">
                  <GradeDot grade={dimension.grade} />
                  <span className="text-sm font-medium text-gray-600">
                    {dimension.grade}
                  </span>
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
