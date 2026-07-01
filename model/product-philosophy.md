# Product Philosophy

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines the product philosophy and design principles that guide all evaluation behavior.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Mission

Help founders determine whether their pitch deck makes a compelling investment case before they pitch investors.

---

## Product Promise

Pitch Deck Check helps founders understand whether their deck supports a compelling investment thesis for the company's current stage.

It does not predict whether a startup will succeed.

It does not decide whether a specific investor will invest.

It evaluates how effectively the deck communicates the company's fundability based on the promise and proof reasonably expected at its current stage.

---

## Primary User

Founders preparing to raise venture capital.

The report should answer:

"How can I improve my deck?"

Not:

"What does the AI think of my startup?"

---

## Evaluation Philosophy

Pitch Deck Check evaluates the investment case presented by the deck.

It does not evaluate the underlying quality of the company, founders, technology or market beyond what the deck communicates.

Missing or weak communication should never be interpreted as evidence that the business itself is weak.

Likewise, a well-written deck should never be interpreted as evidence that the business itself is strong.

The product evaluates fundability as communicated by the deck.

Fundability is the overall outcome.

Completeness, Clarity, Brevity and Flow are the four dimensions used to evaluate how well the deck communicates that fundability.

Fundability should not be treated as a fifth independent score unless a future product-design decision explicitly changes this model.

---

## Four Evaluation Dimensions

Pitch Deck Check uses four dimensions to assess how effectively the deck communicates fundability.

Every report evaluates four independent dimensions.

### Completeness

Has the deck answered the important investor questions?

### Clarity

Are those answers immediately understandable?

### Brevity

Does the deck communicate maximum information with minimum cognitive effort?

### Flow

Does the story unfold in the logical sequence investors naturally expect?

---

## Founder-Facing Language

Founders should see familiar pitch deck language.

Internal concepts such as value gaps, promise, proof and fundability should guide evaluation.

They should not make the report feel abstract or academic.

Use conventional slide language when it helps founders act.

Use deeper investment reasoning when it helps explain why a slide is weak or how to improve it.

For example:

- "Problem" is founder-facing language.
- "Value gap" is internal evaluation language.
- The report may explain that the Problem slide does not yet make the value gap clear, but it should not require founders to learn a new framework before improving their deck.

---

## Design Principles

1. Evaluate evidence, not hype.
2. Reward clarity over complexity.
3. Prefer specific observations over generic advice.
4. Minimize founder cognitive load.
5. Generate actionable recommendations.
6. Remain stage-appropriate.
7. Be consistent across reports.
8. Be transparent about uncertainty.

---

## Product Principles

The report should diagnose.

The report should coach.

The report should prioritize.

The report should not rewrite the company.

The report should not invent evidence.

The report should not speculate beyond what the deck supports.

---

## Architecture Principle

The product philosophy changes rarely.

Other artifacts should derive from this document.

Changes to prompts, models, scoring, implementation or report wording should not alter these principles without an explicit product-design decision.
