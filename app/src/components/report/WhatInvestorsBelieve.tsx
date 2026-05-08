interface WhatInvestorsBelieveProps {
  beliefs: string[]
}

export function WhatInvestorsBelieve({ beliefs }: WhatInvestorsBelieveProps) {
  if (!beliefs || beliefs.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        What Investors Believe
      </h2>
      <ul className="space-y-3">
        {beliefs.map((belief, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-green-500 flex-shrink-0">+</span>
            <span className="text-sm text-gray-700 leading-relaxed">{belief}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
