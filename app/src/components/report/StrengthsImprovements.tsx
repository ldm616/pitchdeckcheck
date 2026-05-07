import type { V1Strength, V1Improvement } from '../../lib/types'

interface TopStrengthsProps {
  strengths: V1Strength[]
}

export function TopStrengths({ strengths }: TopStrengthsProps) {
  if (!strengths || strengths.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Strengths
      </h3>
      <div className="flex flex-col gap-2.5">
        {strengths.map((s, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-green-50 rounded-lg border-l-3 border-green-500"
          >
            <p className="text-sm text-green-700 leading-relaxed">
              {s.strength}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
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
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Improvement Priorities
      </h3>
      <div className="flex flex-col gap-2.5">
        {improvements.map((imp, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-amber-50 rounded-lg border-l-3 border-amber-500"
          >
            <p className="text-sm text-amber-800 leading-relaxed font-medium">
              {idx + 1}. {imp.improvement}
            </p>
            {imp.context && (
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {imp.context}
              </p>
            )}
            <p className="mt-1.5 text-xs text-gray-500">
              {imp.slide_type}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
