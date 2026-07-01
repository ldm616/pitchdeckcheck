# Scoring Rubric

Version: 0.1
Status: Draft
Owner: Product Design
Implementation Owner: Claude
Purpose: Defines how Pitch Deck Check evaluates pitch decks across the four product dimensions.

This artifact is product-owned. Implementation code, prompts, scoring logic, and report generation should interpret this artifact, not redefine it.

---

## Purpose

The Scoring Rubric defines how Pitch Deck Check evaluates the investment case communicated by a pitch deck.

It translates Foundation, Company Context and Investor Framework into evaluation principles.

It does not define prompts.

It does not define report wording.

It does not define implementation logic.

It does not yet define numeric score bands.

---

## Scoring Philosophy

Pitch Deck Check evaluates the fundability communicated by the deck.

Fundability is the overall outcome.

Fundability is not a separate fifth score.

The four scoring dimensions are:

1. Completeness
2. Clarity
3. Brevity
4. Flow

Together, these dimensions evaluate how effectively the deck communicates a compelling investment thesis for the company's current stage.

The four dimensions evaluate communication of the investment case, but communication quality is not the same as investment quality.

A deck can communicate clearly and still reveal that the investment case itself is weak.

Pitch Deck Check should identify when the issue is communication and when the issue is the substance of the investment thesis presented by the deck.

Pitch Deck Check can help founders communicate their pitch as completely, clearly, efficiently and logically as possible.

Pitch Deck Check cannot make an inherently weak investment thesis fundable.

In some cases, clearer communication may make a weak investment case easier for investors and founders to recognize.

That is still a useful outcome.

---

## Stage-Aware Evaluation

Scores must be evaluated relative to Company Context.

The same deck evidence may be strong at one stage and weak at another.

A deck should not be penalized for lacking proof that is not reasonably expected at its stage.

A deck should be penalized when it fails to provide the promise or proof reasonably expected at its stage.

Company Context adjusts expected evidence.

Company Context does not excuse unclear, unsupported or incoherent communication.

---

## Completeness

Completeness evaluates whether the deck answers the investor questions reasonably expected for the company's stage.

Completeness does not mean merely mentioning every topic.

A deck is complete only when it addresses the relevant investor questions with answers that are specific enough and credible enough to evaluate.

Completeness asks:

Does the deck provide enough information for an investor to understand and evaluate the investment thesis?

Completeness considers:

- whether required Framework Slides are addressed
- whether Context Dependent slides are addressed when required for the company's context
- whether Investor Decisions are answered
- whether Evidence Questions are supported
- whether important claims have credible evidence
- whether the deck leaves major investor questions unanswered

Completeness should distinguish between:

- missing information
- weak information
- unsupported claims
- information present but hard to find
- information deferred to a later conversation

A deck can be complete without being long.

A deck can be long without being complete.

---

## Clarity

Clarity evaluates whether the deck's investment thesis is easy to understand.

Clarity asks:

Can an investor quickly understand what the company does, why it matters, and why it could become valuable?

Clarity considers:

- whether the customer is clearly defined
- whether the value gap is understandable
- whether the proposed future state is clear
- whether the product's role is understandable
- whether claims are specific rather than vague
- whether metrics and evidence are easy to interpret
- whether slide-level messages are obvious
- whether terminology is used consistently

Clarity should penalize ambiguity, jargon, vague claims, unexplained metrics and unclear relationships between slides.

A deck can be visually polished but unclear.

A deck can be simple and still highly clear.

---

## Brevity

Brevity evaluates whether the deck communicates the investment thesis efficiently.

Brevity asks:

Does the deck communicate the strongest investment case with minimal unnecessary cognitive load?

Brevity considers:

- whether slides are overloaded
- whether the deck repeats the same point without adding evidence
- whether weak or irrelevant details distract from the thesis
- whether the deck uses too much text
- whether evidence is presented at the right level of detail
- whether the deck prioritizes the strongest information
- whether the deck makes investors work harder than necessary

Brevity should not reward superficiality.

A deck should be concise because the thinking is sharp, not because important evidence is missing.

Brevity is strongest when the deck is both efficient and substantive.

---

## Flow

Flow evaluates whether the deck presents the investment story in a logical investor-friendly sequence.

Flow asks:

Does the deck guide the investor through the investment thesis in an order that builds conviction?

Flow considers:

- whether the deck follows a coherent narrative arc
- whether earlier slides create context for later slides
- whether claims are introduced before evidence that depends on them
- whether the deck jumps between ideas unnecessarily
- whether the investor can understand the causal chain from value gap to value creation to value capture
- whether the sequence creates momentum toward the financing ask

Flow should not require every deck to follow the canonical Framework Slide order exactly.

Decks may combine, split or reorder presentation slides.

However, unnecessary deviations that make the investment story harder to understand should reduce Flow.

---

## Missing Evidence vs. Weak Evidence

Missing evidence and weak evidence should be evaluated differently.

Missing evidence means the deck does not address an important investor question.

Weak evidence means the deck addresses the question but does so with insufficient specificity, credibility or support.

Unsupported claims should be treated as weak evidence unless the claim is central enough that the absence of support leaves the investor question effectively unanswered.

The scoring model should help founders understand the difference between:

- "You did not answer this."
- "You answered this, but investors may not believe it yet."
- "You answered this, but the answer is hard to understand."
- "You answered this, but it takes too much effort to find."

---

## Required, Context Dependent and Optional Slides

The Investor Framework defines Completeness Designation.

Required slides are expected in every Company Context.

Context Dependent slides are expected only in the contexts listed in the Investor Framework.

Optional slides, if introduced in the future, should not reduce Completeness when absent.

The Scoring Rubric determines the scoring impact of missing or weakly answered slides.

The Investor Framework defines what should be evaluated.

The Scoring Rubric defines how evaluation should respond.

---

## Overall Grade

The overall grade should reflect how effectively the deck communicates fundability for the company's current stage.

The overall grade should be derived from the four dimension scores:

1. Completeness
2. Clarity
3. Brevity
4. Flow

The overall grade should not be a separate fundability score.

The overall grade should reflect both communication effectiveness and the strength of the investment case as presented by the deck.

A deck should not receive a high overall grade merely because it is polished, concise or well organized.

If the deck clearly communicates a weak market, weak differentiation, implausible go-to-market motion, insufficient team advantage, unrealistic financials or other substantive investment weakness, the overall grade should reflect that weakness.

The grade evaluates the pitch as presented.

It does not judge the company's ultimate potential outside the deck.

The overall grade should not be calculated as a simple average by default.

A deck with a strong overall grade should give investors a clear, complete, efficient and logically sequenced understanding of why the company could become an exceptional investment.

A deck with a weak overall grade should leave important uncertainty unresolved, even if some individual slides are strong.

Severe weaknesses in Completeness, Clarity, Flow or stage-appropriate evidence may cap the overall grade because investors cannot evaluate, understand or follow an unsupported thesis.

A weakness in Brevity should reduce the overall grade when unnecessary cognitive load makes the investment case harder to absorb.

Brevity should not normally act as a hard gate unless the deck is so overloaded, repetitive or unfocused that it prevents investors from understanding the thesis.

The overall grade should reward decks that are complete, clear, efficient and logically sequenced.

The overall grade should penalize decks that rely on unsupported claims, vague communication, excessive friction or incoherent sequencing.

---

## Founder Usefulness

Scoring should help founders improve the deck.

Scores should diagnose the type of weakness, not merely judge quality.

A useful score should help a founder understand whether the deck needs:

- more evidence
- clearer explanation
- sharper prioritization
- better sequencing
- stronger stage-appropriate proof
- removal of distracting or redundant content

The scoring system should support actionable feedback.

It should not feel like a black-box grade.

The report should help founders understand whether the primary issue is:

- missing information
- unclear communication
- unnecessary complexity
- weak sequencing
- unsupported claims
- a substantive weakness in the investment case presented by the deck

When the issue is substantive, the report should say so clearly without implying that better wording alone will fix it.

---

## Current Scope

This artifact defines the conceptual scoring model only.

Future versions may define:

- weighting rules
- display formats
- slide-level scoring behavior
- confidence handling
- calibration examples
- benchmark answers
- score-to-report mappings

Those decisions should not be implemented until they are explicitly authored in this artifact or a downstream product-owned artifact.

---

## Internal Score Bands

Pitch Deck Check uses internal 1–5 score bands to calibrate evaluation.

These bands are internal evaluation guidance.

They do not determine how scores must be displayed to founders.

Future report versions may display numeric scores, letter grades, labels or a combination.

The internal bands are:

1. Very Weak
2. Weak
3. Adequate
4. Strong
5. Excellent

A score should reflect the company's current context.

A score of 5 does not mean the company is perfect.

It means the deck performs exceptionally well on that dimension for the company's stage.

A score of 1 does not mean the company is bad.

It means the deck performs very poorly on that dimension or leaves investors unable to evaluate the relevant part of the thesis.

---

## Completeness Score Bands

Completeness evaluates whether the deck answers the investor questions reasonably expected for the company's stage.

### 1 — Very Weak

The deck leaves major required investor questions unanswered.

Required Framework Slides or stage-required Context Dependent slides are missing or effectively unanswered.

Investors cannot evaluate the investment thesis without substantial additional explanation.

### 2 — Weak

The deck addresses some required questions but leaves important gaps.

Several Investor Decisions are only partially answered.

Important claims lack credible evidence or are too thin to support investor confidence.

### 3 — Adequate

The deck answers most investor questions reasonably expected for its stage.

Some gaps remain, but the core investment thesis can be evaluated.

The deck may need more evidence, specificity or stage-appropriate proof to feel investor-ready.

### 4 — Strong

The deck answers the important investor questions for its stage with credible support.

Most Framework Slides are well covered.

Remaining gaps are minor, explainable or unlikely to prevent a serious investor from understanding the thesis.

### 5 — Excellent

The deck answers the investor questions expected for its stage thoroughly and efficiently.

The investment thesis is well supported across the relevant Framework Slides.

The deck anticipates the major questions an investor would naturally ask next.

---

## Clarity Score Bands

Clarity evaluates whether the deck's investment thesis is easy to understand.

### 1 — Very Weak

The deck is confusing or difficult to interpret.

Investors may not understand what the company does, who the customer is, what value gap exists or why the opportunity matters.

Important claims, metrics or slide messages are unclear.

### 2 — Weak

The deck communicates some important ideas but requires too much interpretation.

The customer, value gap, product, evidence or business logic may be vague, inconsistent or difficult to connect.

Investors are likely to leave with basic questions about what the company is actually claiming.

### 3 — Adequate

The deck is generally understandable.

The main thesis can be followed, but some important ideas need clearer wording, better explanation or more specific framing.

Investors can understand the company, but the deck does not yet make the case feel crisp.

### 4 — Strong

The deck communicates the investment thesis clearly.

The customer, value gap, solution, product, evidence and business logic are easy to follow.

Most slides have a clear message and require little interpretation.

### 5 — Excellent

The deck makes the investment thesis immediately understandable.

The company, customer, value gap, product, evidence and business logic are communicated with exceptional precision.

Investors can quickly grasp both what the company does and why it could become valuable.

---

## Brevity Score Bands

Brevity evaluates whether the deck communicates the investment thesis efficiently.

### 1 — Very Weak

The deck creates substantial unnecessary cognitive load.

Slides are overloaded, repetitive, unfocused or filled with low-value detail.

Important points are buried, and investors must work hard to identify the real thesis.

### 2 — Weak

The deck contains useful information but presents it inefficiently.

There may be too much text, too many repeated claims, weak prioritization or distracting details.

The deck makes the investment case harder to absorb than necessary.

### 3 — Adequate

The deck is reasonably efficient.

Most content contributes to the thesis, but some slides could be shorter, sharper or better prioritized.

The deck may still include redundant, low-value or overly detailed material.

### 4 — Strong

The deck communicates substantial information with relatively low cognitive load.

Slides are focused, the strongest points are prioritized and unnecessary detail is limited.

Investors can absorb the thesis without excessive effort.

### 5 — Excellent

The deck is highly efficient without feeling thin.

Every slide earns its place.

The deck communicates the strongest available investment case with minimal friction and no meaningful wasted attention.

---

## Flow Score Bands

Flow evaluates whether the deck presents the investment story in a logical investor-friendly sequence.

### 1 — Very Weak

The deck feels disorganized or incoherent.

The sequence makes it difficult to understand the investment thesis.

Important context appears too late, claims appear before necessary setup or the story jumps between ideas without logic.

### 2 — Weak

The deck has a recognizable story but the sequence creates confusion or friction.

Some slides appear out of order, transitions are weak or the investor must reconstruct the logic manually.

The narrative does not build conviction effectively.

### 3 — Adequate

The deck follows a mostly logical sequence.

The investment story can be followed, but some ordering, transitions or dependencies could be improved.

The narrative is understandable but not yet especially persuasive or smooth.

### 4 — Strong

The deck presents the investment story in a clear and logical sequence.

Earlier slides create useful context for later slides.

The narrative builds conviction toward the financing ask.

### 5 — Excellent

The deck has a highly effective investor narrative.

The sequence makes the thesis feel natural, compelling and progressively more convincing.

Each section builds on the prior section with minimal friction and strong momentum.

---

## Gating Principles

Some weaknesses should limit the overall grade even when other dimensions are strong.

Completeness Gate:

If the deck omits major required investor questions, the overall grade should not be high, even if the deck is clear and polished.

Clarity Gate:

If the deck is difficult to understand, the overall grade should not be high, even if many sections are present.

Stage Gate:

If the deck lacks the promise or proof reasonably expected for its Company Context, the overall grade should not be high.

Evidence Gate:

If central claims are unsupported, the overall grade should not be high, even if the deck is persuasive on the surface.

Investment-Case Gate:

If the deck clearly presents a thesis that is complete and understandable but substantively weak, the overall grade should not be high.

Examples include a market that appears too small, a value gap that appears unimportant, weak product differentiation, an implausible go-to-market plan, insufficient team advantage, unrealistic financial assumptions or a business model that does not appear capable of creating venture-scale value.

Brevity should not normally act as a hard gate unless the deck is so overloaded, repetitive or unfocused that it prevents investors from understanding the thesis.

---

## Weighting Principles

The overall grade should be derived from the four dimension scores, subject to the gates defined above.

Weighting should reflect the relative importance of each dimension to investor decision-making.

The default conceptual weighting is:

1. Completeness — highest weight
2. Clarity — high weight
3. Flow — moderate weight
4. Brevity — lower weight

Completeness carries the highest weight because investors cannot evaluate a thesis that omits major required information.

Clarity carries high weight because investors cannot build conviction in a thesis they cannot understand.

Flow carries moderate weight because sequence affects how naturally conviction builds, but a strong thesis can still survive some sequencing issues.

Brevity carries lower weight because inefficiency usually weakens communication rather than invalidating the thesis.

Brevity should still matter.

Excessive cognitive load can reduce investor engagement and make the deck feel less fundable.

However, Brevity should not outweigh Completeness or Clarity unless the deck is so overloaded that it prevents understanding.

---

## Gate and Weight Interaction

Gates should be applied before finalizing the overall grade.

Weighting should determine the baseline overall grade.

Gates should then limit the maximum overall grade when a severe weakness prevents investors from evaluating, understanding or believing the thesis.

A deck should not receive a high overall grade if:

- major required investor questions are unanswered
- the company or thesis is difficult to understand
- the deck lacks promise or proof reasonably expected for its Company Context
- central claims are unsupported
- the narrative sequence prevents investors from following the investment case

A deck may still receive a strong overall grade when:

- minor information gaps remain but the core thesis is well supported
- the deck is somewhat verbose but still clear and substantive
- the sequence differs from the canonical Framework order but the story remains logical
- some stage-appropriate proof is early but credible

Gates should prevent misleadingly high grades.

Gates should not punish decks for being imperfect.

The purpose of gating is to prevent surface polish from masking unresolved investment risk.

---

## Dimension Interaction Principles

The four dimensions should be evaluated separately but interpreted together.

Completeness and Clarity are tightly linked.

A deck may contain the right information but still score poorly if investors cannot understand it.

A deck may be clear but incomplete if it explains only part of the investment thesis.

Completeness and Brevity should be balanced.

A deck should not lose Brevity simply because it includes evidence investors need.

A deck should lose Brevity when it includes unnecessary, redundant or poorly prioritized information.

Clarity and Flow are also linked.

A confusing sequence can reduce clarity.

However, Flow should focus on narrative order, while Clarity should focus on whether each idea is understandable.

Brevity and Flow can interact.

A deck that repeats itself may feel both inefficient and poorly sequenced.

The scoring model should identify the primary issue rather than double-penalizing the same weakness without explanation.

The scoring model should distinguish between communication weaknesses and investment-case weaknesses.

For example, a deck may score well on Clarity because the thesis is easy to understand, while still receiving a limited Overall Grade because the thesis it communicates is not compelling.

Likewise, a deck may have a strong underlying thesis but score poorly because the deck fails to communicate it clearly, completely or efficiently.

---

## Stage-Aware Weighting

The meaning of each dimension should remain stable across Company Contexts.

However, the evidence expected within each dimension should change by context.

Completeness should be judged against the Framework Slides and Context Dependent slides required for the company's context.

Clarity should remain important at every stage.

Brevity should remain important at every stage, but early-stage decks should not be penalized for explaining unfamiliar or novel ideas clearly.

Flow should remain important at every stage, but earlier-stage decks may rely more heavily on thesis logic while later-stage decks should integrate more proof.

The overall grade should reflect the promise and proof reasonably expected at the company's stage.

---

## Founder-Facing Score Display

Internal 1–5 bands do not determine founder-facing display.

Founder-facing reports should emphasize diagnosis over judgment.

Scores should help founders understand what to improve.

Possible future display formats include:

- numeric scores
- letter grades
- descriptive labels
- traffic-light indicators
- prioritized issue severity
- a combined overall grade plus dimension-level explanations

No founder-facing display format is finalized in this version.
