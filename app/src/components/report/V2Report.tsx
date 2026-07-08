import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PitchDeckCheckReportV2,
  DeckCommunicationScoreV2,
  SlideLevelFeedbackV2,
} from '../../lib/types'

// V2 report renderer — dashboard-first layout with a simple three-level
// hierarchy: Deck Score (top) -> Deck Feedback (4 cards) -> Slide Feedback.
// Reads only whitelisted report_v2 fields; never surfaces gate terminology,
// debug data, or raw *.signals. Every section tolerates missing/partial data.

interface V2ReportProps {
  report: PitchDeckCheckReportV2
}

// --- grading -----------------------------------------------------------------

type Grade = 'A' | 'B' | 'C' | 'D' | 'neutral'

// Strong semantic grade colors, applied only to the grade underline.
const GRADE_UNDERLINE: Record<Grade, string> = {
  A: 'bg-grade-a',
  B: 'bg-grade-b',
  C: 'bg-grade-c',
  D: 'bg-grade-d',
  neutral: 'bg-monarch-border-strong',
}

// Card border: default calm neutral; selected gets a bold orange border. Always
// border-2 so selection never shifts layout.
function cardClass(selected: boolean): string {
  return `border-2 bg-monarch-card rounded-xl px-3 py-2 text-left w-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition focus:outline-none focus-visible:border-monarch-accent ${
    selected
      ? 'border-monarch-accent shadow-[0_1px_3px_rgba(255,90,31,0.12)]'
      : 'border-monarch-border hover:border-monarch-border-strong'
  }`
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

// Grade as a bold letter with a strong colored underline (dashboard metric
// style), not a pill. Sizes: md (cards), lg (detail), xl (hero).
function GradeMark({ grade, size = 'md' }: { grade: Grade; size?: 'md' | 'lg' | 'xl' }) {
  const letter = grade === 'neutral' ? '–' : grade
  const textCls = size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : 'text-[15px]'
  const underlineCls =
    size === 'xl' ? 'mt-1 h-0.5 w-8' : size === 'lg' ? 'mt-0.5 h-0.5 w-7' : 'mt-0.5 h-0.5 w-6'
  return (
    <span className="inline-flex flex-col items-center leading-none shrink-0">
      <span className={`${textCls} font-semibold text-monarch-ink`}>{letter}</span>
      <span className={`rounded-full ${underlineCls} ${GRADE_UNDERLINE[grade]}`} />
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
  return (
    <button type="button" onClick={onSelect} className={cardClass(selected)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-medium text-monarch-ink">{label}</span>
        <GradeMark grade={grade} />
      </div>
      <p className="mt-0.5 text-[14px] font-normal text-monarch-sub leading-tight">{data.label || DASH_LABEL[grade]}</p>
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
    <button type="button" onClick={onSelect} className={cardClass(selected)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-medium text-monarch-ink truncate">{heading}</span>
        <GradeMark grade={grade} />
      </div>
      {slide.assessment && (
        <p className="mt-0.5 text-[14px] font-normal text-monarch-sub leading-tight truncate">{slide.assessment}</p>
      )}
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div>
      <p className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[14px] text-monarch-body leading-normal">{children}</p>
    </div>
  )
}

function IssueTag({ issueType }: { issueType?: string }) {
  if (!issueType || issueType === 'None') return null
  return (
    <span className="inline-block text-[14px] font-medium text-monarch-sub bg-monarch-fill rounded-lg px-2 py-0.5">
      {issueType}
    </span>
  )
}

// --- selection ---------------------------------------------------------------

type Selected =
  | { type: 'deck_score'; key: string; label: string }
  | { type: 'slide'; index: number }
  | null

// --- component ----------------------------------------------------------------

// Deck Feedback is intentionally limited to the four deck-level
// communication/narrative dimensions. Investment Case, Priority Fixes, Investor
// Questions/Beliefs, and Context are no longer standalone dashboard cards —
// their content is incorporated into the top Deck Score assessment and the
// relevant detail panes instead.
const DIMENSIONS: Array<{ key: keyof PitchDeckCheckReportV2['deck_communication_scores']; label: string }> = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'brevity', label: 'Brevity' },
  { key: 'flow', label: 'Flow' },
]

export function V2Report({ report }: V2ReportProps) {
  const og = report.overall_grade
  const cs = report.context_summary
  const dcs = report.deck_communication_scores
  const believe = report.what_investors_may_believe || []
  const question = report.what_investors_may_question || []
  const slides = report.slide_level_feedback || []
  const deckDims = useMemo(() => DIMENSIONS.filter((d) => dcs && dcs[d.key]), [dcs])

  // Compact, secondary "Evaluated as" line built from inferred context.
  // TODO: replace inferred context display with explicit user-provided context
  // from the upload/report setup flow (stage, target raise, audience, business
  // type, deck purpose). Until then this stays secondary and is not presented as
  // user-confirmed truth.
  const evaluatedAs = useMemo<string>(() => {
    if (!cs) return ''
    return [cs.company_context, cs.target_raise, cs.intended_investor_audience]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' · ')
  }, [cs])

  // Default selection: the lowest/most concerning slide if present, else the
  // lowest deck-feedback dimension. No Priority Fixes card exists anymore.
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

  // --- desktop workspace: resizable two-pane split (>= 1280px) ---------------
  const LEFT_MIN = 600
  const RIGHT_MIN = 420
  const DIVIDER_W = 22

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
    const s = slides[selected.index]
    return s ? <SelectedSlideDetail slide={s} /> : null
  }

  const SLIDE_GRID_STYLE: React.CSSProperties = {
    display: 'grid',
    gap: '0.625rem',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  }

  const leftContent = (
    <div className="space-y-5">
      {deckDims.length > 0 && (
        <div>
          <h2 className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-2.5">Deck Feedback</h2>
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
          <h2 className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-2.5">Slide Feedback</h2>
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

  const detailPane = (
    <div className="rounded-xl border border-monarch-border bg-monarch-card p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-3">Selected</p>
      {renderDetail()}
    </div>
  )

  return (
    <div className="font-sans text-monarch-body">
      {/* Deck Score — one plain-language investor assessment */}
      <div className="flex items-start gap-4 pb-2">
        <GradeMark grade={overallGrade} size="xl" />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-0.5">
            {companyName || report.header?.report_title || 'Pitch Deck Check Report'}
          </p>
          <p className="text-[16px] md:text-[17px] font-medium text-monarch-ink leading-snug">
            {og?.concise_interpretation || 'Assessment not available.'}
          </p>

          {(believe.length > 0 || question.length > 0) && (
            <div className="mt-3 space-y-2.5">
              {believe.length > 0 && (
                <LikelyList
                  label="Investors will likely like"
                  items={believe}
                  markerClass="text-grade-a"
                />
              )}
              {question.length > 0 && (
                <LikelyList
                  label="Investors will likely question"
                  items={question}
                  markerClass="text-grade-c"
                />
              )}
            </div>
          )}

          {evaluatedAs && (
            // TODO: replace inferred context with explicit user-provided context
            // from the upload/report setup flow. Kept secondary and compact.
            <p className="mt-3 text-[14px] text-monarch-muted leading-normal">
              <span className="font-medium">Evaluated as:</span> {evaluatedAs}
            </p>
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
            {/* thin resting rule; orange only on hover/drag */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-monarch-border group-hover:bg-monarch-accent group-active:bg-monarch-accent transition-colors" />
            {/* grab handle with dots */}
            <div className="relative z-10 flex flex-col items-center gap-1 rounded-lg border border-monarch-border-strong bg-monarch-card px-1 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] group-hover:border-monarch-accent group-active:border-monarch-accent transition-colors">
              <span className="w-1 h-1 rounded-full bg-monarch-sub group-hover:bg-monarch-accent" />
              <span className="w-1 h-1 rounded-full bg-monarch-sub group-hover:bg-monarch-accent" />
              <span className="w-1 h-1 rounded-full bg-monarch-sub group-hover:bg-monarch-accent" />
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

      <p className="mt-8 text-[14px] text-monarch-muted leading-normal">
        This report evaluates the deck as presented. It does not predict fundraising success.
      </p>
    </div>
  )
}

// Two short lines under the Deck Score: what investors will likely like /
// question. Compact bulleted list, capped so the top stays scannable.
function LikelyList({ label, items, markerClass }: { label: string; items: string[]; markerClass: string }) {
  const shown = items.slice(0, 4)
  return (
    <div>
      <p className="text-[14px] font-medium text-monarch-ink">{label}:</p>
      <ul className="mt-1 space-y-1">
        {shown.map((it, idx) => (
          <li key={idx} className="flex gap-2">
            <span className={`${markerClass} flex-shrink-0`}>•</span>
            <span className="text-[14px] text-monarch-body leading-normal">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- selected-detail renderers ------------------------------------------------

// Every detail view uses the same simple structure:
// What's working / What needs help / Recommended changes.

function SelectedDeckDetail({ label, data }: { label: string; data: DeckCommunicationScoreV2 }) {
  const grade = deckScoreToGrade(data.score, data.label)
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <GradeMark grade={grade} size="lg" />
        <div>
          <p className="text-base font-semibold text-monarch-ink">{label}</p>
          <p className="text-[14px] text-monarch-sub">{data.label || DASH_LABEL[grade]}</p>
        </div>
      </div>
      <div className="space-y-3">
        <DetailRow label="What's working">{data.explanation}</DetailRow>
        <DetailRow label="What needs help">{data.primary_reason}</DetailRow>
        <DetailRow label="Recommended changes">{data.priority_improvement}</DetailRow>
      </div>
    </div>
  )
}

function SelectedSlideDetail({ slide }: { slide: SlideLevelFeedbackV2 }) {
  const grade = slideAssessmentToGrade(slide.assessment)
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <GradeMark grade={grade} size="lg" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-monarch-ink">
            {typeof slide.slide_number === 'number' ? `Slide ${slide.slide_number} · ` : ''}
            {slide.slide_title_or_section || 'Section'}
          </p>
          <p className="text-[14px] text-monarch-sub">
            {slide.assessment || DASH_LABEL[grade]}
          </p>
        </div>
        <div className="ml-auto">
          <IssueTag issueType={slide.issue_type} />
        </div>
      </div>
      <div className="space-y-3">
        <DetailRow label="What's working">{slide.what_works}</DetailRow>
        <DetailRow label="What needs help">{slide.what_is_missing}</DetailRow>
        {slide.recommended_improvement && slide.recommended_improvement !== slide.what_is_missing && (
          <DetailRow label="Recommended changes">{slide.recommended_improvement}</DetailRow>
        )}
        {slide.investor_decision && (
          <p className="text-[14px] text-monarch-muted leading-normal pt-1">
            <span className="font-medium text-monarch-sub">Investor read:</span> {slide.investor_decision}
          </p>
        )}
      </div>
    </div>
  )
}
