import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface SaveReportCardProps {
  reportCode: string
  reportUrl: string
}

export function SaveReportCard({ reportCode, reportUrl }: SaveReportCardProps) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(reportCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <div className="mb-12 py-6 border-y border-gray-100">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        Save this report
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Copy your report code or link to return later.
      </p>

      <div className="space-y-4">
        {/* Report Code */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wide w-16 flex-shrink-0">
            Code
          </span>
          <span className="font-mono text-sm text-gray-700 tracking-wider">
            {reportCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            title="Copy report code"
          >
            {codeCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Report Link */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wide w-16 flex-shrink-0">
            Link
          </span>
          <span className="text-sm text-gray-500 truncate flex-1 min-w-0">
            {reportUrl}
          </span>
          <button
            onClick={handleCopyLink}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            title="Copy report link"
          >
            {linkCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
