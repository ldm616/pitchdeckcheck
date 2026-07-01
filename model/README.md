# Model Artifacts

This directory holds the product-owned artifacts that define how Pitch Deck Check evaluates decks and generates reports.

## What these files are

- These files are **product-owned artifacts**, not implementation code.
- Their content **defines product behavior** and should not be modified without an explicit product-design decision.
- Implementation code should **load and interpret** these artifacts rather than duplicating their logic.
- Prompts, scoring code, and report generation should **reference these artifacts** whenever practical.

See `CLAUDE.md` at the repo root for the working agreement governing how these artifacts are authored and consumed.

## Artifacts

| File | Purpose |
|------|---------|
| `foundation.md` | Defines the foundational investment principles that guide Pitch Deck Check. |
| `product-philosophy.md` | Articulates the product philosophy of Pitch Deck Check. |
| `company-context.md` | Captures the company context for a deck. |
| `investor-framework.md` | Defines the slide-level investor evaluation framework. |
| `scoring-rubric.md` | Defines the scoring rubric used to evaluate decks. |
| `report-spec.md` | Defines the structure and content of the generated report. |
| `calibration-examples.md` | Provides worked examples for calibrating scoring and report interpretation. |
| `sample-report-format.md` | Defines the founder-facing sample report format. |
| `sample-report-proxy-market-validation.md` | A full sample report demonstrating proxy market validation in an early-stage marketplace deck. |
| `sample-report-clear-deck-weak-opportunity.md` | A full sample report demonstrating a clear deck with a weak investment case for the intended investor audience. |
| `improvement-framework.md` | Defines how founder-facing improvements are generated. |

Each artifact carries `Version`, `Status`, `Owner`, `Implementation Owner`, and `Purpose` fields at the top. Bump the version when content changes; treat `Status: Draft` as not yet wired into production behavior.

## Dependency Hierarchy

The artifacts form a strict top-down dependency chain. `Foundation` is the root; every other artifact derives from the ones above it.

```
Foundation
        ↓
Product Philosophy
        ↓
Company Context
        ↓
Investor Framework
        ↓
Scoring Rubric
        ↓
Report Specification
        ↓
Calibration Examples
        ↓
Sample Report Format
        ↓
Sample Report — Proxy Market Validation
        ↓
Sample Report — Clear Deck, Weak Opportunity
        ↓
Improvement Framework
```

## Artifact Dependency Principles

- Foundation is the root artifact.
- Lower artifacts may depend on higher artifacts.
- Higher artifacts must never depend on lower artifacts.
- Product behavior should be defined once.
- Implementation should reference artifacts rather than duplicate product logic.
