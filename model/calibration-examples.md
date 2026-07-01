# Calibration Examples

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Provides worked examples for calibrating Pitch Deck Check scoring and report interpretation.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

Calibration Examples help keep Pitch Deck Check evaluations consistent.

They illustrate how the Scoring Rubric and Report Specification should behave in realistic edge cases.

They do not define implementation logic.

They do not replace the Scoring Rubric.

They do not define prompts.

They provide product-owned examples for interpreting:

- Deck Communication Scores
- Investment Case as Presented
- gates and binding constraints
- Overall Grade
- Primary Diagnosis
- founder-facing explanation

---

## Calibration Principles

Examples should show how the evaluation model behaves when scores conflict.

The most important cases are not obvious failures or obvious successes.

The most important cases are borderline or mixed cases where the report must explain why the grade landed where it did.

Each example should distinguish among:

- communication weakness
- missing evidence
- under-supported but promising thesis
- substantive investment-case weakness
- investor-audience mismatch

The examples should reinforce that Pitch Deck Check evaluates the pitch and deck as presented.

They should not imply certainty about the company's ultimate potential.

---

## Example Format

Each calibration example should include:

- Scenario
- Assumed Company Context
- Intended Investor Audience
- Deck Communication Scores
- Investment Case as Presented
- Gates / Binding Constraints
- Overall Grade
- Primary Diagnosis
- Report Interpretation
- Founder Action

Deck Communication Scores should use:

- Completeness
- Clarity
- Brevity
- Flow

Investment Case as Presented should use:

- Opportunity Strength
- Execution Credibility
- Investor Fit

Investment Case labels should use:

- Strong
- Promising but Under-Supported
- Mixed
- Weak
- Not Enough Information

---

## Example 1 — Clear Deck, Weak Opportunity

### Scenario

The deck is well organized, concise and easy to understand.

It clearly explains the customer, product and business model.

However, the market appears small, the value gap appears modest and the pitch does not support a venture-scale outcome.

### Assumed Company Context

Product / Pre-Revenue

### Intended Investor Audience

Seed venture capital

### Deck Communication Scores

- Completeness: 4/5 — Strong
- Clarity: 5/5 — Excellent
- Brevity: 4/5 — Strong
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Weak
- Execution Credibility: Mixed
- Investor Fit: Weak

### Gates / Binding Constraints

Investment-Case Gate is active.

The deck provides enough information to evaluate the opportunity, and the opportunity appears too small or insufficiently urgent for the intended investor audience.

### Overall Grade

C+

### Primary Diagnosis

The deck communicates the pitch clearly, but the investment case as presented does not appear compelling enough for seed venture capital.

### Report Interpretation

This is not primarily a writing, design or sequencing problem.

The deck makes the opportunity easy to understand.

The issue is that the opportunity described by the deck appears too limited for the implied investor outcome.

### Founder Action

Clarify whether the company is targeting a venture-scale outcome, a niche angel-backed opportunity or a different investor audience.

If the company is pursuing venture capital, strengthen the market opportunity, value gap, expansion path and upside case.

---

## Example 2 — Promising Company, Poorly Communicated Deck

### Scenario

The company appears to have a large opportunity, credible early traction and a strong team.

However, the deck is disorganized, verbose and unclear.

Important information is present but hard to find.

### Assumed Company Context

Early Revenue

### Intended Investor Audience

Seed venture capital

### Deck Communication Scores

- Completeness: 3/5 — Adequate
- Clarity: 2/5 — Weak
- Brevity: 2/5 — Weak
- Flow: 2/5 — Weak

### Investment Case as Presented

- Opportunity Strength: Strong
- Execution Credibility: Strong
- Investor Fit: Promising but Under-Supported

### Gates / Binding Constraints

Clarity Gate is active.

Flow and Brevity meaningfully reduce investor readiness.

Investment-Case Gate is not active.

### Overall Grade

B-

### Primary Diagnosis

The investment case may be strong, but the deck does not yet communicate it clearly enough for investors to evaluate efficiently.

### Report Interpretation

The deck appears to contain promising substance.

The main issue is communication quality.

Investors may miss the strongest parts of the business because the narrative is hard to follow and the key evidence is buried.

### Founder Action

Rebuild the narrative sequence, clarify the core thesis, reduce unnecessary detail and make the strongest proof points easier to find.

---

## Example 3 — Early-Stage, Promising but Under-Supported

### Scenario

The deck presents a compelling problem, a thoughtful solution vision and a credible founding insight.

The company is early and has limited proof.

Market validation is directionally promising but not yet strong enough to fully support the thesis.

The deck does not yet provide enough customer validation, product evidence or go-to-market evidence to fully support the case.

### Assumed Company Context

Idea / Pre-Product

### Intended Investor Audience

Pre-seed investors or angel investors

### Deck Communication Scores

- Completeness: 3/5 — Adequate
- Clarity: 4/5 — Strong
- Brevity: 4/5 — Strong
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Promising but Under-Supported
- Execution Credibility: Promising but Under-Supported
- Investor Fit: Mixed

### Gates / Binding Constraints

No severe gate is active.

Evidence concerns limit confidence, but the missing proof is partly explainable by company stage.

### Overall Grade

B-

### Primary Diagnosis

The deck presents a promising early-stage thesis, but it needs stronger evidence that the value gap is real and that the founders can reach early customers.

### Report Interpretation

This deck should not be penalized for lacking later-stage proof.

However, even at Idea / Pre-Product stage, investors need enough evidence to believe the problem is real, the solution vision is credible and the team has a plausible path to early validation.

### Founder Action

Add stronger market validation, such as customer discovery, early demand signals, founder insight, prototype evidence, design partner interest or other proof appropriate for a pre-product company.

---

## Example 3A — Proxy Market Validation

### Scenario

The company has limited direct product traction, but the deck provides credible proxy evidence that the market opportunity and value gap are real.

The deck shows that customers are already engaging in adjacent behaviors, using imperfect substitutes or participating in comparable markets.

For example, a marketplace deck may cite existing Craigslist-style listings, competitor activity, community behavior or adjacent marketplace usage to show that supply and demand already exist.

### Assumed Company Context

Idea / Pre-Product

### Intended Investor Audience

Pre-seed investors or angel investors

### Deck Communication Scores

- Completeness: 4/5 — Strong
- Clarity: 4/5 — Strong
- Brevity: 4/5 — Strong
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Promising but Under-Supported
- Execution Credibility: Mixed
- Investor Fit: Mixed

### Gates / Binding Constraints

No severe gate is active.

Market validation supports the opportunity, but the evidence is indirect and still needs direct validation from the company's own customers or users.

### Overall Grade

B

### Primary Diagnosis

The deck makes a credible early case that the market opportunity is real by showing adjacent customer behavior, but it still needs direct validation that customers will adopt this company's product.

### Report Interpretation

Proxy market validation can be useful early evidence.

It helps show that customers already want the underlying outcome and are using imperfect alternatives.

However, investors will still want evidence that this company can convert that behavior into adoption, usage, supply, demand or revenue.

### Founder Action

Add direct validation that connects the proxy behavior to this company's product, such as customer interviews, prototype usage, waitlist quality, design partners, marketplace supply commitments, early demand signals or pilot results.

---

## Example 4 — Good Business, Poor Fit for Top-Tier Venture Capital

### Scenario

The deck describes a real business with a clear customer, useful product and plausible revenue path.

The company may be attractive to angels, operators or sector specialists.

However, the market does not appear large enough and the growth profile does not appear ambitious enough for top-tier venture capital.

### Assumed Company Context

Early Revenue

### Intended Investor Audience

Top-tier venture capital

### Deck Communication Scores

- Completeness: 4/5 — Strong
- Clarity: 4/5 — Strong
- Brevity: 3/5 — Adequate
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Mixed
- Execution Credibility: Strong
- Investor Fit: Weak

### Gates / Binding Constraints

Investor Fit is the binding constraint.

Investment-Case Gate may be active if the deck is explicitly targeting top-tier venture capital.

### Overall Grade

C+

### Primary Diagnosis

The deck presents a credible business, but because the stated investor audience is top-tier venture capital, Investor Fit limits the Overall Grade.

### Report Interpretation

The issue is not that the company appears bad.

The issue is that the pitch does not yet support the scale, growth or return profile expected by the stated investor audience.

For a different investor audience, such as angels, operators or sector specialists, the same deck might be interpreted more favorably.

The report should still display one Overall Grade based on the stated context and intended investor audience.

### Founder Action

Either strengthen the venture-scale case or target investors whose check size, sector interest and return expectations better match the opportunity.

---

## Example 5 — Strong Seed Deck

### Scenario

The deck presents a large value gap, a clear customer, credible early traction, strong founder-market fit and a plausible go-to-market motion.

The deck is clear and well sequenced.

Some proof is still early, but the evidence is appropriate for the company's stage.

### Assumed Company Context

Product / Pre-Revenue

### Intended Investor Audience

Seed venture capital

### Deck Communication Scores

- Completeness: 4/5 — Strong
- Clarity: 4/5 — Strong
- Brevity: 4/5 — Strong
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Strong
- Execution Credibility: Promising but Under-Supported
- Investor Fit: Strong

### Gates / Binding Constraints

No major gate is active.

Execution proof is still developing, but the limitation is stage-appropriate.

### Overall Grade

B+

### Primary Diagnosis

The deck communicates a strong seed-stage investment case, with the main remaining gap around deeper execution proof.

### Report Interpretation

The deck is likely credible for seed investor conversations.

It does not need to prove everything yet, but investors will want stronger evidence that early users are engaging, the product can deliver the promised value and the go-to-market motion can become repeatable.

### Founder Action

Add the strongest available proof around customer engagement, design partners, pilot usage, early demand or execution velocity.

---

## Example 6 — Polished Deck with Unsupported Claims

### Scenario

The deck looks professional and tells a persuasive story.

However, the strongest claims are not supported by evidence.

The deck asserts large market demand, strong differentiation and efficient acquisition without showing enough proof.

### Assumed Company Context

Early Revenue

### Intended Investor Audience

Seed venture capital

### Deck Communication Scores

- Completeness: 2/5 — Weak
- Clarity: 4/5 — Strong
- Brevity: 4/5 — Strong
- Flow: 4/5 — Strong

### Investment Case as Presented

- Opportunity Strength: Promising but Under-Supported
- Execution Credibility: Promising but Under-Supported
- Investor Fit: Mixed

### Gates / Binding Constraints

Evidence Gate is active.

Completeness is also weak because important investor questions are not supported with credible evidence.

Investment-Case Gate is not active unless the unsupported claims are contradicted by evidence in the deck.

### Overall Grade

C+

### Primary Diagnosis

The deck is polished and easy to understand, but investors may not believe the core claims because the evidence is too thin.

### Report Interpretation

This is not a design problem.

The deck needs stronger proof.

The current deck may create initial interest, but it leaves investors with major diligence questions around demand, differentiation and acquisition.

### Founder Action

Add credible evidence for the most important claims, especially customer demand, competitive differentiation, acquisition efficiency and traction quality.

---

## Example 7 — Incomplete Deck, Not Enough Information

### Scenario

The deck is short and visually clean but omits several major investor questions.

It does not explain the business model, competition, go-to-market motion, financing ask or traction.

Investors cannot responsibly evaluate the opportunity from the deck.

### Assumed Company Context

Product / Pre-Revenue

### Intended Investor Audience

Seed venture capital

### Deck Communication Scores

- Completeness: 1/5 — Very Weak
- Clarity: 3/5 — Adequate
- Brevity: 5/5 — Excellent
- Flow: 3/5 — Adequate

### Investment Case as Presented

- Opportunity Strength: Not Enough Information
- Execution Credibility: Not Enough Information
- Investor Fit: Not Enough Information

### Gates / Binding Constraints

Completeness Gate is active.

Investment-Case Gate is not active because the deck does not provide enough information to judge the substance of the thesis.

### Overall Grade

D

### Primary Diagnosis

The deck is too incomplete for investors to evaluate the investment case.

### Report Interpretation

The deck may be concise, but it is missing too many required investor answers.

The right conclusion is not that the opportunity is weak.

The right conclusion is that the deck does not yet provide enough information to evaluate it.

### Founder Action

Add the missing core sections: business model, competition, go-to-market, traction or validation, funding ask and evidence supporting the main claims.

---

## Future Calibration Examples

Future versions should add examples for:

- excellent deck with A-range grade
- AI infrastructure company
- B2B SaaS company
- marketplace company
- consumer product company
- healthcare or regulated company
- deep tech company
- local / non-venture business
- strong team with weak market
- strong market with weak team
- strong product with weak go-to-market
- strong traction with weak storytelling
- weak investor fit with unknown investor audience
- borderline B+ / A- case
- borderline C+ / B- case

---

## Current Scope

This artifact provides conceptual calibration examples.

Future versions may define:

- benchmark decks
- sample reports
- category-specific examples
- score-to-letter-grade worked calculations
- investor-audience-specific calibration
- calibration examples tied to actual public decks

Those decisions should not be implemented until they are explicitly authored in this artifact or a downstream product-owned artifact.
