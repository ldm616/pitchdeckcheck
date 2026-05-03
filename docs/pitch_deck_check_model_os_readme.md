# Pitch Deck Check — Model Operating System

This folder contains v1 of the Pitch Deck Check scoring and upgrade model.

Pitch Deck Check is a freemium deck diagnostic product:

- Free report: investor-readiness score, slide grades, short diagnosis, and upgrade potential.
- Paid report: specific fixes, example language, investor-backed precedents, and rewritten slide guidance.

Core principle: evaluate a pitch deck as investment evidence, not marketing collateral.

Recommended repo structure:

- `/model` — scoring rules, question maps, report boundaries, examples, and prompt files.
- `/app` — future React/Vite app.
- `/functions` — future Netlify or Supabase backend functions.
- `/supabase` — future database schema and migrations.
- `/reports` — optional generated test outputs.
- `/test-decks` — optional sample decks for testing; do not commit confidential decks unless the repo is private.

Immediate workflow:

1. Put these files in a Git repo.
2. Manually test against 5–10 decks.
3. Refine the free/paid boundary.
4. Then implement the app workflow.
