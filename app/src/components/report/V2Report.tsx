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

function GradeBadge({ grade, size = 'sm' }: { grade: Grade; size?: 'xs' | 'sm' | 'lg' | 'xl' }) {
  const t = TONE[grade]
  const letter = grade === 'neutral' ? '–' : grade
  if (size === 'xl') {
    return (
      <span className={`inline-flex items-center justify-center w-14 h-14 rounded-xl text-3xl font-semibold ${t.badge}`}>
        {letter}
      </span>
    )
  }
  const dims =
    size === 'lg' ? 'w-8 h-8 text-base' : size === 'xs' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'
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
      className={`text-left w-full rounded-lg border ${t.border} bg-white px-3 py-2.5 transition-shadow hover:shadow-sm focus:outline-none ${
        selected ? `ring-2 ${t.ring} ring-offset-1` : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide truncate">{label}</span>
        <GradeBadge grade={grade} size="sm" />
      </div>
      <p className={`text-xs font-medium ${t.text}`}>{data.label || DASH_LABEL[grade]}</p>
      {data.explanation && (
        <p className="mt-0.5 text-[11px] text-gray-400 leading-snug line-clamp-1">{data.explanation}</p>
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
      className={`text-left w-full rounded-lg border ${t.border} bg-white px-2.5 py-2 transition-shadow hover:shadow-sm focus:outline-none ${
        selected ? `ring-2 ${t.ring} ring-offset-1` : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-0.5">
        <span className="text-[11px] font-medium text-gray-400">
          {typeof slide.slide_number === 'number' ? `Slide ${slide.slide_number}` : 'Section'}
        </span>
        <GradeBadge grade={grade} size="xs" />
      </div>
      <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-1">
        {slide.slide_title_or_section || 'Section'}
      </p>
      {slide.assessment && (
        <p className={`text-[11px] leading-snug line-clamp-1 ${t.text}`}>{slide.assessment}</p>
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

function DetailHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-gray-900 mb-3">{children}</p>
}

// --- selection ---------------------------------------------------------------

type InsightKey =
  | 'investment_case'
  | 'priority'
  | 'beliefs'
  | 'questions'
  | 'context'
  | 'next_steps'

type Selected =
  | { type: 'deck_score'; key: string; label: string }
  | { type: 'slide'; index: number }
  | { type: 'insight'; key: InsightKey }
  | null

// Compact selectable insight tile (no grade badge).
function InsightCard({
  title,
  subtitle,
  selected,
  onSelect,
}: {
  title: string
  subtitle?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-shadow hover:shadow-sm focus:outline-none ${
        selected ? 'ring-2 ring-slate-400 ring-offset-1' : ''
      }`}
    >
      <p className="text-xs font-semibold text-gray-800 leading-snug">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-gray-400 leading-snug line-clamp-1">{subtitle}</p>}
    </button>
  )
}

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

  const deckDims = useMemo(() => DIMENSIONS.filter((d) => dcs && dcs[d.key]), [dcs])

  // Available insight cards, in display order (only those with data).
  const insights = useMemo<Array<{ key: InsightKey; title: string; subtitle?: string }>>(() => {
    const out: Array<{ key: InsightKey; title: string; subtitle?: string }> = []
    if (ic) out.push({ key: 'investment_case', title: 'Investment Case', subtitle: (ic.opportunity_strength as InvestmentCaseAssessmentV2 | undefined)?.label })
    if (priorities.length > 0) out.push({ key: 'priority', title: 'Priority Improvements', subtitle: `${priorities.length} to address` })
    if (believe.length > 0) out.push({ key: 'beliefs', title: 'Investors May Believe', subtitle: `${believe.length} points` })
    if (question.length > 0) out.push({ key: 'questions', title: 'Investors May Question', subtitle: `${question.length} points` })
    if (cs) out.push({ key: 'context', title: 'Context', subtitle: cs.company_context })
    if (nextSteps.length > 0) out.push({ key: 'next_steps', title: 'Next Steps', subtitle: `${nextSteps.length} steps` })
    return out
  }, [ic, priorities, believe, question, cs, nextSteps])

  // Default selection: Priority Improvements if present, else the lowest-scoring
  // slide, else the lowest deck score, else the first insight, else nothing.
  const defaultSelected = useMemo<Selected>(() => {
    if (priorities.length > 0) return { type: 'insight', key: 'priority' }
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
    if (insights.length > 0) return { type: 'insight', key: insights[0].key }
    return null
  }, [priorities, slides, deckDims, dcs, insights])

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

  const renderDetail = () => {
    if (!selected) return null
    if (selected.type === 'deck_score') {
      const d = dcs[selected.key as keyof typeof dcs]
      return d ? <SelectedDeckDetail label={selected.label} data={d} /> : null
    }
    if (selected.type === 'slide') {
      const s = slides[selected.index]
      return s ? <SelectedSlideDetail slide={s} /> : null
    }
    switch (selected.key) {
      case 'investment_case':
        return ic ? <InvestmentCaseDetail ic={ic} /> : null
      case 'priority':
        return <PriorityDetail items={priorities} />
      case 'beliefs':
        return <ListDetail title="What Investors May Believe" items={believe} marker="+" markerClass="text-emerald-500" />
      case 'questions':
        return <ListDetail title="What Investors May Question" items={question} marker="?" markerClass="text-amber-500" />
      case 'context':
        return cs ? <ContextDetail cs={cs} /> : null
      case 'next_steps':
        return <NextStepsDetail steps={nextSteps} />
      default:
        return null
    }
  }

  return (
    <div>
      {/* Hero (compact) */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        <GradeBadge grade={overallGrade} size="xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
            {companyName || report.header?.report_title || 'Pitch Deck Check Report'}
          </p>
          <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug">
            {og?.concise_interpretation || 'Assessment not available.'}
          </p>
          {og?.primary_constraint && og.primary_constraint !== 'None' && (
            <p className="mt-1 text-xs sm:text-sm text-gray-600">
              <span className="font-medium text-gray-900">Primary constraint:</span>{' '}
              {og.primary_constraint}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard: scorecard + insight grids (left) · selected detail (right) */}
      <div className="mt-5 lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        {/* Left: cards */}
        <div className="lg:col-span-3 space-y-5">
          {deckDims.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5">Deck Scores</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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

          {slides.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5">Slide Scores</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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

          {insights.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5">Insights</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {insights.map((ins) => (
                  <InsightCard
                    key={ins.key}
                    title={ins.title}
                    subtitle={ins.subtitle}
                    selected={selected?.type === 'insight' && selected.key === ins.key}
                    onSelect={() => select({ type: 'insight', key: ins.key })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: selected detail (sticky on desktop, scrolls internally) */}
        {selected && (
          <div ref={detailRef} className="mt-5 lg:mt-0 lg:col-span-2">
            <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/70 p-5 sm:p-6">
              {renderDetail()}
            </div>
          </div>
        )}
      </div>

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

function InvestmentCaseDetail({ ic }: { ic: PitchDeckCheckReportV2['investment_case'] }) {
  return (
    <div>
      <DetailHeading>Investment Case as Presented</DetailHeading>
      <div className="space-y-3">
        {INVESTMENT_AREAS.map(({ key, label }) => {
          const a = ic[key] as InvestmentCaseAssessmentV2 | undefined
          if (!a) return null
          return (
            <div key={key}>
              <p className="text-sm font-medium text-gray-900">
                {label}: <span className="font-normal text-gray-600">{a.label || 'Not Enough Information'}</span>
              </p>
              {a.interpretation && <p className="text-sm text-gray-500 leading-relaxed">{a.interpretation}</p>}
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
    </div>
  )
}

function PriorityDetail({ items }: { items: PitchDeckCheckReportV2['priority_improvements'] }) {
  return (
    <div>
      <DetailHeading>Priority Improvements</DetailHeading>
      <div className="space-y-3">
        {items.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-gray-100 bg-white p-3">
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
    </div>
  )
}

function ListDetail({
  title,
  items,
  marker,
  markerClass,
}: {
  title: string
  items: string[]
  marker: string
  markerClass: string
}) {
  return (
    <div>
      <DetailHeading>{title}</DetailHeading>
      <ul className="space-y-2.5">
        {items.map((it, idx) => (
          <li key={idx} className="flex gap-2">
            <span className={`${markerClass} flex-shrink-0`}>{marker}</span>
            <span className="text-sm text-gray-700 leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContextDetail({ cs }: { cs: PitchDeckCheckReportV2['context_summary'] }) {
  return (
    <div>
      <DetailHeading>Context</DetailHeading>
      <div className="space-y-2 text-sm text-gray-700">
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
    </div>
  )
}

function NextStepsDetail({ steps }: { steps: PitchDeckCheckReportV2['suggested_next_steps'] }) {
  return (
    <div>
      <DetailHeading>Suggested Next Steps</DetailHeading>
      <ol className="space-y-2.5">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="text-gray-400 flex-shrink-0">{idx + 1}.</span>
            <span className="text-sm text-gray-700 leading-relaxed">
              <span className="font-medium text-gray-900">{step.title}</span>
              {step.detail ? ` — ${step.detail}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
