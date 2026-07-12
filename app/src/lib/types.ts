// Core types for Pitch Deck Check

export type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'timeout'
export type AdminView = 'upload' | 'reports' | 'calibration'

export interface UploadResult {
  deck_id: string
  access_token: string
  report_code: string
}

export interface DeckStatusResult {
  deck_id: string
  processing_status: string
  processing_error: string | null
  slide_count: number
  analyzed_slide_count: number
  report: {
    status: string
    overall_grade: string | null
  } | null
}

export interface SlideQuestion {
  question: string
  score: number
  assessment: string
  gap: string
  investor_impact: string
  fix: string
  confidence: 'high' | 'medium' | 'low'
}

export interface FullReportSlide {
  slide_number: number
  type: string
  grade: string
  normalized_score: number
  weighted_score?: number
  max_score?: number
  questions: SlideQuestion[]
}

export interface ThesisElement {
  question: string
  score: number
  assessment: string
  gaps: string
  verdict: string
}

export interface InvestmentThesis {
  why_this_market: ThesisElement
  why_this_product: ThesisElement
  why_this_team: ThesisElement
  why_now: ThesisElement
}

// V3 Debug output structure
export interface V3DebugOutput {
  generated_at?: string
  architecture?: Record<string, unknown>
  deck_context?: Record<string, unknown>
  rule_injection?: Record<string, unknown>
  prompts?: Record<string, unknown>
  scoring?: Record<string, unknown>
  signal_override?: Record<string, unknown>
  slide_evaluations?: Array<Record<string, unknown>>
  thesis_evaluation?: Record<string, unknown>
}

// V1 Founder-Facing Report Types
export interface V1QualityDimension {
  grade: string
  diagnostic: string
  description: string
}

export interface V1QualityDimensions {
  clarity: V1QualityDimension
  brevity: V1QualityDimension
  flow: V1QualityDimension
  completeness: V1QualityDimension
}

export interface V1Strength {
  strength: string
  slide_type: string
}

export interface V1Improvement {
  improvement: string
  context: string
  slide_type: string
}

export interface V1InvestorQuestion {
  question: string
  status: 'Strong' | 'Partial' | 'Weak'
  explanation: string
  unresolved_question: string | null
}

export interface V1NarrativeSequence {
  slides: string
  description: string
  investor_reaction: string
}

export interface V1NarrativeFlow {
  strongest_sequence: V1NarrativeSequence
  weakest_sequence: V1NarrativeSequence
}

export interface V1SlideSummary {
  slide_number: number
  type: string
  grade: string
  key_takeaway: string
}

export interface V1SlideDetail {
  slide_number: number
  type: string
  grade: string
  investor_insight: string
  missing_investor_proof: string | null
  // Legacy fields for backwards compatibility
  what_works?: string
  biggest_gap?: string
  highest_impact_improvement?: string
}

export interface V1Report {
  report_version: string
  overall: {
    grade: string
    score: number
    investor_readout: string
    positioning_note: string
    // Legacy field for backwards compatibility
    synthesis?: string
  }
  // New investor reasoning sections
  what_investors_believe: string[]
  what_still_feels_unproven: string[]
  investor_questions: V1InvestorQuestion[]
  quality_dimensions: V1QualityDimensions
  slides: V1SlideDetail[]
  // Legacy fields for backwards compatibility
  top_strengths?: V1Strength[]
  top_improvements?: V1Improvement[]
  narrative_flow?: V1NarrativeFlow
  slide_summary?: V1SlideSummary[]
}

// ---------------------------------------------------------------------------
// V2 report types (Pitch Deck Check product-owned model)
//
// These describe the NEW founder-facing report shape defined by the
// product-owned artifacts (scoring-rubric.md, report-spec.md,
// sample-report-format.md). They are ADDITIVE and PREPARATORY only:
//   - No generator emits this shape yet.
//   - No component renders it yet.
//   - No API returns it yet.
// They exist so Phase 3 generation and Phase 4 rendering have a stable target.
// The V1 types above are unchanged; both shapes must coexist.
// ---------------------------------------------------------------------------

// Company Context stages (company-context.md). 'Unknown' is used when the stage
// cannot be confidently classified.
export type CompanyContextV2 =
  | 'Idea / Pre-Product'
  | 'Product / Pre-Revenue'
  | 'Early Revenue'
  | 'Growth'
  | 'Unknown'

export type ContextConfidenceV2 = 'High' | 'Medium' | 'Low'

// The four Deck Communication Scores are graded on 1–5 internal bands.
export type DeckCommunicationDimensionV2 =
  | 'Completeness'
  | 'Clarity'
  | 'Brevity'
  | 'Flow'

export type DeckCommunicationScoreValueV2 = 1 | 2 | 3 | 4 | 5

export type DeckCommunicationLabelV2 =
  | 'Very Weak' // 1
  | 'Weak' // 2
  | 'Adequate' // 3
  | 'Strong' // 4
  | 'Excellent' // 5

export interface DeckCommunicationScoreV2 {
  score: DeckCommunicationScoreValueV2
  label: DeckCommunicationLabelV2
  explanation: string
  primary_reason: string
  priority_improvement: string
}

// Keyed by dimension; lowercase keys mirror the existing V1QualityDimensions.
export interface DeckCommunicationScoresV2 {
  completeness: DeckCommunicationScoreV2
  clarity: DeckCommunicationScoreV2
  brevity: DeckCommunicationScoreV2
  flow: DeckCommunicationScoreV2
}

// Investment Case as Presented — qualitative assessment, NOT 1–5 peer scores.
export type InvestmentCaseAreaV2 =
  | 'Opportunity Strength'
  | 'Execution Credibility'
  | 'Investor Fit'

export type InvestmentCaseLabelV2 =
  | 'Strong'
  | 'Promising but Under-Supported'
  | 'Mixed'
  | 'Weak'
  | 'Not Enough Information'

export interface InvestmentCaseAssessmentV2 {
  label: InvestmentCaseLabelV2
  interpretation: string
}

export interface InvestmentCaseV2 {
  opportunity_strength: InvestmentCaseAssessmentV2
  execution_credibility: InvestmentCaseAssessmentV2
  investor_fit: InvestmentCaseAssessmentV2
  // Market Validation is EVIDENCE that supports/weakens the areas above, never
  // a separate score. Optional free-text narrative.
  market_validation?: string
}

// Overall Grade letter set (scoring-rubric.md letter-grade cut points).
// Intentionally distinct from the existing `GRADES` const (current A–E scale),
// which is left unchanged.
export type OverallGradeLetterV2 =
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'C-'
  | 'D'
  | 'F'

export interface OverallGradeV2 {
  letter: OverallGradeLetterV2
  concise_interpretation: string
  primary_constraint: string
  what_this_means: string
}

export interface ReportHeaderV2 {
  report_title?: string
  company_name?: string
  deck_filename?: string
  generated_at?: string
  positioning_statement?: string
}

export interface ContextSummaryV2 {
  company_context: CompanyContextV2
  context_confidence?: ContextConfidenceV2
  intended_investor_audience?: string
  target_raise?: string
  evaluation_note?: string
}

// Canonical issue types are Communication, Evidence, Substance, and Investor
// Fit; samples also use compound tags (e.g. 'Evidence / Market Validation'), so
// this is a free string rather than a closed union.
export type IssueTypeV2 = string

export interface PriorityImprovementV2 {
  title: string
  why_it_matters: string
  what_to_add_or_change: string
  issue_type: IssueTypeV2
}

export interface SlideLevelFeedbackV2 {
  slide_number?: number
  slide_title_or_section: string
  investor_decision: string
  assessment: string
  what_works: string
  what_is_missing: string
  recommended_improvement: string
  issue_type: IssueTypeV2
}

export interface SuggestedNextStepV2 {
  title: string
  detail?: string
}

export interface SaveShareUpgradeV2 {
  intro?: string
  options: string[]
}

// Primary Diagnosis — the single most important constraint on investor
// readiness. issue_type is one of the canonical issue types (Communication /
// Evidence / Substance / Investor Fit), with 'None' when no constraint binds.
export interface PrimaryDiagnosisV2 {
  summary: string
  issue_type: IssueTypeV2
}

// --- dashboard_feedback: dashboard-native content generated by canonical
// report generation. The frontend renders these fields directly (see V2Report).

export interface DashboardEvaluatedContextV2 {
  stage: string
  audience: string
  target_raise: string
  deck_purpose: string
  business_type: string
  confidence: string
  note: string
}

export interface DashboardDeckScoreV2 {
  grade: string
  title: string
  summary: string
  investors_will_like: string[]
  investors_will_question: string[]
  what_could_make_investors_pass: string[]
  highest_leverage_revision_focus: string
  evaluated_context: DashboardEvaluatedContextV2
}

export interface DashboardDeckDimensionV2 {
  grade: string
  assessment: string
  what_works: string
  what_needs_help: string
  recommended_changes: string[]
}

export interface DashboardFlowDimensionV2 extends DashboardDeckDimensionV2 {
  sequencing_notes: string[]
  redundancy_or_repetition: string[]
  misplaced_or_scattered_evidence: string[]
  suggested_moves_or_cuts: string[]
}

export interface DashboardDeckFeedbackV2 {
  completeness: DashboardDeckDimensionV2
  clarity: DashboardDeckDimensionV2
  brevity: DashboardDeckDimensionV2
  flow: DashboardFlowDimensionV2
}

export interface DashboardSlideFeedbackV2 {
  slide_number: number
  title: string
  grade: string
  assessment: string
  investor_decision: string
  what_works: string
  what_needs_help: string
  recommended_changes: string[]
  evidence_found: string[]
  evidence_missing: string[]
  related_deck_issue: string
  // Additive investor-topic fields (present on topic-first reports).
  topic_key?: string
  source_slides?: number[]
  source_label?: string
  evidence_status?: string
  evidence_found_in?: string[]
  actual_position?: number | null
  recommended_position?: number
}

export interface DashboardFeedbackV2 {
  deck_score: DashboardDeckScoreV2
  deck_feedback: DashboardDeckFeedbackV2
  slide_feedback: DashboardSlideFeedbackV2[]
}

// Top-level V2 report content shape.
export interface PitchDeckCheckReportV2 {
  report_version: string
  header: ReportHeaderV2
  context_summary: ContextSummaryV2
  overall_grade: OverallGradeV2
  deck_communication_scores: DeckCommunicationScoresV2
  investment_case: InvestmentCaseV2
  primary_diagnosis: PrimaryDiagnosisV2
  what_investors_may_believe: string[]
  what_investors_may_question: string[]
  priority_improvements: PriorityImprovementV2[]
  slide_level_feedback: SlideLevelFeedbackV2[]
  suggested_next_steps: SuggestedNextStepV2[]
  save_share_upgrade?: SaveShareUpgradeV2
  dashboard_feedback?: DashboardFeedbackV2
}

// Alias so either name may be used by downstream code.
export type ReportContentV2 = PitchDeckCheckReportV2

// Legacy report types (for backwards compatibility)
export interface ReportStrength {
  title?: string
  detail?: string
  question?: string
  score?: number
  assessment?: string
  slide_type?: string
}

export interface ReportIssue {
  title?: string
  detail?: string
  priority?: 'high' | 'medium' | 'low'
  question?: string
  score?: number
  assessment?: string
  gap?: string
  slide_type?: string
}

export interface ReportSlideNote {
  slide_number: number
  inferred_type: string
  grade: string
  note?: string
  normalized_score?: number
}

export interface ReportContent {
  // Common fields
  overall_grade: string
  summary: string
  deck_score?: number
  report_version?: string
  rubric_version?: string

  // Investment thesis (deck-level)
  investment_thesis?: InvestmentThesis

  // Full report format
  slides?: FullReportSlide[]

  // Free report format (legacy)
  strengths?: ReportStrength[]
  biggest_issues?: ReportIssue[]
  slide_notes?: ReportSlideNote[]
  upgrade_teaser?: {
    title: string
    bullets: string[]
  }

  // V1 founder-facing report
  v1_report?: V1Report

  // V2 founder-facing report (additive, not yet generated or rendered).
  // Mirrors the v1_report nesting pattern so a V2 report can travel in the same
  // content blob during migration without disturbing existing fields.
  report_v2?: ReportContentV2

  // V3 debug output (admin only)
  debug?: V3DebugOutput
}

// Compatibility union for code that may later receive either the current
// content shape or a top-level V2 report. NEW name — does not replace or
// redefine `ReportContent`, so existing imports and field access stay valid.
export type AnyReportContent = ReportContent | ReportContentV2

export interface SlideData {
  slide_number: number
  image_path: string | null
  image_url: string | null
  inferred_type: string
}

export interface GetReportResult {
  deck_id: string
  report_code?: string
  report_type: string
  status: string
  overall_grade?: string
  report_created_at?: string
  content?: ReportContent
  generation_error?: string
  slides?: SlideData[]
}

export interface DeleteResult {
  ok: boolean
  deck_id?: string
  deleted?: {
    deck_pdfs: number
    slide_images: number
    db_rows: {
      slides: number
      reports: number
      payments: number
      events: number
      decks: number
    }
  }
  error?: string
}

export interface ReportListItem {
  id: string
  deck_id: string
  report_type: string
  status: string
  overall_grade: string | null
  report_created_at: string
  deck_created_at: string | null
  email: string | null
  original_filename: string | null
  slide_count: number | null
  access_token: string | null
}

// Calibration deck types (admin only)
export interface CalibrationDeck {
  id: string
  company: string
  archetype: string
  era: string | null
  stage: string
  year: number | null
  deck_file: string | null
  expected_grade_range: string[] | null
  strengths: string[]
  known_weaknesses: string[]
  must_not_happen: string[]
  notes: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface CalibrationFormData {
  id: string
  company: string
  archetype: string
  stage: string
  era: string
  year: number
  expected_grade_min: string
  expected_grade_max: string
  strengths: string
  known_weaknesses: string
  must_not_happen: string
  notes: string
  active: boolean
}

// Constants
export const ARCHETYPES = [
  { value: 'consumer_network', label: 'Consumer Network' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'local_marketplace', label: 'Local Marketplace' },
  { value: 'saas', label: 'SaaS' },
  { value: 'developer_tools', label: 'Developer Tools' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'ai_application', label: 'AI Application' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'biotech', label: 'Biotech' },
  { value: 'hardtech', label: 'Hardtech' },
  { value: 'enterprise_ai', label: 'Enterprise AI' },
  { value: 'consumer_ai', label: 'Consumer AI' },
] as const

export const STAGES = [
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
] as const

export const ERAS = [
  { value: 'sparse_classic', label: 'Sparse Classic (pre-2015)' },
  { value: 'modern', label: 'Modern (2015+)' },
] as const

export const GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'] as const

export const DIMENSION_DEFINITIONS = {
  clarity: 'Does the investor understand what this company does and why it matters within 30 seconds?',
  brevity: 'Does the deck move efficiently with strong information density, or does it drag?',
  flow: 'Does conviction build naturally through the narrative, or does momentum reset?',
  completeness: 'Does the deck answer the key investor questions needed at this stage?',
} as const

export type DimensionKey = keyof typeof DIMENSION_DEFINITIONS
