import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PitchDeckCheckReportV2,
  DeckCommunicationScoreV2,
  SlideLevelFeedbackV2,
} from '../../lib/types'

// V2 report renderer — dashboard-first layout with a simple three-level
// hierarchy. The left/dashboard side is scannable navigation only; ALL detailed
// reading happens in the right-side detail pane:
//   1. Deck Score      (one selectable summary card, selected by default)
//   2. Deck Feedback   (4 selectable dimension cards)
//   3. Slide Feedback  (one selectable card per slide/topic)
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
// style), not a pill. Sizes: md (cards), lg (detail).
function GradeMark({ grade, size = 'md' }: { grade: Grade; size?: 'md' | 'lg' }) {
  const letter = grade === 'neutral' ? '–' : grade
  const textCls = size === 'lg' ? 'text-2xl' : 'text-[15px]'
  const underlineCls = size === 'lg' ? 'mt-0.5 h-0.5 w-7' : 'mt-0.5 h-0.5 w-6'
  return (
    <span className="inline-flex flex-col items-center leading-none shrink-0">
      <span className={`${textCls} font-semibold text-monarch-ink`}>{letter}</span>
      <span className={`rounded-full ${underlineCls} ${GRADE_UNDERLINE[grade]}`} />
    </span>
  )
}

// Compact selectable card shared shape: title + grade on one row, one short
// status line below. No detailed text.
function TriageCard({
  title,
  status,
  grade,
  selected,
  onSelect,
}: {
  title: string
  status?: string
  grade: Grade
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className={cardClass(selected)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-medium text-monarch-ink truncate">{title}</span>
        <GradeMark grade={grade} />
      </div>
      {status && (
        <p className="mt-0.5 text-[14px] font-normal text-monarch-sub leading-tight truncate">{status}</p>
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

// Bulleted list used only inside the detail pane (Deck Score detail).
function LikelyList({ label, items, markerClass }: { label: string; items: string[]; markerClass: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-1">{label}</p>
      <ul className="space-y-1">
        {items.map((it, idx) => (
          <li key={idx} className="flex gap-2">
            <span className={`${markerClass} flex-shrink-0`}>•</span>
            <span className="text-[14px] text-monarch-body leading-normal">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- selection ---------------------------------------------------------------

type Selected =
  | { type: 'deck_summary' }
  | { type: 'deck_score'; key: string; label: string }
  | { type: 'slide'; index: number }
  | null

// --- component ----------------------------------------------------------------

// Deck Feedback is intentionally limited to the four deck-level
// communication/narrative dimensions. Investment Case, Priority Fixes, Investor
// Questions/Beliefs, and Context are no longer standalone dashboard cards —
// their content is folded into the Deck Score detail pane or omitted for now.
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

  const overallGrade = overallLetterToGrade(og?.letter)
  const companyName = report.header?.company_name
  const summaryLine = og?.concise_interpretation || 'Assessment not available.'

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

  // Deck Score is selected by default; the detail pane opens on the overall
  // assessment.
  const [selected, setSelected] = useState<Selected>({ type: 'deck_summary' })
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

  // Applied (clamped) left-pane width. Falls back to 50% before measured.
  const maxLeft = Math.max(LEFT_MIN, containerW - RIGHT_MIN - DIVIDER_W)
  const appliedLeft =
    containerW === 0
      ? null
      : leftWidth != null
      ? Math.min(Math.max(leftWidth, LEFT_MIN), maxLeft)
      : Math.round(containerW * 0.5)

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

  const renderDetail = () => {
    if (!selected) return null
    if (selected.type === 'deck_summary') {
      return (
        <SelectedDeckSummaryDetail
          overallGrade={overallGrade}
          companyName={companyName}
          whatThisMeans={og?.what_this_means}
          primaryDiagnosis={report.primary_diagnosis?.summary}
          believe={believe}
          question={question}
          evaluatedAs={evaluatedAs}
          evaluationNote={cs?.evaluation_note}
        />
      )
    }
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
      {/* Deck Score — one compact selectable summary card */}
      <div>
        <h2 className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-2.5">Deck Score</h2>
        <TriageCard
          title={companyName || 'Overall Deck Score'}
          status={summaryLine}
          grade={overallGrade}
          selected={selected?.type === 'deck_summary'}
          onSelect={() => select({ type: 'deck_summary' })}
        />
      </div>

      {deckDims.length > 0 && (
        <div>
          <h2 className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-2.5">Deck Feedback</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {deckDims.map(({ key, label }) => {
              const d = dcs[key]!
              return (
                <TriageCard
                  key={key}
                  title={label}
                  status={d.label || DASH_LABEL[deckScoreToGrade(d.score, d.label)]}
                  grade={deckScoreToGrade(d.score, d.label)}
                  selected={selected?.type === 'deck_score' && selected.key === key}
                  onSelect={() => select({ type: 'deck_score', key: key as string, label })}
                />
              )
            })}
          </div>
        </div>
      )}

      {slides.length > 0 && (
        <div>
          <h2 className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-2.5">Slide Feedback</h2>
          <div style={SLIDE_GRID_STYLE}>
            {slides.map((s, i) => {
              const title = s.slide_title_or_section || 'Section'
              const heading = typeof s.slide_number === 'number' ? `${s.slide_number}: ${title}` : title
              return (
                <TriageCard
                  key={i}
                  title={heading}
                  status={s.assessment}
                  grade={slideAssessmentToGrade(s.assessment)}
                  selected={selected?.type === 'slide' && selected.index === i}
                  onSelect={() => select({ type: 'slide', index: i })}
                />
              )
            })}
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
      {isDesktop ? (
        /* Desktop workspace: resizable two-pane split */
        <div ref={containerRef} className="flex items-stretch">
          <div
            className="min-w-0 shrink-0"
            style={{ width: appliedLeft != null ? `${appliedLeft}px` : '50%' }}
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
        <div className="space-y-5">
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

// --- selected-detail renderers ------------------------------------------------

// Report content is generated by the backend/canonical report. These components
// render canonical fields directly and must avoid deriving, splitting, or
// rewriting substantive feedback. The frontend may choose which fields to show,
// truncate previews, and format labels/grades — nothing more.

function SelectedDeckSummaryDetail({
  overallGrade,
  companyName,
  whatThisMeans,
  primaryDiagnosis,
  believe,
  question,
  evaluatedAs,
  evaluationNote,
}: {
  overallGrade: Grade
  companyName?: string
  whatThisMeans?: string
  primaryDiagnosis?: string
  believe: string[]
  question: string[]
  evaluatedAs: string
  evaluationNote?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <GradeMark grade={overallGrade} size="lg" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-monarch-ink">{companyName || 'Overall Deck Score'}</p>
          <p className="text-[14px] text-monarch-sub">Overall assessment</p>
        </div>
      </div>
      {/* overall_grade.what_this_means — rendered verbatim. */}
      {whatThisMeans && <p className="text-[15px] text-monarch-body leading-normal mb-4">{whatThisMeans}</p>}
      {/* primary_diagnosis.summary — rendered verbatim when a constraint binds. */}
      {primaryDiagnosis && primaryDiagnosis.trim() && primaryDiagnosis.trim() !== 'None' && (
        <div className="mb-4">
          <p className="text-[14px] font-medium text-monarch-sub uppercase tracking-wide mb-1">Primary diagnosis</p>
          <p className="text-[14px] text-monarch-body leading-normal">{primaryDiagnosis}</p>
        </div>
      )}
      {/* what_investors_may_believe[] / what_investors_may_question[] — items
          rendered verbatim, never summarized or rewritten. */}
      <div className="space-y-4">
        <LikelyList label="What investors may believe" items={believe} markerClass="text-grade-a" />
        <LikelyList label="What investors may question" items={question} markerClass="text-grade-c" />
      </div>
      {(evaluatedAs || evaluationNote) && (
        // context_summary fields, shown as a secondary line. Concatenation is
        // display formatting only; field text is not reworded.
        // TODO: replace inferred context display with explicit user-provided
        // context from the upload/report setup flow (stage, target raise,
        // audience, business type, deck purpose).
        <div className="mt-4 space-y-1">
          {evaluatedAs && (
            <p className="text-[14px] text-monarch-muted leading-normal">
              <span className="font-medium">Evaluated as:</span> {evaluatedAs}
            </p>
          )}
          {evaluationNote && <p className="text-[14px] text-monarch-muted leading-normal">{evaluationNote}</p>}
        </div>
      )}
    </div>
  )
}

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
      {/*
        Render the actual canonical deck-communication fields. Do NOT relabel
        them as What's working / What needs help / Recommended changes — the
        canonical report does not provide those semantic buckets for deck-level
        feedback, and forcing them here rewrites/misassigns substance.
        TODO: have the canonical report emit explicit deck-level what_works /
        what_needs_help / recommended_changes fields so the frontend can render
        them without deriving.
      */}
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
  // Canonical fields rendered verbatim. `missing`/`recommended` are only aliased
  // for the duplicate-hiding check below — never reworded.
  const missing = slide.what_is_missing
  const recommended = slide.recommended_improvement
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
        <DetailRow label="What needs help">{missing}</DetailRow>
        {recommended && recommended !== missing && (
          <DetailRow label="Recommended changes">{recommended}</DetailRow>
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
