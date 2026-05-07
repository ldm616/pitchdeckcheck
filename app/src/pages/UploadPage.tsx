import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '../lib/routes'
import { useDeckUpload } from '../hooks/useDeckUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function UploadPage() {
  const {
    email,
    setEmail,
    fileName,
    status,
    errorMessage,
    isProcessing,
    isDisabled,
    handleFileChange,
    handleFileDrop,
    handleSubmit,
  } = useDeckUpload()

  return (
    <div className="flex-1 flex items-start justify-center pt-8 pb-12 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Back link */}
            <Link
              to={ROUTES.HOME}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-3">
                Upload Your Pitch Deck
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Get your deck quality report in under 2 minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email field */}
              <div className="mb-5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <p className="text-xs text-gray-400 mb-1.5">
                  We'll use this to save your private report link so you can return to it later.
                </p>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isProcessing}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* File upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pitch deck (PDF)
                </label>
                <UploadDropzone
                  onFileSelect={handleFileDrop}
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
                className="w-full py-3 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    {status === 'uploading' ? 'Uploading...' : 'Processing...'}
                  </>
                ) : (
                  'Upload Deck'
                )}
              </button>

              {/* Secondary reassurance */}
              {status === 'idle' && (
                <p className="mt-4 text-xs text-gray-400 text-center">
                  Your report is saved privately and linked to your email so you can come back later.
                </p>
              )}
            </form>

            {/* Error state */}
            {status === 'error' && errorMessage && (
              <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
