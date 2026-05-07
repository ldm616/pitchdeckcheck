import { useState } from 'react'
import { sendReportLink } from '../../lib/api'

interface SaveReportSectionProps {
  deckId: string
  accessToken: string
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error'

export function SaveReportSection({ deckId, accessToken }: SaveReportSectionProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    setStatus('sending')
    setErrorMessage(null)

    try {
      const result = await sendReportLink(deckId, accessToken, email.trim())

      if (result.ok) {
        setStatus('sent')
        setEmail('')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Something went wrong')
      }
    } catch {
      setStatus('error')
      setErrorMessage("We couldn't send the link. Try again or copy this page URL for now.")
    }
  }

  // Success state
  if (status === 'sent') {
    return (
      <div className="mb-12 py-6 border-y border-gray-100">
        <p className="text-sm text-gray-600">
          Private link sent.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-12 py-6 border-y border-gray-100">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
        Save this report
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Email yourself a private link so you can return to this report later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          disabled={status === 'sending'}
        />

        <button
          type="submit"
          disabled={!email.trim() || status === 'sending'}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'sending' ? 'Sending...' : 'Send private link'}
        </button>
      </form>

      {status === 'error' && errorMessage && (
        <p className="mt-3 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <p className="mt-4 text-xs text-gray-400">
        No account required. Your deck is used only to generate this report.
      </p>
    </div>
  )
}
