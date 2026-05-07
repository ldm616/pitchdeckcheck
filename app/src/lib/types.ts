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
  what_works: string
  biggest_gap: string
  highest_impact_improvement: string
}

export interface V1Report {
  report_version: string
  overall: {
    grade: string
    score: number
    synthesis: string
    positioning_note: string
  }
  quality_dimensions: V1QualityDimensions
  top_strengths: V1Strength[]
  investor_questions: V1InvestorQuestion[]
  top_improvements?: V1Improvement[] // deprecated, kept for backwards compatibility
  narrative_flow: V1NarrativeFlow
  slide_summary: V1SlideSummary[]
  slides: V1SlideDetail[]
}

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

  // V3 debug output (admin only)
  debug?: V3DebugOutput
}

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
