import type { V1InvestorQuestion } from '../../lib/types'

interface InvestorQuestionsProps {
  questions: V1InvestorQuestion[]
}

function StatusIndicator({ status }: { status: string }) {
  const color = status === 'Strong'
    ? 'bg-green-500'
    : status === 'Partial'
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
  )
}

export function InvestorQuestions({ questions }: InvestorQuestionsProps) {
  if (!questions || questions.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        Investor Questions
      </h2>
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{q.question}</span>
              <span className="flex items-center gap-[5px]">
                <StatusIndicator status={q.status} />
                <span className="text-xs text-gray-400">{q.status}</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {q.explanation}
            </p>
            {q.unresolved_question && (
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                <span className="text-gray-400">Unresolved: </span>
                {q.unresolved_question}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
