-- ============================================================================
-- Pitch Deck Check v1 Schema
-- ============================================================================
--
-- This schema supports:
-- - PDF upload and storage
-- - Slide extraction
-- - Free and paid report generation
-- - Stripe payment tracking
-- - Magic link access (no user accounts required)
--
-- Access Pattern:
-- - Frontend NEVER accesses Supabase directly
-- - All access via Netlify Functions using service role key
-- - RLS is enabled as defense-in-depth
--
-- Run this in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS where possible).
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- pgcrypto provides gen_random_uuid() - usually enabled by default in Supabase
-- but we ensure it exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================
-- Using CHECK constraints instead of CREATE TYPE for easier re-runnability
-- and simpler migrations. Values are validated at the column level.


-- ============================================================================
-- HELPER FUNCTION: updated_at trigger
-- ============================================================================

-- Automatically update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_updated_at() IS
  'Trigger function to automatically update updated_at column on row changes.';


-- ============================================================================
-- TABLE: decks
-- ============================================================================
-- Core table storing uploaded pitch decks.
-- Each deck has a unique access_token for magic link access.
-- No user account required - email is stored for notifications only.

CREATE TABLE IF NOT EXISTS public.decks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (no account required)
  email TEXT NOT NULL,

  -- Magic link token - used for secure report access without login
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- File information
  file_path TEXT NOT NULL,                    -- Path in deck-pdfs bucket
  original_filename TEXT NOT NULL,            -- Original uploaded filename
  file_size_bytes INTEGER,                    -- File size for validation

  -- Extraction results
  slide_count INTEGER,                        -- Populated after extraction

  -- Processing state
  processing_status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (processing_status IN (
      'uploaded',        -- PDF received, not yet processed
      'extracting',      -- Slide extraction in progress
      'extracted',       -- Slides ready, awaiting report generation
      'generating_free', -- Free report being generated
      'ready',           -- Free report available
      'failed'           -- Processing failed (see processing_error)
    )),
  processing_error TEXT,                      -- Error message if status = 'failed'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.decks IS
  'Core table for uploaded pitch decks. One row per upload.';
COMMENT ON COLUMN public.decks.access_token IS
  'Magic link token for secure report access. Include in report URLs.';
COMMENT ON COLUMN public.decks.processing_status IS
  'Current processing state: uploaded → extracting → extracted → generating_free → ready (or failed).';

-- Indexes for decks
CREATE INDEX IF NOT EXISTS decks_access_token_idx ON public.decks(access_token);
CREATE INDEX IF NOT EXISTS decks_email_idx ON public.decks(email);
CREATE INDEX IF NOT EXISTS decks_created_at_idx ON public.decks(created_at);
CREATE INDEX IF NOT EXISTS decks_processing_status_idx ON public.decks(processing_status);

-- Updated_at trigger for decks
DROP TRIGGER IF EXISTS decks_updated_at ON public.decks;
CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- TABLE: slides
-- ============================================================================
-- Extracted slide data. One row per slide in a deck.
-- Stores image path and extracted text for AI analysis.

CREATE TABLE IF NOT EXISTS public.slides (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent deck reference
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,

  -- Slide position (1-indexed)
  slide_number INTEGER NOT NULL CHECK (slide_number > 0),

  -- Extracted content
  image_path TEXT NOT NULL,                   -- Path in slide-images bucket
  extracted_text TEXT,                        -- OCR/extracted text content

  -- AI-inferred slide type (cover, problem, solution, etc.)
  inferred_type TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique slide numbers per deck
  UNIQUE(deck_id, slide_number)
);

COMMENT ON TABLE public.slides IS
  'Extracted slide data from pitch decks. One row per slide.';
COMMENT ON COLUMN public.slides.inferred_type IS
  'AI-detected slide type: cover, problem, solution, product, market, traction, team, etc.';

-- Indexes for slides
CREATE INDEX IF NOT EXISTS slides_deck_id_idx ON public.slides(deck_id);


-- ============================================================================
-- TABLE: reports
-- ============================================================================
-- Generated reports (free diagnostic or paid fix plan).
-- Maximum one free report and one paid report per deck.

CREATE TABLE IF NOT EXISTS public.reports (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent deck reference
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,

  -- Report type
  report_type TEXT NOT NULL
    CHECK (report_type IN ('free', 'paid')),

  -- Generation state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',     -- Queued for generation
      'generating',  -- AI generation in progress
      'ready',       -- Report available
      'failed'       -- Generation failed (see generation_error)
    )),

  -- Report content
  overall_grade TEXT,                         -- Letter grade (A+, A, A-, B+, etc.)
  content JSONB,                              -- Full report content as JSON
  generation_error TEXT,                      -- Error message if status = 'failed'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure only one report per type per deck
  UNIQUE(deck_id, report_type)
);

COMMENT ON TABLE public.reports IS
  'Generated reports. Maximum one free and one paid report per deck.';
COMMENT ON COLUMN public.reports.report_type IS
  'Report type: free (diagnostic only) or paid (full fix plan).';
COMMENT ON COLUMN public.reports.content IS
  'Full report content as JSONB. Structure varies by report_type.';

-- Indexes for reports
CREATE INDEX IF NOT EXISTS reports_deck_id_idx ON public.reports(deck_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports(status);

-- Updated_at trigger for reports
DROP TRIGGER IF EXISTS reports_updated_at ON public.reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- TABLE: payments
-- ============================================================================
-- Stripe payment records. One row per checkout attempt.
-- A deck has paid access if it has a payment with status = 'completed'.

CREATE TABLE IF NOT EXISTS public.payments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Associated deck
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,

  -- Payer info (may differ from deck email)
  email TEXT NOT NULL,

  -- Stripe identifiers
  stripe_checkout_session_id TEXT UNIQUE,     -- Stripe checkout session ID
  stripe_payment_intent_id TEXT,              -- Stripe payment intent (after completion)

  -- Payment details
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (length(currency) = 3),

  -- Payment state
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',    -- Checkout session created, awaiting completion
      'completed',  -- Payment successful - unlocks paid report
      'failed',     -- Payment failed
      'refunded'    -- Payment refunded - should revoke access
    )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS
  'Stripe payment records. A completed payment unlocks the paid report.';
COMMENT ON COLUMN public.payments.status IS
  'Payment state. Only completed status unlocks paid report access.';

-- Indexes for payments
CREATE INDEX IF NOT EXISTS payments_deck_id_idx ON public.payments(deck_id);
CREATE INDEX IF NOT EXISTS payments_stripe_session_idx ON public.payments(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- Updated_at trigger for payments
DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- TABLE: events
-- ============================================================================
-- Lightweight event log for analytics and debugging.
-- deck_id is nullable to allow system-level events.

CREATE TABLE IF NOT EXISTS public.events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Associated deck (nullable for system events)
  deck_id UUID REFERENCES public.decks(id) ON DELETE SET NULL,

  -- Event information
  event_type TEXT NOT NULL,                   -- Event name
  metadata JSONB,                             -- Additional event data

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS
  'Event log for analytics and debugging. Insert-only.';
COMMENT ON COLUMN public.events.event_type IS
  'Event types: deck_uploaded, extraction_started, extraction_completed, free_report_generated, free_report_viewed, checkout_started, payment_completed, paid_report_generated, paid_report_viewed.';

-- Indexes for events
CREATE INDEX IF NOT EXISTS events_deck_id_idx ON public.events(deck_id);
CREATE INDEX IF NOT EXISTS events_type_idx ON public.events(event_type);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at);


-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- RLS is enabled on all tables as defense-in-depth.
-- In v1, all access goes through Netlify Functions using the service role key,
-- which bypasses RLS. These policies ensure that if anon/authenticated keys
-- are accidentally exposed, no data is accessible.

-- Enable RLS on all tables
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: decks
-- ============================================================================
-- No direct client access. All operations via service role.

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "decks_no_access" ON public.decks;

-- Deny all access via anon/authenticated keys
CREATE POLICY "decks_no_access" ON public.decks
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "decks_no_access" ON public.decks IS
  'Deny all direct client access. Use service role via backend functions.';

-- ============================================================================
-- RLS POLICIES: slides
-- ============================================================================
-- No direct client access. All operations via service role.

DROP POLICY IF EXISTS "slides_no_access" ON public.slides;

CREATE POLICY "slides_no_access" ON public.slides
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "slides_no_access" ON public.slides IS
  'Deny all direct client access. Use service role via backend functions.';

-- ============================================================================
-- RLS POLICIES: reports
-- ============================================================================
-- No direct client access. All operations via service role.

DROP POLICY IF EXISTS "reports_no_access" ON public.reports;

CREATE POLICY "reports_no_access" ON public.reports
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "reports_no_access" ON public.reports IS
  'Deny all direct client access. Use service role via backend functions.';

-- ============================================================================
-- RLS POLICIES: payments
-- ============================================================================
-- No direct client access. All operations via service role.

DROP POLICY IF EXISTS "payments_no_access" ON public.payments;

CREATE POLICY "payments_no_access" ON public.payments
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "payments_no_access" ON public.payments IS
  'Deny all direct client access. Use service role via backend functions.';

-- ============================================================================
-- RLS POLICIES: events
-- ============================================================================
-- No direct client access. Insert-only via service role.

DROP POLICY IF EXISTS "events_no_access" ON public.events;

CREATE POLICY "events_no_access" ON public.events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON POLICY "events_no_access" ON public.events IS
  'Deny all direct client access. Insert via service role only.';


-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Storage buckets created manually in Supabase dashboard:
--   - deck-pdfs (private, 50MB limit, application/pdf only)
--   - slide-images (private, 10MB limit, image/png and image/jpeg only)
--
-- No bucket creation SQL needed.


-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================
-- Storage bucket policies are managed via Supabase dashboard.
-- Both deck-pdfs and slide-images buckets are private (no public access).
-- All file operations go through service role via backend functions.
--
-- No direct SQL needed - configure in Dashboard > Storage > Policies.


-- ============================================================================
-- VERIFICATION QUERIES (Optional - uncomment to check setup)
-- ============================================================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('decks', 'slides', 'reports', 'payments', 'events');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('decks', 'slides', 'reports', 'payments', 'events');

-- Verify buckets exist
-- SELECT id, name, public, file_size_limit FROM storage.buckets
-- WHERE id IN ('deck-pdfs', 'slide-images');

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public';


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
