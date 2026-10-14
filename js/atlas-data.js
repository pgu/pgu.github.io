// Content for the "Atlas" view: a containment tree (zoom into a node to see its children)
// plus cross-links (graph edges between nodes of different branches).
// Sample content, to be completed and refined. Optional per node later: image, text, animation.
(function () {
  function n(id, title, children, extra) {
    var o = { id: id, title: title, children: children || [] };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

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

  // The very top: deep space. One tiny patch of sky holds thousands of galaxies; ours is one of them.
  var root = n('universe', 'Universe', [milkyWay], {
    hue: 255,
    image: 'pictures/atlas/The_Hubble_eXtreme_Deep_Field.jpg',
    credit: 'Hubble eXtreme Deep Field, NASA / ESA / G. Illingworth, D. Magee, P. Oesch (UC Santa Cruz) / R. Bouwens (Leiden) / HUDF09 Team (public domain)'
  });

  window.ATLAS = { root: root, links: links };
})();
