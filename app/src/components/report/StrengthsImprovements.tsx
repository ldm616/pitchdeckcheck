import type { V1Strength, V1Improvement } from '../../lib/types'

interface TopStrengthsProps {
  strengths: V1Strength[]
}

export function TopStrengths({ strengths }: TopStrengthsProps) {
  if (!strengths || strengths.length === 0) return null

  return (
    <div className="mb-14">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        What Works
      </h2>
      <div className="space-y-4">
        {strengths.map((s, idx) => (
          <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              {s.strength}
            </p>
            <p className="mt-1.5 text-xs text-gray-400">
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

  return (
    <div className="mb-14">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Key Improvements
      </h2>
      <div className="space-y-6">
        {improvements.map((imp, idx) => (
          <div key={idx} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              {imp.improvement}
            </p>
            {imp.context && (
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {imp.context}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {imp.slide_type}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
