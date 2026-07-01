# Report Specification

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines the founder-facing Pitch Deck Check report structure.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

The Report Specification defines what the founder-facing report should contain.

It translates Foundation, Product Philosophy, Company Context, Investor Framework and Scoring Rubric into a usable report experience.

It does not define prompts.

It does not define scoring logic.

It does not define implementation code.

It does not rewrite the founder's deck.

---

## Report Promise

The report should help founders understand whether their pitch deck is investor-ready.

It should answer:

- What is working?
- What is missing?
- What is unclear?
- Where might investors hesitate?
- Is the issue communication, evidence, substance or investor fit?
- What should the founder improve first?

The report should be useful even when the answer is uncomfortable.

A clear report may help founders see that the pitch itself is weak, mismatched or under-supported.

That is a valuable outcome.

---

## Core Report Structure

The report should contain the following sections in order:

1. Report Header
2. Context Summary
3. Overall Grade
4. Deck Communication Scores
5. Investment Case as Presented
6. Primary Diagnosis
7. What Investors May Believe
8. What Investors May Question
9. Slide-Level Feedback
10. Priority Improvements
11. Suggested Next Steps
12. Save / Share / Upgrade Section

---

## Report Header

The Report Header should orient the founder.

It should include:

- company name, if available
- report title
- analysis timestamp, if available
- deck filename, if useful
- short positioning statement

The header should not overstate precision.

The header should make clear that the report evaluates the deck or pitch as presented.

---

## Context Summary

The Context Summary should explain how the deck was evaluated.

It should include:

- detected Company Context
- confidence in context classification, if available
- target raise amount, if provided
- intended investor audience, if provided
- any important assumptions used in evaluation

If the investor audience or raise amount is unknown, the report should say so plainly and avoid over-specific fundability claims.

Context Summary should help the founder understand that stage and investor audience affect expectations.

---

## Overall Grade

The report should show one Overall Grade.

The Overall Grade should be displayed as a letter grade.

The Overall Grade should reflect:

- Deck Communication Scores
- Investment Case as Presented
- Company Context
- investor audience and raise amount, when known
- gating constraints, when applicable

The report should not display a separate Fundability Score.

The Overall Grade should be accompanied by a concise explanation.

The explanation should say why the grade was assigned and what most limits the deck's investor readiness.

If the Overall Grade is limited by a gate, the report should identify the binding issue.

If the binding issue is substantive, the report should make clear that better wording alone may not fix it.

---

## Deck Communication Scores

Deck Communication Scores should show how well the deck communicates the pitch.

The report should display four scores:

- Completeness
- Clarity
- Brevity
- Flow

Each score should include:

- numeric band
- descriptive label
- concise explanation
- primary reason for the score
- highest-priority improvement

The report should make clear that these are communication scores.

A deck can communicate well and still present a weak investment case.

A deck can present a strong opportunity and still communicate it poorly.

---

## Investment Case as Presented

Investment Case as Presented should explain whether the pitch itself appears compelling, credible and appropriately matched to the intended investor audience.

It should include:

- Opportunity Strength
- Execution Credibility
- Investor Fit

Each assessment should use qualitative labels from the Scoring Rubric:

- Strong
- Promising but Under-Supported
- Mixed
- Weak
- Not Enough Information

The report should explain the reason for each label.

The report should not display these areas as 1–5 peer scores.

The report should not average them into the Deck Communication Scores.

If an assessment is under-supported, the report should explain what evidence is missing.

If an assessment is weak, the report should explain why the issue appears substantive.

If Investor Fit cannot be evaluated because investor audience or raise amount is unknown, the report should say so.

---

## Primary Diagnosis

Primary Diagnosis should explain the most important constraint on investor readiness.

It should identify whether the main issue is:

- missing information
- unclear communication
- unnecessary complexity
- weak sequencing
- unsupported claims
- substantive weakness in the investment case
- mismatch with intended investor audience

The diagnosis should be specific.

It should not simply restate the scores.

It should help the founder understand what kind of work is needed.

Examples of diagnosis types:

- "The deck is promising but under-supported."
- "The deck is clear but the opportunity appears too small for the implied investor audience."
- "The core issue is not wording; it is missing evidence that customers care."
- "The investment case may be strong, but the deck does not yet communicate it clearly."

These examples are illustrative, not mandatory report text.

---

## What Investors May Believe

This section should summarize the strongest positive conclusions investors may draw from the deck.

It should focus on claims that are reasonably supported by the deck.

It should not invent strengths.

It should not overstate evidence.

It should help founders see what is already working.

---

## What Investors May Question

This section should summarize the most important unresolved investor concerns.

It should include both communication concerns and investment-case concerns.

It should focus on the questions most likely to affect investor willingness to continue.

It should not list every possible objection.

It should prioritize concerns that are central to fundability.

---

## Slide-Level Feedback

Slide-Level Feedback should evaluate the deck slide by slide or Framework Slide by Framework Slide, depending on the implementation.

It should identify:

- what the slide is trying to accomplish
- whether the relevant Investor Decision is answered
- what works
- what is missing or weak
- whether the issue is communication, evidence or substance
- how important the issue is

Slide-Level Feedback should not require the founder's physical slide order to exactly match the Investor Framework.

When a presentation slide combines multiple Framework Slides, feedback should explain the combined role clearly.

When a Framework Slide is missing, feedback should explain the investor question left unanswered.

---

## Priority Improvements

Priority Improvements should identify the most important fixes.

It should prioritize improvements by likely impact on investor readiness.

It should distinguish among:

- add missing evidence
- clarify the message
- shorten or simplify
- improve sequence
- strengthen the investment case
- adjust investor targeting

The report should avoid giving an overwhelming number of recommendations.

The first version should emphasize the top three to five improvements.

Priority Improvements should be specific enough that founders know what to do next.

---

## Score-to-Report Mapping

Score-to-report mapping defines how evaluation results should shape the founder-facing report.

The report should not simply display scores.

It should translate scores, labels and gates into a clear diagnosis.

The mapping should answer:

- what most limits investor readiness
- which issues are communication issues
- which issues are evidence issues
- which issues are substantive investment-case issues
- which issues relate to investor fit
- what the founder should improve first

The report should prioritize explanation over mechanics.

Founders do not need to understand the full scoring system to understand what to do next.

---

## Overall Grade Mapping

The Overall Grade should set the report's top-level interpretation.

The grade explanation should identify the most important reason the deck received that grade.

If the Overall Grade is limited by a gate, the grade explanation should identify the binding gate in founder-facing language.

If the grade is limited by low Deck Communication Scores, the explanation should identify the communication weakness.

If the grade is limited by Investment Case as Presented, the explanation should identify whether the issue is Opportunity Strength, Execution Credibility or Investor Fit.

If the grade is limited by missing information, the explanation should say the investment case is under-supported rather than weak.

The grade explanation should be concise.

It should not restate every score.

---

## Deck Communication Score Mapping

Each Deck Communication Score should map to one primary diagnostic message.

Completeness should map to whether the deck answers the investor questions reasonably expected for its stage.

Low Completeness should produce recommendations to add missing information, answer specific investor questions or support important claims.

Clarity should map to whether the investment thesis is easy to understand.

Low Clarity should produce recommendations to clarify the customer, value gap, solution, product, evidence or business logic.

Brevity should map to whether the deck communicates efficiently.

Low Brevity should produce recommendations to reduce cognitive load, remove redundancy or prioritize stronger evidence.

Flow should map to whether the story builds investor conviction in a logical sequence.

Low Flow should produce recommendations to reorder, combine, separate or better connect sections of the deck.

When one underlying issue affects multiple scores, the report should identify the primary issue rather than repeating the same criticism in multiple ways.

---

## Investment Case Mapping

Investment Case as Presented should map to qualitative interpretation, not numeric scoring.

Opportunity Strength should explain whether the opportunity appears large, urgent, differentiated, defensible and economically attractive enough for the implied investor outcome.

Execution Credibility should explain whether the deck gives investors reason to believe the team can execute on the opportunity.

Investor Fit should explain whether the pitch appears appropriate for the intended investor audience and financing goal.

Labels should map to report language as follows:

- Strong: explain what is compelling and supported.
- Promising but Under-Supported: explain what could be compelling and what evidence is missing.
- Mixed: explain both the credible strengths and the material concerns.
- Weak: explain the substantive concern and why it matters.
- Not Enough Information: explain what cannot be evaluated and what information is needed.

If an Investment Case label is Weak and central to fundability, it may become the Primary Diagnosis.

If an Investment Case label is Promising but Under-Supported, it should usually produce a Priority Improvement focused on evidence.

If Investor Fit is unknown, the report should ask the founder to clarify target raise amount or intended investor audience before making precise fundability claims.

---

## Gate Mapping

Gates should shape the report's explanation of what most limits investor readiness.

A fired gate should usually appear in at least one of:

- Overall Grade explanation
- Primary Diagnosis
- What Investors May Question
- Priority Improvements

Gate mapping should follow these principles:

Completeness Gate:

Explain which major investor questions are unanswered.

Clarity Gate:

Explain what investors cannot understand clearly enough.

Stage Gate:

Explain what promise or proof is missing for the company's current context.

Evidence Gate:

Explain which central claims lack support.

Investment-Case Gate:

Explain which substantive weakness limits fundability as presented.

A gate should not be presented as a technical scoring mechanism.

It should be translated into practical founder-facing language.

---

## Priority Mapping

Priority Improvements should be selected by likely impact on investor readiness.

The highest-priority improvements should usually come from:

1. fired gates or binding constraints
2. central Investment Case weaknesses
3. missing required or stage-required investor questions
4. lowest Deck Communication Scores
5. investor concerns that affect the next meeting or financing decision

Priority Improvements should avoid overwhelming the founder.

The first version should show three to five priorities.

Each priority should include:

- the issue
- why it matters to investors
- what to improve next
- whether the issue is communication, evidence, substance or investor fit

When the same issue appears in multiple sections, Priority Improvements should consolidate it into one clear action.

---

## Suggested Next Steps

Suggested Next Steps should give the founder a practical path forward.

They may include:

- revise specific slides
- add specific evidence
- clarify investor audience
- validate the value gap
- sharpen positioning
- rethink target investor type
- prepare a stronger proof point
- rebuild the narrative sequence

Suggested Next Steps should not imply that every problem is fixable through copywriting.

When the issue is substantive, the report should say what evidence or business progress would make the pitch stronger.

---

## Save / Share / Upgrade Section

The report may include a section that supports product growth or monetization.

This section may include:

- save report
- share report
- download report
- rerun analysis after revisions
- upgrade for detailed improvement guidance
- upgrade for slide-by-slide rewrite guidance
- upgrade for investor-targeting guidance

This section should not reduce the usefulness of the free report.

The free report should remain genuinely valuable.

Paid features should feel like a natural next step for founders who want help acting on the diagnosis.

---

## Tone Principles

The report should be direct, specific and useful.

It should not be harsh for the sake of being harsh.

It should not flatter unsupported claims.

It should avoid generic advice.

It should distinguish clearly between:

- what the deck fails to communicate
- what the pitch appears to show
- what cannot be evaluated from the current material

The report should evaluate the deck, not the founder's worth or the company's ultimate potential outside the deck.

---

## Current Scope

This artifact defines the founder-facing report structure.

Future versions may define:

- exact section copy
- component-level report schema
- report length targets
- free vs paid report differences
- score-to-report mappings
- sample report examples
- upgrade copy
- downloadable report format

Those decisions should not be implemented until they are explicitly authored in this artifact or a downstream product-owned artifact.
