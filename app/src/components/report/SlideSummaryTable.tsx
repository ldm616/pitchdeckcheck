import { getGradeTextColor } from '../GradeBadge'
import type { V1SlideSummary } from '../../lib/types'

interface SlideSummaryTableProps {
  slides: V1SlideSummary[]
}

export function SlideSummaryTable({ slides }: SlideSummaryTableProps) {
  if (!slides || slides.length === 0) return null

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Slide Summary
      </h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[480px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">
                Slide
              </th>
              <th className="p-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">
                Type
              </th>
              <th className="p-2.5 text-center font-semibold text-gray-700 border-b border-gray-200">
                Grade
              </th>
              <th className="p-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">
                Key Takeaway
              </th>
            </tr>
          </thead>
          <tbody>
            {slides.map((slide, idx) => (
              <tr
                key={slide.slide_number}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <td className="p-2.5 border-b border-gray-200 text-gray-500">
                  {slide.slide_number}
                </td>
                <td className="p-2.5 border-b border-gray-200 text-gray-700">
                  {slide.type}
                </td>
                <td className="p-2.5 border-b border-gray-200 text-center">
                  <span className={`font-semibold ${getGradeTextColor(slide.grade)}`}>
                    {slide.grade}
                  </span>
                </td>
                <td className="p-2.5 border-b border-gray-200 text-gray-600 leading-relaxed">
                  {slide.key_takeaway}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
