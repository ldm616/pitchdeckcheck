import { useCallback, useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileText, RefreshCw, Trash2 } from 'lucide-react'

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  onClearFile?: () => void
  selectedFileName?: string | null
  disabled?: boolean
  error?: string | null
}

export function UploadDropzone({
  onFileSelect,
  onClearFile,
  selectedFileName,
  disabled = false,
  error,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        onFileSelect(file)
      }
    }
  }, [disabled, onFileSelect])

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'application/pdf') {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleChooseDifferent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClearFile?.()
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 0)
  }, [onClearFile])

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClearFile?.()
  }, [onClearFile])

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center transition-colors
          ${disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${isDragging ? 'border-gray-400 bg-gray-100' : 'border-gray-200 hover:border-gray-300 bg-white'}
          ${error ? 'border-gray-300' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFileName ? (
          <div className="flex flex-col items-center gap-4">
            <FileText className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
            <p className="text-gray-900 font-medium">{selectedFileName}</p>
            {!disabled && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleChooseDifferent}
                  className="relative group p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label="Change file"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={2} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[11px] text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Change
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="relative group p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={2} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[11px] text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Remove
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">
              {isDragging ? 'Drop here' : 'Drop file or browse. 50MB max.'}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-gray-600 text-center">{error}</p>
      )}
    </div>
  )
}
