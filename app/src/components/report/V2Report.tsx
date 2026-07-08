import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

// Monarch-inspired semantic grade palette (soft tinted badge + darker ink).
const TONE: Record<Grade, { text: string; badge: string; border: string }> = {
  A: { text: 'text-grade-a-ink', badge: 'bg-grade-a-bg text-grade-a-ink', border: 'border-grade-a-border' },
  B: { text: 'text-grade-b-ink', badge: 'bg-grade-b-bg text-grade-b-ink', border: 'border-grade-b-border' },
  C: { text: 'text-grade-c-ink', badge: 'bg-grade-c-bg text-grade-c-ink', border: 'border-grade-c-border' },
  D: { text: 'text-grade-d-ink', badge: 'bg-grade-d-bg text-grade-d-ink', border: 'border-grade-d-border' },
  neutral: { text: 'text-monarch-muted', badge: 'bg-monarch-fill text-monarch-muted', border: 'border-monarch-border' },
}

// Orange accent ring for the selected card (consistent active-UI accent).
const SELECTED_RING = 'ring-2 ring-monarch-accent ring-offset-2 ring-offset-monarch-canvas'

const DASH_LABEL: Record<Grade, string> = {
  A: 'Strong',
  B: 'Needs refinement',
  C: 'Under-supported',
  D: 'Missing / weak',
  neutral: 'Not assessed',
}

// Rank for choosing the default (most important) selection. Lower = worse.
const RANK: Record<Grade, number> = { D: 0, C: 1, B: 2, A: 3, neutral: 4 }

// Color hierarchy: A/B stay quiet (warm-gray border, colored badge only); C/D
// get a tinted border to draw the eye. Selected state adds the orange ring.
function cardBorderClass(grade: Grade): string {
  return grade === 'C' || grade === 'D' ? TONE[grade].border : 'border-monarch-border'
}

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
      className={`text-left w-full rounded-xl border ${cardBorderClass(grade)} bg-monarch-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow focus:outline-none ${
        selected ? SELECTED_RING : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium text-monarch-muted uppercase tracking-wide">{label}</span>
        <GradeBadge grade={grade} size="sm" />
      </div>
      <p className={`text-xs font-medium ${t.text}`}>{data.label || DASH_LABEL[grade]}</p>
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
  const title = slide.slide_title_or_section || 'Section'
  const heading = typeof slide.slide_number === 'number' ? `${slide.slide_number}: ${title}` : title
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full rounded-xl border ${cardBorderClass(grade)} bg-monarch-card px-2.5 py-2 shadow-sm transition-shadow hover:shadow focus:outline-none ${
        selected ? SELECTED_RING : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-medium text-monarch-ink truncate">{heading}</span>
        <GradeBadge grade={grade} size="xs" />
      </div>
      {slide.assessment && (
        <p className="mt-0.5 text-[11px] text-monarch-muted leading-snug truncate">{slide.assessment}</p>
      )}
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div>
      <p className="text-xs font-medium text-monarch-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-monarch-body leading-relaxed">{children}</p>
    </div>
  )
}

function IssueTag({ issueType }: { issueType?: string }) {
  if (!issueType || issueType === 'None') return null
  return (
    <span className="inline-block text-[11px] font-medium text-monarch-sub bg-monarch-fill rounded px-2 py-0.5">
      {issueType}
    </span>
  )
}

function DetailHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-monarch-ink mb-3">{children}</p>
}

// --- selection ---------------------------------------------------------------

// Deck-level feedback cards that are not communication scores.
type InsightKey = 'investment_case' | 'priority' | 'questions' | 'beliefs' | 'context'

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
      className={`text-left w-full rounded-xl border border-monarch-border bg-monarch-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow focus:outline-none ${
        selected ? SELECTED_RING : ''
      }`}
    >
      <p className="text-xs font-semibold text-monarch-ink leading-snug">{title}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-monarch-muted leading-snug line-clamp-1">{subtitle}</p>}
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
  const deckDims = useMemo(() => DIMENSIONS.filter((d) => dcs && dcs[d.key]), [dcs])

  // Deck-level feedback cards (beyond the four communication scores), in order.
  const deckCards = useMemo<Array<{ key: InsightKey; title: string; subtitle?: string }>>(() => {
    const out: Array<{ key: InsightKey; title: string; subtitle?: string }> = []
    if (ic) out.push({ key: 'investment_case', title: 'Investment Case', subtitle: (ic.opportunity_strength as InvestmentCaseAssessmentV2 | undefined)?.label })
    if (priorities.length > 0) out.push({ key: 'priority', title: 'Priority Fixes', subtitle: `${priorities.length} to fix` })
    if (question.length > 0) out.push({ key: 'questions', title: 'Investor Questions', subtitle: `${question.length} points` })
    if (believe.length > 0) out.push({ key: 'beliefs', title: 'Investor Beliefs', subtitle: `${believe.length} points` })
    if (cs) out.push({ key: 'context', title: 'Context', subtitle: cs.company_context })
    return out
  }, [ic, priorities, believe, question, cs])

  // Optional hero chips for the biggest themes, derived from priority fixes.
  const keyIssues = useMemo<string[]>(() => {
    const text = priorities
      .map((p) => `${p.title} ${p.why_it_matters || ''} ${p.what_to_add_or_change || ''}`)
      .join(' ')
      .toLowerCase()
    const chips: string[] = []
    if (/defensib|moat/.test(text)) chips.push('Defensibility')
    if (/retention|repeat usage|repeat use/.test(text)) chips.push('Retention')
    if (/liquidity|marketplace/.test(text)) chips.push('Marketplace liquidity')
    if (/\bcac\b|payback|acquisition cost/.test(text)) chips.push('CAC / payback')
    return chips.slice(0, 4)
  }, [priorities])

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
    if (deckCards.length > 0) return { type: 'insight', key: deckCards[0].key }
    return null
  }, [priorities, slides, deckDims, dcs, deckCards])

  const [selected, setSelected] = useState<Selected>(defaultSelected)
  const detailRef = useRef<HTMLDivElement | null>(null)

  // --- desktop workspace: resizable two-pane split (>= 1280px) ---------------
  const LEFT_MIN = 600
  const RIGHT_MIN = 420
  const DIVIDER_W = 18

  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerW, setContainerW] = useState(0)
  useEffect(() => {
    if (!isDesktop) return
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setContainerW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [isDesktop])

  const [leftWidth, setLeftWidth] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem('pdc_report_split')
      return v ? parseInt(v, 10) : null
    } catch {
      return null
    }
  })
  const leftWidthRef = useRef<number | null>(leftWidth)

  // Applied (clamped) left-pane width. Falls back to 60% before measured.
  const maxLeft = Math.max(LEFT_MIN, containerW - RIGHT_MIN - DIVIDER_W)
  const appliedLeft =
    containerW === 0
      ? null
      : leftWidth != null
      ? Math.min(Math.max(leftWidth, LEFT_MIN), maxLeft)
      : Math.round(containerW * 0.6)

  const onDividerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const onMove = (ev: PointerEvent) => {
        const w = Math.max(LEFT_MIN, Math.min(ev.clientX - rect.left, rect.width - RIGHT_MIN - DIVIDER_W))
        leftWidthRef.current = w
        setLeftWidth(w)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        try {
          if (leftWidthRef.current != null) localStorage.setItem('pdc_report_split', String(Math.round(leftWidthRef.current)))
        } catch {
          /* ignore */
        }
      }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    []
  )

  const select = (next: Selected) => {
    setSelected(next)
    // On stacked (non-desktop) layouts, bring the detail panel into view.
    if (!isDesktop) {
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
      default:
        return null
    }
  }

  const SLIDE_GRID_STYLE: React.CSSProperties = {
    display: 'grid',
    gap: '0.625rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  }

  const leftContent = (
    <div className="space-y-5">
      {(deckDims.length > 0 || deckCards.length > 0) && (
        <div>
          <h2 className="text-xs font-medium text-monarch-muted uppercase tracking-wide mb-2.5">Deck Feedback</h2>
          {deckDims.length > 0 && (
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
          )}
          {deckCards.length > 0 && (
            <div style={SLIDE_GRID_STYLE} className={deckDims.length > 0 ? 'mt-2.5' : ''}>
              {deckCards.map((c) => (
                <InsightCard
                  key={c.key}
                  title={c.title}
                  subtitle={c.subtitle}
                  selected={selected?.type === 'insight' && selected.key === c.key}
                  onSelect={() => select({ type: 'insight', key: c.key })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {slides.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-monarch-muted uppercase tracking-wide mb-2.5">Slide Feedback</h2>
          <div style={SLIDE_GRID_STYLE}>
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
    </div>
  )

  // Detail pane border subtly reflects the selected card's grade tone.
  let detailTone: Grade = 'neutral'
  if (selected?.type === 'deck_score') {
    const d = dcs[selected.key as keyof typeof dcs]
    detailTone = d ? deckScoreToGrade(d.score, d.label) : 'neutral'
  } else if (selected?.type === 'slide') {
    const s = slides[selected.index]
    detailTone = s ? slideAssessmentToGrade(s.assessment) : 'neutral'
  }

  const detailPane = (
    <div className={`rounded-xl border-2 ${TONE[detailTone].border} bg-white p-5 sm:p-6`}>
      <p className="text-[11px] font-medium text-monarch-muted uppercase tracking-wide mb-3">Selected</p>
      {renderDetail()}
    </div>
  )

  return (
    <div className="font-sans text-monarch-body">
      {/* Hero (compact) */}
      <div className="flex items-center gap-4 pb-4 border-b border-monarch-border">
        <GradeBadge grade={overallGrade} size="xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-monarch-muted uppercase tracking-wide mb-0.5">
            {companyName || report.header?.report_title || 'Pitch Deck Check Report'}
          </p>
          <p className="text-base font-medium text-monarch-ink leading-snug">
            {og?.concise_interpretation || 'Assessment not available.'}
          </p>
          {og?.primary_constraint && og.primary_constraint !== 'None' && (
            <p className="mt-1 text-xs text-monarch-sub">
              <span className="font-medium text-monarch-body">Primary constraint:</span> {og.primary_constraint}
            </p>
          )}
          {keyIssues.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keyIssues.map((chip) => (
                <span
                  key={chip}
                  className="inline-block text-[11px] font-medium text-monarch-sub bg-monarch-fill rounded-full px-2 py-0.5"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {isDesktop ? (
        /* Desktop workspace: resizable two-pane split */
        <div ref={containerRef} className="mt-5 flex items-stretch">
          <div
            className="min-w-0 shrink-0"
            style={{ width: appliedLeft != null ? `${appliedLeft}px` : '60%' }}
          >
            {leftContent}
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
            onPointerDown={onDividerDown}
            className="group relative shrink-0 flex items-center justify-center cursor-col-resize select-none touch-none"
            style={{ width: DIVIDER_W }}
          >
            {/* full-height warm-gray rule, orange on hover */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-monarch-border group-hover:bg-monarch-accent/50 transition-colors" />
            {/* grab handle with dots */}
            <div className="relative z-10 flex flex-col items-center gap-[3px] rounded-md border border-monarch-border bg-monarch-card px-[3px] py-1.5 shadow-sm group-hover:border-monarch-accent group-active:border-monarch-accent group-active:shadow transition-colors">
              <span className="w-1 h-1 rounded-full bg-[#C9C4BE] group-hover:bg-monarch-accent" />
              <span className="w-1 h-1 rounded-full bg-[#C9C4BE] group-hover:bg-monarch-accent" />
              <span className="w-1 h-1 rounded-full bg-[#C9C4BE] group-hover:bg-monarch-accent" />
            </div>
          </div>
          {selected && (
            <div className="flex-1 min-w-0">
              <div className="sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">{detailPane}</div>
            </div>
          )}
        </div>
      ) : (
        /* Stacked layout (tablet / mobile) */
        <div className="mt-5 space-y-5">
          {leftContent}
          {selected && <div ref={detailRef}>{detailPane}</div>}
        </div>
      )}

      <p className="mt-8 text-xs text-monarch-muted leading-relaxed">
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
          <p className="text-sm font-semibold text-monarch-ink">{label}</p>
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
          <p className="text-sm font-semibold text-monarch-ink">
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
              <p className="text-sm font-medium text-monarch-ink">
                {label}: <span className="font-normal text-monarch-sub">{a.label || 'Not Enough Information'}</span>
              </p>
              {a.interpretation && <p className="text-sm text-monarch-sub leading-relaxed">{a.interpretation}</p>}
            </div>
          )
        })}
        {typeof ic.market_validation === 'string' && ic.market_validation && (
          <div>
            <p className="text-sm font-medium text-monarch-ink">Market Validation</p>
            <p className="text-sm text-monarch-sub leading-relaxed">{ic.market_validation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PriorityDetail({ items }: { items: PitchDeckCheckReportV2['priority_improvements'] }) {
  return (
    <div>
      <DetailHeading>Priority Fixes</DetailHeading>
      <div className="space-y-3">
        {items.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-monarch-border bg-white p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-monarch-ink">
                {idx + 1}. {p.title}
              </span>
              <IssueTag issueType={p.issue_type} />
            </div>
            {p.why_it_matters && (
              <p className="text-sm text-monarch-sub leading-relaxed">
                <span className="font-medium text-monarch-body">Why it matters:</span> {p.why_it_matters}
              </p>
            )}
            {p.what_to_add_or_change && (
              <p className="text-sm text-monarch-sub leading-relaxed mt-1">
                <span className="font-medium text-monarch-body">What to add:</span> {p.what_to_add_or_change}
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
            <span className="text-sm text-monarch-body leading-relaxed">{it}</span>
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
      <div className="space-y-2 text-sm text-monarch-body">
        {cs.company_context && (
          <p>
            <span className="font-medium text-monarch-ink">Detected stage:</span> {cs.company_context}
            {cs.context_confidence ? ` (${cs.context_confidence} confidence)` : ''}
          </p>
        )}
        {cs.intended_investor_audience && (
          <p>
            <span className="font-medium text-monarch-ink">Investor audience:</span> {cs.intended_investor_audience}
          </p>
        )}
        {cs.target_raise && (
          <p>
            <span className="font-medium text-monarch-ink">Target raise:</span> {cs.target_raise}
          </p>
        )}
        {cs.evaluation_note && <p className="text-monarch-sub leading-relaxed pt-1">{cs.evaluation_note}</p>}
      </div>
    </div>
  )
}

