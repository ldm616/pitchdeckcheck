import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <Loader2
      className={`${sizeClasses[size]} animate-spin text-blue-600 ${className}`}
    />
  )
}

interface ProcessingStatusProps {
  status: string | null
  slideCount?: number | null
}

export function ProcessingStatus({ status, slideCount }: ProcessingStatusProps) {
  const getStatusMessage = () => {
    switch (status) {
      case 'extracting':
        return 'Extracting slides from your deck...'
      case 'extracted':
      case 'analyzing':
        return slideCount
          ? `Analyzing ${slideCount} slides...`
          : 'Analyzing slides...'
      case 'analyzed':
      case 'generating_free':
        return 'Generating your report...'
      default:
        return 'Processing your deck...'
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 text-center">
        {getStatusMessage()}
      </p>
    </div>
  )
}
