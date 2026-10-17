// Atlas on canvas (experimental): the same tree, layout and node markup as the HTML Atlas (atlas.js),
// but every circle is a real DOM element painted into ONE <canvas layoutsubtree> with drawElementImage().
// Canvas-only extras: a starfield that flies past as you zoom, rack-focus depth of field between levels,
// additive glow and pulses, cross-link arcs drawn on hover, and a depth ruler drawn as canvas text.
(function () {
  var Core = window.AtlasCore, H2C = window.H2C;
  if (!Core || !H2C) return;
  var D = Core.D, byId = Core.byId, parent = Core.parent, depthOf = Core.depthOf, maxDepth = Core.maxDepth;
  var START = Core.START, hasKids = Core.hasKids, pathTo = Core.pathTo, el = Core.el;

  var fallbackEl = document.getElementById('ac-fallback'), mainEl = document.getElementById('ac-main');
  var stageEl = document.getElementById('ac-stage'), panelEl = document.getElementById('ac-panel');
  var crumbsEl = document.getElementById('ac-crumbs'), outBtn = document.getElementById('ac-out');
  var starsBox = document.getElementById('ac-fx-stars'), dofBox = document.getElementById('ac-fx-dof');
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RULER_W = 150, INTRO = true;

  var started = false, failed = false, introDone = false;
  var cv, ctx, W = 0, H = 0, dpr = 1, C = { x: 0, y: 0 }, R = 1;
  var cur = D.root.id, trans = null, busy = false, animating = false, raf = 0, settleTimer = 0;
  var layers = {};                 // id -> { nodes: [{id, item, el}], bd: backdrop element | null }
  var hits = [], chips = [], uiHits = [];   // hit areas of the last frame (nodes, link chips, canvas-drawn buttons)
  var mouse = null, hoverId = null, focusId = null, leaveT = 0, selected = null, backTo = null;
  var pulse = null;                // { id, t0 }: ring around the node we just jumped to
  var stars = [], phase = 0, prevPhase = 0, last = 0;

  function smooth(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hue(id) { return byId[id].hue; }

  /* ---------- geometry (same rules as the HTML Atlas, minus the ruler column which is drawn on the canvas) ---------- */
  function measure() {
    var left = W > 700 ? RULER_W : 0;
    C = { x: left + (W - left) / 2, y: H / 2 };
    R = Math.min(W - left, H) / 2 * .94;
  }
  function px(item) { return { x: C.x + R * item.x, y: C.y + R * item.y, r: R * item.r }; }

  /* ---------- layers: real DOM children of the canvas, never painted by the browser ---------- */
  function buildLayer(id) {
    var L = { nodes: [], bd: null };
    var node = byId[id];
    if (node.image) {            // the level's own picture, same image as the node one level up, so the zoom lands seamlessly
      var bd = el('div', 'at-backdrop');
      bd.style.left = '0px'; bd.style.top = '0px'; bd.style.width = bd.style.height = (2 * R) + 'px';
      Core.setPicture(bd, node, true);
      cv.appendChild(bd); L.bd = bd;
    }
    Core.layoutOf(id).forEach(function (item) {
      var e = Core.buildNode(item, px, true);          // bare: no listeners, the canvas does the hit testing
      e.style.left = '0px'; e.style.top = '0px';       // laid out at the origin; drawElementImage places it
      cv.appendChild(e);
      L.nodes.push({ id: item.id, item: px(item), el: e });
    });
    return L;
  }
  function setLayers(ids) {
    Object.keys(layers).forEach(function (k) {
      if (ids.indexOf(k) < 0) {
        layers[k].nodes.forEach(function (n) { n.el.remove(); });
        if (layers[k].bd) layers[k].bd.remove();
        delete layers[k];
      }
    });
    ids.forEach(function (id) { if (!layers[id]) layers[id] = buildLayer(id); });
  }
  function clearLayers() { setLayers([]); }

  /* ---------- camera: identical maths to atlas.js, applied to coordinates instead of CSS transforms ---------- */
  function camera() {
    if (!trans) return { list: [{ id: cur, tx: 0, ty: 0, z: 1, alpha: 1, blur: 0, focusChild: null }] };
    var p = trans.p, c = trans.c, t = trans.t;
    var q = px(Core.layoutOf(p).filter(function (i) { return i.id === c; })[0]);
    var s = R / q.r, z = Math.pow(s, t), u = s === 1 ? 0 : (z - 1) / (s - 1);
    var cam = { x: C.x + (q.x - C.x) * u, y: C.y + (q.y - C.y) * u }, zk = z / s;
    return { list: [
      { id: p, tx: C.x - z * cam.x, ty: C.y - z * cam.y, z: z, alpha: 1 - smooth(.55, 1, t), blur: 6 * smooth(0, 1, t), focusChild: c, fade: 1 - smooth(0, .5, t) },
      { id: c, tx: C.x + z * (q.x - cam.x) - zk * C.x, ty: C.y + z * (q.y - cam.y) - zk * C.y, z: zk, alpha: smooth(0, .35, t), blur: 6 * (1 - smooth(.15, 1, t)), focusChild: null }
    ] };
  }

  /* ---------- stars: they stream outward as you zoom in, inward as you zoom out ---------- */
  function makeStars() {
    stars = [];
    for (var i = 0; i < 240; i++) stars.push({ a: Math.random() * 6.283, u: Math.random(), d: .35 + Math.random() * .65, b: .35 + Math.random() * .65, h: Math.random() < .25 ? 200 + Math.random() * 60 : 45 });
  }
  function drawStars(dphase) {
    var rmin = 8, rmax = Math.hypot(W, H) * .55, k = Math.log(rmax / rmin), moving = Math.abs(dphase) > 1e-5;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], f = (s.u + phase * s.d * .6) % 1; if (f < 0) f += 1;
      var rr = rmin * Math.exp(k * f), x = C.x + Math.cos(s.a) * rr, y = C.y + Math.sin(s.a) * rr;
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      var al = Math.sin(Math.PI * f) * s.b, size = .5 + 1.6 * f * s.d;
      ctx.fillStyle = 'hsla(' + s.h + ',70%,85%,' + al.toFixed(3) + ')';
      if (moving) {                                   // streak along the direction of travel
        var len = Math.min(26, Math.abs(dphase) * 380 * s.d * (.3 + f)), sg = dphase > 0 ? -1 : 1;
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = size;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(s.a) * len * sg, y + Math.sin(s.a) * len * sg); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, y, size, 0, 7); ctx.fill(); }
    }
  }

  /* ---------- drawing ---------- */
  function draw(ts) {
    if (failed || !cv || !W) return;
    var now = ts || performance.now(), dt = last ? Math.min(.05, (now - last) / 1000) : .016;
    last = now;
    var needFrame = false;
    ctx.reset();
    ctx.scale(dpr, dpr);

    // background + stars
    var bg = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, Math.max(W, H) * .7);
    bg.addColorStop(0, '#12203f'); bg.addColorStop(1, '#070d1c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var depthF = trans ? depthOf[trans.p] + (depthOf[trans.c] - depthOf[trans.p]) * trans.t : depthOf[cur];
    prevPhase = phase; phase = depthF * 1.1;
    if (starsBox.checked) { drawStars(reduced ? 0 : phase - prevPhase); needFrame = needFrame || Math.abs(phase - prevPhase) > 1e-5; }

    hits = []; uiHits = [];
    var cam = camera(), rest = !trans;
    if (!rest) needFrame = true;
    cam.list.forEach(function (L) {
      var layer = layers[L.id]; if (!layer) return;
      var useBlur = dofBox.checked && !reduced && L.blur > .3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, L.alpha));
      if (useBlur) ctx.filter = 'blur(' + (L.blur * dpr).toFixed(1) + 'px)';
      if (layer.bd) ctx.drawElementImage(layer.bd, L.tx + L.z * (C.x - R), L.ty + L.z * (C.y - R), 2 * R * L.z, 2 * R * L.z);
      layer.nodes.forEach(function (n) {
        var sx = L.tx + L.z * n.item.x, sy = L.ty + L.z * n.item.y, sr = L.z * n.item.r;
        if (sr < 1.5 || sx + sr < -50 || sy + sr < -50 || sx - sr > W + 50 || sy - sr > H + 50) return;
        var h = hue(n.id), isFocus = (focusId === n.id || selected === n.id) && rest, isPulse = pulse && pulse.id === n.id && rest;
        // ambient glow (additive), stronger on the focused circle
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        var gr = ctx.createRadialGradient(sx, sy, sr * .6, sx, sy, sr * (isFocus ? 1.7 : 1.35));
        gr.addColorStop(0, 'hsla(' + h + ',80%,60%,' + (isFocus ? .42 : .12) + ')'); gr.addColorStop(1, 'hsla(' + h + ',80%,60%,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, sr * (isFocus ? 1.7 : 1.35), 0, 7); ctx.fill();
        ctx.restore();
        ctx.save();
        if (L.focusChild === n.id) ctx.globalAlpha *= Math.max(0, L.fade);
        ctx.drawElementImage(n.el, sx - sr, sy - sr, 2 * sr, 2 * sr);
        ctx.restore();
        if (n.item.r < 50 && L.alpha > .05) {     // small circles keep their label underneath, outside the element's box: draw it as canvas text
          var nd = byId[n.id];
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, L.alpha)) * (L.focusChild === n.id ? Math.max(0, L.fade) : 1);
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillStyle = nd.discreet ? '#aab5cc' : '#e6ebf5';
          ctx.font = (nd.discreet ? '400 12px' : '600 13px') + ' -apple-system, "Segoe UI", sans-serif';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
          ctx.fillText(nd.title, sx, sy + sr + 5);
          if (nd.caption) { ctx.font = '11px -apple-system, "Segoe UI", sans-serif'; ctx.fillStyle = '#8d9bb8'; ctx.fillText(nd.caption, sx, sy + sr + 21); }
          ctx.restore();
        }
        if (isFocus && !reduced) {      // breathing ring around the circle under the pointer
          var k = (Math.sin(now / 260) + 1) / 2;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'hsla(' + h + ',90%,70%,' + (.25 + .35 * k).toFixed(2) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, sr + 4 + 4 * k, 0, 7); ctx.stroke(); ctx.restore();
          needFrame = true;
        }
        if (isPulse) {
          var age = (now - pulse.t0) / 1000;
          if (age > 1.6) pulse = null;
          else {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'hsla(' + h + ',90%,75%,' + (1 - age / 1.6).toFixed(2) + ')'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(sx, sy, sr + age * sr * .9, 0, 7); ctx.stroke(); ctx.restore();
            needFrame = true;
          }
        }
        if (rest) hits.push({ id: n.id, x: sx, y: sy, r: sr });
      });
      ctx.restore();
    });

    if (rest) {
      drawArcs(now); if (chips.length || focusId) needFrame = true;
      drawCenter();
    }
    drawRuler(depthF);

    // vignette: fog toward the edges
    var vg = ctx.createRadialGradient(C.x, C.y, Math.min(W, H) * .35, C.x, C.y, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(4,8,18,0)'); vg.addColorStop(1, 'rgba(4,8,18,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // leaving a circle: keep its links for a moment so the pointer can reach a chip
    if (!mouseOverChip() && !hoverId && focusId && leaveT && now - leaveT > 380) { focusId = null; leaveT = 0; chips = []; panelFor(); }
    if (needFrame && !document.hidden) cv.requestPaint();
  }

  // cross-links of the focused circle: arcs to other circles of this level, or to chips for links that leave it
  function drawArcs(now) {
    chips = [];
    if (!focusId) return;
    var me = hits.filter(function (h) { return h.id === focusId; })[0]; if (!me) return;
    var links = D.links.filter(function (l) { return l.a === focusId || l.b === focusId; });
    var cy = 54, hh = hue(focusId);
    links.forEach(function (l, i) {
      var other = l.a === focusId ? l.b : l.a;
      var tgtChild = Core.childOfAncestor(other, cur);
      var tgt = tgtChild && tgtChild !== focusId ? hits.filter(function (h) { return h.id === tgtChild; })[0] : null;
      var tx, ty, label = l.label || '';
      if (!tgt) {                         // the other end lives elsewhere: a chip on the right edge, clickable
        var title = byId[other].title + (Core.titleCount[byId[other].title] > 1 && parent[other] ? ' (' + byId[parent[other]].title + ')' : '');
        ctx.font = '600 12px -apple-system, "Segoe UI", sans-serif';
        var w = Math.min(230, ctx.measureText('↔ ' + title).width + 22), x = W - w - 14, y = cy + i * 34;
        chips.push({ x: x, y: y, w: w, h: 26, other: other, title: title, label: label });
        tx = x; ty = y + 13;
      } else { tx = tgt.x; ty = tgt.y; }
      var mx = (me.x + tx) / 2, my = (me.y + ty) / 2, bx = mx + (C.x - mx) * .35, by = my + (C.y - my) * .35;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = 'hsl(' + hh + ',90%,60%)'; ctx.shadowBlur = 14;
      ctx.strokeStyle = 'hsla(' + hh + ',90%,70%,.85)'; ctx.lineWidth = 2;
      ctx.setLineDash([7, 9]); ctx.lineDashOffset = -now / 28;
      ctx.beginPath(); ctx.moveTo(me.x, me.y); ctx.quadraticCurveTo(bx, by, tx, ty); ctx.stroke();
      ctx.restore();
    });
    chips.forEach(function (c) {      // drawn after the arcs so the text stays crisp
      ctx.save();
      ctx.fillStyle = 'rgba(11,18,32,.92)'; ctx.strokeStyle = 'hsl(' + hh + ',70%,62%)'; ctx.lineWidth = 1.2;
      roundRect(c.x, c.y, c.w, c.h, 13); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6ebf5'; ctx.font = '600 12px -apple-system, "Segoe UI", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(fit('↔ ' + c.title, c.w - 20), c.x + 10, c.y + c.h / 2 + .5);
      ctx.restore();
    });
  }
  function fit(text, maxW) { if (ctx.measureText(text).width <= maxW) return text; while (text.length > 2 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1); return text + '…'; }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mouseOverChip() { return !!(mouse && chips.some(function (c) { return mouse.x >= c.x && mouse.x <= c.x + c.w && mouse.y >= c.y && mouse.y <= c.y + c.h; })); }

  // title of the level in the hole of the ring, and the way up (both drawn on the canvas, both clickable)
  function drawCenter() {
    var N = Core.layoutOf(cur).length;
    if (N < 2 || N > 8) { if (parent[cur]) drawUp(C.x, H - 22, true); return; }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13px -apple-system, "Segoe UI", sans-serif';
    var words = byId[cur].title.split(' '), lines = [], ln = '';
    words.forEach(function (w) { if (ctx.measureText(ln + ' ' + w).width > 112 && ln) { lines.push(ln); ln = w; } else ln = ln ? ln + ' ' + w : w; });
    lines.push(ln);
    var hh = lines.length * 17, y0 = C.y - hh / 2 - 8;
    var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, ctx.measureText(l).width); });
    uiHits.push({ kind: 'level', x: C.x - tw / 2 - 8, y: y0 - 8, w: tw + 16, h: hh + 16 });
    ctx.fillStyle = '#e6ebf5';
    lines.forEach(function (l, i) { ctx.fillText(l, C.x, y0 + 8 + i * 17); });
    ctx.restore();
    if (parent[cur]) drawUp(C.x, y0 + hh + 26, false);
  }
  function drawUp(cx, cy, bottom) {
    ctx.save();
    ctx.font = '11px -apple-system, "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var label = '⤴ ' + byId[parent[cur]].title, w = Math.min(150, ctx.measureText(label).width + 22), x = cx - w / 2, y = cy - 11;
    var over = mouse && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + 22;
    ctx.fillStyle = over ? 'rgba(56,189,248,.18)' : 'rgba(11,18,32,.6)'; ctx.strokeStyle = over ? '#38bdf8' : '#26334f'; ctx.lineWidth = 1;
    roundRect(x, y, w, 22, 11); ctx.fill(); ctx.stroke();
    ctx.fillStyle = over ? '#38bdf8' : '#8d9bb8'; ctx.fillText(fit(label, w - 14), cx, cy + .5);
    ctx.restore();
    uiHits.push({ kind: 'up', x: x, y: y, w: w, h: 22 });
  }

  // depth ruler on the left: clickable levels, like the HTML version
  function drawRuler(depthF) {
    if (W <= 700) return;
    var x0 = 14, y0 = 28, y1 = H - 28, path = pathTo(cur);
    ctx.save();
    ctx.strokeStyle = '#26334f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.font = '11px -apple-system, "Segoe UI", sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (var d = 0; d <= maxDepth; d++) {
      var y = y0 + (y1 - y0) * d / maxDepth, id = path[d];
      ctx.fillStyle = '#26334f'; ctx.fillRect(x0, y - 1, 10, 2);
      if (id) {
        ctx.fillStyle = id === cur ? '#38bdf8' : '#c5cee0';
        ctx.fillText(fit(byId[id].title, RULER_W - 36), x0 + 16, y);
        uiHits.push({ kind: 'go', id: id, x: x0, y: y - 10, w: RULER_W - 18, h: 20 });
      }
    }
    var my = y0 + (y1 - y0) * depthF / maxDepth;
    ctx.fillStyle = '#38bdf8'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x0, my, 6, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- navigation: same state machine as atlas.js ---------- */
  function finish() {
    if (!trans) return;
    cur = trans.t >= .5 ? trans.c : trans.p;
    trans = null; selected = null; focusId = null; chips = [];
    if (backTo && cur === backTo.id) backTo = null;
    setLayers([cur]); updateUI(); cv.requestPaint();
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
        cv.requestPaint();
        if (k < 1) raf = requestAnimationFrame(step);
        else { animating = false; finish(); resolve(); }
      });
    });
  }
  function begin(p, c, t) { trans = { p: p, c: c, t: t }; setLayers([p, c]); }
  function zoomIn(id, dur) { if (!hasKids(id)) return Promise.resolve(); begin(cur, id, 0); return animateTo(1, dur == null ? 620 : dur); }
  function zoomOut(dur) { if (!parent[cur]) return Promise.resolve(); begin(parent[cur], cur, 1); return animateTo(0, dur == null ? 560 : dur); }
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
  function jumpToLink(other) {       // the level that shows `other`, then a pulse on it
    var dest = hasKids(other) ? parent[other] || other : parent[other];
    var arrive = function () { pulse = { id: other, t0: performance.now() }; cv.requestPaint(); };
    if (dest === cur) { arrive(); return; }
    backTo = { id: cur, title: byId[cur].title };
    goTo(dest, arrive);
  }
  function nodeAt(p) {
    var best = null;
    hits.forEach(function (h) { var d = Math.hypot(h.x - p.x, h.y - p.y); if (d <= h.r && (!best || d < best.d)) best = { h: h, d: d }; });
    return best && best.h;
  }
  function uiAt(p) { for (var i = 0; i < uiHits.length; i++) { var u = uiHits[i]; if (p.x >= u.x && p.x <= u.x + u.w && p.y >= u.y && p.y <= u.y + u.h) return u; } return null; }
  function chipAt(p) { for (var i = 0; i < chips.length; i++) { var c = chips[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; } return null; }

  /* ---------- side panel and breadcrumb (plain DOM, outside the canvas) ---------- */
  function updateUI() {
    crumbsEl.textContent = '';
    var path = pathTo(cur), KEEP = 5, first = Math.max(0, path.length - KEEP);
    if (first > 0) {
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
    panelFor();
  }
  var shownPanel = null;
  function panelFor() {
    var id = focusId || selected || cur;
    var key = id + '|' + (focusId ? 'f' : selected ? 's' : 'l') + '|' + (backTo ? backTo.id : '');
    if (key === shownPanel) return;
    shownPanel = key;
    var node = byId[id];
    panelEl.textContent = '';
    if (backTo) {
      var back = el('button', 'at-back', '↩ Back to ' + backTo.title);
      back.addEventListener('click', function () { var to = backTo.id; backTo = null; shownPanel = null; if (to !== cur && !busy && !animating && !trans) goTo(to); else panelFor(); });
      panelEl.appendChild(back);
    }
    panelEl.appendChild(el('h3', null, focusId || selected ? 'Topic' : 'This level'));
    panelEl.appendChild(el('h2', null, node.title));
    var credit = (id === cur && !focusId && !selected && node.levelCredit) ? node.levelCredit : node.credit;
    if (credit) panelEl.appendChild(el('div', 'at-credit', 'Image: ' + credit));
    if (node.images && node.images.length) panelEl.appendChild(Core.gallery(node));
    var rel = D.links.filter(function (l) { return l.a === id || l.b === id; });
    if (rel.length) {
      panelEl.appendChild(el('h3', null, 'Linked elsewhere'));
      rel.forEach(function (l) {
        var out = l.a === id ? l.b : l.a;
        var row = el('div', 'at-link');
        row.appendChild(el('span', null, '↔ ' + byId[out].title + (Core.titleCount[byId[out].title] > 1 && parent[out] ? ' (' + byId[parent[out]].title + ')' : '')));
        if (l.label) row.appendChild(el('em', null, l.label));
        var go = el('button', 'link-btn', 'Go ›'); go.addEventListener('click', function () { jumpToLink(out); }); row.appendChild(go);
        panelEl.appendChild(row);
      });
    }
  }

  /* ---------- input ---------- */
  function local(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function setupInput() {
    cv.addEventListener('pointermove', function (e) {
      mouse = local(e);
      if (trans || busy) { cv.requestPaint(); return; }
      var n = nodeAt(mouse), ui = uiAt(mouse), chip = chipAt(mouse);
      hoverId = n ? n.id : null;
      if (n) { if (focusId !== n.id) { focusId = n.id; panelFor(); } leaveT = 0; }
      else if (focusId && !chip && !leaveT) leaveT = performance.now();
      cv.style.cursor = (n && (hasKids(n.id) || true)) || ui || chip ? 'pointer' : '';
      cv.requestPaint();
    });
    cv.addEventListener('pointerleave', function () { mouse = null; hoverId = null; if (focusId) leaveT = performance.now(); cv.requestPaint(); });
    cv.addEventListener('click', function (e) {
      if (trans || busy || animating) return;
      var p = local(e), chip = chipAt(p);
      if (chip) { jumpToLink(chip.other); return; }
      var ui = uiAt(p);
      if (ui) {
        if (ui.kind === 'up') zoomOut();
        else if (ui.kind === 'go') { if (ui.id !== cur) goTo(ui.id); }
        else if (ui.kind === 'level') { selected = null; focusId = null; shownPanel = null; panelFor(); pulse = null; }
        return;
      }
      var n = nodeAt(p);
      if (n) { if (hasKids(n.id)) zoomIn(n.id); else { selected = n.id; shownPanel = null; panelFor(); pulse = { id: n.id, t0: performance.now() }; cv.requestPaint(); } }
      else if (selected) { selected = null; shownPanel = null; panelFor(); cv.requestPaint(); }
    });
    // wheel / pinch: scrub the zoom, then settle on the nearest level
    cv.addEventListener('wheel', function (e) {
      if (busy || animating) { e.preventDefault(); return; }
      var dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * (e.ctrlKey ? 3 : 1);
      if (!trans) {
        if (dy < 0) {
          var n = nodeAt(local(e)) || nearestWithKids(local(e));
          if (!n || !hasKids(n.id)) return;
          begin(cur, n.id, 0);
        } else if (dy > 0 && parent[cur]) begin(parent[cur], cur, 1);
        else return;
      }
      e.preventDefault();
      clearTimeout(settleTimer);
      trans.t = Math.min(1, Math.max(0, trans.t - dy * .0028));
      if (trans.t <= 0 || trans.t >= 1) { finish(); return; }
      cv.requestPaint();
      settleTimer = setTimeout(function () { if (trans) animateTo(trans.t >= .5 ? 1 : 0, 260); }, 150);
    }, { passive: false });
    function nearestWithKids(p) {
      var best = null, bd = R * .25;
      hits.forEach(function (h) { var d = Math.hypot(h.x - p.x, h.y - p.y) - h.r; if (hasKids(h.id) && d < bd) { bd = d; best = h; } });
      return best;
    }
    document.addEventListener('keydown', function (e) {
      if (location.hash !== '#atlas-canvas' || !started || Core.lightboxOpen()) return;
      if (busy || animating) return;
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); zoomOut(); }
    });
    outBtn.addEventListener('click', function () { if (!busy && !animating) zoomOut(); });
  }

  /* ---------- lifecycle ---------- */
  function resize() {
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    measure();
    clearLayers();
    setLayers(trans ? [trans.p, trans.c] : [cur]);
    cv.requestPaint();
  }
  function start() {
    started = true;
    cv = document.createElement('canvas');
    cv.setAttribute('layoutsubtree', ''); cv.setAttribute('content', 'drawable');
    cv.tabIndex = 0;
    cv.setAttribute('aria-label', 'Zoomable map of topics, drawn on a canvas. Click a circle to zoom in, Escape to zoom out.');
    ctx = cv.getContext('2d');
    stageEl.appendChild(cv);
    cv.addEventListener('paint', function () { try { draw(performance.now()); } catch (err) { failed = true; showFallback(err && err.message || err); } });
    makeStars(); setupInput();
    [starsBox, dofBox].forEach(function (b) { b.addEventListener('change', function () { cv.requestPaint(); }); });
    new ResizeObserver(resize).observe(cv);
    resize();
    if (!introDone) {
      introDone = true;
      if (INTRO && !reduced) {      // start at the top of the universe and fly in to "(me)"
        cur = D.root.id; setLayers([cur]); updateUI();
        setTimeout(function () { goTo(START, null, 750); }, 500);
      } else { cur = START; setLayers([cur]); updateUI(); }
    }
  }
  function showFallback(err) {
    mainEl.hidden = true; fallbackEl.hidden = false;
    H2C.renderFallback(fallbackEl, err, '#atlas', 'regular Atlas');
  }
  function show() {
    if (failed) return;
    if (!H2C.hasApi()) { showFallback(); return; }
    fallbackEl.hidden = true; mainEl.hidden = false;
    if (!started) { try { start(); } catch (err) { failed = true; showFallback(err && err.message || err); } }
    else cv.requestPaint();
  }
  window.addEventListener('viewchange', function (e) { if (e.detail === 'atlas-canvas') show(); });
  if (location.hash === '#atlas-canvas') show();
})();
