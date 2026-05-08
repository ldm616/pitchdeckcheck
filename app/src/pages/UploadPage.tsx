import { useDeckUpload } from '../hooks/useDeckUpload'
import { UploadDropzone } from '../components/UploadDropzone'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { FounderHeader } from '../components/FounderHeader'
import { FounderFooter } from '../components/FounderFooter'

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
    <div className="flex flex-col flex-1">
      <FounderHeader />

      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-8">
            Upload your pitch deck
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <UploadDropzone
                onFileSelect={handleFileDrop}
                onClearFile={clearFile}
                selectedFileName={fileName}
                disabled={isProcessing}
                error={errorMessage}
              />
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-3.5 px-4 text-base font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  Uploading deck...
                </>
              ) : (
                'Upload your deck'
              )}
            </button>
          </form>

          {status === 'error' && errorMessage && (
            <p className="mt-6 text-sm text-gray-600">{errorMessage}</p>
          )}
        </div>
      </main>

      <FounderFooter />
    </div>
  )
}
