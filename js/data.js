// Profile data, sourced from LinkedIn profile PDF.
// Dates are [year, month]; end: null = present.
window.PROFILE = {
  name: 'Pascal Guilcher',
  title: 'Principal Product Designer @ Qlik',
  tagline: 'Data integration & API products — two decades of engineering, now designing.',
  location: 'Nantes, France',
  summary:
    'I design data integration and API software at Qlik, after two decades building it as a software engineer. ' +
    'I can sit with users in an interview, sketch the flow, check it against the market, and then talk implementation ' +
    'with the engineers who will build it.',
  languages: ['French (native)', 'English (professional)', 'Spanish (professional)', 'German (elementary)', 'Italian (elementary)'],
  links: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/pascal-guilcher/' },
    { label: 'GitHub', url: 'https://github.com/pgu' }
  ],
  careerStart: 2005
};

// tech name -> category
window.TECH_CATEGORY = {
  // Design & research
  'Figma': 'Design & Research', 'Miro': 'Design & Research', 'Pendo': 'Design & Research',
  'User research': 'Design & Research', 'Market intelligence': 'Design & Research',
  'Competitive analysis': 'Design & Research', 'Product design': 'Design & Research',
  'Marketing research': 'Design & Research',
  // Data & integration
  'DataOps': 'Data & Integration', 'FinOps': 'Data & Integration', 'Semantic layer': 'Data & Integration',
  'iPaaS': 'Data & Integration', 'ELT': 'Data & Integration', 'ETL': 'Data & Integration',
  'Reverse-ETL': 'Data & Integration', 'Data quality': 'Data & Integration', 'Data catalog': 'Data & Integration',
  'Stitch': 'Data & Integration', 'Qlik Sense': 'Data & Integration', 'SQL': 'Data & Integration',
  'PL/SQL': 'Data & Integration', 'Oracle': 'Data & Integration', 'iBatis': 'Data & Integration',
  'Hibernate': 'Data & Integration', 'JDBC': 'Data & Integration', 'Objectify': 'Data & Integration',
  'ERP': 'Data & Integration', 'Supply chain': 'Data & Integration',
  // APIs
  'REST': 'APIs', 'OpenAPI': 'APIs', 'Arazzo': 'APIs', 'TypeSpec': 'APIs', 'Overlays': 'APIs',
  'API management': 'APIs', 'MCP': 'APIs', 'Restlet': 'APIs', 'JSON': 'APIs', 'OWL': 'APIs', 'SVG': 'APIs',
  // AI
  'AI agents': 'AI', 'AI-assisted UX': 'AI',
  // Front-end
  'React.js': 'Front-end', 'AngularJS': 'Front-end', 'JavaScript': 'Front-end', 'Webpack': 'Front-end',
  'GWT': 'Front-end', 'ExtJS': 'Front-end', 'CSS': 'Front-end', 'Sass': 'Front-end', 'Less': 'Front-end',
  'Stylus': 'Front-end', 'Jade': 'Front-end', 'Bootstrap': 'Front-end', 'Lodash': 'Front-end',
  'Underscore.js': 'Front-end', 'Moment.js': 'Front-end', 'Select2': 'Front-end', 'Highcharts': 'Front-end',
  'HTML': 'Front-end', 'Ajax': 'Front-end', 'GIN': 'Front-end', 'Android': 'Front-end', 'JSP': 'Front-end',
  // Back-end
  'Java': 'Back-end', 'Spring': 'Back-end', 'Guava': 'Back-end', 'Guice': 'Back-end', 'Struts': 'Back-end',
  'Java EE': 'Back-end', 'Servlets': 'Back-end', 'EJB': 'Back-end', 'Tomcat': 'Back-end',
  'Google App Engine': 'Back-end', 'Quartz': 'Back-end', 'iText': 'Back-end', 'Apache POI': 'Back-end',
  // Tooling & practices
  'Git': 'Tooling', 'GitHub': 'Tooling', 'Jenkins': 'Tooling', 'Maven': 'Tooling', 'Ant': 'Tooling',
  'SVN': 'Tooling', 'CVS': 'Tooling', 'Bash': 'Tooling', 'Cygwin': 'Tooling', 'Eclipse': 'Tooling',
  'IntelliJ IDEA': 'Tooling', 'WebStorm': 'Tooling', 'JUnit': 'Tooling', 'Mockito': 'Tooling',
  'Jira': 'Tooling', 'Trac': 'Tooling', 'Hudson': 'Tooling', 'CloudBees': 'Tooling', 'Agile': 'Tooling',
  'TDD': 'Tooling'
};

window.CATEGORY_COLOR = {
  'Design & Research': '#f472b6',
  'Data & Integration': '#38bdf8',
  'APIs': '#34d399',
  'AI': '#c084fc',
  'Front-end': '#fbbf24',
  'Back-end': '#fb7185',
  'Tooling': '#94a3b8',
  'Other': '#64748b'
};

window.JOBS = [
  {
    id: 'qlik-design', kind: 'work', org: 'Qlik', role: 'Principal Product Designer',
    start: [2025, 6], end: null, place: 'Nantes, France',
    blurb: 'Designing the user experience of Qlik\'s data integration and management software for data engineers and analysts, with Product Management, UX Research and Engineering.',
    points: [
      'Explore and design data tooling: DataOps workflows (environments, promotion, versioning), FinOps, "as Code" approaches, the semantic layer, AI-assisted and agentic experiences (MCP, tools, skills).',
      'Run user research with data engineers; synthesize into prioritized requirements; share through interactive dashboards and reports.',
      'Market-intelligence practice since 2023: ~2,000 curated entries (Gartner, Forrester, IDC, BARC), teardown boards on Snowflake, Databricks, Microsoft Fabric, MuleSoft, Postman and more.',
      'Turn that intelligence into design input: personas, ideation memos mapping emerging tech to Qlik and Talend products, cross-vendor comparisons.'
    ],
    tech: ['Figma', 'Miro', 'User research', 'Market intelligence', 'DataOps', 'FinOps', 'Semantic layer', 'MCP', 'AI agents', 'AI-assisted UX', 'Data catalog', 'Data quality']
  },
  {
    id: 'qlik-swe', kind: 'work', org: 'Qlik', role: 'Principal Software Engineer',
    start: [2023, 5], end: [2025, 5], place: 'Nantes, France',
    blurb: 'Front-end engineer on API Designer, working closely with UX and Product.',
    points: [
      'Designed and built API product features, incl. an AI-assisted API creation flow and Folders: requirements and flows in Miro, designs in Figma, user research, in-product guidance with Pendo, React migration from AngularJS.',
      'Analyzed the API lifecycle ecosystem (OpenAPI, Overlays, Arazzo, TypeSpec) and the Data & Integration markets (iPaaS, API management, RPA, BI, data quality).',
      'Certified across Talend and Qlik platforms (9 practitioner-level credentials, 2023).'
    ],
    tech: ['React.js', 'AngularJS', 'JavaScript', 'Figma', 'Miro', 'Pendo', 'User research', 'OpenAPI', 'Overlays', 'Arazzo', 'TypeSpec', 'REST', 'iPaaS', 'API management', 'Market intelligence', 'AI-assisted UX', 'Qlik Sense', 'Data quality', 'Data catalog']
  },
  {
    id: 'talend', kind: 'work', org: 'Talend', role: 'Principal Software Engineer',
    start: [2017, 11], end: [2023, 4], place: 'Nantes, France',
    blurb: 'Developer, UX/product designer, UX researcher and competitive-intelligence analyst across API products and data & integration projects. Talend was acquired by Qlik in 2023.',
    points: [
      'API products: API Designer, Portal, Documentation, Tester, Data APIs (API Creator).',
      'UXR (interviews, surveys) and market intelligence for Data projects around Stitch (ELT, product-led growth) and Reverse-ETL.',
      'Market intelligence on the iPaaS market; partnered with CSMs on customer data stacks and integration strategies.'
    ],
    tech: ['React.js', 'AngularJS', 'JavaScript', 'Webpack', 'Jenkins', 'Git', 'GitHub', 'REST', 'OpenAPI', 'iPaaS', 'ELT', 'Reverse-ETL', 'Stitch', 'Data quality', 'User research', 'Market intelligence', 'Competitive analysis', 'Figma']
  },
  {
    id: 'restlet', kind: 'work', org: 'Restlet', role: 'Full-Stack Web Engineer',
    start: [2014, 8], end: [2017, 10], place: 'Nantes area, France',
    blurb: 'ApiSpark: Studio (aka API Designer) and Client (aka API Tester, fka DHC). Acquired by Talend in 2017.',
    points: [],
    tech: ['AngularJS', 'Lodash', 'Moment.js', 'Select2', 'Bootstrap', 'CSS', 'Sass', 'Less', 'Git', 'GitHub', 'WebStorm', 'REST', 'Restlet', 'OpenAPI']
  },
  {
    id: 'netco', kind: 'work', org: 'SFEIR @ netcosports', role: 'Front-End Web Developer',
    start: [2014, 3], end: [2014, 7], place: 'Paris region, France',
    blurb: 'Back-office web application letting customers manage their data (dev team: 1 senior developer).',
    points: [],
    tech: ['AngularJS', 'Lodash', 'Moment.js', 'Highcharts', 'Select2', 'Bootstrap', 'CSS', 'Stylus', 'Jade', 'Git', 'GitHub', 'IntelliJ IDEA']
  },
  {
    id: 'adeo', kind: 'work', org: 'SFEIR @ adeo', role: 'Full-Stack Web Engineer',
    start: [2011, 11], end: [2014, 3], place: 'Neuilly-sur-Seine & Lille, France',
    blurb: 'CMS as a SaaS for the leading French player in the international DIY market (~12 senior developers).',
    points: [
      'Front: AngularJS middle-office webapp and an HTML5 portal of GWT webapps, clients of the API.',
      'Mobile: Android application. Server: framework producing the business components of the REST API.',
      'DevOps: Bash scripts automating install and execution of the whole stack.'
    ],
    tech: ['AngularJS', 'Underscore.js', 'JavaScript', 'CSS', 'GWT', 'Java', 'Guava', 'Restlet', 'Spring', 'JUnit', 'Mockito', 'Git', 'GitHub', 'Eclipse', 'IntelliJ IDEA', 'Agile', 'TDD', 'CloudBees', 'Android', 'Bash', 'REST']
  },
  {
    id: 'storeforce', kind: 'work', org: 'SFEIR @ storeforce', role: 'Front-End & Backend Developer',
    start: [2011, 8], end: [2011, 10], place: 'Suresnes, France',
    blurb: 'SaaS store-management web app (team of 2), from persistence to UI: CRUD screens, a Google-Calendar-like planning UI, and the planning generation engine.',
    points: [],
    tech: ['GWT', 'CSS', 'GIN', 'Guava', 'Objectify', 'Google App Engine', 'Git', 'Maven', 'Jenkins', 'Agile']
  },
  {
    id: 'altavia', kind: 'work', org: 'Altavia', role: 'Senior Software Development Engineer',
    start: [2010, 9], end: [2011, 7], place: 'Saint-Ouen, France',
    blurb: 'Web application for the mass retail sector (team of 4): CRUD screens, email and report engines, PDF/Excel import-export engines.',
    points: [],
    tech: ['GWT', 'Ajax', 'CSS', 'Java', 'GIN', 'Guice', 'Spring', 'iBatis', 'SQL', 'JUnit', 'Mockito', 'Apache POI', 'Quartz', 'iText', 'Guava', 'Bash', 'Tomcat', 'Eclipse', 'Maven', 'SVN', 'Hudson', 'Trac', 'Cygwin', 'Agile']
  },
  {
    id: 'elca', kind: 'work', org: 'ELCA Informática', role: 'Full-Stack Web Developer',
    start: [2007, 10], end: [2010, 8], place: 'Madrid, Spain · Lausanne, Switzerland',
    blurb: 'Secutix2, a ticketing solution (team of ~50): CRUD and complex screens (rates grids), data import/export module, responsive UI components in object-oriented JavaScript.',
    points: [],
    tech: ['ExtJS', 'Ajax', 'HTML', 'CSS', 'JavaScript', 'JSON', 'JSP', 'Java', 'Spring', 'Hibernate', 'SQL', 'PL/SQL', 'Tomcat', 'Oracle', 'Eclipse', 'Maven', 'SVN', 'Hudson', 'Jira', 'Cygwin']
  },
  {
    id: 'sopra', kind: 'work', org: 'Sopra Group', role: 'J2EE Java Engineer',
    start: [2006, 1], end: [2007, 9], place: 'Madrid, Spain',
    blurb: 'ANPE (French national employment agency, team of ~20): new features for candidates, employers and staff; build migration from Ant to Maven.',
    points: [],
    tech: ['JavaScript', 'Struts', 'Java EE', 'JSP', 'Servlets', 'EJB', 'JDBC', 'Java', 'Oracle', 'Eclipse', 'Ant', 'Maven', 'CVS', 'Cygwin']
  },
  {
    id: '3m', kind: 'work', org: '3M', role: 'Marketing Intern',
    start: [2005, 1], end: [2005, 4], place: 'Düsseldorf, Germany',
    blurb: 'Market research on ERP and best-of-breed players in Supply Chain Execution in Europe.',
    points: [],
    tech: ['Marketing research', 'Market intelligence', 'ERP', 'Supply chain']
  },
  {
    id: 'ctu', kind: 'work', org: 'Czech Technical University', role: 'Development Intern',
    start: [2004, 1], end: [2004, 6], place: 'Prague, Czechia',
    blurb: 'Researched and designed an interface between SVG and OWL.',
    points: [],
    tech: ['SVG', 'OWL']
  },
  { id: 'edu-master', kind: 'edu', org: 'Université de Nantes · Universität Rostock', role: 'Master\'s degree, International Trade',
    start: [2004, 9], end: [2005, 12], place: 'Nantes · Rostock', blurb: '', points: [], tech: [] },
  { id: 'edu-poly', kind: 'edu', org: 'Polytech\'Nantes', role: 'Engineer\'s degree, Software Engineering',
    start: [2001, 9], end: [2004, 6], place: 'Nantes, France', blurb: '', points: [], tech: [] },
  { id: 'edu-prepa', kind: 'edu', org: 'Lycée Clemenceau', role: 'Prépa MP/MPSI',
    start: [1999, 9], end: [2001, 6], place: 'Nantes, France', blurb: '', points: [], tech: [] }
];

// Extra keywords from the profile summary / keywords section, for the game.
window.EXTRA_KEYWORDS = [
  'Data Engineers', 'Data Analysts', 'Modern Data Stack', 'Metadata', 'Data Warehouse', 'Medallion', 'EAI',
  'Workflow', 'Process Automation', 'Integrators', 'Gartner', 'Forrester', 'IDC', 'BARC', 'GigaOm', 'Snowflake',
  'Databricks', 'Microsoft Fabric', 'MuleSoft', 'Postman', 'Qlik', 'Talend', 'Restlet', 'Personas',
  'Product Analytics', 'MVP', 'Skills', 'Tools', 'Agentic', 'Semantic Layer', 'Versioning', 'Promotion',
  'Environments', 'Magic Quadrant', 'Forrester Wave', 'MarketScape', 'Hype Cycle', 'Product Design',
  'Product Management', 'UX Research', 'Prototyping'
];
