# Pitch Deck Check

Investor-readiness scoring for pitch decks.

## Project Structure

```
app/              # React frontend
netlify/functions # Serverless backend
scripts/          # Admin scripts (seeding, etc.)
docs/             # Documentation
supabase/         # Database schema
```

## Development

### Frontend

```bash
cd app
npm install
npm run dev
```

### Backend

Netlify Functions run automatically with `netlify dev` or deploy to Netlify.

## Making Changes to Report Generation

We use a structured evaluation process to ensure changes improve output quality.

### Before Making Changes

1. Read `/docs/EVALS.md` for the evaluation framework
2. Run a report on a benchmark deck and save the output
3. Identify what you're trying to improve

### When Making Changes

1. Make ONE meaningful change at a time
2. Run report on the same benchmark deck
3. Fill out the evaluation template in EVALS.md
4. Compare outputs side-by-side

### After Making Changes

1. Document improvements and regressions
2. Only commit if improvement is clear or tradeoff is intentional
3. Include evaluation summary in commit message

See `/docs/EVALS.md` for full details.

## Key Files

| File | Purpose |
|------|---------|
| `netlify/functions/lib/reportGenerator.js` | Full report generation (`generateFullReport`) |
| `netlify/functions/lib/rubrics.js` | Rubric questions, weights, scoring |
| `netlify/functions/lib/canonicalPatterns.js` | Investor reasoning patterns |
| `scripts/seed-rubrics.js` | Seed rubric questions to database |
| `scripts/seed-patterns.js` | Seed investor patterns to database |
| `docs/EVALS.md` | Evaluation framework |

## Report Generation Architecture

**Concept:** Generate a comprehensive full report now. Derive filtered subsets (free report) later.

```
generateFullReport(supabase, deckId)
    ├── Evaluates slides with investor questions + pattern context
    ├── Computes deterministic scores
    ├── Evaluates investment thesis
    ├── Builds full_report (source of truth)
    ├── Derives free_report (limited subset, for now)
    └── Stores both in reports.content
```

**Current focus:** full_report quality

The full report provides detailed, actionable investor-grade feedback:
- What is missing vs investor expectations
- Why each gap matters (investor impact)
- How to close each gap (conditional fixes)
- Investor reasoning patterns where relevant

**Future:** Free report will use configurable filters to include/exclude content from full_report for product packaging.

## Rubric Management

### Source of Truth

The rubric source of truth for **runtime** is `netlify/functions/lib/rubrics.js`.

A database copy exists in `rubric_versions` and `rubric_questions` tables for:
- Traceability and version history
- Pattern mapping (pattern_rubric_map references question_key)
- Future admin editing
- Future DB-driven rubrics

### Seeding Rubrics to Database

To sync the rubric from code to database:

```bash
cd scripts
npm install
SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npm run seed:rubrics
```

The script will:
1. Upsert the current RUBRIC_VERSION as active
2. Deactivate all other versions
3. Upsert all questions with deterministic keys
4. Print verification output

Safe to rerun - uses upsert based on `(version_key, question_key)`.

## Report Versions

Reports include `report_version` for tracking. Format: `report_vX.Y`

Current: `report_v2.4`
