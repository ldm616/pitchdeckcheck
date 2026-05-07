import type { V1SlideSummary } from '../../lib/types'

interface SlideSummaryTableProps {
  slides: V1SlideSummary[]
}

export function SlideSummaryTable({ slides }: SlideSummaryTableProps) {
  if (!slides || slides.length === 0) return null

  return (
    <div className="mb-12">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">
        Slide Overview
      </h2>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-3 text-left font-medium text-gray-500 w-12">
                #
              </th>
              <th className="px-2 py-3 text-left font-medium text-gray-500 w-28">
                Type
              </th>
              <th className="px-2 py-3 text-center font-medium text-gray-500 w-12">

              </th>
              <th className="px-2 py-3 text-left font-medium text-gray-500">
                Summary
              </th>
            </tr>
          </thead>
          <tbody>
            {slides.map((slide) => (
              <tr
                key={slide.slide_number}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="px-2 py-3 text-gray-400">
                  {slide.slide_number}
                </td>
                <td className="px-2 py-3 text-gray-600">
                  {slide.type}
                </td>
                <td className="px-2 py-3 text-center text-gray-500 font-medium">
                  {slide.grade}
                </td>
                <td className="px-2 py-3 text-gray-600 leading-relaxed">
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
