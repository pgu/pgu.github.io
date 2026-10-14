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
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- model ---------- */
  var byId = {}, parent = {}, depthOf = {}, maxDepth = 0;
  (function index(node, p, d, hue) {
    node.hue = node.hue != null ? node.hue : hue;
    byId[node.id] = node; parent[node.id] = p ? p.id : null; depthOf[node.id] = d;
    maxDepth = Math.max(maxDepth, d);
    node.children.forEach(function (c) { index(c, node, d + 1, node.hue); });
  })(D.root, null, 0, 265);

  function hasKids(id) { return byId[id].children.length > 0; }
  function pathTo(id) { var a = []; for (var x = id; x; x = parent[x]) a.unshift(x); return a; }
  function childOfAncestor(id, pid) { for (var x = id; x; x = parent[x]) if (parent[x] === pid) return x; return null; }
  function inSubtree(id, rootId) { for (var x = id; x; x = parent[x]) if (x === rootId) return true; return false; }

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
    else if (N <= 6) ring(ch, .58, .34, -Math.PI / 2);
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
  function setPicture(e, node) {
    e.style.backgroundImage = 'url(' + node.image + ')';
    if (node.imagePos) e.style.backgroundPosition = node.imagePos;
    if (node.imageZoom) e.style.backgroundSize = (node.imageZoom * 100) + '%';   // crop away black borders baked into the picture
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
    lab.style.fontSize = Math.max(11, Math.min(21, p.r * .21)) + 'px';
    lab.style.maxWidth = (p.r * 1.65) + 'px';
    e.appendChild(lab);
    var ext = D.links.filter(function (l) { return inSubtree(l.a, n.id) !== inSubtree(l.b, n.id); }).length;
    if (ext) e.appendChild(el('span', 'at-badge', '↔ ' + ext));
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

    if (byId[id].image) {   // the level's own picture: the same image the node showed one level up, so the zoom lands seamlessly
      var bd = el('div', 'at-backdrop');
      bd.style.left = (C.x - R) + 'px'; bd.style.top = (C.y - R) + 'px'; bd.style.width = bd.style.height = (2 * R) + 'px';
      setPicture(bd, byId[id]);
      layer.appendChild(bd);
    }
    var svg = svgEl('svg', { width: W, height: H, class: 'at-edges' });
    linksAt(id).internal.forEach(function (k) {
      var a = byItem[k.a], b = byItem[k.b], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var cx = mx + (C.x - mx) * .55, cy = my + (C.y - my) * .55;
      var path = svgEl('path', { d: 'M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y, class: 'at-edge' });
      path.dataset.link = k.i;
      var t = svgEl('title', {}); t.textContent = k.l.label || ''; path.appendChild(t);
      svg.appendChild(path);
    });
    layer.appendChild(svg);

    if (N >= 2 && N <= 6) {   // title of the level in the hole of the ring
      var c = el('div', 'at-center');
      c.style.left = C.x + 'px'; c.style.top = C.y + 'px';
      c.appendChild(el('b', null, byId[id].title));
      if (parent[id]) {   // the hub is also the way back up
        c.classList.add('up');
        c.appendChild(el('span', 'at-up-hint', '⤴ ' + byId[parent[id]].title));
        c.title = 'Zoom out to ' + byId[parent[id]].title;
        c.addEventListener('click', function () { if (!busy && !animating && !trans) zoomOut(); });
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
    if (location.hash !== '#atlas' || busy || animating) return;
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); zoomOut(); }
  });
  outBtn.addEventListener('click', function () { if (!busy && !animating) zoomOut(); });

  /* ---------- breadcrumb, ruler, side panel ---------- */
  var selected = null;

  function updateUI() {
    crumbsEl.textContent = '';
    pathTo(cur).forEach(function (id, i, arr) {
      if (i) crumbsEl.appendChild(el('span', 'at-sep', '›'));
      var b = el('button', 'at-crumb' + (id === cur ? ' on' : ''), byId[id].title);
      b.addEventListener('click', function () { if (id !== cur) goTo(id); });
      crumbsEl.appendChild(b);
    });
    outBtn.hidden = !parent[cur];
    updateUpPill();
    buildRuler(); updateRuler();
    showInfo(null);
  }

  var upBtn = el('button', 'at-up-pill');
  upBtn.addEventListener('click', function () { if (!busy && !animating && !trans) zoomOut(); });
  stage.insertBefore(upBtn, rulerEl);
  function updateUpPill() {
    upBtn.hidden = !parent[cur];
    if (parent[cur]) upBtn.textContent = '⤴ ' + byId[parent[cur]].title;
  }

  var marker;
  function buildRuler() {
    rulerEl.textContent = '';
    var path = pathTo(cur);
    for (var d = 0; d <= maxDepth; d++) {
      var t = el('div', 'at-tick' + (path[d] ? ' known' : ''));
      t.style.top = (d / maxDepth * 100) + '%';
      t.appendChild(el('i'));
      t.appendChild(el('span', null, path[d] ? byId[path[d]].title : ''));
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
    panelEl.appendChild(el('h3', null, id || selected ? 'Topic' : 'This level'));
    panelEl.appendChild(el('h2', null, node.title));
    panelEl.appendChild(el('div', 'at-path', pathTo(nid).map(function (x) { return byId[x].title; }).join(' › ')));
    if (node.credit) panelEl.appendChild(el('div', 'at-credit', 'Image: ' + node.credit));
    var kids = node.children.length;
    panelEl.appendChild(el('p', null, kids ? kids + ' item' + (kids > 1 ? 's' : '') + ' inside. Click to zoom in.' : 'Leaf. Pictures, text or animation can live here later.'));

    var rel = D.links.map(function (l, i) { return { l: l, i: i }; }).filter(function (k) {
      var ia = inSubtree(k.l.a, nid), ib = inSubtree(k.l.b, nid);
      return ia !== ib;     // one end inside this node, the other outside
    });
    if (nid === cur && !id && !selected) {   // level view: also the links among the current children
      var la = linksAt(cur);
      if (la.internal.length) {
        panelEl.appendChild(el('h3', null, 'Links between these items'));
        la.internal.forEach(function (k) {
          var row = linkRow(k.l, byId[k.a].title + ' ↔ ' + byId[k.b].title);
          row.addEventListener('mouseenter', function () { hot(k.i, true); });
          row.addEventListener('mouseleave', function () { hot(k.i, false); });
          panelEl.appendChild(row);
        });
      }
    }
    if (rel.length) {
      panelEl.appendChild(el('h3', null, 'Linked elsewhere'));
      rel.forEach(function (k) {
        var out = inSubtree(k.l.a, nid) ? k.l.b : k.l.a;
        var inner = inSubtree(k.l.a, nid) ? k.l.a : k.l.b;
        var where = pathTo(out).slice(1).map(function (x) { return byId[x].title; }).join(' › ');
        panelEl.appendChild(linkRow(k.l, byId[inner].title + ' ↔ ' + where, function () {
          var dest = hasKids(out) ? parent[out] || out : parent[out];
          flashId = out;
          if (dest === cur) { flash(out); flashId = null; } else goTo(dest);
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
