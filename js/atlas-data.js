// Content for the "Atlas" view: a containment tree (zoom into a node to see its children)
// plus cross-links (graph edges between nodes of different branches).
// Sample content, to be completed and refined. Optional per node later: image, text, animation.
(function () {
  function n(id, title, children, extra) {
    var o = { id: id, title: title, children: children || [] };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  var root = n('me', 'Me', [
    n('customers', 'Customers understanding', [
      n('porter5', '5 Porter forces'),
      n('porter-chain', 'Porter value chain'),
      n('togaf', 'Enterprise architecture (TOGAF)', [
        n('business-arch', 'Business architecture'),
        n('data-arch', 'Data architecture'),
        n('app-arch', 'Applications architecture'),
        n('tech-arch', 'Technology architecture')
      ])
    ], { hue: 200 }),

    n('market', 'Market understanding', [
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
      n('product-mgmt', 'Product management', [
        n('market-intel', 'Market intelligence', [
          n('mi-customers', 'Customers'),
          n('mi-market', 'Market'),
          n('mi-competition', 'Competition')
        ]),
        n('strategy', 'Product strategy'),
        n('prioritization', 'Prioritization'),
        n('gtm', 'Go-to-market'),
        n('success-metrics', 'Success metrics', [
          n('user-metrics', 'User metrics'),
          n('business-metrics', 'Business metrics')
        ])
      ]),
      n('product-dev', 'Product development', [
        n('frontend', 'Frontend', [
          n('ux-ui', 'UX and UI topics'),
          n('browser-tech', 'Browser technologies'),
          n('api-tech', 'API technologies'),
          n('java', 'Java ecosystem'),
          n('cicd', 'CI/CD')
        ])
      ])
    ], { hue: 28 })
  ], { hue: 265 });

  // Placeholder cross-links: edit freely.
  var links = [
    { a: 'data-arch', b: 'data-cartography', label: 'same domain: data' },
    { a: 'mi-customers', b: 'customers', label: 'feeds customer understanding' },
    { a: 'mi-market', b: 'market', label: 'feeds market understanding' },
    { a: 'mi-competition', b: 'competitors', label: 'feeds competitor tracking' },
    { a: 'porter5', b: 'competitors', label: 'competitive rivalry' },
    { a: 'personas', b: 'ux-ui', label: 'personas inform UX' },
    { a: 'magic-quadrants', b: 'competitors', label: 'analysts rank competitors' },
    { a: 'critical-capabilities', b: 'prioritization', label: 'capability gaps drive priorities' },
    { a: 'user-metrics', b: 'personas', label: 'who the users are' }
  ];

  window.ATLAS = { root: root, links: links };
})();
