export type ExamQuestionType = 'MULTIPLE_CHOICE' | 'SITUATION_WRITTEN' | 'Q_AND_A_SHORT';

export interface ExamQuestionItem {
  id: string;
  skillCategory: string;
  questionType: ExamQuestionType;
  questionTitle: string;
  questionPrompt: string;
  options?: string[]; // Only for MULTIPLE_CHOICE
  correctOptionIndex?: number; // Only for MULTIPLE_CHOICE
  sampleStrongAnswer: string;
}

export const AGENCY_MASTER_EXAM_BANK: ExamQuestionItem[] = [
  // ==========================================
  // 1. CORE GOVERNANCE, SITUATIONAL AWARENESS & CLIENT COMMUNICATION (10 Questions)
  // ==========================================
  {
    id: 'gov-1',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Emergency Client Escalation & Post-Deployment Traffic Drop',
    questionPrompt:
      'SITUATION: A Tier-1 enterprise client emails on Friday at 4:30 PM furious that organic traffic dropped 22% after a staging-to-production deployment. Write your immediate client email response and list your exact 3-step technical triage protocol.',
    sampleStrongAnswer:
      "Dear [Client Name], I am personally leading an immediate technical audit of today's deployment. Our squad is verifying Search Console crawl logs, robots.txt directives, and server response codes across top landing pages. We will deliver a root-cause report within 2 hours. Triage Steps: 1) Inspect Search Console live URL inspect & server 5xx log spikes. 2) Check canonical tags & robots meta tags on production. 3) Revert or hotfix any rogue staging noindex headers."
  },
  {
    id: 'gov-2',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Scope Creep Defense During Client Calls',
    questionPrompt:
      'During a weekly sync, the client CMO requests an unplanned 30-page custom schema migration due by next Tuesday without budget expansion. What is the correct Tier-1 Governance response?',
    options: [
      'Agree immediately to keep the client happy and force the squad to work overtime.',
      'Acknowledge the strategic value, estimate the exact hours needed, and propose adding it to next sprint via an official Change Request or backlog swap.',
      'Refuse outright on the call and tell the client it is not in the contract.',
      'Ignore the request and hope the client forgets by next week.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Acknowledge the strategic value, estimate the exact hours needed, and propose adding it to next sprint via an official Change Request or backlog swap.'
  },
  {
    id: 'gov-3',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Autonomous Blocker Resolution Before Deadline',
    questionPrompt:
      'SITUATION: During sprint execution, a critical deliverable is blocked by missing client CMS credentials 48 hours before the milestone deadline. Explain your proactive escalation and contingency workflow.',
    sampleStrongAnswer:
      'Instantly notify the Squad Lead and Client Manager via Slack with an urgent blocker alert. Simultaneously draft a professional client follow-up specifying the exact credential access role needed, and immediately pivot to an alternative interim sprint task so zero velocity is lost.'
  },
  {
    id: 'gov-4',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Client SLA Communication Windows',
    questionPrompt:
      'What is the mandatory agency SLA response window for a P1 Critical Production Blocker (e.g., site returning 500 errors or noindex tag deployed on home page)?',
    options: [
      'Within 24 business hours',
      'Within 60 minutes with immediate triage initiation',
      'By the next scheduled weekly client call',
      'Within 4 hours during normal business hours'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer: 'Option B: Within 60 minutes with immediate triage initiation'
  },
  {
    id: 'gov-5',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Executive Summary Structure in Deliverables',
    questionPrompt:
      'What are the 3 mandatory components of the "Executive Summary" slide/paragraph in any Tier-1 client deliverable?',
    sampleStrongAnswer:
      '1) Core Business Impact / Revenue Opportunity, 2) Key Data Findings / Root Cause Diagnosis, 3) Prioritized Actionable Next Steps with Owners and Timeline.'
  },
  {
    id: 'gov-6',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'NDA & Data Privacy Governance',
    questionPrompt:
      'A team member wants to paste raw client server log files containing proprietary customer query data and PII into an unauthorized public AI tool. What is the policy?',
    options: [
      'Allowed if the log file is under 1MB',
      'Strictly prohibited; all client data must be sanitized or processed only within secure SOC2 agency-approved enterprise environments',
      'Allowed if you delete the prompt history afterwards',
      'Allowed only for staging servers'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Strictly prohibited; all client data must be sanitized or processed only within secure SOC2 agency-approved enterprise environments'
  },
  {
    id: 'gov-7',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Handling a Client Disagreement on Strategy',
    questionPrompt:
      'SITUATION: A client VP insists on targeting low-intent vanity keywords that have zero commercial conversion potential. How do you redirect their strategy respectfully?',
    sampleStrongAnswer:
      'Present a side-by-side comparison of Search Intent and Conversion Rate benchmarks. Show how commercial intent clusters generate 4x higher pipeline revenue despite lower raw search volume, and propose a pilot cluster to prove ROI.'
  },
  {
    id: 'gov-8',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Sprint Delivery Quality Assurance Gate',
    questionPrompt:
      'Before marking any technical or strategy deliverable as "Client Ready" in the agency hub, what mandatory peer-review step must be completed?',
    options: [
      'Self-check spellcheck only',
      'Dual sign-off: Technical Lead rubric checklist verification + Client Lead communication clarity review',
      'Automated grammar scan',
      'No review needed for Tier 1 employees'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Dual sign-off: Technical Lead rubric checklist verification + Client Lead communication clarity review'
  },
  {
    id: 'gov-9',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Pre-Meeting Preparation Protocol',
    questionPrompt:
      'What must be prepared and shared with the client at least 12 hours prior to any Quarterly Business Review or Strategy Sync?',
    sampleStrongAnswer:
      'A structured Agenda itemized by topic, pre-read deck or KPI scorecard, and explicit decision items required from stakeholders.'
  },
  {
    id: 'gov-10',
    skillCategory: 'Core Governance & Situational Awareness',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Cross-Squad Resource Dependency Resolution',
    questionPrompt:
      'SITUATION: Your SEO technical audit requires implementation by the client external development agency, who claims they have no sprint capacity for 3 months. How do you overcome this?',
    sampleStrongAnswer:
      'Package our top 3 highest-impact fixes into self-contained edge-worker or cloudflare snippets where possible, or present an Executive Business Case to the client CTO quantifying the monthly revenue loss of delaying the fixes.'
  },

  // ==========================================
  // 2. TECHNICAL SEO & SITE ARCHITECTURE (10 Questions)
  // ==========================================
  {
    id: 'tech-1',
    skillCategory: 'Technical SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'JavaScript Rendering & Indexing Blocker Diagnosis',
    questionPrompt:
      'SITUATION: An enterprise Next.js e-commerce client reports that Googlebot is not indexing their dynamically filtered category pages despite 200 OK status codes. Diagnose client-side vs server-side rendering issues and specify the architectural fix.',
    sampleStrongAnswer:
      'Run Google Search Console Live URL Test to inspect rendered HTML vs raw DOM. Ensure internal links use clean <a href> tags rather than JS onClick handlers. Implement Server-Side Rendering (SSR) or Static Site Generation (SSG) for all indexable category URLs.'
  },
  {
    id: 'tech-2',
    skillCategory: 'Technical SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Canonicalization & Parameter Handling',
    questionPrompt:
      'An e-commerce site generates tracking URLs like /shoes?color=red&utm_source=fb. What is the correct canonicalization and indexing strategy?',
    options: [
      'Add noindex to all URLs containing parameters and omit canonical tags.',
      'Point the self-referencing canonical tag on all parameter URLs back to the clean base URL (/shoes) and configure robots.txt clean parameters.',
      'Set canonical tags to point to the homepage.',
      'Use 301 redirects on all parameter URLs.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Point the self-referencing canonical tag on all parameter URLs back to the clean base URL (/shoes) and configure robots.txt clean parameters.'
  },
  {
    id: 'tech-3',
    skillCategory: 'Technical SEO',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Core Web Vitals Interaction to Next Paint (INP)',
    questionPrompt:
      'What is the Google threshold for a "Good" INP score, and what are 2 primary frontend causes of poor INP?',
    sampleStrongAnswer:
      'Good INP threshold is under 200 milliseconds. Primary causes: 1) Long main-thread JavaScript execution tasks blocking UI rendering, 2) Unoptimized event handler callbacks.'
  },
  {
    id: 'tech-4',
    skillCategory: 'Technical SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'International Hreflang Configuration',
    questionPrompt:
      'When configuring hreflang tags for a US English site (/en-us/) and a UK English site (/en-gb/), which rule is strictly required to avoid invalidation?',
    options: [
      'Only the homepage requires hreflang tags.',
      'Bidirectional reciprocal return links across all language variations plus an x-default fallback tag.',
      'Hreflang tags should use uppercase language codes only.',
      'Canonical tags must point to x-default.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Bidirectional reciprocal return links across all language variations plus an x-default fallback tag.'
  },
  {
    id: 'tech-5',
    skillCategory: 'Technical SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Crawl Budget Optimization on 1M+ Page E-Commerce Site',
    questionPrompt:
      'SITUATION: Server log file analysis reveals Googlebot spends 65% of its crawl budget hitting faceted search combination URLs (/shop?sort=price&brand=nike&size=10). Outline your remediation architecture.',
    sampleStrongAnswer:
      'Disallow infinite faceted combination paths via robots.txt (Disallow: /*?*sort=), apply noindex/nofollow to non-searchable facets, and expose only high-search-volume curated facet landing pages via clean static URL paths in XML sitemaps.'
  },
  {
    id: 'tech-6',
    skillCategory: 'Technical SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'HTTP Status Code Triage: 301 vs 302 vs 308',
    questionPrompt:
      'Which HTTP redirect status code should be used for a permanent site migration that preserves the request method (POST/GET) strictly across endpoints?',
    options: [
      '302 Found',
      '301 Moved Permanently',
      '308 Permanent Redirect',
      '307 Temporary Redirect'
    ],
    correctOptionIndex: 2,
    sampleStrongAnswer: 'Option C: 308 Permanent Redirect'
  },
  {
    id: 'tech-7',
    skillCategory: 'Technical SEO',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'JSON-LD Structured Data Hierarchy',
    questionPrompt:
      'How should nested Organization, WebSite, and BreadcrumbList schemas be linked together within a single JSON-LD graph?',
    sampleStrongAnswer:
      'Use proper @id referencing (e.g. "@id": "https://domain.com/#organization") and link entities using "@graph" array syntax so Google parses unified entity relationships.'
  },
  {
    id: 'tech-8',
    skillCategory: 'Technical SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Robots.txt Directive Precedence',
    questionPrompt:
      'If robots.txt contains both "Allow: /products/shoes" and "Disallow: /products/", how does Googlebot handle crawling for /products/shoes/nike?',
    options: [
      'It is blocked because Disallow always wins.',
      'It is allowed because Googlebot matches the longest specific path rule.',
      'It depends on which line appears first in the file.',
      'It results in a crawl error.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: It is allowed because Googlebot matches the longest specific path rule.'
  },
  {
    id: 'tech-9',
    skillCategory: 'Technical SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Cumulative Layout Shift (CLS) Hero Banner Fix',
    questionPrompt:
      'SITUATION: Mobile CLS is failing at 0.35 because a web font swap and dynamic notification banner push down the hero section after load. Detail your CSS & font engineering fix.',
    sampleStrongAnswer:
      'Preload critical font files (<link rel="preload" as="font">) with font-display: optional or swap with exact fallback font metrics (size-adjust). Reserve fixed min-height container space for any notification banner above the fold.'
  },
  {
    id: 'tech-10',
    skillCategory: 'Technical SEO',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'XML Sitemap Governance Standards',
    questionPrompt:
      'What are the 3 critical criteria for URLs included in an enterprise production XML Sitemap?',
    sampleStrongAnswer:
      '1) Must return HTTP 200 OK, 2) Must be self-referencing canonical indexable URLs (no noindex or redirects), 3) Accurate <lastmod> timestamp reflecting real content updates.'
  },

  // ==========================================
  // 3. ON-PAGE SEO & SEMANTIC OPTIMIZATION (8 Questions)
  // ==========================================
  {
    id: 'onpage-1',
    skillCategory: 'On-Page SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Entity Salience & NLP Content Gap Engineering',
    questionPrompt:
      'SITUATION: A client service page ranks #6 for "Enterprise Cloud Security" despite having more backlinks than #1. Analysis shows missing topical entities. How do you optimize entity salience?',
    sampleStrongAnswer:
      'Conduct semantic entity extraction (Google NLP API) against top 3 ranking URLs. Integrate missing primary and secondary entities (e.g., Zero Trust Architecture, IAM, SOC2 compliance) into H2 subheadings, definitive introduction paragraphs, and structured FAQ schema.'
  },
  {
    id: 'onpage-2',
    skillCategory: 'On-Page SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Keyword Cannibalization Resolution',
    questionPrompt:
      'Two pages on the client domain constantly swap between positions #8 and #14 for their primary money keyword. What is the cleanest architectural resolution?',
    options: [
      'Add more keyword density to both pages.',
      'Consolidate the two pages into one definitive long-form pillar page, 301 redirecting the weaker page to the stronger URL.',
      'Change the title tag of one page to lowercase.',
      'Remove internal links pointing to both pages.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Consolidate the two pages into one definitive long-form pillar page, 301 redirecting the weaker page to the stronger URL.'
  },
  {
    id: 'onpage-3',
    skillCategory: 'On-Page SEO',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Internal PageRank Sculpting & Contextual Anchors',
    questionPrompt:
      'What is the optimal internal linking protocol when publishing a new supporting cluster article to boost the primary commercial pillar page?',
    sampleStrongAnswer:
      'Include 2-3 descriptive, exact or partial-match keyword anchor text links within the first 300 words pointing upward to the core commercial pillar page, plus horizontal links to related cluster nodes.'
  },
  {
    id: 'onpage-4',
    skillCategory: 'On-Page SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'HTML Heading Hierarchy (H1-H4) Best Practices',
    questionPrompt:
      'Which HTML heading structure is compliant with semantic accessibility and modern SEO standards?',
    options: [
      'Multiple H1 tags per section to target different keywords.',
      'Exactly one unique descriptive H1 per page, followed logically by H2 major sections and H3 subtopics without skipping hierarchy levels.',
      'Using H3 tags for visual styling without H2 tags above them.',
      'Omitting H1 entirely if the hero image has text.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Exactly one unique descriptive H1 per page, followed logically by H2 major sections and H3 subtopics without skipping hierarchy levels.'
  },
  {
    id: 'onpage-5',
    skillCategory: 'On-Page SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Featured Snippet & People Also Ask (PAA) Capture',
    questionPrompt:
      'SITUATION: A client page ranks #3 for a high-volume informational query where position #0 is a paragraph/table Featured Snippet. How do you re-engineer the content block to capture the snippet?',
    sampleStrongAnswer:
      'Place an explicit H2 matching the query exactly, immediately followed by a concise 45-55 word direct definition paragraph or a well-structured markdown HTML table (<table, th, tr>) with clean semantic headers.'
  },
  {
    id: 'onpage-6',
    skillCategory: 'On-Page SEO',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Title Tag & Meta Description CTR Optimization',
    questionPrompt:
      'When optimizing a title tag for high competitive CTR on desktop and mobile SERPs, what character / pixel length and keyword placement is optimal?',
    options: [
      '100 characters with keyword at the very end.',
      'Under 580 pixels (~55-60 characters) with primary commercial keyword front-loaded and a compelling conversion hook.',
      '20 characters only.',
      'Repeating the primary keyword 3 times.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Under 580 pixels (~55-60 characters) with primary commercial keyword front-loaded and a compelling conversion hook.'
  },
  {
    id: 'onpage-7',
    skillCategory: 'On-Page SEO',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Content Pruning & Index Bloat Remediation',
    questionPrompt:
      'When auditing a blog with 2,000 articles where 40% generate zero organic traffic over 18 months, what criteria decide whether to Update, Consolidate (301), or Delete (410)?',
    options: undefined,
    sampleStrongAnswer:
      'Update if query demand exists but content is outdated; Consolidate (301) if backlinks exist or content overlaps another URL; Delete (410) if zero backlinks, zero impressions, and off-topic.'
  },
  {
    id: 'onpage-8',
    skillCategory: 'On-Page SEO',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Search Intent Misalignment Remediation',
    questionPrompt:
      'SITUATION: A client published a 4,000-word ultimate guide targeting "best enterprise CRM software", but SERP results are 100% comparative software review tables and comparison grids. Outline your content transformation plan.',
    sampleStrongAnswer:
      'Restructure the page format to match dominant SERP commercial intent: convert long-form narrative paragraphs into an interactive comparison matrix table, feature verified feature scorecards, and add clear pros/cons summaries per tool.'
  },

  // ==========================================
  // 4. CLIENT STRATEGY, QBRS & ACCOUNT MANAGEMENT (8 Questions)
  // ==========================================
  {
    id: 'strat-1',
    skillCategory: 'Client Strategy',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Executive QBR Expectation & Revenue Alignment',
    questionPrompt:
      'SITUATION: In a Quarterly Business Review, the CMO demands to rank #1 for a broad 150,000 search volume keyword within 30 days. How do you redirect strategy to high-converting commercial clusters while retaining client trust?',
    sampleStrongAnswer:
      'Acknowledge their ambition while presenting SERP keyword difficulty and domain authority reality. Pivot the discussion to bottom-of-funnel commercial intent clusters where conversion rate is 4x higher and ranking velocity is achievable within 60 days, demonstrating higher immediate revenue ROI.'
  },
  {
    id: 'strat-2',
    skillCategory: 'Client Strategy',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Forecasting Organic Traffic & Revenue Model',
    questionPrompt:
      'When building an organic growth forecast model for a SaaS client CFO, which inputs produce the most defensible financial projection?',
    options: [
      'Assuming 100% ranking for all keywords on day 1.',
      'Segmenting target keyword clusters by search volume, expected SERP CTR curve by position, current ranking velocity, and historical visitor-to-lead conversion rate.',
      'Doubling last year traffic arbitrarily.',
      'Using search volume multiplied by average CPC.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Segmenting target keyword clusters by search volume, expected SERP CTR curve by position, current ranking velocity, and historical visitor-to-lead conversion rate.'
  },
  {
    id: 'strat-3',
    skillCategory: 'Client Strategy',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Share of Voice (SoV) vs Share of Search Calculation',
    questionPrompt:
      'How do you calculate Organic Share of Voice for a specific commercial keyword cluster against top 4 competitors?',
    sampleStrongAnswer:
      'Sum the estimated organic traffic or weighted CTR visibility score of the client domain across the target cluster keywords and divide by the total aggregate visibility score of all top ranking competitors.'
  },
  {
    id: 'strat-4',
    skillCategory: 'Client Strategy',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Competitive Programmatic SEO Counter-Strategy',
    questionPrompt:
      'SITUATION: A major competitor just launched a programmatic SEO directory capturing 50,000 monthly visits. Outline your competitive counter-strategy.',
    sampleStrongAnswer:
      'Conduct an immediate content gap and URL structure audit of the competitor programmatic directory. Design a superior, data-enriched template combining unique local/entity data with robust internal linking to out-value their thin programmatic pages.'
  },
  {
    id: 'strat-5',
    skillCategory: 'Client Strategy',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Client Churn Risk Early Warning Signs',
    questionPrompt:
      'Which combination of signals represents the highest immediate churn risk for an agency retainer client?',
    options: [
      'Client asks thoughtful questions about the quarterly report.',
      'Sudden stakeholder turnover (new CMO/VP), canceled weekly syncs, and delayed invoice approvals.',
      'Client requests an additional audit.',
      'Traffic grew 15% month over month.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Sudden stakeholder turnover (new CMO/VP), canceled weekly syncs, and delayed invoice approvals.'
  },
  {
    id: 'strat-6',
    skillCategory: 'Client Strategy',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Roadmap Prioritization Framework (ICE / RICE)',
    questionPrompt:
      'In the ICE strategic prioritization framework, what do the letters I, C, and E stand for, and how are they scored?',
    sampleStrongAnswer:
      'Impact (1-10 expected business outcome), Confidence (1-10 certainty based on data/precedent), and Ease (1-10 simplicity/speed of execution). Score = Impact x Confidence x Ease.'
  },
  {
    id: 'strat-7',
    skillCategory: 'Client Strategy',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Handling Core Algorithm Update Volatility During Client Call',
    questionPrompt:
      'SITUATION: A Google Core Update rolls out mid-month causing temporary daily ranking fluctuations. The client emails anxiously demanding immediate drastic site changes. What is your executive response?',
    sampleStrongAnswer:
      'Advise calm adherence to quality fundamentals: explain that during active core update rollouts, premature reactive edits pollute diagnostic signals. Present our continuous monitoring dashboard and establish a 14-day post-rollout audit date to assess permanent shifts.'
  },
  {
    id: 'strat-8',
    skillCategory: 'Client Strategy',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'QBR Slide Deck Executive Storytelling Arc',
    questionPrompt:
      'What is the most effective narrative sequence for a 30-minute Quarterly Business Review presentation with C-level stakeholders?',
    options: [
      'Start with 40 slides of raw keyword ranking tables.',
      '1) Executive Scorecard & Revenue Attainment vs Goal, 2) Key Strategic Wins & Case Evidence, 3) Competitive Opportunity Analysis, 4) Proposed Next Quarter Strategic Roadmap & Resource Alignment.',
      'Spend 25 minutes discussing billing.',
      'Skip slides and read spreadsheets aloud.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: 1) Executive Scorecard & Revenue Attainment vs Goal, 2) Key Strategic Wins & Case Evidence, 3) Competitive Opportunity Analysis, 4) Proposed Next Quarter Strategic Roadmap & Resource Alignment.'
  },

  // ==========================================
  // 5. LINK BUILDING, DIGITAL PR & OFF-PAGE AUTHORITY (7 Questions)
  // ==========================================
  {
    id: 'link-1',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Link Quality Vetting & Toxic Profile Audit',
    questionPrompt:
      'SITUATION: A vendor offers a DR 70 link placement, but Ahrefs organic traffic shows a sudden spike followed by a 90% drop. How do you evaluate and accept/reject this placement?',
    sampleStrongAnswer:
      'Immediately reject the placement. Enforce our agency quality rubric: domain must have consistent multi-year organic traffic growth from Tier-1 geos, zero PBN footprint, zero paid guest post footprints, and strong topical relevance to the client industry.'
  },
  {
    id: 'link-2',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Anchor Text Velocity & Distribution Profile',
    questionPrompt:
      'When building editorial backlinks to a high-competition commercial landing page, what anchor text distribution profile is safest and most effective?',
    options: [
      '100% exact-match money keywords.',
      'A natural, diversified mix of brand anchors (~50%), URL/naked anchors (~20%), topical descriptive long-tail anchors (~20%), and selective exact/partial match anchors (<10%).',
      '100% generic "click here" anchors.',
      'Only linking to the homepage.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: A natural, diversified mix of brand anchors (~50%), URL/naked anchors (~20%), topical descriptive long-tail anchors (~20%), and selective exact/partial match anchors (<10%).'
  },
  {
    id: 'link-3',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Private Blog Network (PBN) Footprint Identification',
    questionPrompt:
      'List 4 technical or structural red flags that reveal a prospective link partner is part of an artificial PBN.',
    sampleStrongAnswer:
      '1) Shared IP subnet or hosting C-block across network sites, 2) Identical WHOIS privacy or registration dates, 3) Thin spun AI content covering unrelated niches on the same blog, 4) Excessive outbound link velocity with no inbound editorial citations.'
  },
  {
    id: 'link-4',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'High-Authority Digital PR Data Campaign Execution',
    questionPrompt:
      'SITUATION: You need to acquire 5 authoritative industry links this month for an enterprise SaaS client. Describe your editorial outreach methodology.',
    sampleStrongAnswer:
      'Leverage digital PR data studies and proprietary client benchmarks to pitch journalists and SaaS content directors with unique data citations. Execute highly personalized value-first outreach offering mutual resource integration.'
  },
  {
    id: 'link-5',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Disavow File Governance Standards',
    questionPrompt:
      'Under what specific scenario should an agency submit a Google Disavow file for a client domain?',
    options: [
      'Every month routinely as preventative maintenance.',
      'Only when the domain has received a manual action notification or exhibits severe algorithmic suppression caused by verified historical toxic/spammy link schemes.',
      'Whenever a competitor gets a new link.',
      'For any link with DR under 20.'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer:
      'Option B: Only when the domain has received a manual action notification or exhibits severe algorithmic suppression caused by verified historical toxic/spammy link schemes.'
  },
  {
    id: 'link-6',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Link Relevance vs Raw Domain Rating (DR)',
    questionPrompt:
      'Why is an organic link from a DR 42 niche-relevant industry publication more valuable than a link from a general DR 78 multi-topic guest farm?',
    sampleStrongAnswer:
      'Search engines pass semantic topic authority and user engagement signals; niche publications have high topical salience and authentic audience traffic, whereas guest farms suffer from link equity dilution and algorithmic devaluation.'
  },
  {
    id: 'link-7',
    skillCategory: 'Link Building & Digital PR',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Unlinking & Broken Link Reclamation Campaign',
    questionPrompt:
      'SITUATION: A major industry news outlet mentioned the client brand name in a viral feature article but did not link to their site. Detail your reclamation outreach script.',
    sampleStrongAnswer:
      'Send a prompt, appreciative note to the journalist thanking them for featuring the brand, pointing out the specific mention, and politely providing the direct canonical URL to the cited resource/tool to enhance their readers experience.'
  },

  // ==========================================
  // 6. WEB DESIGN, UI/UX & CONVERSION RATE OPTIMIZATION (7 Questions)
  // ==========================================
  {
    id: 'ux-1',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Above-the-Fold CRO Redesign',
    questionPrompt:
      'SITUATION: A client landing page bounce rate is 68% because the value proposition is buried below a slow auto-playing carousel banner. How do you redesign the above-the-fold hierarchy?',
    sampleStrongAnswer:
      'Remove the auto-playing carousel banner. Implement a high-contrast static hero section with a clear benefit-driven H1, social proof badges, and an unmissable primary call-to-action button above the fold.'
  },
  {
    id: 'ux-2',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'WCAG 2.1 AA Accessibility Minimum Contrast Ratios',
    questionPrompt:
      'What is the minimum WCAG AA contrast ratio required for normal body text against its background color?',
    options: [
      '2.0:1',
      '4.5:1 for normal text (3:1 for large text 18pt+)',
      '1.5:1',
      '7:1 only'
    ],
    correctOptionIndex: 1,
    sampleStrongAnswer: 'Option B: 4.5:1 for normal text (3:1 for large text 18pt+)'
  },
  {
    id: 'ux-3',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Mobile Touch Target Ergonomics',
    questionPrompt:
      'What is the minimum recommended touch target dimensions in CSS pixels for interactive buttons and links on mobile viewports?',
    sampleStrongAnswer:
      'Minimum touch target size is 48x48 CSS pixels (or 44x44px minimum per Apple HIG) with at least 8px spacing between adjacent touch elements.'
  },
  {
    id: 'ux-4',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Conversion Funnel Form Abandonment Optimization',
    questionPrompt:
      'SITUATION: A client lead-gen form has 12 required input fields and suffers a 82% abandonment rate. Outline your CRO form redesign strategy.',
    sampleStrongAnswer:
      'Implement a multi-step progressive disclosure form: ask for low-friction non-PII selections in Step 1, capture email/name in Step 2, enable browser autocomplete attributes, and display clear progress indicators.'
  },
  {
    id: 'ux-5',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'MULTIPLE_CHOICE',
    questionTitle: 'Performance Budgeting & Font Loading',
    questionPrompt:
      'Which CSS @font-face descriptor property prevents Flash of Invisible Text (FOIT) and renders fallback text immediately while custom web fonts load?',
    options: [
      'font-display: swap;',
      'font-style: italic;',
      'font-weight: bold;',
      'display: none;'
    ],
    correctOptionIndex: 0,
    sampleStrongAnswer: 'Option A: font-display: swap;'
  },
  {
    id: 'ux-6',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'Q_AND_A_SHORT',
    questionTitle: 'Visual Hierarchy & F-Pattern / Z-Pattern Layouts',
    questionPrompt:
      'When designing a high-converting B2B SaaS pricing page, where should the primary "Most Popular / Recommended" tier card be positioned visually?',
    sampleStrongAnswer:
      'Center or visually anchored position with elevated card contrast, distinct accent border/badge, and clear visual contrast hierarchy over adjacent secondary tiers.'
  },
  {
    id: 'ux-7',
    skillCategory: 'Web Design & UI/UX',
    questionType: 'SITUATION_WRITTEN',
    questionTitle: 'Mobile Accessibility & Touch Target Audit',
    questionPrompt:
      'SITUATION: Mobile audit reveals contrast ratio failures and clickable elements that are too close together. Outline your UI remediation plan.',
    sampleStrongAnswer:
      'Enforce WCAG AA 4.5:1 minimum contrast ratios across all text elements. Expand interactive button touch targets to at least 48x48px with generous spacing for seamless mobile UX.'
  }
];
