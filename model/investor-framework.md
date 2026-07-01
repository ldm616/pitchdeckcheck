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

2. What unique insight, access or advantage positions this team to understand and close this value gap better than others?

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

Demonstrate that a clearly defined customer experiences a meaningful value gap with consequences significant enough to justify a venture-backed business.

Investor Decision

Is there a meaningful value gap that customers are motivated to close?

Evidence Questions

1. Who experiences this value gap, and what consequences does it create for them?

2. How do customers try to close this value gap today, and why do those approaches fall short?

3. What evidence demonstrates that this value gap is real, significant and worth solving?

Context Notes

### Idea / Pre-Product

Expect compelling evidence that the value gap exists and is important, even if customer validation is still limited.

Do not yet expect large-scale customer proof.

### Product / Pre-Revenue

Expect early validation that customers recognize the value gap and care about closing it.

Do not yet expect broad market adoption.

### Early Revenue

Expect evidence that customers are actively paying to close the value gap and that demand is repeatable.

Do not yet expect dominant market penetration.

### Growth

Expect strong evidence that the value gap supports a large and durable business opportunity.

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

Define the ideal future state customers want if the value gap is successfully closed.

Investor Decision

Do I believe the founders understand what a winning solution should make possible for customers?

Evidence Questions

1. What should customers be able to achieve if the value gap is closed?

2. What customer value would this future state create?

3. Why would customers prefer this future state over their current approach?

Context Notes

### Idea / Pre-Product

Expect a clear and credible vision of the future state customers want.

Do not yet expect product maturity or customer validation.

### Product / Pre-Revenue

Expect the future state to be specific enough that customers can understand why it is valuable.

Do not expect the Solution slide to prove that the product already delivers it.

### Early Revenue

Expect the future state to connect clearly to why early customers are adopting or paying.

Do not expect the Solution slide to carry the burden of proving repeatable traction.

### Growth

Expect the future state to remain compelling as the company scales and expands.

Do not expect the Solution slide to substitute for product execution, competitive advantage or traction.

Completeness Designation

Required

---

# Framework Slide 6 — Product

Name

Product

Framework Slide Category

Evidence-Bearing

Purpose

Demonstrate how this company has implemented the ideal future state in a product customers can successfully use.

Investor Decision

Do I believe this product can reliably deliver the promised customer value?

Evidence Questions

1. How does the product enable customers to achieve the promised future state?

2. What aspects of the product make that value practical, reliable or usable?

3. What evidence suggests the product consistently delivers the promised customer value?

Context Notes

### Idea / Pre-Product

Expect a credible explanation of how the product is intended to make the future state possible.

Do not yet expect a fully developed or customer-tested product.

### Product / Pre-Revenue

Expect evidence that the core product has been built and is usable by early users, pilots or design partners.

Do not yet expect a polished, feature-complete or commercially proven product.

### Early Revenue

Expect evidence that paying customers can use the product to realize the promised value.

Do not yet expect every planned capability to be complete.

### Growth

Expect evidence that the product reliably delivers customer value at scale and continues to improve.

Do not expect product breadth alone to substitute for differentiated customer value.

Completeness Designation

Required

---

# Framework Slide 7 — Competition

Name

Competition

Framework Slide Category

Evidence-Bearing

Purpose

Show how customers currently try to close the value gap and why this company is positioned to deliver more value than those alternatives.

Investor Decision

Why will customers choose this company instead of existing alternatives?

Evidence Questions

1. What alternatives do customers use today, including incumbents, substitutes, workarounds or doing nothing?

2. Where do those alternatives fall short in closing the value gap?

3. Why does this company deliver more customer value than the alternatives customers compare it against?

Context Notes

### Idea / Pre-Product

Expect a clear understanding of the competitive landscape and the customer's current alternatives.

Do not yet expect competitive wins or market share.

### Product / Pre-Revenue

Expect evidence that early users understand why this product is meaningfully better than alternatives.

Do not yet expect a proven competitive win rate.

### Early Revenue

Expect evidence that customers are choosing this product over real alternatives.

Do not yet expect broad category leadership.

### Growth

Expect evidence that the company can keep winning against increasingly sophisticated competitors.

Do not expect early differentiation to substitute for durable advantage.

Completeness Designation

Required

---

# Framework Slide 8 — Moat & Defensibility

Name

Moat & Defensibility

Framework Slide Category

Evidence-Bearing

Purpose

Explain why the company's ability to deliver superior customer value can become durable as competitors respond.

Investor Decision

Why won't competitors erode this company's advantage over time?

Evidence Questions

1. What specific advantages make the company's value difficult for competitors to copy or neutralize?

2. How do those advantages strengthen as the company grows?

3. What evidence suggests the company can defend its position as the market becomes more competitive?

Context Notes

### Idea / Pre-Product

Expect a credible theory for why the company's advantage could become defensible over time.

Do not yet expect proven moats or durable market position.

### Product / Pre-Revenue

Expect early evidence that the product, insight, technology, access or go-to-market wedge could create defensibility.

Do not yet expect defensibility to be fully proven.

### Early Revenue

Expect evidence that early customer adoption, product usage, data, workflow integration or distribution advantages are beginning to strengthen the company's position.

Do not yet expect the company to have an unassailable moat.

### Growth

Expect strong evidence that the company's advantages are compounding and becoming harder for competitors to overcome.

Do not expect early differentiation or market momentum alone to substitute for durable defensibility.

Completeness Designation

Required

---

# Framework Slide 9 — Business Model

Name

Business Model

Framework Slide Category

Evidence-Bearing

Purpose

Explain how the company captures value from the customer value it creates.

Investor Decision

Can this company turn customer value into a large, durable and attractive business?

Evidence Questions

1. Who pays, what do they pay for, and why is the pricing aligned with the value created?

2. What makes the business model scalable, repeatable or economically attractive?

3. What evidence suggests customers will pay enough for this to become a meaningful business?

Context Notes

### Idea / Pre-Product

Expect a credible hypothesis for how the company will capture value.

Do not yet expect validated pricing, revenue or unit economics.

### Product / Pre-Revenue

Expect early evidence that the proposed business model makes sense to customers or buyers.

Do not yet expect meaningful revenue or proven unit economics.

### Early Revenue

Expect evidence that customers are paying and that the business model can become repeatable.

Do not yet expect fully optimized pricing, margins or unit economics.

### Growth

Expect strong evidence that the business model scales efficiently and supports attractive long-term economics.

Do not expect revenue growth alone to substitute for durable value capture.

Completeness Designation

Required

---

# Framework Slide 10 — Market Opportunity

Name

Market Opportunity

Framework Slide Category

Evidence-Bearing

Purpose

Show that the company can become large because the value gap exists across a sufficiently large and reachable market.

Investor Decision

Is this opportunity large enough to support venture-scale returns?

Evidence Questions

1. Who is the initial target market, and why is that segment the right starting point?

2. How large could the opportunity become if the company successfully expands beyond the initial segment?

3. What evidence supports the market size, growth or reachability claims?

Context Notes

### Idea / Pre-Product

Expect a credible market thesis and a clear initial customer segment.

Do not yet expect bottom-up sizing to be fully validated by customer data.

### Product / Pre-Revenue

Expect evidence that the initial target segment is reachable and has meaningful demand.

Do not yet expect proof of broad market penetration.

### Early Revenue

Expect evidence that early customers represent a repeatable segment and that expansion paths are plausible.

Do not yet expect the company to have captured meaningful market share.

### Growth

Expect strong evidence that the company is expanding into a large, durable and economically attractive market.

Do not expect top-down market size alone to substitute for evidence of reachability and demand.

Completeness Designation

Required

---

# Framework Slide 11 — Traction

Name

Traction

Framework Slide Category

Evidence-Bearing

Purpose

Show that customers are beginning to adopt, use, pay for or otherwise validate the company's product or thesis.

Investor Decision

What evidence shows that the company's promise is becoming proof?

Evidence Questions

1. What measurable customer, usage, revenue or validation milestones has the company achieved?

2. What does the trajectory of those milestones suggest about customer demand or momentum?

3. What evidence suggests the traction is meaningful rather than superficial?

Context Notes

### Idea / Pre-Product

Expect any available evidence that supports the company's thesis, such as customer discovery, waitlists, design partners, pilots, letters of intent or other credible validation.

Do not expect product usage, revenue or growth metrics.

### Product / Pre-Revenue

Expect evidence that early users, pilots or design partners are engaging with the product or validating the value proposition.

Do not yet expect meaningful revenue or repeatable growth.

### Early Revenue

Expect evidence that customers are paying, usage is increasing or early revenue is growing.

Do not yet expect fully predictable growth, mature retention data or optimized acquisition.

### Growth

Expect strong evidence of durable growth, retention, expansion, revenue quality or other meaningful traction metrics.

Do not expect vanity metrics to substitute for proof of customer value and business momentum.

Completeness Designation

Context Dependent

Required in the following contexts:

- Product / Pre-Revenue
- Early Revenue
- Growth

---

# Framework Slide 12 — Go-to-Market

Name

Go-to-Market

Framework Slide Category

Evidence-Bearing

Purpose

Explain how the company will reach, acquire and expand customers efficiently enough to build a large business.

Investor Decision

Can this company repeatedly and efficiently acquire the customers it needs to scale?

Evidence Questions

1. What customer acquisition motion will the company use, and why is it appropriate for the target market?

2. What evidence suggests the company can reach customers through this motion efficiently?

3. How can the go-to-market motion become more repeatable, scalable or efficient over time?

Context Notes

### Idea / Pre-Product

Expect a credible hypothesis for how the company will reach its initial customers.

Do not yet expect validated acquisition channels, CAC or repeatable sales motion.

### Product / Pre-Revenue

Expect early evidence that the company can reach and engage the right customers or buyers.

Do not yet expect a fully repeatable or efficient acquisition engine.

### Early Revenue

Expect evidence that customer acquisition is becoming repeatable and that early channel economics are plausible.

Do not yet expect mature CAC, payback or sales productivity metrics.

### Growth

Expect strong evidence that customer acquisition can scale efficiently across segments, channels or geographies.

Do not expect growth alone to substitute for evidence of efficient and repeatable acquisition.

Completeness Designation

Context Dependent

Required in the following contexts:

- Product / Pre-Revenue
- Early Revenue
- Growth

---

# Framework Slide 13 — Product Roadmap

Name

Product Roadmap

Framework Slide Category

Evidence-Bearing

Purpose

Explain what the company must build next to deepen customer value, expand the opportunity or strengthen defensibility.

Investor Decision

Does the product roadmap show a credible path to greater customer value and company value?

Evidence Questions

1. What are the most important product milestones the company plans to achieve next?

2. Why are those milestones the right priorities for increasing customer value, market reach or defensibility?

3. What evidence suggests the company can execute this roadmap?

Context Notes

### Idea / Pre-Product

Expect a credible sequence for turning the product concept into something customers can use.

Do not yet expect a detailed or validated product roadmap.

### Product / Pre-Revenue

Expect a clear plan for improving the product based on early user learning or product gaps.

Do not yet expect the roadmap to be fully validated by commercial data.

### Early Revenue

Expect evidence that the roadmap is shaped by customer usage, willingness to pay or expansion opportunities.

Do not yet expect every roadmap item to be precisely scheduled or fully resourced.

### Growth

Expect a roadmap that supports expansion, retention, differentiation or defensibility at scale.

Do not expect feature volume to substitute for strategic product sequencing.

Completeness Designation

Context Dependent

Required in the following contexts:

- Product / Pre-Revenue
- Early Revenue
- Growth

---

# Framework Slide 14 — Financials

Name

Financials

Framework Slide Category

Evidence-Bearing

Purpose

Show how the company's strategy translates into a credible financial trajectory.

Investor Decision

Do the financials support a believable path to meaningful company value?

Evidence Questions

1. What financial trajectory does the company project, and what are the key assumptions behind it?

2. How do revenue, costs, margins, burn and runway connect to the company's operating plan?

3. What evidence makes the financial assumptions credible for the company's stage?

Context Notes

### Idea / Pre-Product

Expect a simple financial model or milestone-based plan that shows how the company thinks about resources and value creation.

Do not expect validated revenue, margins or unit economics.

### Product / Pre-Revenue

Expect a basic forecast tied to product milestones, early customer learning and expected go-to-market motion.

Do not yet expect meaningful revenue history or fully validated assumptions.

### Early Revenue

Expect financials that connect actual revenue, burn, customer acquisition and operating costs to a credible growth plan.

Do not yet expect mature margins, predictable forecasting or optimized economics.

### Growth

Expect detailed financials showing revenue quality, margin structure, burn efficiency, runway and path toward durable enterprise value.

Do not expect optimistic projections to substitute for defensible assumptions.

Completeness Designation

Context Dependent

Required in the following contexts:

- Product / Pre-Revenue
- Early Revenue
- Growth

---

# Framework Slide 15 — Funding

Name

Funding

Framework Slide Category

Evidence-Bearing

Purpose

Explain the financing request and why this amount of capital is the right next step for increasing company value.

Investor Decision

Does this financing plan create a credible path to the next major value-creating milestone?

Evidence Questions

1. How much capital is the company raising, and why is that amount appropriate?

2. How will the capital be used to advance the company toward specific milestones?

3. What should be true about the company by the time this financing is spent?

Context Notes

### Idea / Pre-Product

Expect a clear financing ask and a credible explanation of what the capital will enable.

Do not yet expect detailed milestone economics or validated capital efficiency.

### Product / Pre-Revenue

Expect the financing plan to connect capital use to product, validation and early go-to-market milestones.

Do not yet expect the use of proceeds to be supported by mature operating data.

### Early Revenue

Expect the financing plan to connect capital use to revenue growth, repeatability, product development or team expansion.

Do not yet expect capital efficiency to be fully optimized.

### Growth

Expect a clear financing plan tied to growth, efficiency, expansion and value creation milestones.

Do not expect a large raise to substitute for a credible plan for using capital effectively.

Completeness Designation

Required

---

# Framework Slide 16 — Contact

Name

Contact

Framework Slide Category

Orientation / Logistics

Purpose

Make it easy for an interested investor to follow up with the company.

Investor Decision

How do I continue the conversation with this company?

Minimum Information

- Company name.
- Founder or primary contact name.
- Direct email address or other clear contact method.
- Optional website or company URL.

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
