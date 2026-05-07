import { useState } from 'react'
import { GradePill } from '../GradeBadge'
import type { V1SlideDetail, SlideData } from '../../lib/types'

interface SlideDetailsProps {
  slides: V1SlideDetail[]
  slideImages: SlideData[]
}

export function SlideDetails({ slides, slideImages }: SlideDetailsProps) {
  const [hoveredSlideNumber, setHoveredSlideNumber] = useState<number | null>(null)

  if (!slides || slides.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Slide Details
      </h3>
      <div className="flex flex-col gap-4">
        {slides.map((slide) => {
          const slideData = slideImages.find(s => s.slide_number === slide.slide_number)
          const imageUrl = slideData?.image_url

          return (
            <div
              key={slide.slide_number}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Slide Header */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-200">
                {imageUrl && (
                  <div
                    className="flex-shrink-0 w-16"
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Slide {slide.slide_number} — {slide.type}
                    </span>
                    <GradePill grade={slide.grade} size="sm" />
                  </div>
                </div>
              </div>

              {/* Slide Content */}
              <div className="p-4 space-y-3.5">
                {/* What Works */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-green-700 uppercase tracking-wide">
                    What Works
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {slide.what_works}
                  </p>
                </div>

                {/* Biggest Gap */}
                {slide.biggest_gap && slide.biggest_gap !== 'No significant gaps identified.' && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-red-600 uppercase tracking-wide">
                      Biggest Gap
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {slide.biggest_gap}
                    </p>
                  </div>
                )}

                {/* Highest-Impact Improvement */}
                {slide.highest_impact_improvement && slide.highest_impact_improvement !== 'No specific improvements needed.' && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      Highest-Impact Improvement
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {slide.highest_impact_improvement}
                    </p>
                  </div>
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
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 pointer-events-none">
            <div className="max-w-[80vw] max-h-[80vh] flex flex-col items-center">
              <img
                src={imageUrl}
                alt={`Slide ${hoveredSlideNumber} preview`}
                className="max-w-full max-h-[calc(80vh-40px)] rounded-lg shadow-2xl"
              />
              <p className="mt-3 text-sm text-white">
                Slide {hoveredSlideNumber}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
