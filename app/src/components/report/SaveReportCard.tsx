import { useState } from 'react'
import { Copy, Check, Link as LinkIcon } from 'lucide-react'

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
    <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200">
      <h3 className="text-base font-semibold text-gray-900 mb-2">
        Save this report
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Copy this private link or report code so you can come back later.
      </p>

      <div className="space-y-3">
        {/* Report Code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm text-gray-700 tracking-wider">
            {reportCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Copy report code"
          >
            {codeCopied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Code</span>
              </>
            )}
          </button>
        </div>

        {/* Report Link */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 truncate">
            {reportUrl}
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Copy report link"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                <span>Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
