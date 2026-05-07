// Grade color utility - muted professional tones
// Green: A, A-, B+, B
// Amber: B-, C+, C
// Red: C-, D+, D, D-, F

export function getGradeColor(grade: string): 'green' | 'amber' | 'red' {
  const g = grade?.toUpperCase()?.charAt(0)
  if (g === 'A') return 'green'
  if (g === 'B') {
    // B- is amber, B and B+ are green
    if (grade.includes('-')) return 'amber'
    return 'green'
  }
  if (g === 'C') {
    // C+ is amber, C and C- are amber/red boundary - treat as amber
    return 'amber'
  }
  // D, F = red
  return 'red'
}

// Tailwind classes for grade colors
export function getGradeColorClass(grade: string): string {
  const color = getGradeColor(grade)
  switch (color) {
    case 'green': return 'bg-green-600'
    case 'amber': return 'bg-amber-500'
    case 'red': return 'bg-red-600'
  }
}

export function getGradeBorderClass(grade: string): string {
  const color = getGradeColor(grade)
  switch (color) {
    case 'green': return 'border-l-green-600'
    case 'amber': return 'border-l-amber-500'
    case 'red': return 'border-l-red-600'
  }
}

interface GradeBadgeProps {
  grade: string
  size?: 'sm' | 'md' | 'lg'
}

// Minimal grade indicator - just the letter with subtle styling
export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <span className={`${sizeClasses[size]} font-semibold text-gray-900`}>
      {grade}
    </span>
  )
}

// Grade with colored accent bar
export function GradeWithAccent({ grade, size = 'md' }: GradeBadgeProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  const barHeights = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-10',
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`w-1 ${barHeights[size]} rounded-full ${getGradeColorClass(grade)}`} />
      <span className={`${sizeClasses[size]} font-semibold text-gray-900`}>
        {grade}
      </span>
    </div>
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

// Tiny colored dot indicator for tables
export function GradeDot({ grade }: { grade: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${getGradeColorClass(grade)}`} />
  )
}
