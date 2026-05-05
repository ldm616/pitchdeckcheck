# Pitch Deck Check

Investor-readiness scoring for pitch decks.

## Project Structure

```
app/              # React frontend
netlify/functions # Serverless backend
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
| `netlify/functions/lib/rubrics.js` | Rubric questions, weights, scoring |
| `netlify/functions/lib/generateFreeReport.js` | Report generation logic |
| `docs/EVALS.md` | Evaluation framework |

## Report Versions

Reports include `report_version` for tracking. Format: `report_vX.Y`

Current: `report_v2.1`
