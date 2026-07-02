import type {
  PitchDeckCheckReportV2,
  DeckCommunicationScoreV2,
  InvestmentCaseAssessmentV2,
} from '../../lib/types'

// V2 report renderer. Reads only the whitelisted report_v2 fields; it never
// surfaces gate terminology, debug data, or raw *.signals. Every section
// tolerates missing/partial data and simply omits what is absent.

interface V2ReportProps {
  report: PitchDeckCheckReportV2
}

// --- small presentation helpers ----------------------------------------------

function gradeColorClass(letter?: string): string {
  const g = (letter || '').toUpperCase()
  if (g.startsWith('A')) return 'text-green-600'
  if (g.startsWith('B')) return 'text-green-600'
  if (g === 'C+' || g === 'C') return 'text-amber-600'
  if (g === 'C-' || g === 'D') return 'text-red-600'
  return 'text-red-600' // F / anything else
}

function labelColorClass(label?: string): string {
  switch (label) {
    case 'Strong':
      return 'text-green-600'
    case 'Promising but Under-Supported':
      return 'text-amber-600'
    case 'Mixed':
      return 'text-amber-600'
    case 'Weak':
      return 'text-red-600'
    default:
      return 'text-gray-500' // Not Enough Information / unknown
  }
}

function bandColorClass(score?: number): string {
  if (typeof score !== 'number') return 'text-gray-500'
  if (score >= 4) return 'text-green-600'
  if (score === 3) return 'text-amber-600'
  return 'text-red-600'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
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

const DIMENSION_ORDER: Array<{ key: keyof PitchDeckCheckReportV2['deck_communication_scores']; label: string }> = [
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

// --- component ----------------------------------------------------------------

export function V2Report({ report }: V2ReportProps) {
  const og = report.overall_grade
  const cs = report.context_summary
  const dcs = report.deck_communication_scores
  const ic = report.investment_case
  const pd = report.primary_diagnosis
  const believe = report.what_investors_may_believe || []
  const question = report.what_investors_may_question || []
  const priorities = report.priority_improvements || []
  const slideFeedback = report.slide_level_feedback || []
  const nextSteps = report.suggested_next_steps || []
  const save = report.save_share_upgrade

  return (
    <div>
      {/* Header / Overall Grade (combined) */}
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          {report.header?.report_title || 'Pitch Deck Check Report'}
        </p>
        {og && (
          <>
            <div className="flex items-baseline gap-3 mb-3">
              <span className={`text-5xl font-semibold ${gradeColorClass(og.letter)}`}>
                {og.letter || '—'}
              </span>
            </div>
            {og.concise_interpretation && (
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {og.concise_interpretation}
              </p>
            )}
            {og.primary_constraint && og.primary_constraint !== 'None' && (
              <p className="text-sm text-gray-600 leading-relaxed">
                <span className="font-medium text-gray-900">Primary constraint:</span>{' '}
                {og.primary_constraint}
              </p>
            )}
            {og.what_this_means && (
              <p className="text-sm text-gray-600 leading-relaxed mt-1">{og.what_this_means}</p>
            )}
          </>
        )}
        <p className="mt-4 text-xs text-gray-400 leading-relaxed">
          This report evaluates the deck as presented. It does not predict fundraising success.
        </p>
      </div>

      {/* Context Summary */}
      {cs && (
        <Section title="Context Summary">
          <div className="space-y-1 text-sm text-gray-700">
            {cs.company_context && (
              <p>
                <span className="font-medium text-gray-900">Detected stage:</span>{' '}
                {cs.company_context}
                {cs.context_confidence ? ` (${cs.context_confidence} confidence)` : ''}
              </p>
            )}
            {cs.intended_investor_audience && (
              <p>
                <span className="font-medium text-gray-900">Investor audience:</span>{' '}
                {cs.intended_investor_audience}
              </p>
            )}
            {cs.target_raise && (
              <p>
                <span className="font-medium text-gray-900">Target raise:</span> {cs.target_raise}
              </p>
            )}
            {cs.evaluation_note && (
              <p className="text-gray-600 leading-relaxed pt-1">{cs.evaluation_note}</p>
            )}
          </div>
        </Section>
      )}

      {/* Deck Communication Scores */}
      {dcs && (
        <Section title="Deck Communication Scores">
          <div className="space-y-4">
            {DIMENSION_ORDER.map(({ key, label }) => {
              const d: DeckCommunicationScoreV2 | undefined = dcs[key]
              if (!d) return null
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{label}:</span>
                    <span className={`text-sm font-medium ${bandColorClass(d.score)}`}>
                      {typeof d.score === 'number' ? `${d.score}/5` : '—'}
                      {d.label ? ` — ${d.label}` : ''}
                    </span>
                  </div>
                  {d.explanation && (
                    <p className="text-sm text-gray-600 leading-relaxed">{d.explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Investment Case as Presented */}
      {ic && (
        <Section title="Investment Case as Presented">
          <div className="space-y-4">
            {INVESTMENT_AREAS.map(({ key, label }) => {
              const a = ic[key] as InvestmentCaseAssessmentV2 | undefined
              if (!a) return null
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{label}:</span>
                    <span className={`text-sm font-medium ${labelColorClass(a.label)}`}>
                      {a.label || 'Not Enough Information'}
                    </span>
                  </div>
                  {a.interpretation && (
                    <p className="text-sm text-gray-600 leading-relaxed">{a.interpretation}</p>
                  )}
                </div>
              )
            })}
            {typeof ic.market_validation === 'string' && ic.market_validation && (
              <div>
                <span className="text-sm font-medium text-gray-900">Market Validation:</span>
                <p className="text-sm text-gray-600 leading-relaxed">{ic.market_validation}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Primary Diagnosis */}
      {pd && (pd.summary || pd.issue_type) && (
        <Section title="Primary Diagnosis">
          {pd.summary && (
            <p className="text-sm text-gray-700 leading-relaxed mb-2">{pd.summary}</p>
          )}
          <IssueTag issueType={pd.issue_type} />
        </Section>
      )}

      {/* What Investors May Believe */}
      {believe.length > 0 && (
        <Section title="What Investors May Believe">
          <ul className="space-y-3">
            {believe.map((b, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-green-500 flex-shrink-0">+</span>
                <span className="text-sm text-gray-700 leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* What Investors May Question */}
      {question.length > 0 && (
        <Section title="What Investors May Question">
          <ul className="space-y-3">
            {question.map((q, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-amber-500 flex-shrink-0">?</span>
                <span className="text-sm text-gray-700 leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Priority Improvements */}
      {priorities.length > 0 && (
        <Section title="Priority Improvements">
          <div className="space-y-4">
            {priorities.map((p, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {idx + 1}. {p.title}
                  </span>
                  <IssueTag issueType={p.issue_type} />
                </div>
                {p.why_it_matters && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-medium text-gray-700">Why it matters:</span>{' '}
                    {p.why_it_matters}
                  </p>
                )}
                {p.what_to_add_or_change && (
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">
                    <span className="font-medium text-gray-700">What to add:</span>{' '}
                    {p.what_to_add_or_change}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Slide-Level Feedback */}
      {slideFeedback.length > 0 && (
        <Section title="Slide-Level Feedback">
          <div className="space-y-4">
            {slideFeedback.map((s, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {typeof s.slide_number === 'number' ? `${s.slide_number}. ` : ''}
                    {s.slide_title_or_section || 'Section'}
                  </span>
                  <div className="flex items-center gap-2">
                    {s.assessment && (
                      <span className="text-xs text-gray-500">{s.assessment}</span>
                    )}
                    <IssueTag issueType={s.issue_type} />
                  </div>
                </div>
                {s.investor_decision && (
                  <p className="text-xs text-gray-400 italic leading-relaxed mb-2">
                    {s.investor_decision}
                  </p>
                )}
                {s.what_works && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <span className="font-medium text-gray-700">What works:</span> {s.what_works}
                  </p>
                )}
                {s.what_is_missing && (
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">
                    <span className="font-medium text-gray-700">What is missing:</span>{' '}
                    {s.what_is_missing}
                  </p>
                )}
                {s.recommended_improvement &&
                  s.recommended_improvement !== s.what_is_missing && (
                    <p className="text-sm text-gray-600 leading-relaxed mt-1">
                      <span className="font-medium text-gray-700">Recommended:</span>{' '}
                      {s.recommended_improvement}
                    </p>
                  )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Suggested Next Steps */}
      {nextSteps.length > 0 && (
        <Section title="Suggested Next Steps">
          <ol className="space-y-3">
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

      {/* Save / Share / Upgrade (bullets only; no actions wired yet) */}
      {save && (save.intro || (save.options && save.options.length > 0)) && (
        <Section title="Save or Improve This Report">
          {save.intro && (
            <p className="text-sm text-gray-700 leading-relaxed mb-3">{save.intro}</p>
          )}
          {save.options && save.options.length > 0 && (
            <ul className="space-y-2">
              {save.options.map((opt, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  <span className="text-sm text-gray-600 leading-relaxed">{opt}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  )
}
