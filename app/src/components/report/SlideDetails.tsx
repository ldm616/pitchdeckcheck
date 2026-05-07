import { useState } from 'react'
import { GradeDot } from '../GradeBadge'
import type { V1SlideDetail, SlideData } from '../../lib/types'

interface SlideDetailsProps {
  slides: V1SlideDetail[]
  slideImages: SlideData[]
}

export function SlideDetails({ slides, slideImages }: SlideDetailsProps) {
  const [hoveredSlideNumber, setHoveredSlideNumber] = useState<number | null>(null)

  if (!slides || slides.length === 0) return null

  // Helper to check if text is essentially "no gap" / "no improvement needed"
  const isNoAction = (text: string) => {
    if (!text) return true
    const lower = text.toLowerCase()
    return lower.includes('no major gap') ||
           lower.includes('no significant gap') ||
           lower.includes('no gaps') ||
           lower.startsWith('no specific') ||
           lower.startsWith('no changes') ||
           lower === 'none' ||
           lower.includes('this slide does its job') ||
           lower.includes('effectively')
  }

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Slide-by-Slide
      </h2>
      <div className="space-y-10">
        {slides.map((slide) => {
          const slideData = slideImages.find(s => s.slide_number === slide.slide_number)
          const imageUrl = slideData?.image_url
          const hasGap = slide.biggest_gap && !isNoAction(slide.biggest_gap)
          const hasImprovement = slide.highest_impact_improvement && !isNoAction(slide.highest_impact_improvement)

          return (
            <div key={slide.slide_number} className="pb-10 border-b border-gray-100 last:border-0 last:pb-0">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                {imageUrl && (
                  <div
                    className="flex-shrink-0 w-20"
                    onMouseEnter={() => setHoveredSlideNumber(slide.slide_number)}
                    onMouseLeave={() => setHoveredSlideNumber(null)}
                  >
                    <img
                      src={imageUrl}
                      alt={`Slide ${slide.slide_number}`}
                      className="w-full h-auto rounded border border-gray-200 cursor-pointer"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Slide {slide.slide_number}
                    </span>
                    <span className="text-sm text-gray-300">·</span>
                    <span className="text-sm text-gray-500">
                      {slide.type}
                    </span>
                    <span className="text-sm text-gray-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <GradeDot grade={slide.grade} />
                      <span className="text-sm font-medium text-gray-500">
                        {slide.grade}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content - flowing prose style */}
              <div className="space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {slide.what_works}
                </p>

                {hasGap && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {slide.biggest_gap}
                  </p>
                )}

                {hasImprovement && (
                  <p className="text-sm text-gray-500 leading-relaxed">
                    <span className="text-gray-400">Improvement: </span>
                    {slide.highest_impact_improvement}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hover preview overlay */}
      {hoveredSlideNumber !== null && (() => {
        const slideData = slideImages.find(s => s.slide_number === hoveredSlideNumber)
        const imageUrl = slideData?.image_url
        if (!imageUrl) return null

        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-none">
            <div className="max-w-[85vw] max-h-[85vh] flex flex-col items-center">
              <img
                src={imageUrl}
                alt={`Slide ${hoveredSlideNumber} preview`}
                className="max-w-full max-h-[calc(85vh-40px)] rounded-lg"
              />
              <p className="mt-3 text-sm text-white/80">
                Slide {hoveredSlideNumber}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
