# Recommended Build Plan

## Store this in a real Git repo

Yes. Store the model files in a Git repo from day one.

Recommended local folder: `pitch-deck-check/`

Suggested structure:

- `model/`
- `app/`
- `functions/`
- `supabase/`
- `reports/`
- `test-decks/`

Do not commit confidential test decks unless the repo is private.

## Suggested stack

- React + Vite + TypeScript
- Tailwind
- Netlify hosting
- Netlify Functions or Supabase Edge Functions
- Supabase Postgres + Storage
- Stripe checkout
- OpenAI API
- PDF-to-slide-image extraction
- OCR/layout extraction

## V1 flow

1. User uploads deck.
2. User enters email.
3. Backend stores deck.
4. Backend extracts slide images and text.
5. AI generates free report.
6. User sees free score instantly.
7. User unlocks paid fix plan.
8. Stripe confirms payment.
9. AI generates paid report.
10. Report is saved and accessible via magic link.

## Build order

1. Finalize model files and manually test with 5–10 decks.
2. Build upload + free report only.
3. Add Stripe paid unlock.
4. Add saved report pages.
5. Add better deck parsing and visual analysis.
6. Add admin review and pattern-library updates.

## Likely database tables

- users
- decks
- deck_slides
- reports
- payments
- report_events
- investor_examples
- model_versions
