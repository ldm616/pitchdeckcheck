import { useState } from 'react'
import { GradePill } from '../GradeBadge'
import type { V1QualityDimensions, DimensionKey } from '../../lib/types'
import { DIMENSION_DEFINITIONS } from '../../lib/types'

interface QualityBreakdownProps {
  dimensions: V1QualityDimensions
}

export function QualityBreakdown({ dimensions }: QualityBreakdownProps) {
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null)
  const dimensionKeys: DimensionKey[] = ['clarity', 'brevity', 'flow', 'completeness']

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Quality Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dimensionKeys.map((dim) => {
          const dimension = dimensions[dim]
          const isExpanded = expandedDimension === dim

          return (
            <div
              key={dim}
              className="p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 capitalize">
                  {dim}
                </span>
                <GradePill grade={dimension.grade} size="sm" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {dimension.diagnostic}
              </p>
              <button
                onClick={() => setExpandedDimension(isExpanded ? null : dim)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {isExpanded ? 'Show less' : 'What does this mean?'}
              </button>
              {isExpanded && (
                <p className="mt-2 text-xs text-gray-400 italic leading-relaxed">
                  {DIMENSION_DEFINITIONS[dim]}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
