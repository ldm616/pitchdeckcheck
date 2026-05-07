import type { V1NarrativeFlow } from '../../lib/types'

interface NarrativeFlowProps {
  narrativeFlow: V1NarrativeFlow
}

export function NarrativeFlow({ narrativeFlow }: NarrativeFlowProps) {
  if (!narrativeFlow) return null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Narrative Flow
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Strongest Sequence */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="mb-2 text-xs font-semibold text-green-700 uppercase tracking-wide">
            Strongest Sequence
          </p>
          <p className="mb-1.5 text-sm font-semibold text-green-900">
            {narrativeFlow.strongest_sequence.slides}
          </p>
          <p className="mb-2 text-sm text-green-700 leading-relaxed">
            {narrativeFlow.strongest_sequence.description}
          </p>
          <p className="text-xs text-green-500 italic">
            {narrativeFlow.strongest_sequence.investor_reaction}
          </p>
        </div>

        {/* Weakest Sequence */}
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="mb-2 text-xs font-semibold text-red-700 uppercase tracking-wide">
            Needs Work
          </p>
          <p className="mb-1.5 text-sm font-semibold text-red-900">
            {narrativeFlow.weakest_sequence.slides}
          </p>
          <p className="mb-2 text-sm text-red-700 leading-relaxed">
            {narrativeFlow.weakest_sequence.description}
          </p>
          <p className="text-xs text-red-400 italic">
            {narrativeFlow.weakest_sequence.investor_reaction}
          </p>
        </div>
      </div>
    </div>
  )
}
