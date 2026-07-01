# Company Context

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines how Pitch Deck Check classifies a company before evaluating the deck.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

Pitch Deck Check should first determine the company's current stage before evaluating the deck.

Investor expectations change dramatically with company maturity.

The same deck should receive different completeness expectations depending on what evidence could reasonably exist at that stage.

Company context should influence evaluation expectations.

It should not influence scoring philosophy.

---

## Classification

Pitch Deck Check should determine company context using the following priority order:

1. Explicit founder input.
2. Clear evidence contained within the deck.
3. Reasonable inference from the deck when necessary.

If confidence is low, choose the lower (less mature) context rather than the higher one.

The detected context should be reported to the founder.

---

## Contexts

### 1. Idea / Pre-Product

Typical Characteristics

- No shipped product.
- No meaningful users.
- No paying customers.

Investors primarily want evidence that:

- the problem is real
- the timing is right
- the founders are credible
- the proposed solution is compelling
- the opportunity is attractive
- there is a credible path to reaching initial customers
- there is a credible sequence for turning the product concept into something customers can use

Absence of traction, validated acquisition channels, detailed roadmap proof or financial metrics should not reduce completeness.

---

### 2. Product / Pre-Revenue

Typical Characteristics

- Product exists.
- Users, pilots or design partners may exist.
- No meaningful recurring revenue.

Investors primarily want evidence that:

- customers find value
- the product solves the stated problem
- early validation exists
- adoption is increasing
- there is a credible path to monetization
- the company can reach and engage the right early customers or buyers
- the product roadmap is shaped by early user learning or product gaps

Revenue metrics should not be expected.

---

### 3. Early Revenue

Typical Characteristics

- Paying customers exist.
- Revenue is real but still early.
- Go-to-market is beginning to repeat.

Investors primarily want evidence that:

- customers buy repeatedly
- pricing works
- traction is increasing
- customer acquisition is becoming repeatable
- early unit economics are encouraging
- the roadmap is shaped by customer usage, willingness to pay or expansion opportunities

Perfect metrics should not be expected.

---

### 4. Growth

Typical Characteristics

- Meaningful customer base.
- Meaningful recurring or repeat revenue.
- Business is scaling.

Investors primarily want evidence that:

- growth is durable
- customer acquisition is efficient
- retention is strong
- economics improve with scale
- competitive advantage strengthens over time
- the product roadmap supports expansion, retention, differentiation or defensibility at scale

---

## Classification Principles

Company context is an aid to evaluation.

It is not itself an evaluation.

The purpose of classification is to calibrate investor expectations.

Context should be chosen using overall company maturity rather than isolated signals.

Borderline cases should default to the lower context unless strong evidence supports the higher one.

The framework intentionally avoids hard thresholds such as revenue amounts or customer counts.

Professional judgment should be preferred over arbitrary numerical cutoffs.

---

## Design Principles

Company context adjusts expectations.

Company context does not excuse weak communication.

Every deck should still communicate clearly.

Every deck should still tell a logical investment story.

---

## Future Principle

Additional contexts may be introduced if they materially improve evaluation quality.

The framework should remain as simple as possible.
