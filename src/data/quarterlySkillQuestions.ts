export interface QuestionnaireQuestion {
  id: string;
  domain: 'On-Page SEO' | 'Off-Page SEO' | 'Technical SEO' | 'Situational Awareness & Client Communication' | 'Analytics & Automation';
  type: 'multiple-choice' | 'situational' | 'qa';
  question: string;
  options?: string[];
  correctAnswer?: string;
  rubricKeywords?: string[];
  explanation: string;
  points: number;
}

export const QUARTERLY_SKILL_QUESTIONS: QuestionnaireQuestion[] = [
  // ==========================================
  // DOMAIN 1: ON-PAGE SEO & CORE WEB FUNDAMENTALS (10 Qs)
  // ==========================================
  {
    id: 'op-1',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'Which HTML tag hierarchy is best practice for semantic SEO and accessibility on a cornerstone landing page?',
    options: [
      'Multiple <H1> tags for every major keyword section followed by <H3> tags',
      'Single descriptive <H1> followed by logically nested <H2> and <H3> subheadings without skipping levels',
      'Using bold <span> elements styled with CSS to replace standard heading tags for faster parsing',
      'An <H1> tag placed in the footer containing all secondary target keywords'
    ],
    correctAnswer: 'Single descriptive <H1> followed by logically nested <H2> and <H3> subheadings without skipping levels',
    explanation: 'Semantic HTML requires a single clear H1 per document and strict hierarchy (H2 -> H3) without skipping levels.',
    points: 2
  },
  {
    id: 'op-2',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'When optimizing title tags for a highly competitive commercial keyword, what is the recommended length and keyword placement strategy?',
    options: [
      '50-60 characters (approx 580-600px), front-loading primary keyword and ending with brand identity',
      '80-90 characters to pack as many synonyms and secondary modifiers as possible',
      'Only using brand name followed by generic terms like "Home" or "Services"',
      '120 characters using all uppercase letters for higher visual prominence'
    ],
    correctAnswer: '50-60 characters (approx 580-600px), front-loading primary keyword and ending with brand identity',
    explanation: 'Search engines display ~600px; front-loading the target keyword maximizes CTR and relevance signals.',
    points: 2
  },
  {
    id: 'op-3',
    domain: 'On-Page SEO',
    type: 'situational',
    question: 'SITUATIONAL: A client’s e-commerce category page ranks #8 on Google but has a low CTR (1.2%). How do you optimize On-Page elements without changing the core URL?',
    rubricKeywords: ['meta description', 'rich snippets', 'schema', 'ctr', 'search intent', 'faq schema', 'title tag'],
    explanation: 'AI expects actionable CTR optimization: rewriting title/meta description for commercial intent, adding FAQ or Review schema for rich snippets.',
    points: 3
  },
  {
    id: 'op-4',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'What is the primary function of canonical tags (<link rel="canonical">) in large enterprise websites?',
    options: [
      'To force search engines to index every URL parameter variation separately',
      'To consolidate link equity and specify the authoritative URL among duplicate or similar pages',
      'To replace 301 redirects completely across all deleted pages',
      'To increase page loading speed on mobile devices'
    ],
    correctAnswer: 'To consolidate link equity and specify the authoritative URL among duplicate or similar pages',
    explanation: 'Canonical tags prevent duplicate content dilution by consolidating ranking signals to the preferred URL.',
    points: 2
  },
  {
    id: 'op-5',
    domain: 'On-Page SEO',
    type: 'qa',
    question: 'Q&A: Explain the difference between primary keyword density and Topic Authority / Entity Optimization in modern search algorithms.',
    rubricKeywords: ['entities', 'semantic search', 'nlp', 'context', 'topical authority', 'keyword stuffing'],
    explanation: 'Modern search algorithms rely on entity relationships and semantic relevance rather than repetitive keyword density.',
    points: 2
  },
  {
    id: 'op-6',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'How should internal linking anchor text be optimized across supporting blog posts pointing to a money service page?',
    options: [
      'Using identical exact-match anchor text on 100% of internal links',
      'Using descriptive, context-relevant natural variations and semantic modifiers matching user intent',
      'Using only generic anchors like "Click Here" or "Read More"',
      'Nofollow all internal links to preserve crawl budget'
    ],
    correctAnswer: 'Using descriptive, context-relevant natural variations and semantic modifiers matching user intent',
    explanation: 'Varied, descriptive anchor text passes topical relevance without triggering artificial manipulation filters.',
    points: 2
  },
  {
    id: 'op-7',
    domain: 'On-Page SEO',
    type: 'situational',
    question: 'SITUATIONAL: You audit a blog article that has dropped 30% in organic traffic over 6 months due to content decay. Outline your refresh workflow.',
    rubricKeywords: ['update statistics', 'search intent change', 'add headings', 'refresh dates', 'internal links', 'competitor gap'],
    explanation: 'AI evaluates checking search intent shifts, refreshing outdated data/dates, expanding subtopics, and building fresh internal links.',
    points: 3
  },
  {
    id: 'op-8',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'Which image optimization practice provides both accessibility compliance and keyword context for search engines?',
    options: [
      'Uploading 10MB PNG images with generic filenames like IMG_001.png',
      'Using compressed WebP formats with descriptive filenames and accurate alt text attributes',
      'Hiding all images via CSS display:none on mobile devices',
      'Leaving alt attributes completely empty on informative infographics'
    ],
    correctAnswer: 'Using compressed WebP formats with descriptive filenames and accurate alt text attributes',
    explanation: 'WebP reduces file size while alt attributes provide accessibility and visual search relevance.',
    points: 2
  },
  {
    id: 'op-9',
    domain: 'On-Page SEO',
    type: 'multiple-choice',
    question: 'What is E-E-A-T and how is it practically demonstrated on a healthcare or finance YMYL article?',
    options: [
      'Experience, Expertise, Authoritativeness, Trustworthiness demonstrated via verified author bios, citations, and editorial review',
      'Engagement, Earnings, Analytics, Traffic measured solely by bounce rate',
      'External Links, Email Marketing, Ad Revenue, Tracking',
      'Exact Match Domain, Encryption, Accessibility, Typography'
    ],
    correctAnswer: 'Experience, Expertise, Authoritativeness, Trustworthiness demonstrated via verified author bios, citations, and editorial review',
    explanation: 'YMYL topics require clear credibility signals including qualified author credentials and trustworthy citations.',
    points: 2
  },
  {
    id: 'op-10',
    domain: 'On-Page SEO',
    type: 'qa',
    question: 'Q&A: Describe how to structure FAQ schema JSON-LD on a service page to maximize Search Engine Results Page (SERP) visibility.',
    rubricKeywords: ['json-ld', 'faqpage schema', 'question answer', 'rich results', 'google search console validation'],
    explanation: 'JSON-LD script block embedded in head/body defining FAQPage with Question and acceptedAnswer pairs.',
    points: 2
  },

  // ==========================================
  // DOMAIN 2: OFF-PAGE SEO & DIGITAL PR (10 Qs)
  // ==========================================
  {
    id: 'off-1',
    domain: 'Off-Page SEO',
    type: 'multiple-choice',
    question: 'Which backlink acquisition method carries the highest editorial authority and lowest risk of algorithmic penalty?',
    options: [
      'Automated forum profile signature links generated in bulk',
      'Data-driven Digital PR campaigns earning natural organic citations from high-DR industry news publications',
      'Purchasing sitewide footer links from unrelated PBN directories',
      'Exchanging 3-way reciprocal links with automated link farms'
    ],
    correctAnswer: 'Data-driven Digital PR campaigns earning natural organic citations from high-DR industry news publications',
    explanation: 'Earned editorial links from real publications provide genuine authority and brand trust.',
    points: 2
  },
  {
    id: 'off-2',
    domain: 'Off-Page SEO',
    type: 'situational',
    question: 'SITUATIONAL: A client receives a manual action notice or severe rank drop from toxic spammy backlinks built by their previous agency. What steps do you take?',
    rubricKeywords: ['disavow file', 'google search console', 'audit backlinks', 'manual outreach removal', 'reconsideration request'],
    explanation: 'AI evaluates identifying toxic domains, attempting outreach removal where appropriate, compiling and uploading a clean GSC disavow file, and submitting a reconsideration request.',
    points: 3
  },
  {
    id: 'off-3',
    domain: 'Off-Page SEO',
    type: 'multiple-choice',
    question: 'When evaluating a potential link partner or guest post publication, which metric combination is most reliable?',
    options: [
      'High Domain Rating (DR) even if organic traffic is zero and keywords are declining',
      'Verified consistent organic traffic, topical relevance, genuine editorial standards, and clean anchor distribution',
      'Domain age over 20 years regardless of current spam score',
      'Total number of outgoing external links exceeding 50,000'
    ],
    correctAnswer: 'Verified consistent organic traffic, topical relevance, genuine editorial standards, and clean anchor distribution',
    explanation: 'Real organic traffic and topical relevance distinguish legitimate publications from link farms.',
    points: 2
  },
  {
    id: 'off-4',
    domain: 'Off-Page SEO',
    type: 'qa',
    question: 'Q&A: What is unlinked brand mention reclamation and how do you execute it effectively?',
    rubricKeywords: ['brand monitoring', 'outreach email', 'editorial request', 'ahrefs alerts', 'google alerts', 'convert mention to link'],
    explanation: 'Finding editorial mentions of the client brand that lack a hyperlink and contacting editors to add the backlink.',
    points: 2
  },
  {
    id: 'off-5',
    domain: 'Off-Page SEO',
    type: 'multiple-choice',
    question: 'What is the role of rel="sponsored" and rel="nofollow" attributes in affiliate or paid partnerships?',
    options: [
      'They should never be used because they hurt indexing speed',
      'They transparently signal paid/promotional relationships to comply with Search Engine guidelines and prevent link spam penalties',
      'They double the amount of PageRank passed to the destination URL',
      'They automatically index the target URL within 5 minutes'
    ],
    correctAnswer: 'They transparently signal paid/promotional relationships to comply with Search Engine guidelines and prevent link spam penalties',
    explanation: 'Google requires rel="sponsored" or rel="nofollow" on compensated links to maintain search integrity.',
    points: 2
  },
  {
    id: 'off-6',
    domain: 'Off-Page SEO',
    type: 'situational',
    question: 'SITUATIONAL: You pitch a high-tier journalist with a proprietary industry research study. How do you structure the outreach pitch for maximum conversion?',
    rubricKeywords: ['hook', 'exclusive data', 'concise bullet points', 'customized subject line', 'press kit asset', 'clear attribution'],
    explanation: 'AI looks for concise data hooks, tailored subject lines, ready-to-use visualizations, and frictionless attribution links.',
    points: 3
  },
  {
    id: 'off-7',
    domain: 'Off-Page SEO',
    type: 'multiple-choice',
    question: 'Why is anchor text diversity critical in a natural backlink profile?',
    options: [
      'Having 95% exact-match money anchor text triggers algorithmic spam filters like Penguin',
      'It allows websites to rank for keywords not mentioned on the page',
      'Search engines ignore any link that uses branded anchor text',
      'Anchor text diversity reduces domain hosting bandwidth'
    ],
    correctAnswer: 'Having 95% exact-match money anchor text triggers algorithmic spam filters like Penguin',
    explanation: 'A healthy profile contains branded, URL, natural phrase, and balanced topical anchors.',
    points: 2
  },
  {
    id: 'off-8',
    domain: 'Off-Page SEO',
    type: 'qa',
    question: 'Q&A: Explain how local citations (NAP consistency) influence Off-Page authority for multi-location businesses.',
    rubricKeywords: ['name address phone', 'nap consistency', 'local pack ranking', 'directory listings', 'trust signals'],
    explanation: 'Consistent Name, Address, Phone (NAP) across authoritative directories confirms business legitimacy for local map pack rankings.',
    points: 2
  },
  {
    id: 'off-9',
    domain: 'Off-Page SEO',
    type: 'multiple-choice',
    question: 'What is broken link building?',
    options: [
      'Creating broken 404 pages on competitor websites',
      'Finding dead 404 links on relevant external websites and pitching your superior live resource as a replacement',
      'Deliberately redirecting old backlinks to homepage only',
      'Reporting competitor backlinks to Google webmaster spam report'
    ],
    correctAnswer: 'Finding dead 404 links on relevant external websites and pitching your superior live resource as a replacement',
    explanation: 'Broken link building provides mutual value by fixing external broken links with your valuable content.',
    points: 2
  },
  {
    id: 'off-10',
    domain: 'Off-Page SEO',
    type: 'situational',
    question: 'SITUATIONAL: A client asks why a competitor with fewer backlinks ranks higher than them. Provide your analytical diagnostic.',
    rubricKeywords: ['link quality vs quantity', 'topical authority', 'on-page relevance', 'internal linking architecture', 'user experience signals'],
    explanation: 'AI checks for explaining backlink quality/relevance over raw volume, stronger topical authority, user engagement, or internal link flow.',
    points: 3
  },

  // ==========================================
  // DOMAIN 3: TECHNICAL SEO & ARCHITECTURE (10 Qs)
  // ==========================================
  {
    id: 'tech-1',
    domain: 'Technical SEO',
    type: 'multiple-choice',
    question: 'Which HTTP status code should be returned when a page is permanently moved to a new destination URL?',
    options: [
      '302 Found (Temporary Redirect)',
      '301 Moved Permanently',
      '404 Not Found',
      '200 OK with a JavaScript window.location redirect'
    ],
    correctAnswer: '301 Moved Permanently',
    explanation: '301 redirects transfer ranking signals permanently to the new destination URL.',
    points: 2
  },
  {
    id: 'tech-2',
    domain: 'Technical SEO',
    type: 'multiple-choice',
    question: 'What directive in robots.txt prevents search engine crawlers from scanning private staging directories?',
    options: [
      'Allow: /staging/',
      'Disallow: /staging/',
      'Noindex: /staging/',
      'Sitemap: /staging/'
    ],
    correctAnswer: 'Disallow: /staging/',
    explanation: 'Disallow blocks crawler access at the path level.',
    points: 2
  },
  {
    id: 'tech-3',
    domain: 'Technical SEO',
    type: 'situational',
    question: 'SITUATIONAL: A client launches a site migration and Google Search Console reports "Discovered - currently not indexed" on 10,000 product URLs. How do you troubleshoot?',
    rubricKeywords: ['crawl budget', 'internal linking depth', 'server response time', 'xml sitemap', 'duplicate content', 'thin content'],
    explanation: 'AI checks diagnosing crawl budget constraints, thin content, internal link isolation, or server capacity limits.',
    points: 3
  },
  {
    id: 'tech-4',
    domain: 'Technical SEO',
    type: 'multiple-choice',
    question: 'Which Core Web Vital metric measures visual load stability and prevents layout shifts?',
    options: [
      'LCP (Largest Contentful Paint)',
      'INP (Interaction to Next Paint)',
      'CLS (Cumulative Layout Shift)',
      'TTFB (Time to First Byte)'
    ],
    correctAnswer: 'CLS (Cumulative Layout Shift)',
    explanation: 'CLS scores unexpected layout shifts during page loading (target < 0.1).',
    points: 2
  },
  {
    id: 'tech-5',
    domain: 'Technical SEO',
    type: 'qa',
    question: 'Q&A: Explain how hreflang tags prevent international SEO duplicate content across regional English variants (en-US, en-GB, en-CA).',
    rubricKeywords: ['hreflang attribute', 'country code', 'language code', 'x-default', 'bidirectional link validation'],
    explanation: 'Hreflang tags signal the specific language and regional target to Google, ensuring users see localized currency/content without triggering duplicate content penalties.',
    points: 2
  },
  {
    id: 'tech-6',
    domain: 'Technical SEO',
    type: 'situational',
    question: 'SITUATIONAL: You discover a client website has 15-step redirect chains slowing down mobile rendering. How do you resolve this?',
    rubricKeywords: ['direct 301 redirect', 'eliminate intermediate hops', 'update internal links', 'htaccess or server config', 'crawl audit'],
    explanation: 'AI evaluates updating legacy redirects so hop 1 points directly to the final destination URL and updating internal links.',
    points: 3
  },
  {
    id: 'tech-7',
    domain: 'Technical SEO',
    type: 'multiple-choice',
    question: 'What is the purpose of the XML Sitemap <lastmod> date tag?',
    options: [
      'To artificially reset page age every day',
      'To inform crawlers when the content was genuinely modified so they can prioritize recrawling updated pages',
      'To replace HTTP caching headers completely',
      'To display publication dates directly in search snippets'
    ],
    correctAnswer: 'To inform crawlers when the content was genuinely modified so they can prioritize recrawling updated pages',
    explanation: 'Accurate <lastmod> timestamps optimize crawl efficiency for updated content.',
    points: 2
  },
  {
    id: 'tech-8',
    domain: 'Technical SEO',
    type: 'qa',
    question: 'Q&A: What is dynamic rendering and when is it recommended for JavaScript-heavy single page applications (SPAs)?',
    rubricKeywords: ['server side rendering', 'client side javascript', 'crawler bot detection', 'prerendered html', 'indexing speed'],
    explanation: 'Serving pre-rendered static HTML to search engine crawlers while serving standard interactive JS to human visitors.',
    points: 2
  },
  {
    id: 'tech-9',
    domain: 'Technical SEO',
    type: 'multiple-choice',
    question: 'Which pagination strategy is currently recommended by Google for multi-page category listings?',
    options: [
      'Rel="next" and rel="prev" tags only',
      'Clear sequential links to paginated URLs with unique descriptive titles and self-referencing canonical tags',
      'Canonicalizing all paginated pages (page 2, page 3) back to page 1',
      'Blocking page 2+ in robots.txt'
    ],
    correctAnswer: 'Clear sequential links to paginated URLs with unique descriptive titles and self-referencing canonical tags',
    explanation: 'Self-referencing canonicals on paginated URLs ensure products on deeper pages remain indexable.',
    points: 2
  },
  {
    id: 'tech-10',
    domain: 'Technical SEO',
    type: 'situational',
    question: 'SITUATIONAL: An enterprise e-commerce site generates infinite faceted filter URLs causing crawl traps. What technical controls do you put in place?',
    rubricKeywords: ['robots.txt disallow', 'canonical tags', 'noindex follow', 'parameter handling', 'facet clean url'],
    explanation: 'AI looks for blocking non-essential filter permutations in robots.txt, canonicalizing clean base categories, or applying meta noindex.',
    points: 3
  },

  // ==========================================
  // DOMAIN 4: SITUATIONAL AWARENESS & CLIENT COMMUNICATION (10 Qs)
  // ==========================================
  {
    id: 'sit-1',
    domain: 'Situational Awareness & Client Communication',
    type: 'situational',
    question: 'SITUATIONAL: A VP of Marketing client emails you upset because a core keyword dropped 4 positions after a Google Core Update. Draft your professional executive response.',
    rubricKeywords: ['reassure volatility window', 'serp intent analysis', 'competitor movement comparison', 'action plan roadmap', 'calm professional tone'],
    explanation: 'AI checks for acknowledging concern calmly, explaining algorithm stabilization windows, sharing competitor context, and presenting concrete next steps.',
    points: 3
  },
  {
    id: 'sit-2',
    domain: 'Situational Awareness & Client Communication',
    type: 'multiple-choice',
    question: 'When presenting quarterly SEO deliverables to a C-suite executive, which metric hierarchy should lead the meeting?',
    options: [
      'Raw crawl error counts and H2 tag character limits',
      'Qualified organic pipeline revenue, conversions, and share of voice for commercial terms',
      'Number of blog words published this month',
      'Total external backlinks discovered regardless of spam score'
    ],
    correctAnswer: 'Qualified organic pipeline revenue, conversions, and share of voice for commercial terms',
    explanation: 'Executives care about business outcomes (revenue, conversions, ROI) rather than technical micro-metrics.',
    points: 2
  },
  {
    id: 'sit-3',
    domain: 'Situational Awareness & Client Communication',
    type: 'situational',
    question: 'SITUATIONAL: The client’s internal development team rejects your technical SEO tickets claiming "too much engineering effort." How do you overcome this roadblock?',
    rubricKeywords: ['quantify revenue impact', 'prioritize effort vs reward', 'collaborate on simpler workaround', 'executive alignment', 'clear dev specs'],
    explanation: 'AI evaluates quantifying traffic/revenue opportunity cost, ranking tickets by effort/impact matrix, and providing clear ready-to-merge dev specs.',
    points: 3
  },
  {
    id: 'sit-4',
    domain: 'Situational Awareness & Client Communication',
    type: 'qa',
    question: 'Q&A: How do you handle scope creep when a client demands 10 additional landing page rewrites outside their fixed monthly retainer hours cap?',
    rubricKeywords: ['refer to retainer agreement', 'transparent hour cap', 'offer change order proposal', 'prioritize within existing hours'],
    explanation: 'Professionally reference the agreed deliverable cap, offer to prioritize within current hours or issue a supplementary change order.',
    points: 2
  },
  {
    id: 'sit-5',
    domain: 'Situational Awareness & Client Communication',
    type: 'multiple-choice',
    question: 'What is the most effective cadence and format for monthly client reporting calls?',
    options: [
      'Reading an 80-page automated spreadsheet line by line',
      'An executive summary slide highlighting ROI, key wins, blockers solved, and next month’s strategic focus',
      'Only emailing an unformatted CSV export without commentary',
      'Skipping meetings unless the client specifically complains'
    ],
    correctAnswer: 'An executive summary slide highlighting ROI, key wins, blockers solved, and next month’s strategic focus',
    explanation: 'Concise executive summaries with clear narrative focus build long-term agency trust.',
    points: 2
  },
  {
    id: 'sit-6',
    domain: 'Situational Awareness & Client Communication',
    type: 'situational',
    question: 'SITUATIONAL: During a live client zoom meeting, the client asks a highly complex server-side edge caching question you do not know the answer to. How do you respond?',
    rubricKeywords: ['transparent honest acknowledgment', 'avoid guessing', 'commit to investigating with engineering lead', 'follow up by end of day'],
    explanation: 'AI looks for confident professional transparency: acknowledging the question, consulting technical specialists, and providing a thorough follow-up.',
    points: 3
  },
  {
    id: 'sit-7',
    domain: 'Situational Awareness & Client Communication',
    type: 'multiple-choice',
    question: 'Which communication tier qualifies an employee to lead autonomous client-facing discovery and renewal meetings?',
    options: [
      'Tier 3: Internal Execution Only',
      'Tier 2: Direct Email Capable',
      'Tier 1: Client-Facing Lead with exceptional English tone and proactive situational composure',
      'Any junior intern on their first week'
    ],
    correctAnswer: 'Tier 1: Client-Facing Lead with exceptional English tone and proactive situational composure',
    explanation: 'Tier 1 leadership requires high composure, strategic empathy, and articulate verbal/written fluency.',
    points: 2
  },
  {
    id: 'sit-8',
    domain: 'Situational Awareness & Client Communication',
    type: 'qa',
    question: 'Q&A: Explain how to onboard a newly signed enterprise client during Week 1 to guarantee zero churn risk.',
    rubricKeywords: ['kickoff call agenda', 'gsc ga4 access setup', '30 60 90 roadmap alignment', 'clear communication channels', 'quick win audit'],
    explanation: 'Structured onboarding kickoff, prompt access provisioning, clear milestone timeline, and immediate high-impact technical quick wins.',
    points: 2
  },
  {
    id: 'sit-9',
    domain: 'Situational Awareness & Client Communication',
    type: 'situational',
    question: 'SITUATIONAL: A client accidentally deletes their Google Analytics 4 property tag during a Friday website update. How do you detect and resolve it?',
    rubricKeywords: ['automated uptime alert', 'verify gtm container', 'restore measurement id', 'document root cause incident report'],
    explanation: 'AI evaluates rapid alert detection, restoring Tag Manager / snippet implementation immediately, and providing a blameless post-mortem.',
    points: 3
  },
  {
    id: 'sit-10',
    domain: 'Situational Awareness & Client Communication',
    type: 'multiple-choice',
    question: 'When communicating a necessary site migration delay to a client, what key element must be included?',
    options: [
      'Blaming the junior copywriter',
      'Clear explanation of the technical quality safeguard, revised delivery date, and assurance that core timelines remain protected',
      'Silence until the client asks',
      'Demanding more money immediately'
    ],
    correctAnswer: 'Clear explanation of the technical quality safeguard, revised delivery date, and assurance that core timelines remain protected',
    explanation: 'Proactive communication framed around protecting quality safeguards preserves client trust.',
    points: 2
  },

  // ==========================================
  // DOMAIN 5: DATA ANALYTICS, REPORTING & AI AUTOMATION (10 Qs)
  // ==========================================
  {
    id: 'data-1',
    domain: 'Analytics & Automation',
    type: 'multiple-choice',
    question: 'In Google Analytics 4 (GA4), what replaces Universal Analytics bounce rate as the primary quality engagement signal?',
    options: [
      'Engagement Rate (sessions lasting >10s, 2+ pageviews, or a conversion event)',
      'Total Hits per Second',
      'Server IP Lookup Table',
      'Average Screen Brightness'
    ],
    correctAnswer: 'Engagement Rate (sessions lasting >10s, 2+ pageviews, or a conversion event)',
    explanation: 'GA4 Engagement Rate measures meaningful active sessions far more accurately than legacy bounce rate.',
    points: 2
  },
  {
    id: 'data-2',
    domain: 'Analytics & Automation',
    type: 'situational',
    question: 'SITUATIONAL: You need to automate weekly keyword position tracking alerts to slack when any top-3 keyword drops outside page 1. Outline the tech stack.',
    rubricKeywords: ['api integration', 'python or make automation', 'slack webhook alert', 'ahrefs or gsc api', 'threshold trigger'],
    explanation: 'AI checks for combining rank tracker API (Ahrefs/GSC), automated scheduler/script, threshold filter (>10 position drop), and webhook notification.',
    points: 3
  },
  {
    id: 'data-3',
    domain: 'Analytics & Automation',
    type: 'multiple-choice',
    question: 'How does regex filtering in Google Search Console help uncover long-tail question intent queries?',
    options: [
      'By matching custom patterns like ^(who|what|where|why|how) .*',
      'By deleting non-English queries automatically',
      'By changing search impressions into clicks',
      'By increasing maximum export rows from 1,000 to 10,000'
    ],
    correctAnswer: 'By matching custom patterns like ^(who|what|where|why|how) .*',
    explanation: 'Regular expression filters isolate question modifiers for content strategy clustering.',
    points: 2
  },
  {
    id: 'data-4',
    domain: 'Analytics & Automation',
    type: 'qa',
    question: 'Q&A: How do you validate whether an AI-generated content draft meets E-E-A-T and factual accuracy standards before client publishing?',
    rubricKeywords: ['human editorial review', 'fact check claims', 'add original insights', 'verify citations', 'brand tone alignment'],
    explanation: 'Human-in-the-loop verification checking factual claims, injecting original expertise, updating citations, and refining brand voice.',
    points: 2
  },
  {
    id: 'data-5',
    domain: 'Analytics & Automation',
    type: 'multiple-choice',
    question: 'What is the benefit of integrating Google Looker Studio with BigQuery for large enterprise SEO accounts?',
    options: [
      'Bypasses the 16-month Search Console data retention limit and enables blended multi-channel attribution models',
      'Makes website pages load faster',
      'Automatically builds high-DR backlinks',
      'Removes the need for JavaScript tags'
    ],
    correctAnswer: 'Bypasses the 16-month Search Console data retention limit and enables blended multi-channel attribution models',
    explanation: 'BigQuery storage preserves historical SEO data indefinitely and supports complex custom BI reporting.',
    points: 2
  },
  {
    id: 'data-6',
    domain: 'Analytics & Automation',
    type: 'situational',
    question: 'SITUATIONAL: A client’s conversion rate drops suddenly on mobile but organic traffic remains steady. How do you use analytics tools to diagnose?',
    rubricKeywords: ['device breakdown report', 'funnel drop-off analysis', 'session replay clarity or hotjar', 'core web vitals mobile test'],
    explanation: 'AI evaluates segmenting GA4 by device category, checking checkout funnel drop-offs, reviewing heatmaps/replays, and verifying mobile layout shifts.',
    points: 3
  },
  {
    id: 'data-7',
    domain: 'Analytics & Automation',
    type: 'multiple-choice',
    question: 'Which UTM parameter convention ensures clean campaign attribution across cross-channel digital marketing?',
    options: [
      'Consistent lowercase utm_source, utm_medium, and descriptive utm_campaign without spaces',
      'Random uppercase letters and symbols in utm_source',
      'Putting full sentences inside utm_term',
      'Omitting utm_medium completely'
    ],
    correctAnswer: 'Consistent lowercase utm_source, utm_medium, and descriptive utm_campaign without spaces',
    explanation: 'Standardized lowercase UTM parameters prevent attribution fragmentation in analytics.',
    points: 2
  },
  {
    id: 'data-8',
    domain: 'Analytics & Automation',
    type: 'qa',
    question: 'Q&A: Explain how semantic clustering scripts group 5,000 raw keyword ideas into coherent article roadmaps.',
    rubricKeywords: ['serp similarity', 'nlp embeddings', 'search intent overlap', 'parent topic hub', 'automated grouping'],
    explanation: 'Clustering algorithms compare SERP URL overlap or NLP vector embeddings to group keywords that share identical search intent into single canonical pages.',
    points: 2
  },
  {
    id: 'data-9',
    domain: 'Analytics & Automation',
    type: 'multiple-choice',
    question: 'What is the purpose of setting up custom alerts in Google Analytics 4?',
    options: [
      'To automatically detect anomalies like a 40% sudden drop in organic sessions within 24 hours',
      'To increase ad click-through rates',
      'To generate weekly invoices',
      'To delete inactive user accounts'
    ],
    correctAnswer: 'To automatically detect anomalies like a 40% sudden drop in organic sessions within 24 hours',
    explanation: 'Automated anomaly alerts catch tracking failures or algorithm drops immediately.',
    points: 2
  },
  {
    id: 'data-10',
    domain: 'Analytics & Automation',
    type: 'situational',
    question: 'SITUATIONAL: Describe how you leverage AI assistants (like LLMs) to speed up technical SEO log file analysis without compromising accuracy.',
    rubricKeywords: ['summarize bot crawl patterns', 'detect status code anomalies', 'python script generation', 'verify against raw data'],
    explanation: 'AI looks for generating Python parsing scripts, clustering crawler status code spikes, summarizing status distributions, and validating hypotheses.',
    points: 3
  }
];
