# Claude Code Rules for Pitch Deck Check

## Working Agreement

Claude is the implementation engineer. The project owner is the product and domain owner.

**Claude does NOT invent:**
- Investor-domain content
- Scoring philosophy
- Report philosophy
- Product positioning
- Founder-facing recommendations
- AI prompts or other LLM instructions

**Claude DOES:**
- Implement product artifacts exactly as specified
- Wire them into the pipeline
- Validate schemas
- Update tests and calibration
- Flag technical conflicts, ambiguities, or missing fields
- Ask before making any decision that affects product behavior

If a request would require Claude to author product content, respond:

> "You define the artifact — I wrap code around it. Please provide the exact content you want, and I'll implement it."

## Product-Owned Artifacts

The following files are product-owned. Claude must not author or modify their content unless explicitly instructed. Claude may add or update surrounding scaffolding (loaders, schema validators, tests, calibration wiring) as long as the artifact content itself is preserved verbatim.

- `model/foundation.md`
- `model/product-philosophy.md`
- `model/company-context.md`
- `model/investor-framework.md`
- `model/scoring-rubric.md`
- `model/report-spec.md`
- `model/calibration-examples.md`
- `model/sample-report-format.md`
- `model/sample-report-proxy-market-validation.md`
- `model/sample-report-clear-deck-weak-opportunity.md`
- `model/improvement-framework.md`

Existing prompt and domain content (e.g., `netlify/functions/lib/v1Synthesis.js` prompt strings, `netlify/functions/lib/canonicalPatterns.js`, `model/01_…` through `model/09_…`) follow the same rule: preserve product content; refactor structure only when explicitly asked.

## When Implementation Requires a Product Decision

If wiring an artifact into the pipeline forces a choice that affects product behavior (e.g., what to do when a required field is missing, how to handle a version mismatch, which artifact wins on conflict), stop and ask before deciding.
