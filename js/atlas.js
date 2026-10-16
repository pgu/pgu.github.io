// Atlas: cosmic-zoom ("powers of ten") navigation over a tree with cross-links, rendered with plain DOM + CSS transforms.
//
// Only two layers ever exist at once: the level you are on, and (while zooming) the neighbour level.
// A node already shows a miniature of its children, laid out exactly like the child level will be,
// so zooming in is a camera move on the parent layer cross-faded with the child layer: no huge scale factors accumulate.
(function () {
  var D = window.ATLAS;
  var stage = document.getElementById('at-stage');
  var rulerEl = document.getElementById('at-ruler');
  var crumbsEl = document.getElementById('at-crumbs');
  var panelEl = document.getElementById('at-panel');
  var outBtn = document.getElementById('at-out');
  var SVG = 'http://www.w3.org/2000/svg';
  var ME_ID = 'me';
  // discreet picture hint: a thin outlined frame with a mountain line
  var PIC_ICON = '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><rect x="1" y="2" width="10" height="8" rx="1.2" fill="none" stroke="currentColor" stroke-width="1"/><path d="M1.6 9 4.4 6 6.4 8 8 6.4 10.4 9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- model ---------- */
  var byId = {}, parent = {}, depthOf = {}, maxDepth = 0;
  (function index(node, p, d, hue) {
    node.hue = node.hue != null ? node.hue : hue;
    byId[node.id] = node; parent[node.id] = p ? p.id : null; depthOf[node.id] = d;
    maxDepth = Math.max(maxDepth, d);
    node.children.forEach(function (c) { index(c, node, d + 1, node.hue); });
  })(D.root, null, 0, 265);

  var titleCount = {};
  Object.keys(byId).forEach(function (k) { titleCount[byId[k].title] = (titleCount[byId[k].title] || 0) + 1; });

  function hasKids(id) { return byId[id].children.length > 0; }
  function pathTo(id) { var a = []; for (var x = id; x; x = parent[x]) a.unshift(x); return a; }
  function childOfAncestor(id, pid) { for (var x = id; x; x = parent[x]) if (parent[x] === pid) return x; return null; }
  var imgCountCache = {};
  function imageCount(id) {     // pictures attached to a node or anywhere below it
    if (imgCountCache[id] != null) return imgCountCache[id];
    var n = (byId[id].images || []).length;
    byId[id].children.forEach(function (c) { n += imageCount(c.id); });
    return (imgCountCache[id] = n);
  }
  function inSubtree(id, rootId) { for (var x = id; x; x = parent[x]) if (x === rootId) return true; return false; }

  // A link joins two of the items shown on a level only if both ends are those items themselves.
  function isDirect(k) { return (k.l.a === k.a && k.l.b === k.b) || (k.l.a === k.b && k.l.b === k.a); }

  // Links between the children of `pid`, and links that leave that subtree.
  function linksAt(pid) {
    var internal = [], external = [];
    D.links.forEach(function (l, i) {
      var a = childOfAncestor(l.a, pid), b = childOfAncestor(l.b, pid);
      if (a && b) { if (a !== b) internal.push({ i: i, l: l, a: a, b: b }); }
      else if (a || b) external.push({ i: i, l: l, inside: a || b, outside: a ? l.b : l.a, insideEnd: a ? l.a : l.b });
    });
    return { internal: internal, external: external };
  }

  /* ---------- layout (unit circle, shared by the full level and by the miniature inside a node) ---------- */
  var layoutCache = {};
  function layoutOf(id) {
    if (layoutCache[id]) return layoutCache[id];
    var ch = byId[id].children, N = ch.length, out = [];
    function ring(list, rho, rMax, start) {
      var m = list.length, r = m === 1 ? rMax : Math.min(rMax, rho * Math.sin(Math.PI / m) * .92);
      list.forEach(function (c, i) {
        var a = start + (i / m) * Math.PI * 2;
        out.push({ id: c.id, x: m === 1 && rho === 0 ? 0 : rho * Math.cos(a), y: m === 1 && rho === 0 ? 0 : rho * Math.sin(a), r: r });
      });
    }
    if (N === 1) ring(ch, 0, .5, 0);
    else if (N === 2) ring(ch, .6, .3, Math.PI);          // side by side, leaving the hub readable between them
    else if (byId[id].seq && N <= 9) ring(ch, .62, N >= 7 ? .185 : .22, -Math.PI / 2);   // ordered chain: one ring, room for arrows
    else if (N <= 8) ring(ch, N <= 6 ? .58 : .64, N <= 6 ? .34 : .25, -Math.PI / 2);
    else {
      var m = Math.ceil(N * .62);
      ring(ch.slice(0, m), .7, .24, -Math.PI / 2);
      ring(ch.slice(m), .24, .18, -Math.PI / 2);
    }
    out.forEach(function (o) { var q = byId[o.id].pos; if (q) { o.x = q.x; o.y = q.y; o.r = q.r; } });   // hand-placed nodes (e.g. the Sun in the galaxy)
    return (layoutCache[id] = out);
  }

  /* ---------- geometry ---------- */
  var W = 0, H = 0, C = { x: 0, y: 0 }, R = 1;
  function measure() {
    W = stage.clientWidth; H = stage.clientHeight;
    var left = W > 700 ? 160 : 0;       // keep the level clear of the depth ruler
    C = { x: left + (W - left) / 2, y: H / 2 }; R = Math.min(W - left, H) / 2 * .94;
  }
  function px(item) { return { x: C.x + R * item.x, y: C.y + R * item.y, r: R * item.r }; }

  /* ---------- DOM builders ---------- */
  function setPicture(e, node, level) {
    var img = level && node.levelImage ? node.levelImage : node.image;
    var zoom = level && node.levelImage ? node.levelImageZoom : node.imageZoom;
    e.style.backgroundImage = 'url(' + img + ')';
    if (node.imagePos && !(level && node.levelImage)) e.style.backgroundPosition = node.imagePos;
    if (zoom) e.style.backgroundSize = (zoom * 100) + '%';   // crop away black borders baked into the picture
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svgEl(tag, attrs) { var e = document.createElementNS(SVG, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  function buildNode(item) {
    var n = byId[item.id], p = px(item), kids = hasKids(n.id);
    var e = el('div', 'at-node ' + (kids ? 'has-kids' : 'leaf'));
    e.dataset.id = n.id;
    e.style.left = (p.x - p.r) + 'px'; e.style.top = (p.y - p.r) + 'px';
    e.style.width = e.style.height = (2 * p.r) + 'px';
    e.style.setProperty('--h', n.hue);
    if (n.image) { e.classList.add('pic'); setPicture(e, n); }
    if (n.discreet) e.classList.add('discreet');
    if (p.r < 50) e.classList.add('tiny');     // too small for its label: the label goes underneath
    if (kids) {   // miniature of the next level, positioned exactly as that level will be
      layoutOf(n.id).forEach(function (ci) {
        var d = el('span', 'at-dot'), cr = p.r * ci.r;
        d.style.left = (p.r + p.r * ci.x - cr) + 'px'; d.style.top = (p.r + p.r * ci.y - cr) + 'px';
        d.style.width = d.style.height = (2 * cr) + 'px';
        if (byId[ci.id].image) { d.classList.add('pic'); setPicture(d, byId[ci.id]); }
        e.appendChild(d);
      });
    }
    var lab = el('span', 'at-label', n.title);
    if (n.caption) lab.appendChild(el('small', 'at-caption', n.caption));
    lab.style.fontSize = Math.max(11, Math.min(21, p.r * .21)) + 'px';
    lab.style.maxWidth = (p.r * 1.65) + 'px';
    e.appendChild(lab);
    var hasPics = imageCount(n.id) > 0 && depthOf[n.id] > depthOf[ME_ID];   // no picture hint on "me" and the cosmic levels above
    if (hasPics) {      // discreet hint: at least one picture in this node or below
      var badge = el('span', 'at-badge');
      var ic = el('span', 'at-pic'); ic.title = 'Contains pictures';
      ic.innerHTML = PIC_ICON;     // static markup, no user input
      badge.appendChild(ic);
      e.appendChild(badge);
    }
    e.addEventListener('click', function () { onNode(n.id); });
    e.addEventListener('mouseenter', function () { showInfo(n.id); });
    e.addEventListener('mouseleave', function () { showInfo(null); });
    return e;
  }

  function buildLayer(id) {
    var layer = el('div', 'at-layer');
    layer.dataset.id = id;
    var L = layoutOf(id), N = L.length, byItem = {};
    L.forEach(function (it) { byItem[it.id] = px(it); });

    if (byId[id].image) {   // the level's own picture (a level can use a different one than its node, e.g. Earth by night): the same image the node showed one level up, so the zoom lands seamlessly
      var bd = el('div', 'at-backdrop');
      bd.style.left = (C.x - R) + 'px'; bd.style.top = (C.y - R) + 'px'; bd.style.width = bd.style.height = (2 * R) + 'px';
      setPicture(bd, byId[id], true);
      layer.appendChild(bd);
    }
    var svg = svgEl('svg', { width: W, height: H, class: 'at-edges' });
    linksAt(id).internal.filter(isDirect).forEach(function (k) {
      var a = byItem[k.a], b = byItem[k.b], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var cx = mx + (C.x - mx) * .55, cy = my + (C.y - my) * .55;
      var path = svgEl('path', { d: 'M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y, class: 'at-edge' });
      path.dataset.link = k.i;
      var t = svgEl('title', {}); t.textContent = k.l.label || ''; path.appendChild(t);
      svg.appendChild(path);
    });
    if (byId[id].seq) {   // ordered chain: arrows from each item to the next
      var defs = svgEl('defs', {}), mk = svgEl('marker', { id: 'at-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto' });
      mk.appendChild(svgEl('path', { d: 'M0 0L10 5L0 10z', fill: 'rgba(197,206,224,.95)' }));
      defs.appendChild(mk); svg.appendChild(defs);
      for (var q = 0; q < N - 1; q++) {
        var s0 = byItem[L[q].id], s1 = byItem[L[q + 1].id], dx = s1.x - s0.x, dy = s1.y - s0.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd;
        svg.appendChild(svgEl('path', {
          d: 'M' + (s0.x + ux * (s0.r + 3)) + ' ' + (s0.y + uy * (s0.r + 3)) + ' L' + (s1.x - ux * (s1.r + 6)) + ' ' + (s1.y - uy * (s1.r + 6)),
          class: 'at-seq', 'marker-end': 'url(#at-arrow)'
        }));
      }
    }
    layer.appendChild(svg);

    if (N >= 2 && N <= 8) {   // title of the level in the hole of the ring
      var c = el('div', 'at-center');
      c.style.left = C.x + 'px'; c.style.top = C.y + 'px';
      // 1) the level's own name: click to select it (back to the level's details in the side panel)
      var sel = el('button', 'at-center-title', byId[id].title);
      sel.title = 'Show the details of ' + byId[id].title;
      sel.addEventListener('click', function () {
        if (trans) return;
        selected = null; showInfo(null);
        sel.classList.remove('picked'); void sel.offsetWidth; sel.classList.add('picked');
      });
      c.appendChild(sel);
      // 2) below: the way up
      if (parent[id]) {
        var up = el('button', 'at-center-up', '⤴ ' + byId[parent[id]].title);
        up.title = 'Zoom out to ' + byId[parent[id]].title;
        up.addEventListener('click', function () { if (!busy && !animating && !trans) zoomOut(); });
        c.appendChild(up);
      }
      layer.appendChild(c);
    }
    L.forEach(function (it) { layer.appendChild(buildNode(it)); });
    return layer;
  }

  /* ---------- state + rendering ---------- */
  var cur = D.root.id;
  var trans = null;            // { p, c, t }: camera between level p (t=0) and its child c (t=1)
  var layers = {};             // id -> layer element (only the ones in use)
  var raf = 0, animating = false, busy = false, settleTimer = 0, flashId = null, hoverId = null;
  var built = false, introDone = false;
  var START = 'me', INTRO = true;   // set INTRO = false to open directly on "Me"

  function setLayers(ids) {
    Object.keys(layers).forEach(function (k) {
      if (ids.indexOf(k) < 0) { layers[k].remove(); delete layers[k]; }
    });
    ids.forEach(function (id) {
      if (!layers[id]) { layers[id] = buildLayer(id); stage.insertBefore(layers[id], rulerEl); }
    });
    ids.forEach(function (id) { stage.insertBefore(layers[id], rulerEl); });   // keep order: parent below child
  }

  function setT(layer, tx, ty, s, opacity) {
    layer.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
    layer.style.opacity = opacity;
  }
  function smooth(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function render() {
    if (!built) return;
    if (!trans) {
      setLayers([cur]);
      var l = layers[cur];
      l.style.transform = 'none'; l.style.opacity = 1; l.classList.remove('moving');
      return;
    }
    var p = trans.p, c = trans.c, t = trans.t;
    setLayers([p, c]);
    var q = px(layoutOf(p).filter(function (i) { return i.id === c; })[0]);
    var s = R / q.r;                          // zoom that makes child circle c fill the stage
    var z = Math.pow(s, t);                   // exponential zoom: constant perceived speed
    var u = s === 1 ? 0 : (z - 1) / (s - 1);  // keeps the focal point moving linearly on screen
    var cam = { x: C.x + (q.x - C.x) * u, y: C.y + (q.y - C.y) * u };
    var P = layers[p], K = layers[c];
    P.classList.add('moving'); K.classList.add('moving');
    P.style.setProperty('--t', t);
    var fn = P.querySelector('.at-node[data-id="' + c + '"]');
    if (fn) fn.classList.add('zoom-focus');   // its own label/badge fade out so they don't smear over the next level
    setT(P, C.x - z * cam.x, C.y - z * cam.y, z, 1 - smooth(.55, 1, t));
    var zk = z / s;                           // child level is drawn at its natural size when t = 1
    setT(K, C.x + z * (q.x - cam.x) - zk * C.x, C.y + z * (q.y - cam.y) - zk * C.y, zk, smooth(0, .35, t));
    updateRuler();
  }

  function finish() {
    if (!trans) return;
    cur = trans.t >= .5 ? trans.c : trans.p;
    trans = null;
    selected = null;
    if (backTo && cur === backTo.id) backTo = null;      // back where we started
    render(); updateUI();
    if (flashId) { flash(flashId); flashId = null; }
  }

  function animateTo(target, dur) {
    return new Promise(function (resolve) {
      cancelAnimationFrame(raf); clearTimeout(settleTimer);
      if (reduced || dur <= 0) { trans.t = target; finish(); resolve(); return; }
      animating = true;
      var from = trans.t, t0 = null;
      raf = requestAnimationFrame(function step(now) {
        if (t0 == null) t0 = now;
        var k = Math.min(1, (now - t0) / dur);
        trans.t = from + (target - from) * easeInOut(k);
        render();
        if (k < 1) raf = requestAnimationFrame(step);
        else { animating = false; finish(); resolve(); }
      });
    });
  }

  function zoomIn(id, dur) {
    if (!hasKids(id)) return Promise.resolve();
    trans = { p: cur, c: id, t: 0 };
    return animateTo(1, dur == null ? 620 : dur);
  }
  function zoomOut(dur) {
    if (!parent[cur]) return Promise.resolve();
    trans = { p: parent[cur], c: cur, t: 1 };
    return animateTo(0, dur == null ? 560 : dur);
  }

  // Navigate to the level of node `id` (its children are shown), one zoom step at a time.
  function goTo(id, then, dur) {
    if (busy || animating) return;
    busy = true;
    var from = pathTo(cur), to = pathTo(id), common = 0;
    while (common < from.length && common < to.length && from[common] === to[common]) common++;
    var seq = Promise.resolve(), i;
    for (i = from.length; i > common; i--) seq = seq.then(function () { return zoomOut(dur || 340); });
    to.slice(common).forEach(function (n) { seq = seq.then(function () { return zoomIn(n, dur || 340); }); });
    seq.then(function () { busy = false; if (then) then(); });
  }

  function onNode(id) {
    if (busy || animating || trans) return;
    if (hasKids(id)) zoomIn(id); else { selected = id; showInfo(null); flash(id); }
  }

  function flash(id) {
    var n = stage.querySelector('.at-node[data-id="' + id + '"]');
    if (!n) return;
    n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash');
  }

  /* ---------- wheel / pinch: scrub the zoom ---------- */
  stage.addEventListener('wheel', function (e) {
    if (busy || animating) { e.preventDefault(); return; }
    var dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 3 : 1);
    if (!trans) {
      if (dy < 0) {
        var target = nodeUnder(e);
        if (!target) return;
        trans = { p: cur, c: target, t: 0 };
      } else if (dy > 0 && parent[cur]) {
        trans = { p: parent[cur], c: cur, t: 1 };
      } else return;
    }
    e.preventDefault();
    clearTimeout(settleTimer);
    trans.t = Math.min(1, Math.max(0, trans.t - dy * .0028));
    render();
    if (trans.t <= 0 || trans.t >= 1) { finish(); return; }
    settleTimer = setTimeout(function () { if (trans) animateTo(trans.t >= .5 ? 1 : 0, 260); }, 150);
  }, { passive: false });

  function nodeUnder(e) {
    var n = e.target.closest && e.target.closest('.at-node');
    if (n && hasKids(n.dataset.id) && parent[n.dataset.id] === cur) return n.dataset.id;
    var r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = R * .25;
    layoutOf(cur).forEach(function (it) {
      var p = px(it), d = Math.hypot(p.x - x, p.y - y) - p.r;
      if (hasKids(it.id) && d < bd) { bd = d; best = it.id; }
    });
    return best;
  }

  document.addEventListener('keydown', function (e) {
    if (location.hash !== '#atlas') return;
    if (!lb.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); } return; }
    if (busy || animating) return;
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); zoomOut(); }
  });
  stage.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.at-node, .at-center, .at-tick')) return;
    if (selected) { selected = null; showInfo(null); }
  });
  outBtn.addEventListener('click', function () { if (!busy && !animating) zoomOut(); });

  /* ---------- breadcrumb, ruler, side panel ---------- */
  var selected = null, backTo = null;

  function updateUI() {
    crumbsEl.textContent = '';
    var path = pathTo(cur), KEEP = 5, first = Math.max(0, path.length - KEEP);
    if (first > 0) {   // deep path: fold the oldest ancestors into one "…" crumb (its tooltip lists them)
      var fold = el('button', 'at-crumb', '…');
      fold.title = path.slice(0, first).map(function (x) { return byId[x].title; }).join(' › ');
      fold.addEventListener('click', function () { goTo(path[first - 1]); });
      crumbsEl.appendChild(fold);
    }
    path.slice(first).forEach(function (id, i) {
      if (i || first > 0) crumbsEl.appendChild(el('span', 'at-sep', '›'));
      var b = el('button', 'at-crumb' + (id === cur ? ' on' : ''), byId[id].title);
      b.addEventListener('click', function () { if (id !== cur) goTo(id); });
      crumbsEl.appendChild(b);
    });
    outBtn.hidden = !parent[cur];
    buildRuler(); updateRuler();
    showInfo(null);
  }

  var marker;
  function buildRuler() {
    rulerEl.textContent = '';
    var path = pathTo(cur);
    for (var d = 0; d <= maxDepth; d++) {
      var known = path[d], t = el(known ? 'button' : 'div', 'at-tick' + (known ? ' known' : '') + (known === cur ? ' here' : ''));
      t.style.top = (d / maxDepth * 100) + '%';
      t.appendChild(el('i'));
      t.appendChild(el('span', null, known ? byId[known].title : ''));
      if (known) {     // jump straight to that level
        t.title = known === cur ? 'You are here' : 'Zoom out to ' + byId[known].title;
        t.addEventListener('click', function (id) { return function () { if (id !== cur && !busy && !animating && !trans) goTo(id); }; }(known));
      }
      rulerEl.appendChild(t);
    }
    marker = el('div', 'at-marker');
    rulerEl.appendChild(marker);
  }
  function updateRuler() {
    if (!marker) return;
    var depth = trans ? depthOf[trans.p] + (depthOf[trans.c] - depthOf[trans.p]) * trans.t : depthOf[cur];
    marker.style.top = (depth / maxDepth * 100) + '%';
  }

  /* ---------- pictures: gallery in the side panel, click to enlarge ---------- */
  var lb = el('div', 'at-lightbox'), lbImg = el('img'), lbCap = el('div', 'at-lb-cap');
  lb.hidden = true; lb.appendChild(lbImg); lb.appendChild(lbCap); document.body.appendChild(lb);
  function caption(im) { return im.title + (im.credit ? ' — ' + im.credit : ''); }
  // Restricted pictures are blurred unless the toggle is off (the choice is remembered in this browser).
  var blurBox = document.getElementById('at-blur'), BLUR_KEY = 'pgu-atlas-blur';
  try { if (localStorage.getItem(BLUR_KEY) === 'off') blurBox.checked = false; } catch (e) {}
  function applyBlur() { document.body.classList.toggle('at-reveal', !blurBox.checked); }
  blurBox.addEventListener('change', function () {
    applyBlur();
    try { localStorage.setItem(BLUR_KEY, blurBox.checked ? 'on' : 'off'); } catch (e) {}
  });
  applyBlur();

  function openLightbox(im) { lb.classList.toggle('restricted', !!im.blur); lbImg.src = im.src; lbImg.alt = im.title; lbCap.textContent = caption(im) + '   ·   click or Esc to close'; lb.hidden = false; }
  function closeLightbox() { lb.hidden = true; lbImg.removeAttribute('src'); }
  lb.addEventListener('click', closeLightbox);

  function gallery(node) {
    var gal = el('div', 'at-gallery');
    node.images.forEach(function (im) {
      var fig = el('figure', 'at-fig' + (im.blur ? ' restricted' : '')), img = el('img');
      img.src = im.src; img.alt = im.title; img.loading = 'lazy'; img.title = 'Click to enlarge';
      img.addEventListener('click', function () { openLightbox(im); });
      fig.appendChild(img);
      if (im.blur) fig.appendChild(el('span', 'at-blur-tag', 'Blurred: licensed content'));
      fig.appendChild(el('figcaption', null, caption(im)));
      gal.appendChild(fig);
    });
    return gal;
  }

  // Group the links of a level by the pair of items they connect (order-insensitive).
  function mergeInternal(list) {
    var groups = [], by = {};
    list.forEach(function (k) {
      var key = k.a < k.b ? k.a + '|' + k.b : k.b + '|' + k.a;
      if (!by[key]) { by[key] = { a: k.a, b: k.b, items: [] }; groups.push(by[key]); }
      by[key].items.push(k);
    });
    return groups;
  }

  function linkRow(l, text, onGo, goLabel) {
    var row = el('div', 'at-link');
    row.appendChild(el('span', null, text));
    if (l.label) row.appendChild(el('em', null, l.label));
    if (onGo) { var b = el('button', 'link-btn', goLabel || 'Go ›'); b.addEventListener('click', onGo); row.appendChild(b); }
    return row;
  }

  function showInfo(id) {
    var node = byId[id || selected || cur];
    panelEl.textContent = '';
    var nid = node.id;
    if (backTo) {     // after a "Go ›" jump: one click to return to where you were
      var back = el('button', 'at-back', '↩ Back to ' + backTo.title);
      back.addEventListener('click', function () {
        var to = backTo.id; backTo = null;
        if (to !== cur && !busy && !animating && !trans) goTo(to); else showInfo(null);
      });
      panelEl.appendChild(back);
    }
    panelEl.appendChild(el('h3', null, id || selected ? 'Topic' : 'This level'));
    panelEl.appendChild(el('h2', null, node.title));
    var credit = (nid === cur && !id && !selected && node.levelCredit) ? node.levelCredit : node.credit;
    if (credit) panelEl.appendChild(el('div', 'at-credit', 'Image: ' + credit));
    var hasImgs = node.images && node.images.length;
    if (hasImgs) panelEl.appendChild(gallery(node));

    var rel = D.links.map(function (l, i) { return { l: l, i: i }; }).filter(function (k) {
      return k.l.a === nid || k.l.b === nid;     // a link belongs to the nodes it names, not to their ancestors
    });
    if (nid === cur && !id && !selected) {   // level view: also the links among the current children
      var la = linksAt(cur);
      // only links that join two of the items shown here; links between deeper nodes belong to those nodes
      la.internal = la.internal.filter(isDirect);
      if (la.internal.length) {
        panelEl.appendChild(el('h3', null, 'Links between these items'));
        mergeInternal(la.internal).forEach(function (g) {      // one entry per pair of items, details listed below
          var row = el('div', 'at-link');
          row.appendChild(el('span', null, byId[g.a].title + ' ↔ ' + byId[g.b].title));
          var ul = el('ul', 'at-details');
          g.items.forEach(function (k) {
            var li = el('li');
            var direct = (k.l.a === g.a && k.l.b === g.b) || (k.l.a === g.b && k.l.b === g.a);   // both ends are the items themselves
            if (!direct) {
              var left = inSubtree(k.l.a, g.a) ? k.l.a : k.l.b, right = left === k.l.a ? k.l.b : k.l.a;
              li.appendChild(el('span', null, byId[left].title + ' ↔ ' + byId[right].title));
            }
            if (k.l.label) li.appendChild(el('em', null, k.l.label));
            ul.appendChild(li);
          });
          row.appendChild(ul);
          row.addEventListener('mouseenter', function () { g.items.forEach(function (k) { hot(k.i, true); }); });
          row.addEventListener('mouseleave', function () { g.items.forEach(function (k) { hot(k.i, false); }); });
          panelEl.appendChild(row);
        });
      }
    }
    if (rel.length) {
      panelEl.appendChild(el('h3', null, 'Linked elsewhere'));
      rel.forEach(function (k) {
        var out = k.l.a === nid ? k.l.b : k.l.a;
        var where = byId[out].title + (titleCount[byId[out].title] > 1 && parent[out] ? ' (' + byId[parent[out]].title + ')' : '');   // the linked item; its parent only when the name is shared
        panelEl.appendChild(linkRow(k.l, '↔ ' + where, function () {
          var dest = hasKids(out) ? parent[out] || out : parent[out];
          flashId = out;
          if (dest === cur) { flash(out); flashId = null; }
          else { backTo = { id: cur, title: byId[cur].title }; goTo(dest); }
        }));
      });
    }
  }

  function hot(i, on) {
    var p = stage.querySelector('.at-edge[data-link="' + i + '"]');
    if (p) p.classList.toggle('hot', on);
  }

  /* ---------- lifecycle ---------- */
  function build() {
    measure();
    if (!W) return;
    Object.keys(layers).forEach(function (k) { layers[k].remove(); });
    layers = {}; trans = null; built = true;
    if (!introDone) {
      introDone = true;
      if (INTRO && !reduced) {     // powers-of-ten opening: start at the Milky Way and fly in to "Me"
        cur = D.root.id;
        render(); updateUI();
        setTimeout(function () { goTo(START, null, 750); }, 500);
        return;
      }
      cur = START;
    }
    render(); updateUI();
  }
  new ResizeObserver(function () { if (stage.clientWidth && (stage.clientWidth !== W || stage.clientHeight !== H)) build(); }).observe(stage);
  window.addEventListener('viewchange', function (e) { if (e.detail === 'atlas') build(); });
  if (location.hash === '#atlas') build();
})();
