interface GradeBadgeProps {
  grade: string
  size?: 'sm' | 'md' | 'lg'
  showBackground?: boolean
}

export function GradeBadge({ grade, size = 'md', showBackground = true }: GradeBadgeProps) {
  const gradeColors = getGradeColors(grade)

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm rounded-md',
    md: 'w-12 h-12 text-xl rounded-lg',
    lg: 'w-14 h-14 text-2xl rounded-xl',
  }

  if (!showBackground) {
    return (
      <span className={`font-bold ${gradeColors.text}`}>
        {grade}
      </span>
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} ${gradeColors.bg} flex items-center justify-center font-bold text-white`}
    >
      {grade}
    </div>
  )
}

interface GradePillProps {
  grade: string
  size?: 'sm' | 'md'
}

export function GradePill({ grade, size = 'md' }: GradePillProps) {
  const gradeColors = getGradeColors(grade)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={`${sizeClasses[size]} ${gradeColors.bgLight} ${gradeColors.textDark} font-semibold rounded-md`}
    >
      {grade}
    </span>
  )
}

function getGradeColors(grade: string) {
  const letter = grade.charAt(0)

  switch (letter) {
    case 'A':
      return {
        bg: 'bg-green-500',
        bgLight: 'bg-green-100',
        text: 'text-green-500',
        textDark: 'text-green-700',
      }
    case 'B':
      return {
        bg: 'bg-lime-500',
        bgLight: 'bg-lime-100',
        text: 'text-lime-500',
        textDark: 'text-lime-700',
      }
    case 'C':
      return {
        bg: 'bg-yellow-500',
        bgLight: 'bg-yellow-100',
        text: 'text-yellow-500',
        textDark: 'text-yellow-700',
      }
    case 'D':
      return {
        bg: 'bg-orange-500',
        bgLight: 'bg-orange-100',
        text: 'text-orange-500',
        textDark: 'text-orange-700',
      }
    default:
      return {
        bg: 'bg-red-500',
        bgLight: 'bg-red-100',
        text: 'text-red-500',
        textDark: 'text-red-700',
      }
  }
}

export function getGradeTextColor(grade: string): string {
  const letter = grade.charAt(0)
  switch (letter) {
    case 'A':
      return 'text-green-500'
    case 'B':
      return 'text-lime-500'
    case 'C':
      return 'text-yellow-500'
    case 'D':
      return 'text-orange-500'
    default:
      return 'text-red-500'
  }
}
