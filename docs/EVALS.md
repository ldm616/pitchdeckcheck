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

| Deck | Description | Primary Use |
|------|-------------|-------------|
| Gleamr | Current primary test deck | All evaluations |
| TBD | Add 2-4 more decks with different characteristics | |

When adding benchmark decks, include variety:
- Different industries
- Different stages (pre-seed, seed)
- Different quality levels (strong, weak, mixed)
- Different structures (standard, non-standard)

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

### Results

**Overall Grade:** [A-E]
**Deck Score:** [X.XX/5.0]

**Top Strength (from report):**
[quote or paraphrase]

**Top Weakness (from report):**
[quote or paraphrase]

### Criteria Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Accuracy | Good/Mixed/Poor | |
| Specificity | Good/Mixed/Poor | |
| Actionability | Good/Mixed/Poor | |
| Traceability | Good/Mixed/Poor | |
| Differentiation | Good/Mixed/Poor | |

### Changes Observed

**What improved:**
- [specific improvement]

**What regressed:**
- [specific regression, or "None observed"]

**False positives:**
- [issues flagged that aren't real problems]

**False negatives:**
- [real issues that were missed]

### Decision

[ ] Proceed - improvement is clear
[ ] Proceed with caveat - tradeoff is intentional
[ ] Revert - regression outweighs improvement
[ ] Needs more testing

**Notes:**
[any additional context]
```

---

## Rules for Iteration

### Before Making Changes

1. Identify what you're trying to improve
2. Predict how the change will affect output
3. Note current benchmark output for comparison

### When Making Changes

1. Make ONE meaningful change at a time
2. Run report on at least one benchmark deck
3. Fill out evaluation template
4. Compare against previous run (not just inspect current)

### After Making Changes

1. Document at least one improvement OR one regression
2. Do not rely on "feels better" - cite specific differences
3. If regression is found, decide: revert or accept tradeoff
4. Update RUBRIC_VERSION if scoring logic changes
5. Commit with clear description of what changed and why

### What Counts as "Meaningful Change"

- Prompt wording changes
- Scoring scale or threshold changes
- New fields or sections added
- Evaluation logic changes
- Summary generation changes

Does NOT require full eval:
- Typo fixes
- Code refactoring without logic change
- Frontend-only styling changes

---

## Evaluation Log

Record completed evaluations here for reference.

### Template Entry

```
### [Date] - [Brief description]

Commit: [hash]
Deck: [name]
Grade: [X] -> [Y] (or unchanged)
Key finding: [one sentence]
Decision: [proceed/revert/caveat]
```

---

### [Example Entry - Delete after first real eval]

```
### 2026-05-04 - Initial framework creation

Commit: (pending)
Deck: N/A
Grade: N/A
Key finding: Framework established, no evaluation run yet
Decision: Proceed
```

---

## Workflow Integration

When making changes to report generation:

```
1. Run report on Gleamr deck (or other benchmark)
2. Save output for comparison
3. Make your change
4. Run report again on same deck
5. Fill out evaluation template above
6. Compare outputs side-by-side
7. Only commit if improvement is clear or tradeoff is intentional
8. Include evaluation summary in commit message
```

To run a report for evaluation:
1. Upload benchmark deck through admin UI
2. Or use existing deck and regenerate report
3. View full report in admin Reports view

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v1.0 | 2026-05-04 | Initial evaluation framework |
