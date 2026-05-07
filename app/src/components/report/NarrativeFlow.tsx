import type { V1NarrativeFlow } from '../../lib/types'

interface NarrativeFlowProps {
  narrativeFlow: V1NarrativeFlow
}

export function NarrativeFlow({ narrativeFlow }: NarrativeFlowProps) {
  if (!narrativeFlow) return null

  return (
    <div className="mb-14">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Narrative Flow
      </h2>
      <div className="space-y-6">
        {/* Strongest Sequence */}
        <div className="pb-6 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Strongest sequence
          </p>
          <p className="text-sm font-medium text-gray-900 mb-2">
            {narrativeFlow.strongest_sequence.slides}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            {narrativeFlow.strongest_sequence.description}
          </p>
          <p className="text-sm text-gray-500 italic">
            {narrativeFlow.strongest_sequence.investor_reaction}
          </p>
        </div>

        {/* Weakest Sequence */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Needs work
          </p>
          <p className="text-sm font-medium text-gray-900 mb-2">
            {narrativeFlow.weakest_sequence.slides}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            {narrativeFlow.weakest_sequence.description}
          </p>
          <p className="text-sm text-gray-500 italic">
            {narrativeFlow.weakest_sequence.investor_reaction}
          </p>
        </div>
      </div>
    </div>
  )
}
