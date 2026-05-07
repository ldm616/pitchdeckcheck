interface GradeBadgeProps {
  grade: string
  size?: 'sm' | 'md' | 'lg'
}

// Minimal grade indicator - just the letter with subtle styling
export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <span className={`${sizeClasses[size]} font-semibold text-gray-900`}>
      {grade}
    </span>
  )
}

interface GradePillProps {
  grade: string
}

// Minimal inline grade - just the letter
export function GradePill({ grade }: GradePillProps) {
  return (
    <span className="text-sm font-semibold text-gray-500">
      {grade}
    </span>
  )
}

// For tables - muted text color
export function getGradeTextColor(_grade: string): string {
  return 'text-gray-600'
}
