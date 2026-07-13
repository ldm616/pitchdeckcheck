/**
 * Investor-topic criteria — product-owned, deterministic content artifact.
 *
 * One entry per Investor Topic (keyed by topic_key), each with:
 *   - display_question   : the "What's the investor thinking for this topic?"
 *                          line (deterministic source for investor_decision).
 *   - investor_question  : the underlying investor question for the topic.
 *   - investor_criteria  : the "What investors are looking for" bullet list.
 *
 * {companyName} is interpolated at attach time (see interpolateCompanyName):
 * detected company name where available (e.g. "Gleamr"), else "this company".
 *
 * This artifact contains product-owned copy. Do not author or alter the content
 * here without the product owner's instruction; wrap code around it only.
 * There is intentionally NO criterion-level scoring / status here yet
 * (investor_criteria is a plain string[]).
 */

'use strict';

const INVESTOR_TOPIC_CRITERIA = {
  cover: {
    topic_key: 'cover',
    display_question: 'What does {companyName} do, who is it for, and why should I care?',
    investor_question:
      'Can investors quickly understand what the company does, who it serves, and why it matters?',
    investor_criteria: [
      'Clear company description',
      'Specific target customer',
      'Clear value proposition',
      'Compelling reason to care now',
      'Professional first impression',
    ],
  },

  team: {
    topic_key: 'team',
    display_question: 'Why is this team likely to win?',
    investor_question:
      'Does this team have the relevant experience and expertise to build this product and turn it into a market-leading business?',
    investor_criteria: [
      'Relevant domain experience',
      'Relevant product-building experience',
      'Relevant business-building experience',
      'Founder-market fit',
      'Team gaps or missing capabilities',
    ],
  },

  problem: {
    topic_key: 'problem',
    display_question: 'Who has this problem, how painful is it, and what do they do today?',
    investor_question:
      'Is there a meaningful, urgent, and specific customer problem that existing alternatives do not solve well?',
    investor_criteria: [
      'Specific customer segment',
      'Clear pain or value gap',
      'Frequency and severity of the problem',
      'Current alternatives or workarounds',
      'Evidence the problem is worth solving',
    ],
  },

  solution: {
    topic_key: 'solution',
    display_question: 'Why is {companyName} a better way to solve this problem?',
    investor_question:
      'Does the solution directly address the problem and give customers a strong reason to switch?',
    investor_criteria: [
      'Direct connection to the stated problem',
      'Clear customer benefit',
      'Reason to switch from current alternatives',
      'Differentiated approach',
      'Simple explanation of how it works',
    ],
  },

  product: {
    topic_key: 'product',
    display_question: 'Does the product actually deliver the promised value?',
    investor_question:
      'Does the product show how the company delivers value to users in a credible and usable way?',
    investor_criteria: [
      'Clear user workflow',
      'Core product functionality',
      'Evidence the product is real or usable',
      'Activation, usage, or completion proof',
      'Gaps in the user journey or product proof',
    ],
  },

  market: {
    topic_key: 'market',
    display_question:
      'Is this market big enough and specific enough to support a venture-scale outcome?',
    investor_question:
      'Is the market opportunity large, well-defined, and reachable enough to support a venture-scale business?',
    investor_criteria: [
      'Clearly defined market category',
      'Credible market size',
      'Specific serviceable market',
      'Bottom-up assumptions',
      'Path to meaningful market share',
    ],
  },

  traction: {
    topic_key: 'traction',
    display_question: 'Is this real demand, or just early activity?',
    investor_question:
      'Does the deck show evidence that customers are adopting, using, paying for, or repeatedly engaging with the product?',
    investor_criteria: [
      'Customer or user growth',
      'Revenue or transaction growth',
      'Retention or repeat usage',
      'Engagement or usage quality',
      'Evidence momentum is durable',
    ],
  },

  business_model: {
    topic_key: 'business_model',
    display_question: 'Can {companyName} turn each transaction into an attractive, scalable business?',
    investor_question:
      'Can the company convert customer value into a large, durable, and attractive business model?',
    investor_criteria: [
      'Clear revenue model',
      'Pricing or take rate',
      'Gross margin or unit economics',
      'CAC and payback logic',
      'Scalability of the model',
    ],
  },

  competition: {
    topic_key: 'competition',
    display_question: 'Why would customers choose {companyName} instead of existing alternatives?',
    investor_question:
      'Does the deck clearly explain the competitive landscape and why customers will choose this company over alternatives?',
    investor_criteria: [
      'Named competitors or alternatives',
      'Clear basis of comparison',
      'Specific differentiation',
      'Customer decision factors',
      'Honest positioning against stronger incumbents',
    ],
  },

  moat: {
    topic_key: 'moat',
    display_question: 'What makes {companyName} harder to copy as it scales?',
    investor_question:
      'Does the company have advantages that can become stronger, more durable, or harder to copy over time?',
    investor_criteria: [
      'Network effects or marketplace density',
      'Switching costs or retention loops',
      'Proprietary data or technology',
      'Supply, distribution, or acquisition advantage',
      'Durability against fast followers',
    ],
  },

  go_to_market: {
    topic_key: 'go_to_market',
    display_question: 'Can {companyName} acquire customers and suppliers repeatedly and efficiently?',
    investor_question:
      'Does the deck show a repeatable and efficient path to acquiring the customers and supply needed to scale?',
    investor_criteria: [
      'Clearly defined initial customer segment',
      'Specific acquisition channels',
      'Evidence of channel performance',
      'CAC, conversion, or payback proof',
      'Scalable repeatable growth motion',
    ],
  },

  roadmap: {
    topic_key: 'roadmap',
    display_question: 'Do these milestones create meaningful company value?',
    investor_question:
      'Does the roadmap show a credible sequence of milestones that increase customer value and company value?',
    investor_criteria: [
      'Clear near-term milestones',
      'Connection to customer value',
      'Connection to business value',
      'Realistic sequencing',
      'Milestones that de-risk the next round',
    ],
  },

  financials: {
    topic_key: 'financials',
    display_question: 'What has to be true for {companyName} to reach these projections?',
    investor_question:
      'Are the financial projections credible, internally consistent, and tied to the operating drivers of the business?',
    investor_criteria: [
      'Revenue driver assumptions',
      'Customer or transaction growth assumptions',
      'Cost and margin assumptions',
      'Burn and runway logic',
      'Bridge from current traction to projected scale',
    ],
  },

  ask: {
    topic_key: 'ask',
    display_question: 'What does this round buy, and what milestone does it get {companyName} to?',
    investor_question:
      'Does the financing plan explain how much capital is being raised, how it will be used, and what milestone it enables?',
    investor_criteria: [
      'Clear raise amount',
      'Clear use of funds',
      'Runway or time horizon',
      'Milestones funded by the round',
      'Link to next financing or value inflection',
    ],
  },

  contact: {
    topic_key: 'contact',
    display_question: 'How do I continue the conversation?',
    investor_question: 'Does the deck make it easy for an interested investor to follow up?',
    investor_criteria: [
      'Clear contact information',
      'Founder or company email',
      'Website or relevant link',
      'Professional closing slide',
      'Easy next step for investor follow-up',
    ],
  },
};

/**
 * Replace {companyName} in a template string.
 * Detected company name where available; missing → "this company".
 * Never hardcodes a specific company.
 */
function interpolateCompanyName(str, companyName) {
  const name = (companyName && String(companyName).trim()) || 'this company';
  return String(str == null ? '' : str).replace(/\{companyName\}/g, name);
}

module.exports = {
  INVESTOR_TOPIC_CRITERIA,
  interpolateCompanyName,
};
