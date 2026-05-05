/**
 * Evaluation Rule Packs
 *
 * Context-specific evaluation rules that modify how the core prompt
 * evaluates different types of decks.
 *
 * These are NOT active in runtime yet - scaffolding for v3 architecture.
 */

const RULE_PACK_VERSION = 'rule_packs_v1_2026_05_05'

const EVALUATION_RULE_PACKS = {
  modern_seed_deck: {
    name: 'Modern Seed Deck',
    description: 'Contemporary startup decks with expected metrics and structure.',
    rules: [
      'Reward credible investor signal, not completeness alone.',
      'Missing CAC or retention matters when growth depends on scaling efficiency.',
      'Financials should connect to traction and GTM.'
    ]
  },

  sparse_high_signal_deck: {
    name: 'Sparse High-Signal Deck',
    description: 'Early decks with strong ideas but limited detail.',
    rules: [
      'Evaluate signal over completeness.',
      'Do not penalize missing CAC/LTV/financial detail if core idea is strong.',
      'Reward clarity, timing, insight, simplicity.'
    ]
  },

  marketplace: {
    name: 'Marketplace',
    description: 'Two-sided businesses.',
    rules: [
      'Evaluate supply and demand strength.',
      'Assess liquidity and trust.',
      'Check if advantages are durable.'
    ]
  },

  local_services_marketplace: {
    name: 'Local Services Marketplace',
    description: 'Consumer-service matching platforms.',
    rules: [
      'Assess trust and repeat usage.',
      'Do not apply SaaS or API logic unless present.',
      'Coverage only matters if it compounds.'
    ]
  },

  consumer_network: {
    name: 'Consumer Network',
    description: 'User/content-driven products.',
    rules: [
      'Look for network effects or user pull.',
      'Why-now can come from infrastructure shifts.',
      'Sparse traction can still be high-signal.'
    ]
  },

  saas: {
    name: 'SaaS',
    description: 'Subscription software.',
    rules: [
      'Evaluate retention, CAC, expansion.',
      'Missing unit economics is meaningful.',
      'Link product value to revenue durability.'
    ]
  },

  infrastructure_developer: {
    name: 'Infrastructure / Developer',
    description: 'Technical platforms.',
    rules: [
      'Evaluate complexity reduction.',
      'Check developer adoption.',
      'Assess commoditization risk.'
    ]
  }
}

module.exports = {
  RULE_PACK_VERSION,
  EVALUATION_RULE_PACKS,
}
