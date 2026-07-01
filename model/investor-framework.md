# Investor Framework

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines the canonical investor question framework used to evaluate pitch deck completeness.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

The Investor Framework defines the questions a complete pitch deck should answer.

It does not define scoring.

It does not define report wording.

It defines only the investment questions investors expect a deck to answer.

---

## Relationship to Company Context

This framework is universal.

Company Context adjusts the expected evidence for each question.

It does not change the questions themselves.

---

## Scope

The Investor Framework evaluates logical sections of an investment story.

These sections are referred to as "Framework Slides."

A Framework Slide is not the same as a physical presentation slide.

A founder may:

- combine multiple Framework Slides into one presentation slide
- spread one Framework Slide across multiple presentation slides
- omit a Framework Slide entirely

The framework evaluates whether the investment story answers the required questions, not whether a specific slide layout is used.

---

## Framework Design Principles

- Every slide exists to answer one investor decision.
- Every investor decision is supported by three evidence questions.
- Evidence questions should not overlap with other slides.
- Questions should naturally elicit evidence rather than opinions.
- Questions should be understandable by founders without investor training.
- The framework should remain stable over time.

---

## Canonical Order

Framework Slides are intentionally ordered.

The order represents the sequence in which investors naturally evaluate an investment opportunity.

Flow evaluates how effectively the deck follows this sequence.

Individual decks may deviate from the canonical order, but unnecessary deviations may reduce Flow.

---

## Canonical Framework Slide Sequence

The Investor Framework contains exactly sixteen Framework Slides.

They shall always appear in the following canonical order.

1. Cover
2. Team
3. Problem
4. Why Now
5. Solution
6. Product
7. Competition
8. Moat & Defensibility
9. Business Model
10. Market Opportunity
11. Traction
12. Go-to-Market
13. Product Roadmap
14. Financials
15. Funding
16. Contact

This sequence represents the default investment narrative.

Individual decks may combine, split, omit or reorder presentation slides.

The Framework itself always uses this canonical sequence.

---

## Slide Definition Standard

Every slide in this framework contains exactly four elements.

### Purpose

Why this slide exists.

### Investor Decision

The single question an investor is trying to answer before moving on.

### Evidence Questions

Exactly three questions the slide should answer.

### Context Notes

Context Notes define how investor expectations change across Company Contexts.

Context Notes never change the Investor Decision.

They only change the evidence reasonably expected.

Every Framework Slide should contain one Context Note for each Company Context:

- Idea / Pre-Product
- Product / Pre-Revenue
- Early Revenue
- Growth

If no adjustment is required for a particular context, the Context Note should explicitly state:

"No adjustment."

This keeps every Framework Slide structurally consistent.

Each Context Note should normally consist of two concise statements.

The first describes what investors reasonably expect at that Company Context.

The second describes what should not yet be expected.

The goal is to calibrate investor expectations while keeping the report concise and natural to read.

If no adjustment is required, use the canonical phrase:

"No adjustment."

---

## Framework Constraints

Every Framework Slide shall contain exactly:

- one Name
- one Framework Slide Category
- one Purpose
- one Investor Decision
- one Context Notes section
- one Completeness Designation

In addition:

- Evidence-Bearing Framework Slides shall contain exactly three Evidence Questions.
- Orientation / Logistics Framework Slides shall instead define Minimum Information.

Every Framework Slide should be independently understandable.

Evidence Questions should collectively answer the Investor Decision.

---

## Framework Completeness

A Framework Slide may be:

- Required
- Context Dependent
- Optional

This designation will be assigned when individual Framework Slides are authored.

Completeness evaluation will use this designation together with Company Context.

The Investor Framework defines these designations.

The Scoring Rubric determines how they influence scoring.

---

## Framework Slide Schema

Every Framework Slide shall contain the following fields.

### Name

The canonical Framework Slide name.

Framework Slide names shall be unique.

### Framework Slide Category

Exactly one of:

- Evidence-Bearing
- Orientation / Logistics

Evidence-Bearing Framework Slides contain Evidence Questions.

Orientation / Logistics Framework Slides contain Minimum Information.

### Purpose

Exactly one.

### Investor Decision

Exactly one.

### Evidence Questions

Framework Slides whose primary purpose is evaluating an investment claim shall contain exactly three Evidence Questions.

Framework Slides whose primary purpose is orientation or logistics shall contain no mandatory Evidence Questions.

Instead they shall define the minimum information required for that Framework Slide.

Under the current framework, the only Orientation / Logistics Framework Slides are:

- Cover
- Contact

All other Framework Slides shall contain exactly three Evidence Questions.

### Minimum Information

Framework Slides without Evidence Questions shall define the minimum information that must be present for the slide to be considered complete.

Minimum Information should be objective, concise, and independent of presentation style.

### Context Notes

Exactly four.

One for each Company Context:

- Idea / Pre-Product
- Product / Pre-Revenue
- Early Revenue
- Growth

### Completeness Designation

Exactly one of:

- Required
- Context Dependent
- Optional

If the designation is Context Dependent, the Framework Slide shall explicitly list the Company Context(s) in which it is Required.

This is a product-design decision, not a scoring decision.

---

## Naming Principles

Framework Slide names should:

- describe the investor question being answered
- be stable over time
- avoid implementation terminology
- be understandable by founders
- remain independent of any specific presentation template

---

## Cross-Artifact Responsibilities

The Investor Framework defines:

- the canonical investment story
- Framework Slides
- Investor Decisions
- Evidence Questions
- Context Notes
- Framework Completeness

The Investor Framework does not define:

- scores
- report wording
- recommendations
- implementation
- report generation

Those responsibilities belong to other product artifacts.

---

## Future Evolution

New Framework Slides should be introduced only when they represent a genuinely new investor decision.

A missing Evidence Question should normally be added to an existing Framework Slide rather than creating a new one.

The framework should favor stability over completeness.

---

## Future Principle

The slide framework should evolve slowly.

Investor Decisions should change only when there is strong evidence that investors consistently evaluate companies differently.

Evidence Questions may be refined over time provided they remain consistent with the Investor Decision.

---

# Framework Slide 1 — Cover

Name

Cover

Framework Slide Category

Orientation / Logistics

Purpose

Allow an investor to immediately understand what the company does and whether they should continue reading.

Investor Decision

What does this company do, who is it for, and why should I care?

Minimum Information

The Cover slide should clearly communicate:

- Company name.
- A concise one-sentence description of what the company does.
- The primary customer.
- The primary benefit or outcome delivered.

Context Notes

### Idea / Pre-Product

No adjustment.

### Product / Pre-Revenue

No adjustment.

### Early Revenue

No adjustment.

### Growth

No adjustment.

Completeness Designation

Required

---

# Framework Slide 2 — Team

Name

Team

Framework Slide Category

Evidence-Bearing

Purpose

Demonstrate why this team is unusually well positioned to solve this problem and build this company.

Investor Decision

Why is this team more likely to succeed than other capable teams?

Evidence Questions

1. What relevant experience, expertise or insight gives this team an advantage?

2. What unique insight, access or advantage positions this team to solve this problem better than others?

3. What evidence suggests this team can execute successfully?

Context Notes

### Idea / Pre-Product

Expect stronger evidence around founder insight, domain expertise, technical capability or unique access.

Do not yet expect startup traction.

### Product / Pre-Revenue

Expect evidence that the team has successfully built the product and attracted early users or design partners.

Do not yet expect a proven commercial organization.

### Early Revenue

Expect evidence that the team can execute across product, customer acquisition and company building.

Do not yet expect a fully mature executive team.

### Growth

Expect evidence that the leadership team can scale the company, attract talent and execute consistently.

Do not expect every executive role to be fully built out.

Completeness Designation

Required

---

# Framework Slide 3 — Problem

Name

Problem

Framework Slide Category

Evidence-Bearing

Purpose

Demonstrate that the company is solving a meaningful problem that is painful enough to justify a venture-backed business.

Investor Decision

Is this a sufficiently important problem to build a large company around?

Evidence Questions

1. Who experiences this problem, and how significant is it for them?

2. How do customers solve this problem today, and why are those approaches inadequate?

3. What evidence demonstrates that this problem is real, significant and worth solving?

Context Notes

### Idea / Pre-Product

Expect compelling evidence that the problem exists and is important, even if customer validation is still limited.

Do not yet expect large-scale customer proof.

### Product / Pre-Revenue

Expect early validation that customers recognize the problem and value the proposed solution.

Do not yet expect broad market adoption.

### Early Revenue

Expect evidence that customers are actively paying to solve the problem and that demand is repeatable.

Do not yet expect dominant market penetration.

### Growth

Expect strong evidence that the problem supports a large and durable business opportunity.

Do not expect a strong problem statement to substitute for traction or execution.

Completeness Designation

Required

---

# Framework Slide 4 — Why Now

Name

Why Now

Framework Slide Category

Evidence-Bearing

Purpose

Demonstrate why this company has an unusually attractive opportunity to succeed now rather than at another point in time.

Investor Decision

Why is this the right time for this company to exist?

Evidence Questions

1. What has changed that makes this opportunity possible now?

2. Why would this company have struggled to succeed three to five years ago?

3. What durable market, technology, regulatory or behavioral shifts create a favorable window for success?

Context Notes

### Idea / Pre-Product

Expect a clear and credible explanation of why this opportunity exists now.

Do not yet expect proof that the timing thesis has played out commercially.

### Product / Pre-Revenue

Expect early evidence that the timing thesis is reflected in customer interest or adoption.

Do not yet expect broad market validation.

### Early Revenue

Expect evidence that customers are responding to the underlying market shift and that the opportunity is strengthening.

Do not yet expect timing alone to explain commercial success.

### Growth

Expect evidence that the underlying market shift continues to create durable tailwinds for growth.

Do not expect market timing to substitute for competitive execution.

Completeness Designation

Required

---

# Framework Slide 5 — Solution

Name

Solution

Framework Slide Category

Evidence-Bearing

Purpose

Demonstrate that the company's approach solves the stated problem in a meaningfully better way.

Investor Decision

Is this solution compelling enough that customers will choose it over their current approach?

Evidence Questions

1. What is the company's solution to the problem?

2. What customer outcome improves, and by how much?

3. Why is this solution meaningfully better than the customer's current approach?

Context Notes

### Idea / Pre-Product

Expect a clear and credible explanation of the proposed solution and the value it intends to create.

Do not yet expect extensive customer validation.

### Product / Pre-Revenue

Expect early evidence that customers understand and value the proposed solution.

Do not yet expect large-scale proof of adoption.

### Early Revenue

Expect evidence that customers are adopting the solution because it delivers meaningful value.

Do not yet expect widespread market leadership.

### Growth

Expect strong evidence that the solution continues to deliver differentiated customer value at scale.

Do not expect the solution description alone to substitute for competitive advantage or execution.

Completeness Designation

Required
