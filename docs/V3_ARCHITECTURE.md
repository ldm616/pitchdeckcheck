# V3 Evaluation Architecture

## Purpose
This system is evolving from a single prompt into a structured evaluation system with:

- Core Prompt (stable)
- Rule Packs (context-specific)
- Pattern Library (investor reasoning)
- Calibration Set (regression testing)
- Evaluation Findings (continuous improvement)

## Core Principle
The system must be:
- question-first
- deck-aware
- investor-grounded
- pattern-informed
- calibration-tested

## Target Flow
Deck → Context Detection → Rule Pack Selection → Pattern Retrieval → Evaluation → Scoring → Calibration Check → Findings Logging

## Components

### Core Prompt
Stable evaluator defining:
- JSON output format
- evidence discipline
- evaluation tone

### Rule Packs
Versioned context logic:
- modern_seed_deck
- sparse_high_signal_deck
- marketplace
- consumer_network
- SaaS
- local_services_marketplace
- infrastructure_developer

### Pattern Library
Investor success/failure patterns

### Calibration Set
Used to prevent overfitting

Initial decks:
- Gleamr (modern seed marketplace)
- YouTube (sparse high-signal)

### Evaluation Findings
Every failure becomes:
- observed_issue
- generalized_rule
- fix_type
- version_fixed
- status

## Rules for Improvement
Do:
- generalize fixes
- test across decks
- track regressions

Do NOT:
- optimize for one deck
- add one-off rules
- endlessly grow the prompt
