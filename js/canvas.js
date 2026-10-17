// Experimental timeline built on the HTML-in-Canvas proposal (WICG/html-in-canvas):
// real DOM cards are children of a <canvas layoutsubtree>, laid out by the browser,
// then painted into the canvas with ctx.drawElementImage() under custom transforms.
(function () {
  var A = window.App, JOBS = window.JOBS;
  var fallbackEl = document.getElementById('cv-fallback');
  var stage = document.getElementById('cv-stage');
  var note = document.getElementById('cv-note');

  var FLAG_URL = 'chrome://flags/#canvas-draw-element';
  var CARD_W = 160, CARD_H = 100;
  var PAD = 20, MAG = 1.3, SIGMA = 1.1, DOCK_H = 215;
  var OPEN_S = .8, CLOSE_S = .55, GENIE_STRIPS = 140, GENIE_LAG = .2;

  var LABELS = {
    'qlik-design': ['Qlik', 'Product Designer', 140], 'qlik-swe': ['Qlik', 'Principal Engineer', 140],
    'talend': ['Talend', 'Principal Engineer', 5], 'restlet': ['Restlet', 'Full-Stack Engineer', 210],
    'netco': ['netco', 'Front-End Developer', 30], 'adeo': ['adeo', 'Full-Stack Engineer', 30],
    'storeforce': ['storeforce', 'Developer', 30], 'altavia': ['Altavia', 'Senior Engineer', 185],
    'elca': ['ELCA', 'Full-Stack Developer', 255], 'sopra': ['Sopra', 'J2EE Engineer', 330],
    '3m': ['3M', 'Marketing Intern', 355], 'ctu': ['CTU', 'Development Intern', 220],
    'edu-master': ['Master', 'International Trade', 285], 'edu-poly': ['Polytech', 'Engineer\'s degree', 285],
    'edu-prepa': ['Prépa', 'MP/MPSI', 285]
  };

  var started = false, failed = false;
  var cv, ctx, items, detailEl, bodyEl, W, H, dpr = 1, slot, rest0;
  var mouse = null;           // {x, y} in canvas CSS px, or null
  var sel = -1, morphIdx = -1, morphT = 0, morphTarget = 0;
  var shiftCur = 0, mxCur = 0, last = 0;
  var fx = { refl: true, trails: true, glitch: true };             // effects only possible because the cards are pixels on a canvas
  var TRAIL = .55, REFL_H = 46, REFL_A = .3;
  var rgbSrc, rgbCh, glitchAt = 0;                   // RGB split of the expanded panel: scratch canvases, start time
  var trailOk = false, trailCv, trailCtx, reflCv, reflCtx;            // previous frame (dock area) and a mirrored strip
  var snap, snapCtx, snapDirty = true;   // bitmap copy of the detail panel, so genie strips are cheap drawImage calls
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- support detection + fallback ---------- */
  function hasApi() {
    return typeof CanvasRenderingContext2D !== 'undefined' &&
      typeof CanvasRenderingContext2D.prototype.drawElementImage === 'function' &&
      'requestPaint' in HTMLCanvasElement.prototype;
  }

  function browser() {
    var ua = navigator.userAgent, m;
    if (/Firefox\//.test(ua)) return { name: 'Firefox', chromium: false };
    if (/Chrom(e|ium)\//.test(ua)) {
      m = ua.match(/Chrom(?:e|ium)\/(\d+)/);
      var brand = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : 'Chrome';
      return { name: brand, chromium: true, version: m ? +m[1] : 0 };
    }
    if (/Safari\//.test(ua)) return { name: 'Safari', chromium: false };
    return { name: 'this browser', chromium: false };
  }

  function renderFallback(fallbackEl, err, altHref, altLabel) {
    fallbackEl.textContent = '';
    var b = browser();
    fallbackEl.appendChild(el('h2', null, 'This view needs HTML-in-Canvas'));

    if (err) {
      fallbackEl.appendChild(el('p', null, 'The API is present in ' + b.name + ' but failed while drawing:'));
      fallbackEl.appendChild(el('p', 'cv-err', String(err)));
      fallbackEl.appendChild(el('p', null, 'The proposal is still changing between Chrome versions, so this may need an update on my side.'));
    } else if (!b.chromium) {
      fallbackEl.appendChild(el('p', null,
        b.name + ' does not implement HTML-in-Canvas (it is a WICG proposal, so far only prototyped in Chromium). ' +
        'Open this page in Chrome, Edge or Brave to see it.'));
    } else {
      fallbackEl.appendChild(el('p', null,
        b.name + ' ' + (b.version || '') + ' is Chromium-based, but the feature is switched off. To enable it:'));
      var ol = el('ol');
      var li1 = el('li'); li1.appendChild(document.createTextNode('Use Chrome 147 or newer (Canary works too) — you have ' + (b.version || 'an unknown version') + '.'));
      var li2 = el('li'); li2.appendChild(document.createTextNode('Open '));
      li2.appendChild(el('code', null, FLAG_URL));
      var cp = el('button', null, 'Copy');
      cp.addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(FLAG_URL).then(function () { cp.textContent = 'Copied'; });
      });
      li2.appendChild(cp);
      li2.appendChild(document.createTextNode(' in a new tab (browsers block links to chrome:// pages).'));
      var li3 = el('li', null, 'Set “Enable the new drawElement API for Canvas” to Enabled.');
      var li4 = el('li', null, 'Click Relaunch, then come back to this page and re-open this tab.');
      [li1, li2, li3, li4].forEach(function (l) { ol.appendChild(l); });
      fallbackEl.appendChild(ol);
    }
    var p = el('p');
    p.appendChild(document.createTextNode('Meanwhile: '));
    var a = el('a', null, altLabel || 'regular timeline'); a.href = altHref || '#timeline';
    p.appendChild(a);
    p.appendChild(document.createTextNode(' · '));
    var spec = el('a', null, 'about the proposal'); spec.href = 'https://github.com/WICG/html-in-canvas'; spec.target = '_blank'; spec.rel = 'noopener';
    p.appendChild(spec);
    fallbackEl.appendChild(p);
  }
  function showFallback(err) {
    stage.hidden = true;
    note.textContent = '';
    fallbackEl.hidden = false;
    renderFallback(fallbackEl, err);
  }


  /* ---------- build ---------- */
  function yearsLabel(j) {
    return j.start[0] + ' – ' + (j.end ? String(j.end[0]).slice(-2) : 'now');
  }

  function buildDetail(j, hue) {
    detailEl.textContent = '';
    detailEl.style.setProperty('--h', hue);
    var close = el('button', 'cv-close', 'Close ✕');
    close.addEventListener('click', function () { select(-1); });
    detailEl.appendChild(close);
    // scrollable body: the Close button stays put while the content scrolls (wheel / Up / Down / PageUp / PageDown)
    var body = bodyEl = el('div', 'cv-body');
    detailEl.appendChild(body);
    body.appendChild(el('h2', null, j.role));
    body.appendChild(el('div', 'tl-org', j.org));
    body.appendChild(el('div', 'tl-when', A.fmt(j.start) + ' – ' + A.fmt(j.end) + ' · ' + A.duration(j)));
    body.appendChild(el('div', 'tl-place', j.place));
    if (j.blurb) body.appendChild(el('p', 'tl-blurb', j.blurb));
    if (j.points.length) {
      var ul = el('ul', 'tl-points');
      j.points.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      body.appendChild(ul);
    }
    if (j.tech.length) {
      var tt = el('div', 'tl-tech');
      j.tech.forEach(function (t) { tt.appendChild(A.techChip(t)); });
      body.appendChild(tt);
    }
  }

  // Scroll the panel body; returns true if it actually moved (so the page can scroll when it can't).
  function scrollBody(dy) {
    if (!bodyEl || !detailEl.classList.contains('live')) return false;
    var before = bodyEl.scrollTop;
    bodyEl.scrollTop = before + dy;
    var moved = bodyEl.scrollTop !== before;
    if (moved) cv.requestPaint();   // scrolling is a rendering change of the element: redraw
    return moved;
  }

  function start() {
    started = true;
    cv = document.createElement('canvas');
    cv.setAttribute('layoutsubtree', '');          // current Chromium spelling
    cv.setAttribute('content', 'drawable');        // spelling in the newest spec draft; harmless if unknown
    cv.tabIndex = 0;
    cv.setAttribute('aria-label', 'Career timeline. Use left and right arrows to browse, Enter to expand, Escape to close.');
    ctx = cv.getContext('2d');

    var sorted = JOBS.slice().sort(function (a, b) { return A.mIdx(a.start) - A.mIdx(b.start); });
    items = sorted.map(function (j) {
      var lab = LABELS[j.id] || [j.org, j.role, 200];
      var c = el('div', 'cv-card ' + j.kind);
      c.style.setProperty('--h', lab[2]);
      c.setAttribute('drawable', '');
      c.appendChild(el('span', 'o', lab[0]));
      c.appendChild(el('span', 's', lab[1]));
      c.appendChild(el('span', 'y', yearsLabel(j)));
      cv.appendChild(c);
      return { job: j, hue: lab[2], el: c, f: 1, rc: 0, rect: null };
    });
    detailEl = el('div', 'cv-detail');
    detailEl.setAttribute('drawable', '');
    cv.appendChild(detailEl);

    stage.appendChild(buildTools());
    stage.appendChild(cv);
    cv.addEventListener('paint', paint);
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      cv.style.cursor = hit(mouse) >= 0 || detailButtonAt(e.clientX, e.clientY) ? 'pointer' : '';
      cv.requestPaint();
    });
    cv.addEventListener('pointerleave', function () { mouse = null; cv.style.cursor = ''; cv.requestPaint(); });
    cv.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.cv-detail')) return;
      // Chromium (155, flag) reports the <canvas> itself as the hit target even over drawn children,
      // so route clicks to the detail panel's buttons by their (transform-synced) layout rects.
      var btn = detailButtonAt(e.clientX, e.clientY);
      if (btn) { btn.click(); return; }
      var r = cv.getBoundingClientRect();
      var i = hit({ x: e.clientX - r.left, y: e.clientY - r.top });
      if (i < 0 && detailEl.classList.contains('live') && inRect(e.clientX, e.clientY, detailEl.getBoundingClientRect())) return;
      select(i >= 0 && i !== sel ? i : -1);
    });
    cv.addEventListener('wheel', function (e) {
      if (!detailEl.classList.contains('live') || !inRect(e.clientX, e.clientY, detailEl.getBoundingClientRect())) return;
      var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * bodyEl.clientHeight : e.deltaY;
      if (scrollBody(dy)) e.preventDefault();
    }, { passive: false });
    cv.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') select(-1);
      else if (e.key === 'ArrowRight') select(Math.min(items.length - 1, sel + 1));
      else if (e.key === 'ArrowLeft') select(sel < 0 ? items.length - 1 : Math.max(0, sel - 1));
      else if (e.key === 'Enter' && sel < 0) select(items.length - 1);
      else if (e.key === 'ArrowDown' || e.key === 'PageDown') { if (!scrollBody(e.key === 'PageDown' ? bodyEl.clientHeight * .9 : 48)) return; }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { if (!scrollBody(e.key === 'PageUp' ? -bodyEl.clientHeight * .9 : -48)) return; }
      else return;
      e.preventDefault();
    });
    new ResizeObserver(resize).observe(cv);
    note.textContent = 'Experimental: every card is a live DOM element drawn into a <canvas> with drawElementImage(). ' +
      'Hover the dock, click a card to expand it, ←/→ to browse, Esc to close. Reflection and motion trails are pixel effects applied to the HTML cards.';
    resize();
  }

  /* ---------- toolbar: export + effects ---------- */
  function buildTools() {
    var bar = el('div', 'cv-tools');
    var save = el('button', 'cv-save', '⬇ Save as image');
    save.title = 'Download what you see as a PNG: real HTML rendered by the browser, no screenshot library';
    save.addEventListener('click', saveImage);
    bar.appendChild(save);
    [['refl', 'Reflection'], ['trails', 'Motion trails'], ['glitch', 'Glitch on open']].forEach(function (d) {
      var lab = el('label', 'cv-fx'), cb = el('input');
      cb.type = 'checkbox'; cb.checked = fx[d[0]];
      cb.addEventListener('change', function () { fx[d[0]] = cb.checked; if (cv) cv.requestPaint(); });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + d[1]));
      bar.appendChild(lab);
    });
    return bar;
  }

  // The canvas holds the HTML cards as pixels, so exporting is one call: no html2canvas, no re-implemented CSS.
  function saveImage() {
    try {
      var out = document.createElement('canvas');
      out.width = cv.width; out.height = cv.height;
      var o = out.getContext('2d');
      o.drawImage(cv, 0, 0);
      o.scale(dpr, dpr);
      o.font = '12px -apple-system, "Segoe UI", sans-serif'; o.textAlign = 'left'; o.textBaseline = 'bottom';
      o.fillStyle = 'rgba(141,155,184,.9)';
      o.fillText('Pascal Guilcher · pgu.github.io', 12, H - 8);
      out.toBlob(function (blob) {
        if (!blob) { note.textContent = 'Could not export the image in this browser.'; return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pascal-guilcher-timeline' + (sel >= 0 ? '-' + items[sel].job.id : '') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    } catch (err) {
      note.textContent = 'Export failed: ' + (err && err.message || err);
    }
  }

  function resize() {
    var r = cv.getBoundingClientRect();
    if (!r.width) return;
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var avail = W - 2 * PAD;
    slot = avail / (items.length + 2.6);   // spare room for the dock to widen under the cursor
    rest0 = PAD + (avail - items.length * slot) / 2;
    items.forEach(function (it, i) { it.rc = rest0 + (i + .5) * slot; });
    snap = snap || document.createElement('canvas');
    snap.width = Math.round((W - 2 * PAD) * dpr); snap.height = Math.round((H - PAD - DOCK_H) * dpr);
    snapCtx = snap.getContext('2d'); snapDirty = true;
    trailCv = trailCv || document.createElement('canvas'); reflCv = reflCv || document.createElement('canvas');
    trailCv.width = cv.width; trailCv.height = Math.round((DOCK_H + 10) * dpr); trailCtx = trailCv.getContext('2d');
    reflCv.width = cv.width; reflCv.height = Math.round(REFL_H * dpr); reflCtx = reflCv.getContext('2d');
    trailOk = false;
    detailEl.style.width = (W - 2 * PAD) + 'px';
    detailEl.style.height = (H - PAD - DOCK_H) + 'px';
    cv.requestPaint();
  }

  function select(i) {
    sel = i;
    if (i >= 0) {
      morphIdx = i; morphT = reduced ? 1 : 0; morphTarget = 1; glitchAt = 0;
      buildDetail(items[i].job, items[i].hue);
      snapDirty = true;
    } else morphTarget = 0;
    cv.requestPaint();
  }

  function inRect(x, y, r) { return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }

  function detailButtonAt(x, y) {
    if (!detailEl || !detailEl.classList.contains('live')) return null;
    var bs = detailEl.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) if (inRect(x, y, bs[i].getBoundingClientRect())) return bs[i];
    return null;
  }

  function hit(p) {
    for (var i = items.length - 1; i >= 0; i--) {
      var r = items[i].rect;
      if (r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
    }
    return -1;
  }

  /* ---------- paint ---------- */
  function smooth(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // macOS-style genie: slice the panel bitmap (snap) into horizontal strips.
  // Strip s (0 = top .. 1 = bottom) starts moving after a delay proportional to s, so the top
  // leaves the icon first and the bottom stays pinched to it, giving the funnel / S-curve.
  function genie(p, icon, dest) {
    var N = GENIE_STRIPS;
    function U(sv) { return easeInOut(Math.min(1, Math.max(0, p * (1 + GENIE_LAG) - GENIE_LAG * sv))); }
    function Y(sv) { return lerp(icon.top + sv * icon.h, dest.y + sv * dest.h, U(sv)); }
    for (var k = 0; k < N; k++) {
      var s0 = k / N, s1 = (k + 1) / N, sm = (s0 + s1) / 2;
      var u = U(sm), wf = u * u * (3 - 2 * u);
      var w = lerp(icon.w, dest.w, wf), cxs = lerp(icon.cx, dest.x + dest.w / 2, wf);
      var y0 = Y(s0), y1 = Y(s1);
      var sh = snap.height / N;
      ctx.drawImage(snap, 0, k * sh, snap.width, sh, cxs - w / 2, y0, w, Math.max(.5, y1 - y0) + .75);
    }
  }

  // Chromatic aberration + short glitch, played once on the panel when the genie lands.
  // The panel is already pixels on the canvas, so: copy its rectangle, then rebuild it as three colour channels
  // (multiply by pure red / green / blue), drawn with additive blending at slightly different offsets.
  // At offset 0 the sum is exactly the original panel; the effect ends there, so the text is left untouched.
  var CH = [['#f00', -1], ['#0f0', 0], ['#00f', 1]];
  function rgbSplit(rx, ry, dw, dh, amp, glitch) {
    var m = 24, x0 = Math.max(0, Math.floor(rx - m)), y0 = Math.max(0, Math.floor(ry - m));
    var x1 = Math.min(W, Math.ceil(rx + dw + m)), y1 = Math.min(H, Math.ceil(ry + dh + m));
    var sx = Math.round(x0 * dpr), sy = Math.round(y0 * dpr), sw = Math.round((x1 - x0) * dpr), sh = Math.round((y1 - y0) * dpr);
    if (sw < 4 || sh < 4) return;
    rgbSrc = rgbSrc || document.createElement('canvas'); rgbCh = rgbCh || document.createElement('canvas');
    if (rgbSrc.width !== sw || rgbSrc.height !== sh) { rgbSrc.width = rgbCh.width = sw; rgbSrc.height = rgbCh.height = sh; }
    var sc = rgbSrc.getContext('2d'), cc = rgbCh.getContext('2d');
    sc.clearRect(0, 0, sw, sh); sc.drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);

    // glitch: horizontal bands shifted sideways for a few frames
    var bands = glitch ? 9 : 1, bh = Math.ceil(sh / bands), shift = [];
    for (var b = 0; b < bands; b++) shift.push(glitch ? Math.round((Math.random() - .5) * 2 * 12 * dpr * glitch) : 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // only the inner part is rewritten: the copied margin is wider than any shift, so every channel still has pixels
    // to shift in at the edges (otherwise a one-pixel coloured line shows along the border of the copied area)
    var inset = Math.round(16 * dpr);
    ctx.beginPath(); ctx.rect(sx + inset, sy + inset, sw - 2 * inset, sh - 2 * inset); ctx.clip();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, sw, sh);
    ctx.globalCompositeOperation = 'lighter';
    CH.forEach(function (c) {
      cc.globalCompositeOperation = 'source-over';
      cc.clearRect(0, 0, sw, sh); cc.drawImage(rgbSrc, 0, 0);
      cc.globalCompositeOperation = 'multiply'; cc.fillStyle = c[0]; cc.fillRect(0, 0, sw, sh);   // keep one channel
      var dx = Math.round(c[1] * amp * dpr);
      for (var b = 0; b < bands; b++) {
        var by = b * bh, hh = Math.min(bh, sh - by);
        if (hh > 0) ctx.drawImage(rgbCh, 0, by, sw, hh, sx + dx + shift[b], sy + by, sw, hh);
      }
    });
    ctx.restore();
  }

  function paint(e) {
    if (failed) return;
    // Re-snapshot the panel whenever the browser says its rendering changed (content, resize).
    if (!e || !e.changedElements || Array.prototype.indexOf.call(e.changedElements, detailEl) >= 0) snapDirty = true;
    try { draw(); } catch (err) { failed = true; showFallback(err && err.message || err); }
  }

  function draw() {
    var now = performance.now();
    var dt = last ? Math.min(.05, (now - last) / 1000) : .016;
    last = now;
    var k = reduced ? 1 : 1 - Math.exp(-dt * 14);
    var busy = false;

    // trails: keep a copy of the previous frame's dock area before the canvas is cleared
    var dockY = H - DOCK_H + 10, useTrails = fx.trails && !reduced && trailOk && trailCtx;
    if (useTrails) {
      trailCtx.clearRect(0, 0, trailCv.width, trailCv.height);
      trailCtx.drawImage(cv, 0, Math.round(dockY * dpr), cv.width, trailCv.height, 0, 0, cv.width, trailCv.height);
    }

    ctx.reset();
    ctx.scale(dpr, dpr);

    var axisY = H - 62, cardBottom = axisY - 16;
    var inDock = mouse && mouse.y > H - DOCK_H;

    // magnification targets (macOS-dock style gaussian around the cursor)
    var fmax = Math.min(1 + MAG, 1.1 * CARD_W / (slot * .88));
    items.forEach(function (it, i) {
      var d = inDock ? (mouse.x - it.rc) / (slot * SIGMA) : 99;
      var target = 1 + (fmax - 1) * Math.exp(-d * d);
      if (i === sel) target = Math.max(target, 1);
      it.f += (target - it.f) * k;
      if (Math.abs(target - it.f) > .003) busy = true;
    });

    // widths -> positions, then pin the point under the cursor so the dock grows around it
    var cx = [], acc = rest0;
    items.forEach(function (it, i) { var w = it.f * slot; cx[i] = acc + w / 2; acc += w; });
    var shiftT = 0;
    if (inDock) {
      var mx = Math.min(items[items.length - 1].rc, Math.max(items[0].rc, mouse.x)), i0 = 0;
      while (i0 < items.length - 2 && items[i0 + 1].rc < mx) i0++;
      var u = (mx - items[i0].rc) / slot;
      shiftT = mx - (cx[i0] + u * (cx[i0 + 1] - cx[i0]));
    }
    shiftCur += (shiftT - shiftCur) * k;
    if (Math.abs(shiftT - shiftCur) > .3) busy = true;

    var mainRect = { x: PAD, y: PAD, w: W - 2 * PAD, h: H - PAD - DOCK_H };
    if (snapDirty && morphIdx >= 0 && morphT < 1) {
      // one full-size draw of the live element at the canvas origin, copied out before the background paints over it
      ctx.drawElementImage(detailEl, 0, 0, mainRect.w, mainRect.h);
      snapCtx.clearRect(0, 0, snap.width, snap.height);
      snapCtx.drawImage(cv, 0, 0, snap.width, snap.height, 0, 0, snap.width, snap.height);
      snapDirty = false;
    }

    // background: faint grid + ghost year
    ctx.fillStyle = '#0a1226'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(56,189,248,.05)'; ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    var focus = hit_idx(inDock);
    var ghost = items[morphT > .5 && morphIdx >= 0 ? morphIdx : (focus >= 0 ? focus : items.length - 1)];
    ctx.fillStyle = 'rgba(148,163,184,.07)';
    ctx.font = '800 200px -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(ghost.job.start[0]), W / 2, (H - DOCK_H) / 2 + PAD);

    if (morphIdx < 0 || morphT < .05) {
      ctx.fillStyle = 'rgba(141,155,184,.8)'; ctx.font = '15px -apple-system, "Segoe UI", sans-serif';
      ctx.fillText('Hover the dock, click a card to expand it', W / 2, (H - DOCK_H) / 2 + PAD + 130);
    }

    if (useTrails) {       // ghost of the last frame under the new one: cards that moved leave a fading trail
      ctx.globalAlpha = TRAIL;
      ctx.drawImage(trailCv, 0, 0, trailCv.width, trailCv.height, 0, dockY, W, DOCK_H + 10);
      ctx.globalAlpha = 1;
    }

    // cards
    items.forEach(function (it, i) {
      var x = cx[i] + shiftCur;
      var dw = it.f * slot * .88, s = dw / CARD_W, dh = CARD_H * s;
      var rx = x - dw / 2, ry = cardBottom - dh;
      it.rect = { x: rx, y: ry, w: dw, h: dh + 30 };
      var alpha = i === morphIdx ? 1 - smooth(0, .15, morphT) : 1;
      if (alpha > .01) {
        // explicit destination size: the snapshot is device-pixel sized, so don't rely on ctx scale
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.drawElementImage(it.el, rx, ry, dw, dh);
        ctx.restore();
      }
    });

    // floor reflection: mirror the bottom strip of the cards just drawn, fade it out, put it under the cards
    if (fx.refl) {
      var sy = Math.round((cardBottom - REFL_H) * dpr), sh = reflCv.height;
      reflCtx.globalCompositeOperation = 'source-over';
      reflCtx.clearRect(0, 0, reflCv.width, reflCv.height);
      reflCtx.save();
      reflCtx.translate(0, sh); reflCtx.scale(1, -1);
      reflCtx.drawImage(cv, 0, sy, cv.width, sh, 0, 0, cv.width, sh);
      reflCtx.restore();
      reflCtx.globalCompositeOperation = 'destination-in';
      var fade = reflCtx.createLinearGradient(0, 0, 0, sh);
      fade.addColorStop(0, 'rgba(0,0,0,' + REFL_A + ')'); fade.addColorStop(.7, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      reflCtx.fillStyle = fade; reflCtx.fillRect(0, 0, reflCv.width, sh);
      ctx.drawImage(reflCv, 0, 0, reflCv.width, sh, 0, cardBottom + 2, W, REFL_H);
    }

    // axis
    var g = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    g.addColorStop(0, 'rgba(56,189,248,0)'); g.addColorStop(.1, 'rgba(56,189,248,.7)');
    g.addColorStop(.9, 'rgba(56,189,248,.7)'); g.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, axisY); ctx.lineTo(W - PAD, axisY); ctx.stroke();

    // dots
    items.forEach(function (it, i) {
      var x = cx[i] + shiftCur, hot = i === sel || i === focus;
      ctx.fillStyle = 'hsl(' + it.hue + ' 70% 62%)';
      if (hot) { ctx.shadowColor = 'hsl(' + it.hue + ' 80% 60%)'; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.arc(x, axisY, hot ? 6 : 4, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      if (i === sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, axisY, 9, 0, 7); ctx.stroke(); }
    });

    // expanding detail panel ("genie": the panel is drawn as horizontal strips that funnel into the dock card)
    var live = false;
    if (morphIdx >= 0) {
      var tgt = morphTarget;
      if (reduced) morphT = tgt;
      else morphT += Math.sign(tgt - morphT) * dt / (tgt ? OPEN_S : CLOSE_S);
      if ((tgt - morphT) * (tgt ? 1 : -1) <= 0) morphT = tgt; else busy = true;
      if (morphT === 0 && tgt === 0) morphIdx = -1;
    }
    if (morphIdx >= 0) {
      var ic = items[morphIdx];
      var iw = slot * .88, ih = CARD_H * iw / CARD_W;
      var icon = { cx: cx[morphIdx] + shiftCur, w: iw, top: cardBottom - ih, h: ih };
      // beam from dot to panel
      ctx.strokeStyle = 'hsla(' + ic.hue + ' 80% 60% / ' + (.5 * smooth(.7, 1, morphT)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(icon.cx, axisY); ctx.lineTo(icon.cx, mainRect.y + mainRect.h); ctx.stroke(); ctx.setLineDash([]);

      ctx.save();
      ctx.globalAlpha = smooth(0, .1, morphT);
      if (morphT < 1) {
        genie(morphT, icon, mainRect);
      } else {
        var t = ctx.drawElementImage(detailEl, mainRect.x, mainRect.y, mainRect.w, mainRect.h);
        // keep the live DOM (chips, close button) aligned with what is drawn, so clicks land
        if (t && t.toString) detailEl.style.transform = t.toString();
      }
      ctx.restore();
      // once the genie has landed: a brief RGB split + glitch on the panel, then back to a clean picture
      if (morphT >= 1 && morphTarget === 1 && fx.glitch && !reduced) {
        if (!glitchAt) glitchAt = now;
        var age = (now - glitchAt) / 1000;
        if (age < .55) {
          rgbSplit(mainRect.x, mainRect.y, mainRect.w, mainRect.h, 7 * Math.exp(-age * 7), age < .3 ? 1 - age / .3 : 0);
          busy = true;
        }
      }
      live = morphT === 1 && morphTarget === 1;
    }
    detailEl.classList.toggle('live', live);

    // year ticks under the dock
    ctx.fillStyle = 'rgba(141,155,184,.9)'; ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    items.forEach(function (it, i) {
      if (it.f > 1.15 || i === sel || i % 2 === 0) {
        var tx = cx[i] + shiftCur, ty = axisY + 14;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,18,38,.9)'; ctx.strokeText(it.job.start[0], tx, ty);   // halo keeps the year readable over the reflection
        ctx.fillText(it.job.start[0], tx, ty);
      }
    });

    trailOk = true;
    if (busy) cv.requestPaint(); else last = 0;
  }

  function hit_idx(inDock) {
    if (!inDock) return -1;
    return hit(mouse);
  }

  /* ---------- wiring ---------- */
  function show() {
    if (failed) return;
    if (!hasApi()) { showFallback(); return; }
    fallbackEl.hidden = true;
    stage.hidden = false;
    if (!started) {
      try { start(); } catch (err) { failed = true; showFallback(err && err.message || err); }
    } else cv.requestPaint();
  }
  window.H2C = { hasApi: hasApi, renderFallback: renderFallback };   // shared with the Atlas canvas view
  window.addEventListener('viewchange', function (e) { if (e.detail === 'canvas') show(); });
  if (location.hash === '#canvas') show();
})();
