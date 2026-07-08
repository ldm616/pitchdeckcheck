import { useMemo, useRef, useState } from 'react'
import type {
  PitchDeckCheckReportV2,
  DeckCommunicationScoreV2,
  InvestmentCaseAssessmentV2,
  SlideLevelFeedbackV2,
} from '../../lib/types'

// V2 report renderer — dashboard-first layout. Reads only whitelisted
// report_v2 fields; never surfaces gate terminology, debug data, or raw
// *.signals. Every section tolerates missing/partial data.

interface V2ReportProps {
  report: PitchDeckCheckReportV2
}

// --- grading -----------------------------------------------------------------

type Grade = 'A' | 'B' | 'C' | 'D' | 'neutral'

// Restrained tone palette. A: positive, B: neutral/slate, C: amber, D: red.
const TONE: Record<Grade, { text: string; badge: string; border: string; ring: string; dot: string }> = {
  A: { text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
  B: { text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700', border: 'border-slate-200', ring: 'ring-slate-400', dot: 'bg-slate-400' },
  C: { text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700', border: 'border-amber-200', ring: 'ring-amber-400', dot: 'bg-amber-500' },
  D: { text: 'text-red-700', badge: 'bg-red-50 text-red-700', border: 'border-red-200', ring: 'ring-red-400', dot: 'bg-red-500' },
  neutral: { text: 'text-gray-500', badge: 'bg-gray-100 text-gray-500', border: 'border-gray-200', ring: 'ring-gray-300', dot: 'bg-gray-300' },
}

const DASH_LABEL: Record<Grade, string> = {
  A: 'Strong',
  B: 'Needs refinement',
  C: 'Under-supported',
  D: 'Missing / weak',
  neutral: 'Not assessed',
}

// Rank for choosing the default (most important) selection. Lower = worse.
const RANK: Record<Grade, number> = { D: 0, C: 1, B: 2, A: 3, neutral: 4 }

// Canonical slide assessment -> A/B/C/D. Uses the investor-facing assessment,
// not the raw backend grade.
function slideAssessmentToGrade(a?: string): Grade {
  switch ((a || '').trim()) {
    case 'Strong':
      return 'A'
    case 'Mostly answered':
      return 'B'
    case 'Partially answered':
      return 'C'
    case 'Under-supported':
      return 'C'
    case 'Weakly answered':
    case 'Weak':
      return 'D'
    case 'Not answered':
      return 'D'
    default:
      return 'neutral' // Not assessed / unknown
  }
}

// Deck communication score (1–5 / label) -> A/B/C/D.
function deckScoreToGrade(score?: number, label?: string): Grade {
  if (label === 'Strong' || (typeof score === 'number' && score >= 4)) return 'A'
  if (score === 3) return 'B'
  if (score === 2) return 'C'
  if (typeof score === 'number' && score <= 1) return 'D'
  return 'neutral'
}

// Overall letter (e.g. "C+") -> A/B/C/D, dropping plus/minus.
function overallLetterToGrade(letter?: string): Grade {
  const c = (letter || '').trim().toUpperCase()[0]
  if (c === 'A') return 'A'
  if (c === 'B') return 'B'
  if (c === 'C') return 'C'
  if (c === 'D' || c === 'E' || c === 'F') return 'D'
  return 'neutral'
}

// --- small components ---------------------------------------------------------

function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'sm' | 'lg' | 'xl' }) {
  const t = TONE[grade]
  const letter = grade === 'neutral' ? '–' : grade
  if (size === 'xl') {
    return (
      <span className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl text-5xl font-semibold ${t.badge}`}>
        {letter}
      </span>
    )
  }
  const dims = size === 'lg' ? 'w-9 h-9 text-lg' : 'w-7 h-7 text-sm'
  return (
    <span className={`inline-flex items-center justify-center ${dims} rounded-lg font-semibold ${t.badge}`}>
      {letter}
    </span>
  )
}

function DeckScoreCard({
  label,
  data,
  selected,
  onSelect,
}: {
  label: string
  data: DeckCommunicationScoreV2
  selected: boolean
  onSelect: () => void
}) {
  const grade = deckScoreToGrade(data.score, data.label)
  const t = TONE[grade]
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full rounded-xl border ${t.border} bg-white p-4 transition-shadow hover:shadow-sm focus:outline-none ${
        selected ? `ring-2 ${t.ring} ring-offset-1` : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <GradeBadge grade={grade} size="lg" />
      </div>
      <p className={`text-sm font-medium ${t.text}`}>{data.label || DASH_LABEL[grade]}</p>
      {data.explanation && (
        <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-3">{data.explanation}</p>
      )}
    </button>
  )
}

function SlideScoreCard({
  slide,
  selected,
  onSelect,
}: {
  slide: SlideLevelFeedbackV2
  selected: boolean
  onSelect: () => void
}) {
  const grade = slideAssessmentToGrade(slide.assessment)
  const t = TONE[grade]
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full rounded-xl border ${t.border} bg-white p-3 transition-shadow hover:shadow-sm focus:outline-none ${
        selected ? `ring-2 ${t.ring} ring-offset-1` : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-gray-500">
          {typeof slide.slide_number === 'number' ? `Slide ${slide.slide_number}` : 'Section'}
        </span>
        <GradeBadge grade={grade} />
      </div>
      <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
        {slide.slide_title_or_section || 'Section'}
      </p>
      {slide.assessment && (
        <p className={`mt-1 text-xs ${t.text}`}>{slide.assessment}</p>
      )}
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </div>
  )
}

function IssueTag({ issueType }: { issueType?: string }) {
  if (!issueType || issueType === 'None') return null
  return (
    <span className="inline-block text-[11px] font-medium text-gray-500 bg-gray-100 rounded px-2 py-0.5">
      {issueType}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  )
}

// --- selection ---------------------------------------------------------------

type Selected =
  | { type: 'deck_score'; key: string; label: string }
  | { type: 'slide'; index: number }
  | null

// --- component ----------------------------------------------------------------

const DIMENSIONS: Array<{ key: keyof PitchDeckCheckReportV2['deck_communication_scores']; label: string }> = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'brevity', label: 'Brevity' },
  { key: 'flow', label: 'Flow' },
]

const INVESTMENT_AREAS: Array<{ key: keyof PitchDeckCheckReportV2['investment_case']; label: string }> = [
  { key: 'opportunity_strength', label: 'Opportunity Strength' },
  { key: 'execution_credibility', label: 'Execution Credibility' },
  { key: 'investor_fit', label: 'Investor Fit' },
]

export function V2Report({ report }: V2ReportProps) {
  const og = report.overall_grade
  const cs = report.context_summary
  const dcs = report.deck_communication_scores
  const ic = report.investment_case
  const believe = report.what_investors_may_believe || []
  const question = report.what_investors_may_question || []
  const priorities = report.priority_improvements || []
  const slides = report.slide_level_feedback || []
  const nextSteps = report.suggested_next_steps || []
  const save = report.save_share_upgrade

  const deckDims = useMemo(() => DIMENSIONS.filter((d) => dcs && dcs[d.key]), [dcs])

  // Default selection: the lowest-scoring / most important slide, else the
  // lowest deck score, else nothing.
  const defaultSelected = useMemo<Selected>(() => {
    if (slides.length > 0) {
      let worst = 0
      let worstRank = 99
      slides.forEach((s, i) => {
        const r = RANK[slideAssessmentToGrade(s.assessment)]
        if (r < worstRank) {
          worstRank = r
          worst = i
        }
      })
      return { type: 'slide', index: worst }
    }
    if (deckDims.length > 0) {
      let worst = deckDims[0]
      let worstRank = 99
      for (const d of deckDims) {
        const r = RANK[deckScoreToGrade(dcs[d.key]!.score, dcs[d.key]!.label)]
        if (r < worstRank) {
          worstRank = r
          worst = d
        }
      }
      return { type: 'deck_score', key: worst.key as string, label: worst.label }
    }
    return null
  }, [slides, deckDims, dcs])

  const [selected, setSelected] = useState<Selected>(defaultSelected)
  const detailRef = useRef<HTMLDivElement | null>(null)

  const select = (next: Selected) => {
    setSelected(next)
    // On small screens, bring the detail panel into view.
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
  }

  const overallGrade = overallLetterToGrade(og?.letter)
  const companyName = report.header?.company_name

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-gray-100">
        <GradeBadge grade={overallGrade} size="xl" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            {companyName || report.header?.report_title || 'Pitch Deck Check Report'}
          </p>
          <p className="text-lg font-semibold text-gray-900 leading-snug">
            {og?.concise_interpretation || 'Assessment not available.'}
          </p>
          {og?.primary_constraint && og.primary_constraint !== 'None' && (
            <p className="mt-1.5 text-sm text-gray-600">
              <span className="font-medium text-gray-900">Primary constraint:</span>{' '}
              {og.primary_constraint}
            </p>
          )}
          {og?.what_this_means && og.what_this_means !== og.concise_interpretation && (
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">{og.what_this_means}</p>
          )}
        </div>
      </div>

      {/* Deck Scores */}
      {deckDims.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Deck Scores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deckDims.map(({ key, label }) => (
              <DeckScoreCard
                key={key}
                label={label}
                data={dcs[key]!}
                selected={selected?.type === 'deck_score' && selected.key === key}
                onSelect={() => select({ type: 'deck_score', key: key as string, label })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide Scores */}
      {slides.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Slide Scores</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {slides.map((s, i) => (
              <SlideScoreCard
                key={i}
                slide={s}
                selected={selected?.type === 'slide' && selected.index === i}
                onSelect={() => select({ type: 'slide', index: i })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected Detail */}
      {selected && (
        <div ref={detailRef} className="mt-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
          {selected.type === 'deck_score' && dcs[selected.key as keyof typeof dcs] && (
            <SelectedDeckDetail label={selected.label} data={dcs[selected.key as keyof typeof dcs]!} />
          )}
          {selected.type === 'slide' && slides[selected.index] && (
            <SelectedSlideDetail slide={slides[selected.index]} />
          )}
        </div>
      )}

      {/* Secondary narrative sections — arranged wide to reduce scrolling. */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-10">
        {ic && (
          <Section title="Investment Case as Presented">
            <div className="space-y-3">
              {INVESTMENT_AREAS.map(({ key, label }) => {
                const a = ic[key] as InvestmentCaseAssessmentV2 | undefined
                if (!a) return null
                return (
                  <div key={key}>
                    <p className="text-sm font-medium text-gray-900">
                      {label}: <span className="font-normal text-gray-600">{a.label || 'Not Enough Information'}</span>
                    </p>
                    {a.interpretation && (
                      <p className="text-sm text-gray-500 leading-relaxed">{a.interpretation}</p>
                    )}
                  </div>
                )
              })}
              {typeof ic.market_validation === 'string' && ic.market_validation && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Market Validation</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{ic.market_validation}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {cs && (
          <Section title="Context Summary">
            <div className="space-y-1 text-sm text-gray-700">
              {cs.company_context && (
                <p>
                  <span className="font-medium text-gray-900">Detected stage:</span> {cs.company_context}
                  {cs.context_confidence ? ` (${cs.context_confidence} confidence)` : ''}
                </p>
              )}
              {cs.intended_investor_audience && (
                <p>
                  <span className="font-medium text-gray-900">Investor audience:</span> {cs.intended_investor_audience}
                </p>
              )}
              {cs.target_raise && (
                <p>
                  <span className="font-medium text-gray-900">Target raise:</span> {cs.target_raise}
                </p>
              )}
              {cs.evaluation_note && <p className="text-gray-500 leading-relaxed pt-1">{cs.evaluation_note}</p>}
            </div>
          </Section>
        )}

        {believe.length > 0 && (
          <Section title="What Investors May Believe">
            <ul className="space-y-2.5">
              {believe.map((b, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-emerald-500 flex-shrink-0">+</span>
                  <span className="text-sm text-gray-700 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {question.length > 0 && (
          <Section title="What Investors May Question">
            <ul className="space-y-2.5">
              {question.map((qn, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">?</span>
                  <span className="text-sm text-gray-700 leading-relaxed">{qn}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Priorities + Next Steps side by side on desktop. */}
      {(priorities.length > 0 || nextSteps.length > 0) && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-10">
          {priorities.length > 0 && (
            <Section title="Priority Improvements">
              <div className="space-y-3">
                {priorities.map((p, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {idx + 1}. {p.title}
                      </span>
                      <IssueTag issueType={p.issue_type} />
                    </div>
                    {p.why_it_matters && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-700">Why it matters:</span> {p.why_it_matters}
                      </p>
                    )}
                    {p.what_to_add_or_change && (
                      <p className="text-sm text-gray-600 leading-relaxed mt-1">
                        <span className="font-medium text-gray-700">What to add:</span> {p.what_to_add_or_change}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {nextSteps.length > 0 && (
            <Section title="Suggested Next Steps">
              <ol className="space-y-2.5">
                {nextSteps.map((step, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-gray-400 flex-shrink-0">{idx + 1}.</span>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-medium text-gray-900">{step.title}</span>
                      {step.detail ? ` — ${step.detail}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      )}

      {save && (save.intro || (save.options && save.options.length > 0)) && (
        <div className="mt-10">
          <Section title="Save or Improve This Report">
            {save.intro && <p className="text-sm text-gray-700 leading-relaxed mb-3">{save.intro}</p>}
            {save.options && save.options.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {save.options.map((opt, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-gray-300 flex-shrink-0">•</span>
                    <span className="text-sm text-gray-600 leading-relaxed">{opt}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      <p className="mt-10 text-xs text-gray-400 leading-relaxed">
        This report evaluates the deck as presented. It does not predict fundraising success.
      </p>
    </div>
  )
}

// --- selected-detail renderers ------------------------------------------------

function SelectedDeckDetail({ label, data }: { label: string; data: DeckCommunicationScoreV2 }) {
  const grade = deckScoreToGrade(data.score, data.label)
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <GradeBadge grade={grade} size="lg" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className={`text-xs ${TONE[grade].text}`}>{data.label || DASH_LABEL[grade]}</p>
        </div>
      </div>
      <div className="space-y-3">
        <DetailRow label="Explanation">{data.explanation}</DetailRow>
        <DetailRow label="Primary reason">{data.primary_reason}</DetailRow>
        <DetailRow label="Priority improvement">{data.priority_improvement}</DetailRow>
      </div>
    </div>
  )
}

function SelectedSlideDetail({ slide }: { slide: SlideLevelFeedbackV2 }) {
  const grade = slideAssessmentToGrade(slide.assessment)
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <GradeBadge grade={grade} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {typeof slide.slide_number === 'number' ? `Slide ${slide.slide_number} · ` : ''}
            {slide.slide_title_or_section || 'Section'}
          </p>
          <p className={`text-xs ${TONE[grade].text}`}>
            {slide.assessment || DASH_LABEL[grade]}
          </p>
        </div>
        <div className="ml-auto">
          <IssueTag issueType={slide.issue_type} />
        </div>
      </div>
      <div className="space-y-3">
        <DetailRow label="Investor decision">{slide.investor_decision}</DetailRow>
        <DetailRow label="What works">{slide.what_works}</DetailRow>
        <DetailRow label="What is missing">{slide.what_is_missing}</DetailRow>
        {slide.recommended_improvement && slide.recommended_improvement !== slide.what_is_missing && (
          <DetailRow label="Recommended improvement">{slide.recommended_improvement}</DetailRow>
        )}
      </div>
    </div>
  )
}
