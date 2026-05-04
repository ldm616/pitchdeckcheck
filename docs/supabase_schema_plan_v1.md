# Supabase Schema Plan v1

## Overview

This document defines the minimum Supabase schema for Pitch Deck Check v1. The goal is to support:

1. PDF upload and storage
2. Slide extraction and storage
3. Free report generation and access
4. Paid report unlock via Stripe
5. Magic link access (no account required)

---

## Product Flow Summary

```
User uploads PDF → enters email → deck record created → PDF stored
    ↓
Slides extracted → images/text stored
    ↓
Free report generated → user views via magic link
    ↓
User pays → paid report generated → user views via same magic link
```

---

## Tables

### 1. `decks`

The core table. One row per uploaded pitch deck.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `email` | TEXT | NOT NULL | User's email address |
| `access_token` | UUID | NOT NULL, UNIQUE, default `gen_random_uuid()` | Magic link token for report access |
| `file_path` | TEXT | NOT NULL | Path in `deck-pdfs` bucket |
| `original_filename` | TEXT | NOT NULL | Original uploaded filename |
| `file_size_bytes` | INTEGER | | File size for validation |
| `slide_count` | INTEGER | | Populated after extraction |
| `processing_status` | TEXT | NOT NULL, default `'uploaded'` | See enum below |
| `processing_error` | TEXT | | Error message if failed |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Processing Status Enum:**
- `uploaded` — PDF received, not yet processed
- `extracting` — Slide extraction in progress
- `extracted` — Slides ready, awaiting report
- `generating_free` — Free report being generated
- `ready` — Free report available
- `failed` — Processing failed

**Indexes:**
- `decks_access_token_idx` on `access_token` (for magic link lookups)
- `decks_email_idx` on `email` (for user lookup)
- `decks_created_at_idx` on `created_at` (for admin/cleanup)

---

### 2. `slides`

Extracted slide data. One row per slide.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `deck_id` | UUID | NOT NULL, FK → `decks.id` ON DELETE CASCADE | Parent deck |
| `slide_number` | INTEGER | NOT NULL | 1-indexed slide position |
| `image_path` | TEXT | NOT NULL | Path in `slide-images` bucket |
| `extracted_text` | TEXT | | OCR/extracted text content |
| `inferred_type` | TEXT | | Detected slide type (cover, problem, etc.) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Indexes:**
- `slides_deck_id_idx` on `deck_id`
- `slides_deck_slide_idx` on `(deck_id, slide_number)` UNIQUE

---

### 3. `reports`

Generated reports. Typically one free + optionally one paid per deck.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `deck_id` | UUID | NOT NULL, FK → `decks.id` ON DELETE CASCADE | Parent deck |
| `report_type` | TEXT | NOT NULL | `'free'` or `'paid'` |
| `status` | TEXT | NOT NULL, default `'pending'` | See enum below |
| `overall_grade` | TEXT | | Letter grade (A+, B-, etc.) |
| `content` | JSONB | | Full report content |
| `generation_error` | TEXT | | Error message if failed |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Report Status Enum:**
- `pending` — Queued for generation
- `generating` — AI generation in progress
- `ready` — Report available
- `failed` — Generation failed

**Indexes:**
- `reports_deck_id_idx` on `deck_id`
- `reports_deck_type_idx` on `(deck_id, report_type)` UNIQUE

---

### 4. `payments`

Stripe payment records. One row per payment attempt.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `deck_id` | UUID | NOT NULL, FK → `decks.id` ON DELETE CASCADE | Associated deck |
| `email` | TEXT | NOT NULL | Payer email (may differ from deck email) |
| `stripe_checkout_session_id` | TEXT | UNIQUE | Stripe checkout session |
| `stripe_payment_intent_id` | TEXT | | Stripe payment intent (after completion) |
| `amount_cents` | INTEGER | NOT NULL | Amount charged |
| `currency` | TEXT | NOT NULL, default `'usd'` | Currency code |
| `status` | TEXT | NOT NULL, default `'pending'` | See enum below |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Payment Status Enum:**
- `pending` — Checkout session created, not completed
- `completed` — Payment successful
- `failed` — Payment failed
- `refunded` — Payment refunded

**Indexes:**
- `payments_deck_id_idx` on `deck_id`
- `payments_stripe_session_idx` on `stripe_checkout_session_id`
- `payments_status_idx` on `status` (for finding completed payments)

---

### 5. `events` (Optional for v1)

Lightweight analytics/audit log. Useful for debugging and metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Primary key |
| `deck_id` | UUID | FK → `decks.id` ON DELETE SET NULL | Associated deck (nullable) |
| `event_type` | TEXT | NOT NULL | Event name |
| `metadata` | JSONB | | Additional event data |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | |

**Event Types:**
- `deck_uploaded`
- `extraction_started`
- `extraction_completed`
- `free_report_generated`
- `free_report_viewed`
- `checkout_started`
- `payment_completed`
- `paid_report_generated`
- `paid_report_viewed`

**Indexes:**
- `events_deck_id_idx` on `deck_id`
- `events_type_idx` on `event_type`
- `events_created_at_idx` on `created_at`

**Decision:** Include in v1 for debugging. Low overhead, high value.

---

## Storage Buckets

### 1. `deck-pdfs`

Stores original uploaded PDF files.

| Setting | Value | Reason |
|---------|-------|--------|
| Public | **No** | Decks contain confidential business info |
| File size limit | 50 MB | Reasonable for pitch decks |
| Allowed MIME types | `application/pdf` | Only PDFs |

**Path convention:** `{deck_id}/{original_filename}`

**Access:** Signed URLs only, generated server-side.

---

### 2. `slide-images`

Stores extracted slide images (PNG/JPG).

| Setting | Value | Reason |
|---------|-------|--------|
| Public | **No** | Slides may contain confidential info |
| File size limit | 10 MB per image | Reasonable for slide images |
| Allowed MIME types | `image/png`, `image/jpeg` | Standard image formats |

**Path convention:** `{deck_id}/slide_{slide_number}.png`

**Access:** Signed URLs only, generated server-side for report viewing.

---

### 3. `report-assets` (Optional)

Could store rendered report PDFs or exported assets. **Defer to v2** — v1 will render reports dynamically in the browser.

---

## Access Control

### Free Report Access

**Rule:** User can view free report if they have a valid `access_token`.

**Implementation:**
1. Magic link URL: `/report/free/{deck_id}?token={access_token}`
2. Backend verifies `access_token` matches `decks.access_token`
3. If valid, return free report from `reports` table

**No account required.** Token in URL acts as bearer credential.

---

### Paid Report Access

**Rule:** User can view paid report if deck has a `completed` payment.

**Implementation:**
1. Same magic link URL: `/report/paid/{deck_id}?token={access_token}`
2. Backend verifies `access_token` matches `decks.access_token`
3. Backend checks `payments` table for `status = 'completed'` AND `deck_id` match
4. If both valid, return paid report from `reports` table

**The access_token provides identity. The payment record provides authorization.**

---

## Row-Level Security (RLS)

Supabase RLS will be enabled but most access goes through backend functions (Netlify Functions or Supabase Edge Functions) using the service role key.

### Recommended RLS Policies

**`decks` table:**
- No direct client access
- All operations via server-side functions

**`slides` table:**
- No direct client access
- Read-only via server-side functions

**`reports` table:**
- No direct client access
- Server validates access_token before returning data

**`payments` table:**
- No direct client access
- Stripe webhook writes via service role

**`events` table:**
- Insert-only via service role
- No client access

### Client vs Server Access Pattern

| Operation | Access Method |
|-----------|---------------|
| Upload deck | Netlify Function → Supabase service role |
| Get report | Netlify Function → validate token → return data |
| Create checkout | Netlify Function → Stripe API |
| Webhook payment confirm | Netlify Function → service role update |

**The frontend never talks directly to Supabase.** All data flows through backend functions.

---

## Status Field Summary

### Deck Processing Status

```
uploaded → extracting → extracted → generating_free → ready
                ↓                          ↓
              failed                     failed
```

### Report Status

```
pending → generating → ready
              ↓
            failed
```

### Payment Status

```
pending → completed
    ↓         ↓
  failed   refunded
```

---

## Free vs Paid Report Representation

| Aspect | Free Report | Paid Report |
|--------|-------------|-------------|
| `reports.report_type` | `'free'` | `'paid'` |
| Access requirement | Valid `access_token` | Valid `access_token` + completed payment |
| Content | Diagnostic only | Full fix plan |
| `reports.content` structure | Same JSONB schema, different depth | Same JSONB schema, full detail |

Both reports live in the same `reports` table. The `report_type` column distinguishes them.

---

## Open Decisions

### 1. Email verification

**Question:** Should we verify email before processing?

**Recommendation for v1:** No. Accept email on trust. Add verification in v2 if spam becomes an issue.

---

### 2. Deck expiration

**Question:** Should decks/reports expire after a certain time?

**Recommendation for v1:** No automatic expiration. Add `expires_at` column later if needed for storage cost management.

---

### 3. Multiple decks per email

**Question:** Should we track user identity across decks?

**Recommendation for v1:** No user table. Each deck is independent. The email column allows manual lookup if needed. Add proper user accounts in v2.

---

### 4. Report versioning

**Question:** If we regenerate a report, keep history or overwrite?

**Recommendation for v1:** Overwrite. One free report and one paid report per deck maximum. Add versioning in v2 if needed.

---

### 5. Idempotent uploads

**Question:** What if user uploads same file twice?

**Recommendation for v1:** Create separate deck records. Dedupe by hash in v2 if needed.

---

## Entity Relationship Diagram

```
┌──────────────┐
│    decks     │
├──────────────┤
│ id (PK)      │
│ email        │
│ access_token │◄─────── Magic link access
│ file_path    │
│ status       │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│    slides    │
├──────────────┤
│ id (PK)      │
│ deck_id (FK) │
│ slide_number │
│ image_path   │
│ text         │
└──────────────┘

┌──────────────┐
│    decks     │
└──────┬───────┘
       │
       │ 1:N (max 2: free + paid)
       ▼
┌──────────────┐
│   reports    │
├──────────────┤
│ id (PK)      │
│ deck_id (FK) │
│ report_type  │──────── 'free' | 'paid'
│ content      │
│ status       │
└──────────────┘

┌──────────────┐
│    decks     │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│   payments   │
├──────────────┤
│ id (PK)      │
│ deck_id (FK) │
│ stripe_*     │
│ status       │──────── 'completed' unlocks paid report
└──────────────┘

┌──────────────┐
│    decks     │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│    events    │
├──────────────┤
│ id (PK)      │
│ deck_id (FK) │
│ event_type   │
│ metadata     │
└──────────────┘
```

---

## Optional: SQL Schema

<details>
<summary>Click to expand SQL (for reference only — do not run yet)</summary>

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Decks table
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER,
  slide_count INTEGER,
  processing_status TEXT NOT NULL DEFAULT 'uploaded',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX decks_access_token_idx ON decks(access_token);
CREATE INDEX decks_email_idx ON decks(email);
CREATE INDEX decks_created_at_idx ON decks(created_at);

-- Slides table
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  image_path TEXT NOT NULL,
  extracted_text TEXT,
  inferred_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deck_id, slide_number)
);

CREATE INDEX slides_deck_id_idx ON slides(deck_id);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  overall_grade TEXT,
  content JSONB,
  generation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deck_id, report_type)
);

CREATE INDEX reports_deck_id_idx ON reports(deck_id);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_deck_id_idx ON payments(deck_id);
CREATE INDEX payments_stripe_session_idx ON payments(stripe_checkout_session_id);
CREATE INDEX payments_status_idx ON payments(status);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_deck_id_idx ON events(deck_id);
CREATE INDEX events_type_idx ON events(event_type);
CREATE INDEX events_created_at_idx ON events(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

</details>

---

## Next Implementation Step

1. Create Supabase project
2. Run schema SQL in Supabase SQL editor
3. Create storage buckets with settings above
4. Enable RLS on all tables
5. Add service role key to Netlify environment variables
6. Build first Netlify Function: `upload-deck`
