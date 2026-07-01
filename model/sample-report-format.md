# Sample Report Format

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines the sample founder-facing report format for Pitch Deck Check.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

Sample Report Format defines how a Pitch Deck Check report should look and feel to founders.

It translates the Report Specification, Scoring Rubric and Calibration Examples into a readable report format.

It does not define implementation logic.

It does not define scoring formulas.

It does not replace the Report Specification.

It provides a product-owned format reference for:

- generated reports
- public sample reports
- internal QA
- future prompt calibration

---

## Format Principles

The report should be easy to skim.

The report should quickly answer:

- Is this deck investor-ready?
- What is the overall diagnosis?
- What is working?
- What is weak?
- What should I fix first?

The report should not feel like a scoring spreadsheet.

The report should not overwhelm founders with rubric mechanics.

The report should show enough structure to build trust without exposing unnecessary internal methodology.

The report should emphasize practical diagnosis over abstract scoring.

---

## Sample Report Skeleton

The report should follow this founder-facing order:

1. Header
2. Context Summary
3. Overall Grade
4. Deck Communication Scores
5. Investment Case as Presented
6. Primary Diagnosis
7. What Investors May Believe
8. What Investors May Question
9. Priority Improvements
10. Slide-Level Feedback
11. Suggested Next Steps
12. Save / Share / Upgrade Section

This order may differ slightly from internal processing order.

The founder-facing report should lead with the overall interpretation before detailed slide feedback.

---

## Header Format

The Header should include:

- report title
- company name, if available
- deck filename, if useful
- analysis timestamp, if available
- short positioning statement

Example format:

Pitch Deck Check Report

Company: [Company Name]

Deck: [Deck Filename]

Generated: [Date / Time]

This report evaluates the pitch deck as presented. It does not predict fundraising success or judge the company's ultimate potential outside the deck.

---

## Context Summary Format

Context Summary should show the assumptions used to evaluate the deck.

Example format:

### Context Summary

Detected Company Context: Product / Pre-Revenue

Context Confidence: Medium

Intended Investor Audience: Seed venture capital

Target Raise: Not provided

Evaluation Note: Because the intended investor audience and raise amount are incomplete, Investor Fit is evaluated cautiously.

Context Summary should be brief.

If confidence is low, the report should say so.

If investor audience is unknown, the report should avoid precise claims about fundability for a specific investor type.

---

## Overall Grade Format

Overall Grade should be prominent.

Example format:

### Overall Grade: B-

This deck communicates a promising early-stage thesis, but it is not yet consistently investor-ready. The main limitation is that several important claims are under-supported for the intended investor audience.

Primary Constraint: Evidence

What this means: Investors can understand the opportunity, but they may not yet believe the core claims strongly enough to continue without more proof.

The Overall Grade explanation should include:

- grade
- concise interpretation
- primary constraint or binding issue
- what the grade means in practical terms

If a gate limits the grade, identify the issue in founder-facing language.

Do not refer to internal scoring mechanics unless necessary.

---

## Deck Communication Scores Format

Deck Communication Scores should be shown as a compact diagnostic table or card group.

Example format:

### Deck Communication Scores

| Dimension | Score | What it means |
|---|---:|---|
| Completeness | 3/5 — Adequate | Most core investor questions are addressed, but several important claims need stronger support. |
| Clarity | 4/5 — Strong | The core company story is easy to understand. |
| Brevity | 4/5 — Strong | The deck communicates efficiently without much unnecessary detail. |
| Flow | 4/5 — Strong | The narrative sequence is logical and investor-friendly. |

Below the table, include one short diagnostic paragraph.

Example:

The deck is generally clear and efficient. The main communication issue is not structure or wording; it is that several important investor questions need stronger evidence.

Deck Communication Scores should not be presented as a full explanation of fundability.

---

## Investment Case as Presented Format

Investment Case as Presented should be shown separately from Deck Communication Scores.

Example format:

### Investment Case as Presented

| Area | Assessment | Interpretation |
|---|---|---|
| Opportunity Strength | Promising but Under-Supported | The deck describes a meaningful value gap, but market validation is still early. |
| Execution Credibility | Mixed | The team appears thoughtful, but the deck needs stronger proof that this team can execute the plan. |
| Investor Fit | Not Enough Information | The deck does not provide enough information about the target raise or intended investor audience. |

This section should explain whether the pitch itself appears compelling, credible and matched to the intended investor audience.

It should not display Opportunity Strength, Execution Credibility or Investor Fit as 1–5 scores.

It should not display a separate Fundability Score.

---

## Primary Diagnosis Format

Primary Diagnosis should explain the most important takeaway in plain language.

Example format:

### Primary Diagnosis

The deck is promising but under-supported.

The story is clear, but investors may hesitate because the deck does not yet provide enough evidence that the market urgently wants this solution or that the company can reliably reach early customers.

This section should answer:

- what is the main issue?
- is it communication, evidence, substance or investor fit?
- what should the founder focus on first?

Primary Diagnosis should not simply restate the Overall Grade.

---

## What Investors May Believe Format

This section should summarize the strongest supported positives.

Example format:

### What Investors May Believe

Investors may believe that:

- The company is addressing a real customer problem.
- The founders have a thoughtful view of the market.
- The solution vision is understandable.
- The deck is clear enough to evaluate the basic thesis.

Only include claims that the deck reasonably supports.

Do not invent strengths.

Do not use this section to flatter weak evidence.

---

## What Investors May Question Format

This section should summarize the most important unresolved concerns.

Example format:

### What Investors May Question

Investors may ask:

- Is the value gap urgent enough to drive customer behavior change?
- What evidence shows customers are already seeking this outcome?
- Can this team reach early customers efficiently?
- Is the market large enough for the intended investor audience?

This section should focus on central investor questions.

It should not list every possible objection.

When Market Validation is weak or missing, surface it here if it is central to investor confidence.

---

## Priority Improvements Format

Priority Improvements should give the founder the highest-impact fixes first.

Example format:

### Priority Improvements

1. Strengthen market validation.
   - Why it matters: Investors need evidence that customers already want the promised future state.
   - What to add: Customer discovery, waitlist quality, pilot interest, proxy behavior, competitor/substitute metrics or other evidence that demand is real.
   - Issue type: Evidence.

2. Clarify the investor audience.
   - Why it matters: Investor Fit cannot be evaluated precisely without knowing who the deck is targeting.
   - What to add: Target raise amount, round stage and intended investor type.
   - Issue type: Investor Fit.

3. Add proof that the go-to-market path is plausible.
   - Why it matters: Investors need to believe the company can reach early customers.
   - What to add: Early channel tests, design partner pipeline, founder-led sales evidence or segment-specific acquisition logic.
   - Issue type: Evidence / Execution Credibility.

The first version should usually show three to five priorities.

Each priority should include:

- the issue
- why it matters
- what to improve
- issue type

Priority Improvements should consolidate repeated issues rather than restating them.

---

## Slide-Level Feedback Format

Slide-Level Feedback should provide specific feedback without overwhelming the founder.

Example format:

### Slide-Level Feedback

#### Problem

Investor Decision: Is there a meaningful value gap that customers are motivated to close?

Assessment: Partially answered.

What works: The deck identifies a clear customer pain and explains why current alternatives are frustrating.

What is missing: The deck needs stronger evidence that the pain is urgent enough to drive behavior change.

Recommended improvement: Add customer quotes, discovery evidence, usage of imperfect substitutes or other proof that the value gap is real and important.

Issue type: Evidence.

#### Market Opportunity

Investor Decision: Is this opportunity large enough to support venture-scale returns?

Assessment: Under-supported.

What works: The deck identifies a plausible initial segment.

What is missing: The market size and expansion path are not yet supported with enough bottom-up or proxy evidence.

Recommended improvement: Show how the initial segment expands into a larger reachable market.

Issue type: Evidence / Opportunity Strength.

Slide-Level Feedback may be organized by physical deck slide or Framework Slide.

When a physical slide covers multiple Framework Slides, the report should explain the combined role clearly.

When a Framework Slide is missing, the report should explain the investor question left unanswered.

---

## Suggested Next Steps Format

Suggested Next Steps should turn the diagnosis into a practical workflow.

Example format:

### Suggested Next Steps

1. Decide who this deck is for.
   Clarify whether the target audience is angels, pre-seed funds, seed funds, strategic investors or top-tier venture capital.

2. Add evidence before polishing language.
   The deck is already understandable. The next improvement should be stronger proof, not more copywriting.

3. Strengthen the market-validation story.
   Add direct or proxy evidence that customers already want the outcome and are willing to change behavior.

4. Re-run the analysis after revision.
   Use the revised deck to check whether the primary constraint has shifted from evidence to investor fit or execution credibility.

Suggested Next Steps should be practical.

They should not imply that every issue can be fixed through wording.

When the issue is substantive, say what evidence, progress or targeting change would make the pitch stronger.

---

## Save / Share / Upgrade Format

The Save / Share / Upgrade section should support product growth without undermining the value of the free report.

Example format:

### Save or Improve This Report

Save this report so you can compare it against your next deck revision.

Optional next steps:

- Download this report.
- Share this report with a cofounder or advisor.
- Re-run Pitch Deck Check after revising your deck.
- Upgrade for detailed slide-by-slide improvement guidance.
- Upgrade for investor-targeting guidance.

This section should feel like a natural next step.

It should not make the free report feel incomplete.

---

## Public Sample Report Guidance

Public sample reports should show enough value to build trust without exposing unnecessary internal methodology.

Public samples may include:

- Overall Grade
- Deck Communication Scores
- Investment Case as Presented
- Primary Diagnosis
- What Investors May Believe
- What Investors May Question
- top Priority Improvements
- selected Slide-Level Feedback

Public samples do not need to include:

- every Framework Slide
- full internal scoring rationale
- gate mechanics
- weighting details
- complete rubric logic

Public sample reports should be curated.

They should show realistic feedback and preserve the distinction between communication issues, evidence issues, substantive issues and investor fit.

When using a public deck from a well-known company, the sample should clearly state that the report evaluates the deck as presented, without hindsight from the company's later success.

The sample should avoid implying affiliation with the company.

---

## Current Scope

This artifact defines the founder-facing sample report format.

Future versions may define:

- full sample reports
- public homepage sample report excerpts
- sample report formatting for mobile
- downloadable PDF report layout
- paid report format
- before/after revision examples
- company-specific sample reports
- anonymized founder examples

Those decisions should not be implemented until they are explicitly authored in this artifact or a downstream product-owned artifact.
