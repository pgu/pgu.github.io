// Content for the "Atlas" view: a containment tree (zoom into a node to see its children)
// plus cross-links (graph edges between nodes of different branches).
// Sample content, to be completed and refined. Optional per node later: image, text, animation.
(function () {
  function n(id, title, children, extra) {
    var o = { id: id, title: title, children: children || [] };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  // Pictures that illustrate a node (shown in the side panel, click to enlarge). Web-sized copies of the files in
  // pictures-for-atlas-context/. Credits are what the pictures themselves show; fill in the missing authors.
  var IMG = 'pictures/atlas/content/';
  function pic(file, title, credit) { return { src: IMG + file, title: title, credit: credit || '' }; }
  function sq(id, title, caption) { return n(id, title, [], caption ? { caption: caption } : null); }   // a plain leaf

  var me = n('me', 'Me', [
    n('customers', 'Understanding customers', [
      n('porter5', '5 Porter forces'),
      n('porter-chain', 'Porter value chain'),
      n('togaf', 'Enterprise architecture (TOGAF)', [
        n('business-arch', 'Business architecture'),
        n('data-arch', 'Data architecture'),
        n('app-arch', 'Applications architecture'),
        n('tech-arch', 'Technology architecture')
      ])
    ], { hue: 200 }),

    n('market', 'Understanding the market', [
      n('data-cartography', 'Data management cartography'),
      n('competitors', 'Competitors products'),
      n('analysts', 'Analysts materials', [
        n('ref-arch', 'Reference architectures'),
        n('personas', 'Personas'),
        n('magic-quadrants', 'Magic Quadrants'),
        n('critical-capabilities', 'Critical Capabilities')
      ])
    ], { hue: 150 }),

    n('product', 'Product management and development', [

      /* ===================== Product management ===================== */
      n('product-mgmt', 'Product management', [

        n('discovery', 'Discovery and positioning', [
          n('pm-customers', 'Customers', [
            sq('pm-personas', 'Personas'),
            sq('benefit-tree', 'Benefit tree'),
            n('user-needs', 'User needs', [], { caption: 'Kano model, Jobs to be Done',
              images: [pic('10-03-kano-model.jpg', 'User needs (Kano model)', '© Todd Birzer')] }),
            sq('needs-segmentation', 'Needs-based segmentation'),
            sq('customer-value', 'Customer value'),
            n('voc', 'Voice of the customer', [], {
              images: [pic('10-02-voc.jpg', 'Common Voice of the Customer (VOC) sources', 'source unknown')] })
          ]),
          n('pm-market', 'Market', [
            sq('market-sizing', 'Market sizing', 'TAM, SAM, SOM'),
            sq('competitive-analysis', 'Competitive analysis'),
            sq('benchmarking', 'Product benchmarking'),
            sq('tech-watch', 'Technology watch'),
            n('pestel', 'PESTEL analysis', [], {
              images: [pic('10-01-pestel.jpg', 'PESTEL analysis (Product tool #4)', '© Todd Birzer')] })
          ]),
          n('positioning', 'Positioning', [
            sq('differentiation', 'Differentiation'),
            sq('stp', 'Segmentation, targeting and positioning'),
            n('marketing-mix', 'Marketing mix (the 4 Ps)', [
              sq('p-product', 'Product'), sq('p-place', 'Place'), sq('p-promotion', 'Promotion'), sq('p-price', 'Price')
            ])
          ])
        ], { images: [pic('10-04-double-diamond.jpg', 'The Double Diamond: discover, define, develop, deliver', 'Wikipedia (it.wikipedia.org/wiki/Double_Diamond)')] }),

        n('strategy', 'Strategy, prioritization and roadmap', [
          n('vision-objectives', 'Vision and objectives', [
            sq('vision', 'Vision'), sq('objectives', 'Objectives')
          ]),
          n('pm-inputs', 'Inputs', [
            sq('insight', 'Customer, market and competitive insights'),
            sq('product-analytics', 'Product analytics and metrics tracking'),
            sq('support-trends', 'Customer support issues and trends')
          ]),
          n('prioritization', 'Prioritization', [
            n('value-effort', 'Value/effort matrix', [], { images: [
              pic('10-07-value-effort-matrix.jpg', 'Value effort matrix', '© Todd Birzer'),
              pic('10-06-prio-matrix-gartner.jpg', 'Project prioritization matrix (impact vs effort)', '© Gartner, 2024')] }),
            n('use-case-prism', 'Use-case prism', [
              n('business-value', 'Business value', [sq('revenue', 'Revenue'), sq('cost', 'Cost'), sq('risks', 'Risks')]),
              n('feasibility', 'Feasibility', [sq('complexity', 'Complexity'), sq('scope', 'Scope'), sq('predictability', 'Predictability')])
            ], { images: [pic('10-05-usecase-prism-gartner.jpg', 'A sample use-case prism', '© Gartner')] })
          ]),
          sq('roadmap', 'Roadmap')
        ]),

        n('measuring', 'Measuring success', [
          n('ux-metrics', 'UX metrics', [
            n('leading', 'Leading indicators', [
              sq('usability-issues', 'Usability issues'), sq('task-completion', 'Task completion rate'), sq('seq', 'SEQ', 'Single Ease Question')
            ]),
            n('lagging', 'Lagging indicators', [
              sq('sus', 'SUS', 'System Usability Scale'), sq('csat', 'CSAT', 'customer satisfaction'), sq('nps', 'NPS', 'Net Promoter Score')
            ]),
            n('heart', 'HEART framework', [], {
              images: [pic('10-10-heart-fw.jpg', 'HEART framework: goals, signals, metrics', 'Google (HEART framework)')] })
          ], { images: [pic('10-11-ux-measures.jpg', 'UX measures: from leading inputs to lagging outcomes', 'Nielsen Norman Group (NN/g)')] }),
          n('business-metrics', 'Business metrics', [
            sq('mau', 'MAU', 'monthly active users'), sq('mrr', 'MRR', 'monthly recurring revenue'),
            sq('arpu', 'ARPU', 'average revenue per user'), sq('ltv', 'LTV', 'customer lifetime value'),
            sq('nrr', 'NRR', 'net revenue retention'), sq('arr', 'ARR', 'annual recurring revenue'),
            sq('churn', 'Churn')
          ], { images: [pic('10-12-saas-metrics.jpg', 'The SaaS product metrics pyramid', '© ProductPlan')] }),
          n('perception-chain', 'From perception to revenue', [
            sq('user-perception', 'User perception'), sq('satisfaction', 'Satisfaction'), sq('loyalty', 'Loyalty'),
            sq('referrals', 'Referrals'), sq('retention', 'Retention'), sq('renewals', 'Renewals'), sq('revenue-out', 'Revenue')
          ], { seq: true, images: [
            pic('10-08-ux-rev-chain.jpg', 'The UX-revenue chain model', 'UXmatters (uxmatters.com)'),
            pic('10-09-ux-to-business.jpg', 'Correlating UX metrics with company KPIs (athenahealth)', 'UXmatters (uxmatters.com)')] }),
          n('aarrr', 'AARRR', [
            sq('acquisition', 'Acquisition'), sq('activation', 'Activation'), sq('retention-aarrr', 'Retention'),
            sq('referral', 'Referral'), sq('revenue-aarrr', 'Revenue')
          ], { seq: true, caption: 'pirate metrics' })
        ])
      ], { images: [pic('10-00-prag-insti-fw.jpg', 'The Pragmatic Framework', '© Pragmatic Institute')] }),

      /* ===================== Product development ===================== */
      n('product-dev', 'Product development', [

        n('ux-ui', 'UX and UI design', [
          n('visual-principles', 'Visual design principles', [
            n('gestalt', 'Gestalt', [sq('similarity', 'Similarity'), sq('continuation', 'Continuation'), sq('closure', 'Closure')]),
            sq('balance', 'Balance'), sq('scale', 'Scale'), sq('contrast', 'Contrast'),
            n('visual-hierarchy', 'Visual hierarchy', [
              sq('vh-size', 'Size'), sq('vh-color', 'Colour'), sq('vh-contrast', 'Contrast'), sq('vh-proximity', 'Proximity'), sq('vh-repetition', 'Repetition')
            ]),
            sq('golden-ratio', 'Golden ratio')
          ], { images: [pic('11-00-visu.jpg', '5 basic visual design principles in UX', 'Nielsen Norman Group (NN/g)')] }),
          n('usability-laws', 'Usability laws and heuristics', [
            sq('squint-test', 'Squint test'),
            sq('jakobs-law', 'Jakob\'s law', 'familiarity'),
            sq('design-standards', 'Design standards'),
            n('scan-dont-read', 'Users scan, they don\'t read', [sq('f-z-patterns', 'F-pattern and Z-pattern'), sq('signposts', 'Signposts', 'headings, lists, bold words')]),
            sq('aesthetic-usability', 'Aesthetic-usability effect'),
            n('cost-benefit', 'Cost-benefit analysis', [
              sq('utility', 'Utility', 'expected benefit − expected cost'), sq('interaction-cost', 'Interaction cost'), sq('perceived-value', 'Perceived value')
            ])
          ], { images: [
            pic('11-10-ux-laws_1.jpg', 'Laws of UX (1/2): Aesthetic-usability effect, Jakob\'s law, Law of proximity, ...', 'Laws of UX, Jon Yablonski (lawsofux.com)'),
            pic('11-11-ux-laws_2.jpg', 'Laws of UX (2/2): Miller\'s law, Pareto principle, Postel\'s law, Tesler\'s law, ...', 'Laws of UX, Jon Yablonski (lawsofux.com)')] }),
          n('web-page-ux', 'Web page UX', [
            n('wp-foundations', 'Foundations', [sq('web-standards', 'Web standards'), sq('attracting-attention', 'Attracting attention'), sq('scrolling', 'Scrolling'), sq('how-users-scan', 'How users scan')]),
            n('wp-content', 'Content', [n('wp-information', 'Information', [sq('wp-entities', 'Functional entities, attributes, values, states and actions')])]),
            n('wp-layering', 'Priority and layering', [sq('responsive', 'Responsive'), sq('grid', 'Grid')]),
            n('wp-interaction', 'Interaction', [sq('signifiers', 'Signifiers'), sq('calls-to-action', 'Calls to action')]),
            n('wp-presentation', 'Presentation', [sq('typography-color', 'Typography and colour'), sq('imagery', 'Imagery')])
          ]),
          n('info-arch', 'Information architecture', [
            sq('findability', 'Findability'), sq('discoverability', 'Discoverability'),
            n('organization', 'Organization', [sq('categories-hierarchies', 'Categories and hierarchies')]),
            sq('labeling', 'Labeling'),
            n('metadata', 'Metadata', [sq('taxonomies-tags', 'Taxonomies and tags'), sq('ontologies', 'Ontologies')])
          ]),
          n('ui-states', 'UI states and flows', [
            n('happy-path', 'Happy path', [
              sq('main-goal', 'Main user goal'), sq('entry-point', 'Entry point'), sq('key-steps', 'Key steps'), sq('success-confirmation', 'Success confirmation')
            ]),
            n('empty-states', 'Empty states', [
              sq('first-use', 'First use', 'blank slate'), sq('no-results', 'No results', 'empty search'), sq('cleared-completed', 'Cleared or completed'),
              sq('empty-cta', 'Call to action'), sq('onboarding-hints', 'Onboarding hints')
            ]),
            n('loading-states', 'Loading states', [
              sq('spinner', 'Spinner'), sq('progress-bar', 'Progress bar'), sq('skeleton-screen', 'Skeleton screen'),
              sq('optimistic-ui', 'Optimistic UI'), sq('perceived-performance', 'Perceived performance')
            ]),
            n('error-states', 'Error states and recovery', [
              sq('validation-errors', 'Validation errors'), sq('system-errors', 'System errors'), sq('not-found', 'Not found', '404'),
              sq('offline', 'Offline'), sq('permission-denied', 'Permission denied'), sq('retry-undo', 'Retry and undo'), sq('plain-language', 'Plain-language messages')
            ]),
            n('edge-cases', 'Edge cases', [
              sq('partial-data', 'Partial data'), sq('long-text', 'Very long text'), sq('too-many-items', 'Too many items'), sq('slow-network', 'Slow networks')
            ])
          ])
        ]),

        n('web-platform', 'Browser and web platform', [
          n('browser', 'Browser', [
            sq('rendering-engine', 'Rendering engine'),
            n('js-engine', 'JS engine', [sq('event-loop', 'Event loop'), sq('call-stack', 'Call stack, heap and task queue')]),
            sq('web-apis', 'Web APIs')
          ], { images: [pic('11-01-browser.jpg', 'What happens when you enter a URL in the browser', '© ByteByteGo')] }),
          n('web-specs', 'Specs evolution', [
            sq('ecmascript', 'ECMAScript'), sq('html-css-a11y', 'HTML, CSS and accessibility'), n('browser-support', 'Browser support differences', [], { images: [pic('11-09-caniuse.jpg', 'Can I use: CSS Grid Layout browser support', 'Can I use (caniuse.com)')] })
          ]),
          n('js-eco', 'JS ecosystem', [
            n('js-frameworks', 'Frameworks', [sq('react', 'React'), sq('angularjs', 'AngularJS'), sq('gwt', 'GWT')]),
            n('js-tooling', 'Tooling and build tools', [sq('nodejs', 'Node.js'), sq('webpack', 'Webpack')]),
            n('js-cicd', 'CI/CD', [sq('git-github', 'Git and GitHub', 'pull requests, reviews'), sq('jenkins-js', 'Jenkins')])
          ], { images: [pic('11-02-js.jpg', 'JavaScript explained', '© ByteByteGo')] }),
          n('css-eco', 'CSS ecosystem', [sq('bootstrap', 'Bootstrap'), sq('tailwind', 'Tailwind'), sq('sass', 'Sass'), sq('design-tokens', 'Design tokens'), sq('design-system', 'Design system')]),
          n('frontend-perf', 'Frontend performance', [
            sq('selective-rendering', 'Selective rendering'), sq('code-splitting', 'Code splitting', 'modular architecture'),
            sq('loading-sequence', 'Loading sequence'), sq('priority-loading', 'Priority-based loading'),
            sq('tree-shaking', 'Tree shaking'), sq('prefetching', 'Pre-fetching'),
            sq('dynamic-imports', 'Dynamic imports'), sq('compression', 'Compression')
          ], { images: [pic('11-05-frontend-perf.jpg', 'Frontend performance cheatsheet', '© ByteByteGo')] })
        ]),

        n('api-tech', 'API technologies', [
          n('http', 'Network', [sq('http-protocol', 'HTTP')], { images: [pic('11-08-osi.jpg', 'What is the OSI model', '© ByteByteGo')] }),
          n('rest', 'REST', [sq('rest-methods', 'Methods'), sq('media-types', 'Media types'), sq('payload', 'Payload'), sq('response-codes', 'Response codes'), sq('rest-security', 'Security')]),
          n('api-specs', 'Specs and formats', [
            n('openapi', 'OpenAPI', [sq('overlays', 'Overlays'), sq('arazzo', 'Arazzo')]),
            sq('asyncapi', 'AsyncAPI'), sq('graphql', 'GraphQL')
          ], { images: [
            pic('11-06-api-mcp-standards.jpg', 'How API standards relate to each other (OpenAPI, AsyncAPI, Arazzo, Overlay, MCP, A2A, ...)', 'API Evangelist (standards.apievangelist.com/relationships)'),
            pic('11-07-api-std-comp.jpg', 'Vocabulary shared between API standards', 'API Evangelist (standards.apievangelist.com/relationships)')] }),
          n('api-mgmt', 'API management', [sq('rate-limiting', 'Rate limiting'), sq('authentication', 'Authentication'), sq('dev-portal', 'Documentation and developer portal'), sq('monetization', 'Monetization')])
        ], { images: [pic('11-03-api.jpg', 'API protocols', '© ByteByteGo and Postman')] }),

        n('java-eco', 'Java ecosystem', [
          sq('jakarta-ee', 'Jakarta EE', 'formerly J2EE'),
          n('java-lang', 'Java language', [sq('collections', 'Collections')]),
          n('jvm', 'JVM', [sq('gc', 'Garbage collection')], { images: [pic('11-04-jvm.jpg', 'How the JVM works', '© ByteByteGo')] }),
          sq('spring', 'Spring'), sq('hibernate', 'Hibernate'), sq('restlet', 'Restlet'),
          n('java-build', 'Build and CI/CD', [sq('maven', 'Maven'), sq('jenkins-java', 'Jenkins')])
        ])
      ], { hue: 340 })
    ], { hue: 28 })
  ], {
    hue: 265,
    // one small pin among the city lights, in western France (Nantes), not the centre of the planet
    pos: { x: -.565, y: -.5, r: .05 },
    caption: 'one of ~8 billion'
  });

  // Cosmic levels above "Me": zooming out goes Me > Earth > Solar system > Milky Way > Universe.
  var milkyWay = n('milky-way', 'Milky Way', [
    n('solar-system', 'Solar system', [
      n('earth', 'Earth', [me], {
        hue: 205, imageZoom: 1.22,
        // inside the Earth level the backdrop is the planet at night: the city lights are everyone else
        levelImage: 'pictures/atlas/Earth_at_night_globe.jpg', levelImageZoom: 1.2,
        levelCredit: 'Earth at night (Africa, Europe and the Middle East), NASA Earth Observatory image by Robert Simmon, Suomi NPP VIIRS data courtesy of NOAA NGDC (public domain)',
        pos: { x: .06, y: -.56, r: .225 },      // sits exactly over the Earth in the Solar System montage (see imagePos below)
        image: 'pictures/atlas/The_Earth_seen_from_Apollo_17.jpg',
        credit: 'The Blue Marble, NASA / Apollo 17 crew (public domain)'
      })
    ], {
      hue: 45, pos: { x: .36, y: .42, r: .13 }, imagePos: '50% 12%',     // the Sun sits about halfway out in the Orion Spur, not at the centre
      image: 'pictures/atlas/Solar_system.jpg',
      credit: 'Solar System montage, NASA / JPL (public domain)'
    })
  ], {
    hue: 230, pos: { x: -.28, y: -.3, r: .12 },     // one galaxy among countless others
    image: 'pictures/atlas/Milky_Way_2010.jpg',
    credit: 'The Milky Way, artist\'s concept, NASA / JPL-Caltech / R. Hurt (SSC) (public domain)'
  });

  // Cross-links: proposals to review and correct. Each ends at a node of another branch; the same node can appear in several links.
  var links = [
    { a: 'data-arch', b: 'data-cartography', label: 'same domain: data' },
    { a: 'insight', b: 'customers', label: 'feeds customer understanding' },
    { a: 'insight', b: 'market', label: 'feeds market understanding' },
    { a: 'insight', b: 'competitors', label: 'feeds competitor tracking' },
    { a: 'porter5', b: 'competitors', label: 'competitive rivalry' },
    { a: 'competitive-analysis', b: 'competitors', label: 'same topic, product view' },
    { a: 'personas', b: 'pm-personas', label: 'same concept, two sources' },
    { a: 'pm-personas', b: 'ux-ui', label: 'personas inform UX' },
    { a: 'magic-quadrants', b: 'competitors', label: 'analysts rank competitors' },
    { a: 'critical-capabilities', b: 'prioritization', label: 'capability gaps drive priorities' },
    { a: 'info-arch', b: 'data-cartography', label: 'metadata and taxonomies' },
    { a: 'api-tech', b: 'analysts', label: 'API market analysis' },
    { a: 'loading-states', b: 'frontend-perf', label: 'perceived vs real speed' },
    { a: 'error-states', b: 'response-codes', label: 'the HTTP errors behind the messages' },
    { a: 'happy-path', b: 'task-completion', label: 'the metric that tells whether it works' }
  ];

  // The very top: deep space. One tiny patch of sky holds thousands of galaxies; ours is one of them.
  var root = n('universe', 'Universe', [milkyWay], {
    hue: 255,
    image: 'pictures/atlas/The_Hubble_eXtreme_Deep_Field.jpg',
    credit: 'Hubble eXtreme Deep Field, NASA / ESA / G. Illingworth, D. Magee, P. Oesch (UC Santa Cruz) / R. Bouwens (Leiden) / HUDF09 Team (public domain)'
  });

  window.ATLAS = { root: root, links: links };
})();
