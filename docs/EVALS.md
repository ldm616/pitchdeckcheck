# Evaluation Framework

## Purpose

This document defines how we measure improvement in the pitch deck analysis system. Every change to prompts, scoring logic, or report generation must be evaluated against this framework.

We are optimizing for:

- **Accuracy** - Correctly identify investor-relevant strengths and weaknesses
- **Specificity** - Tie feedback to actual deck content, not generic advice
- **Actionability** - Guide founders on exactly what to improve
- **Traceability** - Make clear why each score was assigned
- **Differentiation** - Reflect our rubric and logic, not generic AI output

Random changes degrade quality. This framework ensures intentional iteration.

---

## Golden Checks (Run Every Iteration)

These are invariant checks that must pass before any deeper evaluation. If any fail, the iteration is not acceptable.

### Quick Validation Checklist

- [ ] Summary correctly identifies a top weighted strength (not cover/contact)
- [ ] Summary correctly identifies a real high-impact weakness
- [ ] No hallucinated missing items (claims something is missing when it's present)
- [ ] Fixes are specific and conditional (no generic advice like "add more detail")
- [ ] No contradiction across slides (e.g., "no traction shown" when traction slide exists)
- [ ] Thesis verdicts align with slide-level evidence
- [ ] Scores are consistent with assessment text (low score = clear gap stated)

### Failure Modes to Watch

| Failure | Example | Action |
|---------|---------|--------|
| Hallucination | "No market size provided" when TAM is stated | Reject, fix prompt |
| Generic fix | "Consider adding more information" | Reject, tighten fix rules |
| Contradiction | Thesis says weak traction, slide shows strong traction | Reject, check cross-slide context |
| Score mismatch | Score 4 with "major gaps remain" in assessment | Reject, recalibrate |
| Wrong priority | Cover slide flagged as top weakness | Reject, check weighting |

**Rule: If Golden Checks fail, do not proceed. Fix the issue first.**

---

## Evaluation Criteria

### Accuracy

Does the report correctly identify investor-relevant strengths and weaknesses?

- Are high scores given to genuinely strong elements?
- Are low scores given to genuinely weak elements?
- Are thesis-level evaluations consistent with slide-level findings?
- Are there false positives (flagging non-issues)?
- Are there false negatives (missing real issues)?

### Specificity

Is feedback tied to actual deck content?

- Does the assessment quote or reference specific slides?
- Are gaps described in terms of what THIS deck is missing?
- Do fixes address THIS deck's specific gaps?
- Is investor_impact framed for THIS deck's situation?
- Would the same feedback apply to a completely different deck? (bad)

### Actionability

Does the full report clearly guide what to improve?

- Are fixes concrete enough to act on?
- Are fixes conditional and non-prescriptive?
- Is priority clear (which issues matter most)?
- Does the thesis section clarify high-level positioning gaps?
- Can a founder read the report and know what to do next?

### Traceability

Can we see why each score was assigned?

- Does each score have a supporting assessment?
- Is the gap clearly stated for low scores?
- Does investor_impact explain why the gap matters?
- Is confidence level appropriate given visible evidence?
- Are thesis verdicts consistent with cited evidence?

### Differentiation

Does output reflect our rubric and logic vs generic AI?

- Are slides evaluated against investor-specific questions?
- Does scoring follow our defined scale (0-5)?
- Are weights applied correctly to high-impact slides?
- Does the summary follow our deterministic format?
- Would a generic "analyze this deck" prompt produce different output? (should be yes)

---

## Benchmark Decks

We evaluate changes against a fixed set of decks to ensure consistent comparison.

| Deck | Description | Quality Level | Primary Use |
|------|-------------|---------------|-------------|
| Gleamr | Primary test deck | Mixed (strong traction, weak GTM) | All evaluations |
| TBD | Add deck with weak fundamentals | Weak | Edge case testing |
| TBD | Add deck with strong fundamentals | Strong | Ceiling testing |
| TBD | Add non-standard structure deck | Varies | Structure robustness |

When adding benchmark decks, include variety:
- Different industries
- Different stages (pre-seed, seed)
- Different quality levels (strong, weak, mixed)
- Different structures (standard, non-standard)

---

## Gleamr — Expected Findings

This section defines "correct output" for the Gleamr benchmark deck. Use this to detect regressions or incorrect improvements.

### Expected Top Strengths

| Area | Expected Signal | Notes |
|------|-----------------|-------|
| Traction | Should be one of the strongest signals | Growth metrics are visible |
| Problem | Should score reasonably well | Pain point is articulated |

### Expected Top Weaknesses

| Area | Expected Signal | Notes |
|------|-----------------|-------|
| Go-to-market | Should be weak or partial | Channel strategy unclear |
| Financial assumptions | Should be weak | Projections lack visible assumptions |
| Product differentiation | Should be partial | Claims lack specificity |
| Why now | Should be weak or missing | Timing justification unclear |

### Expected Common Gaps

- Market assumptions not fully explicit
- Limited proof of product-market fit beyond growth numbers
- Limited specificity of team achievements
- Competitive moat is claimed but not defended
- Unit economics not visible

### Expected Thesis Scores (approximate)

| Thesis | Expected Range | Notes |
|--------|----------------|-------|
| Why This Market? | 2-3 | Size claimed, assumptions weak |
| Why This Product? | 2-3 | Value prop present, differentiation weak |
| Why This Team? | 2-3 | Team shown, achievements vague |
| Why Now? | 1-2 | Timing not well justified |

### Using Expected Findings

When evaluating a change:

1. Compare output to expected findings above
2. If output matches expectations → system is working correctly
3. If output diverges from expectations → investigate:
   - Is the divergence an improvement? (we were wrong before)
   - Is the divergence a regression? (we broke something)
4. Document which expected findings were confirmed or contradicted

**A change that causes Gleamr's traction to score poorly is almost certainly a regression.**

---

## Evaluation Template

Use this template for every meaningful change:

```
## Evaluation Run

**Commit:** [hash]
**Date:** [YYYY-MM-DD]
**Report Version:** [from report output]

**Deck:** [name]
**Previous Commit:** [hash for comparison]

---

### Golden Checks

- [ ] Summary identifies weighted strength (not cover/contact)
- [ ] Summary identifies real high-impact weakness
- [ ] No hallucinated missing items
- [ ] Fixes are specific and conditional
- [ ] No cross-slide contradictions
- [ ] Thesis aligns with slide evidence
- [ ] Scores match assessment text

**Golden Check Result:** PASS / FAIL

If FAIL, stop here. Do not proceed until fixed.

---

### Results

**Overall Grade:** [A-E]
**Deck Score:** [X.XX/5.0]

**Top Strength (from report):**
[quote or paraphrase]

**Top Weakness (from report):**
[quote or paraphrase]

---

### Comparison to Expected Findings

| Expected | Actual | Match? |
|----------|--------|--------|
| Traction strong | | |
| GTM weak | | |
| Financials weak | | |
| Differentiation partial | | |
| Why now weak | | |

**Divergences:**
[List any unexpected results and whether they are improvements or regressions]

---

### Criteria Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Accuracy | Good/Mixed/Poor | |
| Specificity | Good/Mixed/Poor | |
| Actionability | Good/Mixed/Poor | |
| Traceability | Good/Mixed/Poor | |
| Differentiation | Good/Mixed/Poor | |

---

### Regression Check

Did we lose anything that was previously correct?

- [ ] No loss of previously correct strengths
- [ ] No loss of previously correct weaknesses
- [ ] No increase in hallucinations
- [ ] No major scoring inconsistencies
- [ ] No new contradictions introduced

**Specific regressions found:**
[List any, or "None"]

---

### Changes Observed

**What improved:**
- [specific improvement with evidence]

**What regressed:**
- [specific regression with evidence, or "None observed"]

**Tradeoffs:**
- [any intentional tradeoffs accepted]

**False positives (new):**
- [issues flagged that aren't real problems]

**False negatives (new):**
- [real issues that were missed]

---

### Decision

[ ] Proceed - improvement is clear, no regressions
[ ] Proceed with caveat - tradeoff is intentional and acceptable
[ ] Revert - regression outweighs improvement
[ ] Needs more testing - unclear impact

**Rationale:**
[Why this decision was made]

**Does this move us closer to investor-grade output?**
[ ] Yes - clear improvement
[ ] Neutral - no net change
[ ] No - regression

```

---

## Rules for Iteration

### Before Making Changes

1. Identify what you're trying to improve (be specific)
2. Predict how the change will affect output
3. Run report on benchmark deck and save output for comparison
4. Review Expected Findings for the benchmark deck

### When Making Changes

1. Make ONE meaningful change at a time
2. Run report on the same benchmark deck
3. Run Golden Checks first — if any fail, stop
4. Fill out full evaluation template
5. Compare against Expected Findings
6. Compare against previous run output

### After Making Changes

1. Complete Regression Check
2. Document at least ONE improvement with evidence
3. Document at least ONE risk or tradeoff (even if minor)
4. Do not rely on "feels better" — cite specific differences
5. If regression found, decide: revert or accept with documented rationale
6. Update REPORT_VERSION if report structure changes
7. Update RUBRIC_VERSION if scoring logic changes
8. Commit with evaluation summary

### Mandatory Documentation

Every evaluation must answer:

- What specifically improved vs last run?
- What specifically regressed (even slightly)?
- Was the tradeoff acceptable? Why?
- Does this move us closer to investor-grade output?

### What Counts as "Meaningful Change"

Requires full evaluation:
- Prompt wording changes
- Scoring scale or threshold changes
- New fields or sections added
- Evaluation logic changes
- Summary generation changes
- Thesis evaluation changes

Does NOT require full eval:
- Typo fixes
- Code refactoring without logic change
- Frontend-only styling changes

---

## Evaluation Log

Record completed evaluations here. Each entry must answer the core questions.

### Entry Format

```
### [Date] - [Brief description]

Commit: [hash]
Deck: [name]
Report Version: [version]
Grade: [X] -> [Y] (or unchanged)

Golden Checks: PASS/FAIL
Expected Findings Match: [X of Y matched]

What improved: [one sentence]
What regressed: [one sentence, or "None"]
Tradeoff: [one sentence, or "None"]

Decision: [proceed/proceed with caveat/revert]
Investor-grade progress: [yes/neutral/no]
```

### Evaluation History

---

#### 2026-05-04 - Initial framework creation

Commit: 40b6c2c
Deck: N/A
Report Version: N/A
Grade: N/A

Golden Checks: N/A (no report generated)
Expected Findings Match: N/A

What improved: Framework established
What regressed: None
Tradeoff: None

Decision: Proceed
Investor-grade progress: Neutral (process improvement, not output improvement)

---

## Workflow Integration

When making changes to report generation:

```
1. Run report on Gleamr deck
2. Save output (copy to temp file or screenshot)
3. Run Golden Checks on current output
4. Make your change
5. Run report again on Gleamr
6. Run Golden Checks on new output — STOP if any fail
7. Compare to Expected Findings
8. Compare to previous output
9. Complete Regression Check
10. Fill out full evaluation template
11. Only commit if:
    - Golden Checks pass
    - No unacceptable regressions
    - At least one clear improvement documented
12. Include evaluation summary in commit message
```

To run a report for evaluation:
1. Upload benchmark deck through admin UI
2. Or use existing deck and regenerate report
3. View full report in admin Reports view
4. Compare against Expected Findings

---

## Rubric Source of Truth

The rubric source of truth for **runtime report generation** is:

```
/netlify/functions/lib/rubrics.js
```

A database copy exists in `rubric_versions` and `rubric_questions` tables for:
- Traceability and version history
- Pattern mapping (`pattern_rubric_map` references `question_key`)
- Future admin editing capabilities
- Future DB-driven rubrics

When changing rubric questions:
1. Edit `rubrics.js` first
2. Run `npm run seed:rubrics` in `/scripts` to sync to database
3. Update `RUBRIC_VERSION` if scoring logic changes

---

## Canonical Investor Patterns

The canonical patterns source of truth is:

```
/netlify/functions/lib/canonicalPatterns.js
```

A database copy exists in `patterns`, `pattern_sources`, and `pattern_rubric_map` tables for:
- Traceability and version history
- Future retrieval and querying
- Pattern-to-rubric mapping lookups

**Key principles:**

1. **Patterns are derived from investment memos, not pitch deck aesthetics**
   - Sources: YouTube/Sequoia 2005, Shopify/BVP 2010, SendGrid/BVP 2011
   - Each pattern captures reusable investor reasoning, not generic advice

2. **Patterns map to specific rubric questions, not broad topics**
   - Each mapping includes a `strength` score (1-3) indicating relevance
   - Mappings are validated against `rubric_questions` during seeding

3. **Code is the source of truth, database is the copy**
   - Edit `canonicalPatterns.js` first
   - Run `npm run seed:patterns` to sync to database

When changing patterns:
1. Edit `canonicalPatterns.js` first
2. Run `npm run seed:patterns` in `/scripts` to sync to database
3. Update `PATTERN_VERSION` if pattern structure changes

---

## Report Generation Architecture

The report generator is:

```
/netlify/functions/lib/reportGenerator.js
```

**Concept:** Generate full report now, derive filtered subsets later.

**Main export:**

| Function | Purpose |
|----------|---------|
| `generateFullReport(supabase, deckId)` | Creates full report, derives free report, stores both |

**Flow:**

```
generateFullReport()
    ├── Fetch deck and slides
    ├── Evaluate slides against investor questions (with pattern context)
    ├── Compute deterministic scores
    ├── Evaluate deck-level investment thesis
    ├── Build full_report (source of truth)
    ├── Derive free_report (limited subset, internal for now)
    └── Store both in reports.content
```

**Architecture principles:**

- `full_report` is the source of truth for all analysis
- `free_report` is a derived subset (currently internal)
- Future: configurable filters to include/exclude full_report content
- Current optimization focus: `full_report` quality

**Full report quality goals:**

- Detailed, insightful, actionable investor-grade feedback
- What is missing vs investor expectations
- Why each gap matters to investors (investor_impact)
- How to close each gap (conditional fixes)
- Investor reasoning patterns where relevant

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v1.0 | 2026-05-04 | Initial evaluation framework |
| v1.1 | 2026-05-04 | Add expected findings, regression checks, golden checks |
| v1.2 | 2026-05-04 | Add canonical investor patterns documentation |
| v1.3 | 2026-05-05 | Add report generation architecture, clarify full/free report separation |
| v1.4 | 2026-05-05 | Rename to reportGenerator.js, clean up exports |
| v1.5 | 2026-05-05 | Evaluation system improvements: grade calibration, deck context awareness, pattern misapplication prevention, fix quality, investment_highlights exclusion, recommended_investment_highlights |
| v1.6 | 2026-05-05 | Enhanced RUBRIC_EVAL_PROMPT: gap classification (slide/deck/truly missing), pattern anchoring, strict investor impact, deduplication, competition analysis |
