import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '../lib/routes'
import { useDeckUpload } from '../hooks/useDeckUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function UploadPage() {
  const {
    fileName,
    status,
    errorMessage,
    isProcessing,
    isDisabled,
    handleFileChange,
    handleFileDrop,
    handleSubmit,
    cancelUpload,
    clearFile,
  } = useDeckUpload()

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Back link */}
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
          Upload your pitch deck
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          PDF up to 50MB
        </p>

        <form onSubmit={handleSubmit}>
          {/* File upload */}
          <div className="mb-6">
            <UploadDropzone
              onFileSelect={handleFileDrop}
              onClearFile={clearFile}
              selectedFileName={fileName}
              disabled={isProcessing}
              error={errorMessage}
            />
            {/* Hidden file input for fallback */}
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isDisabled}
            className="w-full py-3.5 px-4 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                Uploading...
              </>
            ) : (
              'Check My Deck'
            )}
          </button>

          {/* Cancel button */}
          {status === 'uploading' && (
            <button
              type="button"
              onClick={cancelUpload}
              className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}
        </form>

        {/* Error state */}
        {status === 'error' && errorMessage && (
          <p className="mt-6 text-sm text-gray-600">{errorMessage}</p>
        )}
      </div>
    </div>
  )
}
