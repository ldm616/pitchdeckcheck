import { useState } from 'react'
import { GradeDot } from '../GradeBadge'
import type { V1SlideDetail, SlideData } from '../../lib/types'

interface SlideFeedbackProps {
  details: V1SlideDetail[]
  slideImages: SlideData[]
}

export function SlideFeedback({ details, slideImages }: SlideFeedbackProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!details || details.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-1">
        Slide Feedback
      </h2>

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isExpanded ? (
          <>Hide detailed investor feedback <span className="text-gray-400">↑</span></>
        ) : (
          <>Show detailed investor feedback for each slide <span className="text-blue-500">↓</span></>
        )}
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
            {details.map((slide) => {
              const slideData = slideImages.find(s => s.slide_number === slide.slide_number)
              const imageUrl = slideData?.image_url

              // Support both new and legacy field names
              const insight = slide.investor_insight || slide.what_works || ''
              const missingProof = slide.missing_investor_proof ||
                (slide.highest_impact_improvement && !isNoAction(slide.highest_impact_improvement)
                  ? slide.highest_impact_improvement
                  : null)

              return (
                <div key={slide.slide_number} className="pt-6 border-t border-gray-100 first:border-0 first:pt-0">
                  {/* Header */}
                  <div className="flex items-center gap-1.5 text-sm mb-3">
                    <span className="text-gray-500">Slide {slide.slide_number}</span>
                    <span className="text-gray-300">—</span>
                    <span className="font-medium text-gray-900">{slide.type}</span>
                    <span className="text-gray-300">—</span>
                    <span className="flex items-center gap-[5px]">
                      <GradeDot grade={slide.grade} />
                      <span className="font-medium text-gray-500">{slide.grade}</span>
                    </span>
                  </div>

                  {/* Slide image */}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.slide_number}`}
                      className="w-full h-auto my-5 shadow-sm"
                    />
                  )}

                  {/* Investor Insight */}
                  {insight && (
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {insight}
                    </p>
                  )}

                  {/* Missing Investor Proof */}
                  {missingProof && (
                    <p className="text-sm text-gray-500 leading-relaxed">
                      <span className="text-amber-600 font-medium">Missing Investor Proof: </span>
                      {missingProof}
                    </p>
                  )}
                </div>
              )
            })}
        </div>
      )}

    </div>
  )
}

// Helper to check if text is essentially "no improvement needed"
function isNoAction(text: string): boolean {
  if (!text) return true
  const lower = text.toLowerCase()
  return lower.includes('no major gap') ||
         lower.includes('no significant gap') ||
         lower.includes('no gaps') ||
         lower.startsWith('no specific') ||
         lower.startsWith('no changes') ||
         lower === 'none' ||
         lower.includes('this slide does its job') ||
         lower.includes('no changes needed') ||
         lower === 'null'
}
