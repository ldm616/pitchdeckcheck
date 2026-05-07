import { useState } from 'react'
import { Expand, X, ChevronDown } from 'lucide-react'
import { GradeDot } from '../GradeBadge'
import type { V1SlideDetail, SlideData } from '../../lib/types'

interface SlideDetailsProps {
  slides: V1SlideDetail[]
  slideImages: SlideData[]
}

export function SlideDetails({ slides, slideImages }: SlideDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedSlideNumber, setSelectedSlideNumber] = useState<number | null>(null)

  if (!slides || slides.length === 0) return null

  // Helper to check if text is essentially "no improvement needed"
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
           lower.includes('no changes needed')
  }

  const handleThumbnailClick = (slideNumber: number) => {
    setSelectedSlideNumber(slideNumber)
  }

  const handleCloseModal = () => {
    setSelectedSlideNumber(null)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal()
    }
  }

  return (
    <div className="mb-10">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide group-hover:text-gray-500 transition-colors">
          Detailed Slide Feedback
        </h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-6 space-y-8">
          {slides.map((slide) => {
            const slideData = slideImages.find(s => s.slide_number === slide.slide_number)
            const imageUrl = slideData?.image_url
            const hasImprovement = slide.highest_impact_improvement && !isNoAction(slide.highest_impact_improvement)

            // Combine what_works and biggest_gap into assessment
            const assessmentParts = []
            if (slide.what_works && !slide.what_works.toLowerCase().includes('limited conviction')) {
              assessmentParts.push(slide.what_works)
            }
            if (slide.biggest_gap && !isNoAction(slide.biggest_gap)) {
              assessmentParts.push(slide.biggest_gap)
            }
            const assessment = assessmentParts.join(' ')

            return (
              <div key={slide.slide_number} className="pb-8 border-b border-gray-100 last:border-0 last:pb-0">
                {/* Header: Slide # — Type — Grade */}
                <div className="flex items-start gap-4 mb-3">
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => handleThumbnailClick(slide.slide_number)}
                      className="flex-shrink-0 w-16 relative group"
                    >
                      <img
                        src={imageUrl}
                        alt={`Slide ${slide.slide_number}`}
                        className="w-full h-auto rounded border border-gray-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded flex items-center justify-center">
                        <Expand className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium text-gray-900">Slide {slide.slide_number}</span>
                      <span className="text-gray-300">—</span>
                      <span className="text-gray-500">{slide.type}</span>
                      <span className="text-gray-300">—</span>
                      <GradeDot grade={slide.grade} />
                      <span className="font-medium text-gray-500">{slide.grade}</span>
                    </div>
                  </div>
                </div>

                {/* Assessment prose */}
                {assessment && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {assessment}
                  </p>
                )}

                {/* Highest-leverage improvement */}
                {hasImprovement && (
                  <p className="text-sm text-gray-500 leading-relaxed">
                    <span className="text-gray-400 font-medium">Highest-leverage improvement: </span>
                    {slide.highest_impact_improvement}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Image preview modal */}
      {selectedSlideNumber !== null && (() => {
        const slideData = slideImages.find(s => s.slide_number === selectedSlideNumber)
        const imageUrl = slideData?.image_url
        if (!imageUrl) return null

        return (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
            onClick={handleBackdropClick}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-[90vw] max-w-[500px] flex flex-col items-center">
              <img
                src={imageUrl}
                alt={`Slide ${selectedSlideNumber} preview`}
                className="w-full h-auto rounded-lg"
              />
              <p className="mt-3 text-sm text-white/80">
                Slide {selectedSlideNumber}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
