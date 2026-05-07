import type { V1Strength, V1Improvement } from '../../lib/types'

interface TopStrengthsProps {
  strengths: V1Strength[]
}

export function TopStrengths({ strengths }: TopStrengthsProps) {
  if (!strengths || strengths.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        What Works
      </h2>
      <div className="space-y-3">
        {strengths.map((s, idx) => (
          <div key={idx}>
            <p className="text-sm text-gray-700 leading-relaxed">
              {s.strength}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {s.slide_type}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TopImprovementsProps {
  improvements: V1Improvement[]
}

export function TopImprovements({ improvements }: TopImprovementsProps) {
  if (!improvements || improvements.length === 0) return null

  // Limit to 3 priority fixes
  const topThree = improvements.slice(0, 3)

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        Priority Fixes
      </h2>
      <div className="space-y-4">
        {topThree.map((imp, idx) => (
          <div key={idx}>
            <p className="text-sm text-gray-700 leading-relaxed">
              {imp.improvement}
            </p>
            {imp.context && (
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                {imp.context}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
