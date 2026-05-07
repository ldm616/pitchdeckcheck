import type { V1QualityDimensions, DimensionKey } from '../../lib/types'

interface QualityBreakdownProps {
  dimensions: V1QualityDimensions
}

export function QualityBreakdown({ dimensions }: QualityBreakdownProps) {
  const dimensionKeys: DimensionKey[] = ['clarity', 'brevity', 'flow', 'completeness']

  return (
    <div className="mb-12">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Quality Breakdown
      </h2>
      <div className="space-y-6">
        {dimensionKeys.map((dim) => {
          const dimension = dimensions[dim]

          return (
            <div key={dim} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between mb-2">
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
