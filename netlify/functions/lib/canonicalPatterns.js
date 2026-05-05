/**
 * Canonical Investor Patterns
 *
 * These patterns are derived from real investor reasoning found in investment memos
 * (YouTube/Sequoia 2005, Shopify/BVP 2010, SendGrid/BVP 2011).
 *
 * Each pattern captures a reusable investor reasoning principle that maps
 * to specific rubric questions. This enables proprietary, investor-calibrated
 * feedback rather than generic AI output.
 *
 * Source of truth: This file
 * Database copy: patterns, pattern_sources, pattern_rubric_map tables
 *
 * To sync to database: npm run seed:patterns (in /scripts)
 */

const PATTERN_VERSION = 'patterns_v1_2026_05_04'

const CANONICAL_PATTERNS = [
  {
    pattern_key: 'infrastructure_unlock',
    name: 'Infrastructure unlocks new markets',
    category: 'market',
    description:
      'Technology or infrastructure maturity removes a key constraint, enabling a new product category or customer behavior to emerge.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt:
          'Broadband adoption and inexpensive video capture devices made user-generated video viable.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'SaaS and online distribution made SMB ecommerce software easier to adopt.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Cloud/PaaS infrastructure made developer-oriented email delivery services viable.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'market', question_key: 'market_03', strength: 3 },
      { slide_type: 'roadmap', question_key: 'roadmap_01', strength: 1 },
    ],
  },

  {
    pattern_key: 'simplicity_wins_adoption',
    name: 'Simplicity wins adoption',
    category: 'product',
    description:
      'Products that make a previously complex workflow simple and self-serve can unlock adoption among non-expert or underserved users.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Upload/share/watch without codecs or downloads.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Online store live in hours.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Developers sending transactional email same day.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'product', question_key: 'product_03', strength: 3 },
      { slide_type: 'solution', question_key: 'solution_03', strength: 3 },
      { slide_type: 'solution', question_key: 'solution_02', strength: 2 },
    ],
  },

  {
    pattern_key: 'removes_non_core_complexity',
    name: 'Removes non-core complexity',
    category: 'product',
    description:
      'Strong products let customers outsource painful operational complexity that is important but not core to their own business.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Handles hosting, encoding, and format fragmentation.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Handles ecommerce infrastructure.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt:
          'Handles deliverability, email infrastructure, spam reputation, and reporting.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'solution', question_key: 'solution_02', strength: 3 },
      { slide_type: 'solution', question_key: 'solution_01', strength: 2 },
      { slide_type: 'solution', question_key: 'solution_03', strength: 2 },
    ],
  },

  {
    pattern_key: 'efficient_growth_validates_pull',
    name: 'Efficient growth validates pull',
    category: 'traction',
    description:
      'Strong organic growth or efficient acquisition indicates market pull and reduces reliance on expensive paid growth.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Rapid usage growth in first two months.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Organic customer and MRR growth with limited marketing.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Organic developer growth and low CAC.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'traction', question_key: 'traction_01', strength: 3 },
      { slide_type: 'traction', question_key: 'traction_03', strength: 3 },
      { slide_type: 'go_to_market', question_key: 'go_to_market_01', strength: 2 },
    ],
  },

  {
    pattern_key: 'cohort_expansion_offsets_churn',
    name: 'Cohort expansion offsets churn',
    category: 'business_model',
    description:
      'In SMB or developer markets, customer churn can be acceptable when retained cohorts expand materially on a revenue basis.',
    sources: [
      {
        source: 'bvp_shopify_2010',
        excerpt: 'SMB churn acceptable with strong cohort retention.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Logo churn acceptable given net dollar expansion.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'business_model', question_key: 'business_model_01', strength: 3 },
      { slide_type: 'traction', question_key: 'traction_04', strength: 2 },
      { slide_type: 'financials', question_key: 'financials_02', strength: 2 },
    ],
  },

  {
    pattern_key: 'ecosystems_compound_value',
    name: 'Ecosystems compound product value',
    category: 'product',
    description:
      'APIs, embeds, app stores, partnerships, or developer ecosystems can compound product value, distribution, or defensibility.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Embeddable player extends distribution.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'App Store and open API expand product functionality.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Heroku/Rackspace/Softlayer partnerships create developer distribution.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'competition', question_key: 'competition_03', strength: 3 },
      { slide_type: 'solution', question_key: 'solution_01', strength: 2 },
      { slide_type: 'go_to_market', question_key: 'go_to_market_03', strength: 2 },
      { slide_type: 'product', question_key: 'product_02', strength: 1 },
    ],
  },

  {
    pattern_key: 'explicit_uncertainty_builds_credibility',
    name: 'Explicit uncertainty builds credibility',
    category: 'financials',
    description:
      'Investor-ready companies surface unknowns, model scenarios, and explain how assumptions will be tested instead of presenting false precision.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'CPM and monetization assumptions called out explicitly.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Market sizing and SMB risks acknowledged.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Commoditization and enterprise expansion risks acknowledged.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'financials', question_key: 'financials_01', strength: 3 },
      { slide_type: 'market', question_key: 'market_02', strength: 2 },
      { slide_type: 'market', question_key: 'market_01', strength: 2 },
    ],
  },

  {
    pattern_key: 'segment_focus_beats_generic_market',
    name: 'Segment focus beats generic market claims',
    category: 'market',
    description:
      'Strong pitches define the specific customer segment they can win first instead of relying only on broad market size.',
    sources: [
      {
        source: 'bvp_shopify_2010',
        excerpt: 'SMBs and at-home capitalists.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Developers sending transactional email.',
      },
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'User-generated personal video, not all online video.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'market', question_key: 'market_04', strength: 3 },
      { slide_type: 'problem', question_key: 'problem_03', strength: 3 },
      { slide_type: 'problem', question_key: 'problem_01', strength: 2 },
    ],
  },

  {
    pattern_key: 'competition_by_segment_and_job',
    name: 'Competition by segment and job-to-be-done',
    category: 'competition',
    description:
      'Investor-ready competitive analysis segments alternatives by customer segment and job-to-be-done rather than listing similar companies only.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt:
          'Direct competitors, photo sites, entertainment sites, large internet players, file storage, IPTV.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt:
          'SMB ecommerce platforms, registrars, mid-tier ecommerce products, enterprise packages.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'AWS SES, email marketing vendors, infrastructure email entrants.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'competition', question_key: 'competition_04', strength: 3 },
      { slide_type: 'competition', question_key: 'competition_02', strength: 3 },
      { slide_type: 'competition', question_key: 'competition_01', strength: 2 },
    ],
  },

  {
    pattern_key: 'distribution_built_into_product',
    name: 'Distribution built into product',
    category: 'go_to_market',
    description:
      'Products with built-in distribution loops or embedded channels can scale more efficiently than products relying only on external marketing.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Embeds distribute videos across other sites.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Web designer referrals and app ecosystem.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Platform partnerships and developer community.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'go_to_market', question_key: 'go_to_market_03', strength: 3 },
      { slide_type: 'go_to_market', question_key: 'go_to_market_02', strength: 3 },
      { slide_type: 'go_to_market', question_key: 'go_to_market_01', strength: 2 },
    ],
  },

  {
    pattern_key: 'customer_love_validates_product',
    name: 'Customer love validates product',
    category: 'traction',
    description:
      'Strong customer references, intense usage, or clear willingness to tolerate switching costs validate that the product solves a meaningful problem.',
    sources: [
      {
        source: 'bvp_sendgrid_2011',
        excerpt:
          'Customer calls showed deep product adoration and reluctance to switch despite cheaper alternatives.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Organic adoption and app usage suggested customer pull.',
      },
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Rapid content/viewer growth suggested usage pull.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'traction', question_key: 'traction_02', strength: 3 },
      { slide_type: 'traction', question_key: 'traction_04', strength: 2 },
      { slide_type: 'solution', question_key: 'solution_03', strength: 2 },
    ],
  },

  {
    pattern_key: 'founder_market_fit_through_relevant_experience',
    name: 'Founder-market fit through relevant experience',
    category: 'team',
    description:
      'Investors value teams whose prior experience directly maps to the specific product, market, infrastructure, or GTM problem being solved.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'PayPal scaling/design experience.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Ruby on Rails/product design DNA.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt:
          'Founders ran email infrastructure and later added professional operators.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'team', question_key: 'team_01', strength: 3 },
      { slide_type: 'team', question_key: 'team_02', strength: 2 },
      { slide_type: 'team', question_key: 'team_03', strength: 2 },
    ],
  },

  {
    pattern_key: 'team_gaps_are_ok_if_acknowledged',
    name: 'Team gaps are acceptable if acknowledged',
    category: 'team',
    description:
      'Early team gaps are less concerning when the company clearly identifies them and has a credible plan to recruit around them.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt: 'Need for CEO and VP BD/Sales acknowledged.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Need for VP Marketing and senior talent acknowledged.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Professional management layered around technical founders.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'team', question_key: 'team_03', strength: 3 },
      { slide_type: 'team', question_key: 'team_04', strength: 2 },
    ],
  },

  {
    pattern_key: 'unit_economics_can_de_risk_market_doubt',
    name: 'Unit economics can de-risk market doubt',
    category: 'business_model',
    description:
      'Strong CAC, payback, retention, expansion, or margin metrics can overcome investor concerns about market size or category risk.',
    sources: [
      {
        source: 'bvp_shopify_2010',
        excerpt: 'CAC/payback and ARPU expansion despite SMB skepticism.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt: 'Low CAC, under-six-month payback, strong net dollar expansion.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'business_model', question_key: 'business_model_01', strength: 3 },
      { slide_type: 'financials', question_key: 'financials_02', strength: 3 },
      { slide_type: 'traction', question_key: 'traction_04', strength: 2 },
    ],
  },

  {
    pattern_key: 'incumbent_misalignment_creates_opening',
    name: 'Incumbent misalignment creates opening',
    category: 'competition',
    description:
      'Startups can win when incumbents are structurally misaligned with the emerging customer segment, business model, UX expectation, or distribution channel.',
    sources: [
      {
        source: 'sequoia_youtube_2005',
        excerpt:
          'Big players focused on search or Hollywood content rather than UGC community.',
      },
      {
        source: 'bvp_shopify_2010',
        excerpt: 'Enterprise ecommerce vendors too complex and expensive for SMBs.',
      },
      {
        source: 'bvp_sendgrid_2011',
        excerpt:
          'AWS had good-enough low-end product but lacked advanced deliverability/reporting.',
      },
    ],
    rubric_mappings: [
      { slide_type: 'competition', question_key: 'competition_02', strength: 3 },
      { slide_type: 'solution', question_key: 'solution_01', strength: 2 },
      { slide_type: 'roadmap', question_key: 'roadmap_01', strength: 1 },
    ],
  },
]

module.exports = {
  PATTERN_VERSION,
  CANONICAL_PATTERNS,
}
