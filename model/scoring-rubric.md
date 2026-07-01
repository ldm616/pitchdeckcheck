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

These four dimensions are Deck Communication Scores.

They evaluate how effectively the deck communicates the pitch.

They do not fully capture whether the investment case itself is compelling.

Pitch Deck Check should also assess the Investment Case as Presented.

The Investment Case as Presented should evaluate:

1. Opportunity Strength
2. Execution Credibility
3. Investor Fit

These are not additional peer scores within the four-dimension communication model.

They are a separate assessment layer used to explain whether the pitch itself appears compelling, credible and appropriate for the intended investor audience.

Together, these dimensions evaluate how effectively the deck communicates a compelling investment thesis for the company's current stage.

The four dimensions evaluate communication of the investment case, but communication quality is not the same as investment quality.

A deck can communicate clearly and still reveal that the investment case itself is weak.

Pitch Deck Check should identify when the issue is communication and when the issue is the substance of the investment thesis presented by the deck.

Pitch Deck Check can help founders communicate their pitch as completely, clearly, efficiently and logically as possible.

Pitch Deck Check cannot make an inherently weak investment thesis fundable.

In some cases, clearer communication may make a weak investment case easier for investors and founders to recognize.

That is still a useful outcome.

---

## Evaluation Architecture

Pitch Deck Check has three evaluation layers.

### 1. Deck Communication Scores

Deck Communication Scores evaluate how well the deck communicates the pitch.

The four Deck Communication Scores are:

1. Completeness
2. Clarity
3. Brevity
4. Flow

These scores diagnose whether the deck is missing information, unclear, inefficient or poorly sequenced.

### 2. Investment Case as Presented

Investment Case as Presented evaluates the substance of the pitch communicated by the deck.

It asks whether the answers in the deck support a compelling investment thesis.

The three Investment-Case Assessment areas are:

1. Opportunity Strength
2. Execution Credibility
3. Investor Fit

These areas should not be treated as the same type of score as Completeness, Clarity, Brevity and Flow.

They should be used to explain whether the pitch itself appears compelling, weak, mismatched or under-supported.

### 3. Overall Grade

The Overall Grade should reflect both:

- how well the deck communicates the pitch
- how compelling the investment case appears as presented

A strong Overall Grade requires both effective communication and a compelling stage-appropriate investment case.

A deck can communicate a weak investment case clearly.

A deck can also contain a promising investment case but fail to communicate it well.

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

The overall grade should also account for Investor Fit when the founder has provided a target raise amount or intended investor audience.

If investor audience is unknown, the report should avoid over-specific claims about fundability for a particular investor type.

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
- a mismatch between the pitch and the intended investor audience

When the issue is substantive, the report should say so clearly without implying that better wording alone will fix it.

The report should help founders distinguish among:

- a deck that needs better communication
- a pitch that needs stronger evidence
- a pitch that may be better suited to a different investor audience
- a company that may be promising but not venture-scale as presented

---

## Current Scope

This artifact defines the conceptual scoring model only.

Future versions may define:

- weighting rules
- additional display refinements
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

Founder-facing reports may display numeric scores, letter grades, labels or a combination, as defined in the Founder-Facing Score Display section.

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

## Investment Case as Presented

Investment Case as Presented evaluates whether the pitch communicated by the deck appears compelling for the company's context and intended investor audience.

It should not judge the company's ultimate potential outside the deck.

It should not infer that the company is weak merely because the deck communicates poorly.

It should evaluate the pitch as presented.

The Investment Case as Presented has three assessment areas:

1. Opportunity Strength
2. Execution Credibility
3. Investor Fit

These assessments should help founders understand whether the primary issue is:

- the opportunity does not yet look compelling enough
- the company has not shown enough ability to execute
- the pitch may be better matched to a different type of investor
- the deck simply has not communicated enough to evaluate the case

---

## Opportunity Strength

Opportunity Strength evaluates whether the opportunity described by the deck appears capable of supporting a venture-scale or otherwise attractive investment outcome.

Opportunity Strength considers:

- significance of the value gap
- urgency of customer need
- size and reachability of the market
- timing
- differentiation
- value creation potential
- value capture potential
- defensibility
- scale of possible outcome
- market validation and evidence that customers actually want the promised future state

A strong Opportunity Strength assessment means the deck presents a large, meaningful and attractive opportunity.

A weak Opportunity Strength assessment means the deck presents an opportunity that may be too small, insufficiently urgent, poorly differentiated, weakly defended or unlikely to support the investor outcome being implied.

---

## Execution Credibility

Execution Credibility evaluates whether the deck gives investors reason to believe the team can execute on the opportunity.

Execution Credibility considers:

- founder insight
- team-market fit
- relevant experience
- product-building ability
- evidence of execution so far
- traction quality
- go-to-market credibility
- operating plan
- ability to use capital effectively
- ability to generate and learn from market validation

A strong Execution Credibility assessment means the deck gives investors reason to believe this team can turn the opportunity into a valuable company.

A weak Execution Credibility assessment means the deck may describe an interesting opportunity but does not yet show why this team can execute on it.

---

## Investor Fit

Investor Fit evaluates whether the pitch appears appropriate for the investor audience and financing goal.

Investor Fit is context-dependent.

A company may be fundable for one investor type while not being fundable for another.

Investor Fit should consider:

- company stage
- amount being raised
- investor type being targeted
- market size expectations
- likely exit potential
- sector fit
- traction expectations
- founder profile expectations
- check size
- risk tolerance
- return expectations

Examples:

A company with a strong niche opportunity and credible team may be fundable for angels or sector specialists while not being a fit for top-tier venture capital.

A company with a very large opportunity but limited proof may be a fit for high-risk pre-seed investors but not later-stage funds.

A company with modest growth potential may be a good business but not a venture-scale investment.

Investor Fit should help founders understand who the current pitch is most likely to appeal to.

Investor Fit should not imply that a company is bad merely because it is not a fit for a specific investor category.

---

## Market Validation

Market Validation is evidence that customers, buyers or market participants behave in ways that support the investment thesis.

Market Validation is not a separate score.

It is an evidence category that may support Opportunity Strength, Execution Credibility, Traction, Market Opportunity, Go-to-Market and stage-appropriate proof.

Market Validation helps investors determine whether the market opportunity, value gap and customer urgency are real, substantial and worth pursuing.

Market Validation may include:

- customer discovery
- waitlists
- design partners
- pilots
- letters of intent
- usage data
- paid customers
- retention
- repeat usage
- marketplace supply and demand signals
- willingness to switch from current alternatives
- willingness to pay
- evidence of urgency
- evidence that the target segment is reachable
- evidence that customers already use imperfect substitutes
- competitor, substitute or adjacent-market metrics
- evidence that customers are already engaging in adjacent behaviors that support the thesis

Proxy or adjacent-behavior validation may be especially useful before the company has extensive direct traction.

For example, competitor metrics, substitute usage, Craigslist-style listing behavior, marketplace activity or adjacent community participation may support Market Validation when they show customers already want the underlying outcome, even if they are not yet using this company's product.

Market Validation should be evaluated relative to Company Context.

At Idea / Pre-Product stage, Market Validation may be qualitative, indirect or based on proxy behavior.

At Product / Pre-Revenue stage, Market Validation should begin to show that customers recognize the value and engage with the product, concept or adjacent behavior.

At Early Revenue stage, Market Validation should increasingly show willingness to pay, repeatability, usage quality or conversion from current alternatives.

At Growth stage, Market Validation should support durability, retention, expansion or efficient growth.

Weak or missing Market Validation should usually be treated as an evidence or completeness issue unless the deck provides enough information to show that the market does not appear to want the product, future state or value proposition.

---

## Investment-Case Influence on Overall Grade

Opportunity Strength, Execution Credibility and Investor Fit should influence the Overall Grade through assessment and gating, not through separate 1–5 peer scores.

They should help explain whether the pitch communicated by the deck appears fundable for the company's context and intended investor audience.

The Overall Grade should reflect both:

- Deck Communication Scores
- Investment Case as Presented

A deck with strong Deck Communication Scores may still receive a limited Overall Grade if the Investment Case as Presented is weak.

A deck with a strong Investment Case as Presented may still receive a limited Overall Grade if the deck fails to communicate the case clearly, completely, efficiently or logically.

The Investment-Case Assessment should inform the Investment-Case Gate.

The Investment-Case Gate may limit the Overall Grade when the deck clearly presents one or more substantive weaknesses that materially reduce fundability.

Examples include:

- Opportunity Strength is weak because the market appears too small, the value gap appears unimportant or differentiation appears limited.
- Execution Credibility is weak because the deck does not show why this team can execute, build, sell or scale.
- Investor Fit is weak because the pitch does not appear appropriate for the intended investor audience or raise amount.

The Investment-Case Gate should not fire merely because the deck lacks information.

Missing information is primarily a Completeness issue.

The Investment-Case Gate should apply when the deck provides enough information to evaluate the thesis and the thesis itself appears substantively weak or mismatched.

If the deck does not provide enough information to evaluate Opportunity Strength, Execution Credibility or Investor Fit, the report should say the investment case is under-supported rather than weak.

---

## Investment-Case Assessment Display

Opportunity Strength, Execution Credibility and Investor Fit should be displayed qualitatively, not as 1–5 numeric peer scores.

Recommended qualitative labels are:

- Strong
- Promising but Under-Supported
- Mixed
- Weak
- Not Enough Information

Label meanings:

Strong means the deck presents a compelling case in this assessment area for the company's stage and investor context.

Promising but Under-Supported means the assessment area could be compelling, but the deck does not yet provide enough evidence to support it fully.

Mixed means the deck presents both credible strengths and meaningful concerns in this assessment area.

Weak means the deck provides enough information to evaluate the area and the substance appears materially weak.

Not Enough Information means the deck does not provide enough information to evaluate the area responsibly.

These labels should be used to explain the Investment Case as Presented.

They should not be averaged into the Deck Communication Scores.

They should not create a separate Fundability Score.

Opportunity Strength should indicate whether the opportunity appears attractive enough for the implied investor outcome.

Execution Credibility should indicate whether the deck shows credible ability to execute on the opportunity.

Investor Fit should indicate whether the pitch appears matched to the intended investor audience and financing goal.

If the founder has not provided a target investor audience or raise amount, Investor Fit should be described cautiously.

When investor audience is unknown, the report may describe likely investor fit in broad terms but should avoid precise claims about fundability for a specific investor category.

---

## Investment-Case Labels and Gates

Investment-Case labels should inform the Investment-Case Gate.

They should not be converted into numeric peer scores.

A Strong label should not trigger the Investment-Case Gate.

A Promising but Under-Supported label should usually indicate an evidence or completeness issue rather than a substantive weakness.

A Mixed label should usually reduce the Overall Grade but should not automatically trigger a hard gate unless the concern is central to the investment thesis.

A Weak label may trigger the Investment-Case Gate when the weakness is central to fundability.

A Not Enough Information label should usually indicate that the deck is under-supported, not that the investment case is substantively weak.

The Investment-Case Gate should fire only when the deck provides enough information to evaluate the thesis and the thesis appears materially weak or mismatched.

The Investment-Case Gate should not fire solely because the deck is incomplete.

Examples:

- Weak Opportunity Strength may trigger the gate if the market appears too small, the value gap appears unimportant or differentiation appears insufficient for the implied investor outcome.
- Weak Execution Credibility may trigger the gate if the deck shows an ambitious opportunity but does not provide a credible reason to believe this team can execute.
- Weak Investor Fit may trigger the gate if the deck is aimed at an investor audience whose return expectations, stage expectations or check-size logic do not match the pitch.
- Not Enough Information for Opportunity Strength should usually be explained as under-supported market or problem evidence, not as proof that the opportunity is weak.
- Promising but Under-Supported Execution Credibility should usually lead to a recommendation to add evidence, not a conclusion that the team cannot execute.

The report should surface the binding issue clearly.

If the Overall Grade is limited by the Investment-Case Gate, the report should explain that the issue is substantive rather than merely cosmetic or structural.

---

## Central Investment-Case Weaknesses

An Investment-Case weakness is central when it materially affects whether the pitch appears fundable for the company's stage and intended investor audience.

A weakness is central when it undermines one of the core reasons an investor would take the next meeting, continue diligence or consider investing.

Central weaknesses are not minor imperfections.

They are issues that make the investment thesis meaningfully less believable, less attractive or less matched to the intended investor.

A weakness may be central when it affects:

- the significance of the value gap
- the size or reachability of the market
- the credibility of the solution vision
- the product's ability to deliver promised customer value
- the company's differentiation versus alternatives
- the durability of the company's advantage
- the business model's ability to capture value
- the quality or relevance of traction
- the credibility of the go-to-market motion
- the team's ability to execute
- the realism of the financial plan
- the appropriateness of the financing ask
- the fit between the pitch and the intended investor audience

A weakness should usually be considered less central when:

- it affects a secondary detail rather than the main investment thesis
- it is explainable by company stage
- it can be addressed with a small clarification
- it does not materially change the investor's ability to evaluate the opportunity
- it does not materially change the likely investor audience

The Investment-Case Gate should usually trigger only when a central weakness is both:

1. clear enough to evaluate from the deck
2. material enough to limit fundability

If a weakness may be central but the deck does not provide enough information to evaluate it, the report should describe the issue as under-supported rather than substantively weak.

The report should explain central weaknesses in practical founder-facing language.

It should avoid implying that better wording alone will fix a central investment-case weakness.

---

## Overall Grade Impact of Investment-Case Labels

Investment-Case labels should influence the Overall Grade based on severity and centrality.

Strong labels should support a higher Overall Grade when Deck Communication Scores are also strong.

Promising but Under-Supported labels should limit confidence but should usually point to missing proof, weak evidence or incomplete communication rather than a substantive flaw.

Mixed labels should reduce the Overall Grade when concerns are meaningful but not thesis-breaking.

Weak labels should materially limit the Overall Grade when the weakness is central to fundability.

Not Enough Information labels should usually limit the Overall Grade through Completeness or Evidence concerns rather than through the Investment-Case Gate.

A single central Weak label may be enough to limit the Overall Grade significantly.

Multiple Mixed labels may collectively limit the Overall Grade even if no single issue triggers a hard gate.

A weak Investor Fit assessment may limit the Overall Grade when the intended investor audience is known and the pitch appears mismatched to that audience.

If investor audience is unknown, Investor Fit should influence the report more cautiously and should not overstate fundability or lack of fundability for a specific investor category.

---

## Letter Grade Cut Point Guidance

Letter grades should reflect the combined evaluation of:

- Deck Communication Scores
- Investment Case as Presented
- Company Context
- Investor Fit, when known
- gates and binding constraints

Letter grades should not be assigned by simple averaging alone.

The grade should represent the deck's investor readiness as presented.

The grade should not imply a prediction of fundraising success.

---

## A-Range Grades

A-range grades should be rare.

A-range grades indicate that the deck communicates a compelling, stage-appropriate investment case with strong communication and no major unresolved investor concerns.

### A

Use A when the deck is exceptional for its stage.

Expected pattern:

- Deck Communication Scores are mostly 5s, with no score below 4.
- Opportunity Strength is Strong.
- Execution Credibility is Strong.
- Investor Fit is Strong or clearly appropriate when known.
- No major gate is active.
- Any remaining concerns are minor.

An A does not mean the company is guaranteed to raise capital.

It means the deck presents an unusually strong investor-ready case for its stage.

### A-

Use A- when the deck is very strong but has a small number of meaningful refinements remaining.

Expected pattern:

- Deck Communication Scores are mostly 4s and 5s.
- Investment Case as Presented is mostly Strong, with no central Weak labels.
- No major gate is active.
- Remaining issues are unlikely to prevent serious investor interest.

---

## B-Range Grades

B-range grades indicate that the deck is promising and potentially investor-ready, but meaningful weaknesses remain.

A B-range deck should usually be good enough for a serious founder to improve from, and in some cases may already be good enough to begin investor conversations depending on stage and audience.

### B+

Use B+ when the deck communicates a strong investment case but has at least one important weakness to address.

Expected pattern:

- Deck Communication Scores are generally 4 or better, with no severe communication weakness.
- Investment Case as Presented is Strong or Mixed, or Promising but Under-Supported in one important area.
- No hard gate meaningfully caps the grade.
- Investors can understand the opportunity and may want to learn more.

### B

Use B when the deck communicates a good or promising investment case but leaves meaningful investor questions unresolved.

Expected pattern:

- Deck Communication Scores are generally 3s and 4s.
- Investment Case as Presented may include Mixed or Promising but Under-Supported labels.
- Some evidence or communication gaps remain.
- No central Weak issue dominates the case.
- Investors can evaluate the opportunity, but the deck is not yet consistently strong.

### B-

Use B- when the deck has a credible foundation but is not yet reliably investor-ready.

Expected pattern:

- Deck Communication Scores may include multiple 3s or one 2.
- Investment Case as Presented may be Mixed or Promising but Under-Supported in important areas.
- Investors can understand the basic opportunity, but the case needs clearer evidence, sharper communication or stronger fit.
- A gate may be lightly constraining the grade, but not because the entire thesis is unevaluable.

---

## C-Range Grades

C-range grades indicate that the deck contains useful material but has significant investor-readiness issues.

A C-range deck may describe a real company or promising idea, but investors are likely to have major concerns before continuing.

### C+

Use C+ when the deck has recognizable strengths but the investment case is only partially convincing.

Expected pattern:

- Deck Communication Scores are mixed, often including 2s and 3s.
- Important investor questions are under-supported.
- Investment Case as Presented may include Mixed, Promising but Under-Supported or one Weak label.
- Investors may understand parts of the opportunity but lack confidence in the full thesis.

### C

Use C when the deck is materially underdeveloped.

Expected pattern:

- Deck Communication Scores are mostly 2s and 3s.
- Important Framework Slides or stage-required questions are weakly answered.
- Investment Case as Presented is under-supported, Mixed or Weak in important areas.
- One or more gates may limit the grade.
- Investors would need substantial clarification or evidence.

### C-

Use C- when the deck has serious investor-readiness issues but still contains enough information to identify the main problems.

Expected pattern:

- Deck Communication Scores include significant weaknesses.
- Major investor questions are missing, unclear or unsupported.
- Investment Case as Presented may include Weak or Not Enough Information labels in central areas.
- A gate is likely active.
- Investors cannot confidently evaluate the opportunity without major revisions.

---

## D and F Grades

D and F grades indicate that the deck is not investor-ready in its current form.

These grades should be used when investors cannot meaningfully evaluate the opportunity or when the investment case as presented is severely weak.

### D

Use D when the deck leaves major parts of the investment thesis unresolved.

Expected pattern:

- Deck Communication Scores are mostly 1s and 2s, or one critical dimension is very weak.
- Required investor questions are missing or effectively unanswered.
- Investment Case as Presented is Not Enough Information or Weak in central areas.
- One or more gates strongly limits the grade.
- Investors would need substantial additional explanation before they could evaluate the pitch.

### F

Use F when the deck does not provide enough coherent information to evaluate the opportunity or clearly presents a thesis that is not fundable for the intended investor audience.

Expected pattern:

- Deck Communication Scores are very weak across multiple dimensions.
- The deck is incoherent, severely incomplete or unsupported.
- Investment Case as Presented cannot be responsibly evaluated or is clearly incompatible with the intended investor audience.
- Multiple gates are active, or one gate is severe enough to dominate the evaluation.

An F should be used carefully.

It evaluates the deck and pitch as presented, not the founder's worth or the company's ultimate potential outside the deck.

---

## Gate Effects on Letter Grades

Gates should prevent misleadingly high letter grades.

A deck with an active Completeness Gate should usually not receive an A-range grade.

A deck with a severe Completeness Gate should usually not receive a B-range grade.

A deck with an active Clarity Gate should usually not receive an A-range grade.

A deck with a severe Clarity Gate should usually not receive a B-range grade.

A deck with an active Stage Gate should usually not receive an A-range grade.

A deck with a severe Stage Gate should usually not receive a B-range grade.

A deck with an active Evidence Gate should usually not receive an A-range grade.

A deck with a severe Evidence Gate should usually not receive a B-range grade.

A deck with an active Investment-Case Gate should usually not receive an A-range grade.

A deck with a severe Investment-Case Gate should usually not receive a B-range grade unless the gate is narrow, clearly explainable and not central to the intended investor audience.

Brevity should rarely cap the grade by itself.

However, severe Brevity issues may limit the grade when the deck is so overloaded, repetitive or unfocused that investors cannot efficiently understand the thesis.

---

## Letter Grade Calibration Principles

Letter grades should be calibrated to investor readiness, not academic perfection.

A deck does not need to be flawless to receive a strong grade.

A deck does need to resolve the major investor questions reasonably expected for its stage.

The grade should be lower when the report's primary diagnosis is central to fundability.

The grade may be higher when the primary diagnosis is a fixable communication issue and the underlying investment case appears strong.

The grade should avoid false precision.

When a deck sits near a boundary, the explanation should matter more than the exact plus or minus.

The report should make clear what most limits the grade.

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

Founder-facing reports should emphasize diagnosis over judgment.

The report should show:

- one Overall Grade
- four Deck Communication Scores
- one Investment Case as Presented assessment
- a concise explanation of why the grade and assessments were assigned

The Overall Grade should be displayed as a letter grade.

The four Deck Communication Scores should be displayed using the internal 1–5 score bands.

Each Deck Communication Score should include both the numeric band and the descriptive label.

For example:

- Completeness: 3/5 — Adequate
- Clarity: 4/5 — Strong
- Brevity: 3/5 — Adequate
- Flow: 4/5 — Strong

The Investment Case as Presented should be displayed qualitatively.

It should include:

- Opportunity Strength
- Execution Credibility
- Investor Fit

These should not be displayed as 1–5 peer scores.

The report should not display a separate Fundability Score.

Fundability is communicated through the Overall Grade, the Deck Communication Scores, the Investment Case as Presented and the narrative explanation.

The Overall Grade should reflect the deck's communicated fundability for the company's current stage and investor context when known.

The Deck Communication Scores should explain what type of communication improvement is needed.

The Investment Case as Presented should explain whether the pitch itself appears compelling, credible and appropriately matched to the intended investor audience.
