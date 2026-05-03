# Repo Inventory and Build Sequence

## 1. Current Framework and Build System

**Status: None**

No app framework or build system exists. This is a greenfield project. The only files present are:
- Model operating system files in `/model/`
- Documentation files in `/docs/`

**Recommended stack (per `docs/app-notes/recommended_build_plan.md`):**
- React + Vite + TypeScript
- Tailwind CSS
- Netlify hosting
- Netlify Functions or Supabase Edge Functions
- Supabase Postgres + Storage
- Stripe Checkout
- OpenAI API

---

## 2. Current package.json Dependencies and Scripts

**Status: None**

No `package.json` exists. Dependencies must be installed from scratch.

**Required dependencies to add:**

```
# Core
react
react-dom
vite
typescript

# Styling
tailwindcss
postcss
autoprefixer

# Backend/Database
@supabase/supabase-js

# Payments
@stripe/stripe-js
stripe (server-side)

# PDF Processing
pdf-lib or pdf.js
(OCR library TBD - possibly Tesseract.js or cloud OCR)

# AI
openai

# Routing
react-router-dom

# Forms/Validation
react-hook-form
zod
```

---

## 3. Current Folder Structure

```
pitchdeckcheck/
├── docs/
│   ├── app-notes/
│   │   └── recommended_build_plan.md
│   ├── pitch_deck_check_model_os_readme.md
│   └── project_status.md
├── model/
│   ├── 01_section_question_map.md
│   ├── 02_free_report_rules.md
│   ├── 03_paid_fix_rules.md
│   ├── 04_investor_pattern_library.md
│   ├── 05_bvp_precedent_examples.md
│   ├── 06_output_templates.md
│   ├── 07_scoring_logic.md
│   ├── 08_update_process_for_new_examples.md
│   └── 09_prompt_stack.md
└── pitch-deck-check-model-os/  (original download - ignore)
```

**Target structure after build:**

```
pitchdeckcheck/
├── app/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── styles/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── functions/
│   ├── analyze-deck.ts
│   ├── generate-free-report.ts
│   ├── generate-paid-report.ts
│   ├── create-checkout.ts
│   └── webhook-stripe.ts
├── supabase/
│   └── migrations/
├── model/
├── docs/
├── test-decks/
└── reports/
```

---

## 4. Existing Routes/Pages/Components

**Status: None**

No routes, pages, or components exist.

**Required pages for V1:**

| Route | Purpose |
|-------|---------|
| `/` | Landing page with upload CTA |
| `/upload` | Deck upload + email capture |
| `/report/:id` | Free report view |
| `/report/:id/full` | Paid report view (gated) |
| `/checkout/:id` | Stripe checkout redirect |
| `/success` | Post-payment confirmation |

**Required components:**

| Component | Purpose |
|-----------|---------|
| `DeckUploader` | PDF upload with drag-drop |
| `EmailCapture` | Email input before processing |
| `FreeReportView` | Displays free diagnostic report |
| `PaidReportView` | Displays full fix plan |
| `SlideGradeCard` | Individual slide grade display |
| `SectionScorecard` | Section-by-section grades table |
| `UpgradePrompt` | Paywall CTA component |
| `PaymentButton` | Stripe checkout trigger |
| `LoadingState` | Processing indicator |

---

## 5. Existing Supabase Usage

**Status: None**

No Supabase integration exists.

**Required Supabase setup:**

| Table | Purpose |
|-------|---------|
| `users` | Email, created_at, metadata |
| `decks` | user_id, file_path, status, created_at |
| `deck_slides` | deck_id, slide_number, image_path, extracted_text |
| `reports` | deck_id, type (free/paid), content, grade, created_at |
| `payments` | user_id, deck_id, stripe_session_id, status, amount |
| `report_events` | report_id, event_type, timestamp |

**Required Supabase Storage buckets:**

| Bucket | Purpose |
|--------|---------|
| `decks` | Original PDF uploads |
| `slides` | Extracted slide images |
| `reports` | Generated report JSON/HTML |

---

## 6. Existing Netlify Functions

**Status: None**

No Netlify functions exist.

**Required functions:**

| Function | Purpose |
|----------|---------|
| `upload-deck` | Receive PDF, store in Supabase, return deck_id |
| `extract-slides` | Convert PDF to slide images + OCR text |
| `generate-free-report` | Call OpenAI with free prompt, store report |
| `generate-paid-report` | Call OpenAI with paid prompt, store report |
| `create-checkout` | Create Stripe checkout session |
| `webhook-stripe` | Handle Stripe payment confirmation |
| `get-report` | Fetch report by ID (with access control) |

---

## 7. Existing Stripe Usage

**Status: None**

No Stripe integration exists.

**Required Stripe setup:**

- Stripe account with API keys
- Product: "Pitch Deck Check Full Report"
- Price: One-time payment (amount TBD)
- Checkout Session creation
- Webhook for `checkout.session.completed`
- Metadata: deck_id, user_email

---

## 8. Existing PDF/Upload Processing

**Status: None**

No PDF processing exists.

**Required capabilities:**

| Capability | Implementation Options |
|------------|------------------------|
| PDF upload | Browser File API + Supabase Storage |
| PDF to images | `pdf.js` or `pdf-lib` + canvas |
| OCR/text extraction | `pdf.js` text layer or Tesseract.js |
| Slide detection | Page-by-page extraction |
| Image storage | Supabase Storage |

**Processing flow:**
1. User uploads PDF
2. Function receives PDF, stores in Supabase
3. Function extracts each page as image
4. Function extracts text from each page
5. Store slide images + text in `deck_slides`
6. Return deck_id for report generation

---

## 9. Environment Variables Currently Expected

**Status: None**

No `.env` file exists.

**Required environment variables:**

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# OpenAI
OPENAI_API_KEY=

# App
VITE_APP_URL=
```

---

## 10. Gaps Between Current App and Pitch Deck Check V1

| Gap | Severity | Notes |
|-----|----------|-------|
| No React/Vite app scaffold | Critical | Must create from scratch |
| No package.json | Critical | Must initialize project |
| No Supabase setup | Critical | No database or storage |
| No Netlify functions | Critical | No backend processing |
| No Stripe integration | Critical | No payment flow |
| No PDF processing | Critical | Cannot extract slides |
| No OpenAI integration | Critical | Cannot generate reports |
| No authentication | Medium | Email-based magic link needed |
| No admin interface | Low | Can add post-V1 |
| No model file loader | Medium | Need to read /model/ at runtime |

**Model files are complete.** The scoring logic, prompt templates, output formats, and rules are all defined in `/model/`.

---

## 11. Recommended Implementation Sequence

### Phase 1: Project Scaffold
1. Initialize Vite + React + TypeScript project
2. Add Tailwind CSS
3. Create folder structure
4. Add routing with react-router-dom
5. Create placeholder pages

### Phase 2: Core UI
6. Build landing page
7. Build upload page with DeckUploader component
8. Build EmailCapture component
9. Build loading/processing state

### Phase 3: Supabase Backend
10. Create Supabase project
11. Create database tables
12. Create storage buckets
13. Add Supabase client to app

### Phase 4: PDF Processing
14. Create upload-deck function
15. Create extract-slides function
16. Test PDF → images → text pipeline

### Phase 5: AI Report Generation
17. Create model file loader utility
18. Create generate-free-report function
19. Create FreeReportView page
20. Test free report flow end-to-end

### Phase 6: Stripe Payment
21. Create Stripe product and price
22. Create create-checkout function
23. Create webhook-stripe function
24. Add PaymentButton component
25. Create success page

### Phase 7: Paid Report
26. Create generate-paid-report function
27. Create PaidReportView page
28. Add access control (paid only)
29. Test full payment → report flow

### Phase 8: Polish
30. Add error handling throughout
31. Add email notifications
32. Add magic link access
33. Mobile responsiveness
34. Performance optimization

---

## 12. Files to Create/Modify per Step

### Phase 1: Project Scaffold

**Step 1: Initialize Vite + React + TypeScript**
```
CREATE: app/package.json
CREATE: app/vite.config.ts
CREATE: app/tsconfig.json
CREATE: app/tsconfig.node.json
CREATE: app/index.html
CREATE: app/src/main.tsx
CREATE: app/src/App.tsx
CREATE: app/src/vite-env.d.ts
```

**Step 2: Add Tailwind CSS**
```
CREATE: app/tailwind.config.js
CREATE: app/postcss.config.js
CREATE: app/src/styles/index.css
```

**Step 3: Create folder structure**
```
CREATE: app/src/components/.gitkeep
CREATE: app/src/pages/.gitkeep
CREATE: app/src/hooks/.gitkeep
CREATE: app/src/lib/.gitkeep
CREATE: app/src/types/.gitkeep
CREATE: functions/.gitkeep
CREATE: supabase/.gitkeep
```

**Step 4: Add routing**
```
MODIFY: app/src/App.tsx
CREATE: app/src/pages/Home.tsx
CREATE: app/src/pages/Upload.tsx
CREATE: app/src/pages/Report.tsx
CREATE: app/src/pages/Success.tsx
```

### Phase 2: Core UI

**Step 6: Build landing page**
```
MODIFY: app/src/pages/Home.tsx
CREATE: app/src/components/Hero.tsx
CREATE: app/src/components/HowItWorks.tsx
```

**Step 7: Build upload page**
```
MODIFY: app/src/pages/Upload.tsx
CREATE: app/src/components/DeckUploader.tsx
```

**Step 8: Build EmailCapture**
```
CREATE: app/src/components/EmailCapture.tsx
```

**Step 9: Build loading state**
```
CREATE: app/src/components/ProcessingState.tsx
```

### Phase 3: Supabase Backend

**Step 10-12: Supabase setup**
```
CREATE: supabase/migrations/001_initial_schema.sql
CREATE: app/src/lib/supabase.ts
CREATE: app/src/types/database.ts
CREATE: .env.example
```

### Phase 4: PDF Processing

**Step 14: Upload function**
```
CREATE: functions/upload-deck.ts
```

**Step 15: Extract slides function**
```
CREATE: functions/extract-slides.ts
CREATE: functions/lib/pdf-utils.ts
```

### Phase 5: AI Report Generation

**Step 17: Model loader**
```
CREATE: functions/lib/model-loader.ts
CREATE: functions/lib/prompts.ts
```

**Step 18: Free report function**
```
CREATE: functions/generate-free-report.ts
CREATE: functions/lib/openai.ts
```

**Step 19: Free report view**
```
MODIFY: app/src/pages/Report.tsx
CREATE: app/src/components/FreeReportView.tsx
CREATE: app/src/components/SlideGradeCard.tsx
CREATE: app/src/components/SectionScorecard.tsx
CREATE: app/src/components/UpgradePrompt.tsx
```

### Phase 6: Stripe Payment

**Step 22: Checkout function**
```
CREATE: functions/create-checkout.ts
CREATE: functions/lib/stripe.ts
```

**Step 23: Webhook function**
```
CREATE: functions/webhook-stripe.ts
```

**Step 24: Payment button**
```
CREATE: app/src/components/PaymentButton.tsx
```

**Step 25: Success page**
```
MODIFY: app/src/pages/Success.tsx
```

### Phase 7: Paid Report

**Step 26: Paid report function**
```
CREATE: functions/generate-paid-report.ts
```

**Step 27: Paid report view**
```
CREATE: app/src/components/PaidReportView.tsx
CREATE: app/src/components/SlideFixPlan.tsx
```

**Step 28: Access control**
```
CREATE: app/src/hooks/useReportAccess.ts
MODIFY: app/src/pages/Report.tsx
```

### Phase 8: Polish

**Step 30: Error handling**
```
CREATE: app/src/components/ErrorBoundary.tsx
CREATE: app/src/components/ErrorMessage.tsx
MODIFY: functions/*.ts (add try/catch)
```

**Step 31: Email notifications**
```
CREATE: functions/send-email.ts
CREATE: functions/lib/email-templates.ts
```

**Step 32: Magic link access**
```
CREATE: functions/generate-magic-link.ts
CREATE: app/src/pages/MagicLink.tsx
```

---

## Product Constraints Checklist

### Free Report MUST show:
- [ ] Overall deck score/grade
- [ ] Diagnosis per slide
- [ ] Slide-level grades
- [ ] Primary investor question per slide
- [ ] Upgrade potential
- [ ] Upgrade CTA

### Free Report MUST NOT show:
- [ ] Exact fixes or additions
- [ ] Investor-backed examples
- [ ] Rewrite guidance or suggested wording
- [ ] Full scoring mechanics or weights
- [ ] Secondary question lists
- [ ] Before/after rewrites

### Paid Report MUST show:
- [ ] Specific fix plan per slide
- [ ] Suggested wording/rewrites
- [ ] Investor-backed examples
- [ ] Visual guidance where relevant
- [ ] What not to say
- [ ] Priority order

### Scoring Requirements:
- [ ] Deck-level scoring (overall grade)
- [ ] Slide-level scoring (per-slide grades)
- [ ] Section-level scoring (section scorecard)
- [ ] Grade scale: A+, A, A-, B+, B, B-, C+, C, C-, D, E
- [ ] Scoring driven by `/model/` files

---

## Next Action

Begin Phase 1, Step 1: Initialize the Vite + React + TypeScript project scaffold in `/app/`.
