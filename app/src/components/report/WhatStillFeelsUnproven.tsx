interface WhatStillFeelsUnprovenProps {
  concerns: string[]
}

export function WhatStillFeelsUnproven({ concerns }: WhatStillFeelsUnprovenProps) {
  if (!concerns || concerns.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        What Still Feels Unproven
      </h2>
      <ul className="space-y-3">
        {concerns.map((concern, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-amber-500 flex-shrink-0">?</span>
            <span className="text-sm text-gray-700 leading-relaxed">{concern}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
