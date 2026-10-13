(function () {
  var A = window.App, JOBS = window.JOBS, PLACES = window.PLACES;
  var LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet';
  var SRI = {
    css: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
    js: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
  };
  var PIN = { work: '#38bdf8', edu: '#c084fc' };

  var slider = document.getElementById('geo-slider');
  var dateOut = document.getElementById('geo-date');
  var panel = document.getElementById('geo-panel');
  var playBtn = document.getElementById('geo-play');
  var note = document.getElementById('geo-note');

  var minM = Math.min.apply(null, JOBS.map(function (j) { return A.mIdx(j.start); }));
  slider.min = minM; slider.max = A.NOW_M; slider.value = A.NOW_M;

  var map, pins = {}, path, selected = null, timer = null, loading = false;

  // Per-place totals and chronological moves (consecutive duplicates dropped).
  var totals = {}, moves = [];
  JOBS.forEach(function (j) {
    j.geo.forEach(function (pid) {
      var t = totals[pid] || (totals[pid] = { months: 0, work: 0 });
      t.months += A.mIdx(j.end) - A.mIdx(j.start) + 1;
      if (j.kind === 'work') t.work++;
      moves.push({ m: A.mIdx(j.start), pid: pid, kind: j.kind });
    });
  });
  moves.sort(function (a, b) { return a.m - b.m; });
  (function () {
    var out = [];
    moves.forEach(function (x) { if (!out.length || out[out.length - 1].pid !== x.pid) out.push(x); });
    moves = out;
  })();

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function label(m) { return A.MONTHS[m % 12] + ' ' + Math.floor(m / 12); }
  function active(j, m) { return A.mIdx(j.start) <= m && m <= A.mIdx(j.end); }

  function load(cb) {
    if (window.L) return cb();
    if (loading) return;
    loading = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET + '.css'; css.integrity = SRI.css; css.crossOrigin = '';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = LEAFLET + '.js'; js.integrity = SRI.js; js.crossOrigin = '';
    js.onload = function () { loading = false; cb(); };
    js.onerror = function () {
      loading = false;
      note.textContent = 'Could not load the map library (offline?). Reload to retry.';
    };
    document.head.appendChild(js);
  }

  function init() {
    map = L.map('geo-map', { worldCopyJump: false, zoomSnap: 0.25 });
    // CARTO basemaps now require an API key; use OSM tiles, darkened via CSS.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 12
    }).addTo(map);

    var pts = [];
    Object.keys(PLACES).forEach(function (pid) {
      var p = PLACES[pid], t = totals[pid];
      if (!t) return;
      pts.push([p.lat, p.lng]);
      var r = 6 + Math.sqrt(t.months) * 1.3;
      var marker = L.circleMarker([p.lat, p.lng], { radius: r, weight: 2, fillOpacity: .55 });
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -r] });
      marker.on('click', function () { selected = pid; render(); });
      pins[pid] = marker;
    });
    path = L.polyline([], { color: '#38bdf8', weight: 2, opacity: .6, dashArray: '4 6' }).addTo(map);
    map.fitBounds(pts, { padding: [40, 40] });
    note.textContent = 'Circle size = time spent there (work and study). Blue = work, purple = study. Pulsing = where I am at the selected date.';
    render();
  }

  function render() {
    var m = +slider.value;
    dateOut.textContent = m >= A.NOW_M ? 'Today' : label(m);

    var act = JOBS.filter(function (j) { return active(j, m); });
    var activePlaces = {};
    act.forEach(function (j) { j.geo.forEach(function (p) { activePlaces[p] = j.kind; }); });

    if (map) {
      Object.keys(pins).forEach(function (pid) {
        var visited = JOBS.some(function (j) { return j.geo.indexOf(pid) >= 0 && A.mIdx(j.start) <= m; });
        var mk = pins[pid];
        if (visited && !map.hasLayer(mk)) mk.addTo(map);
        if (!visited && map.hasLayer(mk)) map.removeLayer(mk);
        if (!visited) return;
        var kind = activePlaces[pid] || 'work';
        var hasWork = JOBS.some(function (j) { return j.geo.indexOf(pid) >= 0 && j.kind === 'work' && A.mIdx(j.start) <= m; });
        var c = activePlaces[pid] ? PIN[kind] : (hasWork ? PIN.work : PIN.edu);
        mk.setStyle({ color: c, fillColor: c, fillOpacity: activePlaces[pid] ? .7 : .25, opacity: activePlaces[pid] ? 1 : .5 });
        var node = mk.getElement();
        if (node) node.classList.toggle('pin-active', !!activePlaces[pid]);
        if (selected === pid) mk.setStyle({ weight: 4 }); else mk.setStyle({ weight: 2 });
      });
      path.setLatLngs(moves.filter(function (x) { return x.m <= m; }).map(function (x) {
        return [PLACES[x.pid].lat, PLACES[x.pid].lng];
      }));
    }
    renderPanel(m, act);
  }

  function jobBlock(j, withTech) {
    var d = el('div', 'geo-job ' + j.kind);
    d.appendChild(el('b', null, j.role));
    d.appendChild(el('span', 'tl-org', j.org));
    d.appendChild(el('div', 'tl-when', A.fmt(j.start) + ' – ' + A.fmt(j.end) + ' · ' + A.duration(j)));
    if (withTech && j.tech.length) {
      var tt = el('div', 'tl-tech');
      j.tech.slice(0, 10).forEach(function (t) { tt.appendChild(A.techChip(t)); });
      d.appendChild(tt);
    }
    return d;
  }

  function renderPanel(m, act) {
    panel.textContent = '';
    panel.appendChild(el('h3', null, m >= A.NOW_M ? 'Today' : 'In ' + label(m)));
    if (!act.length) panel.appendChild(el('p', 'geo-empty', 'Nothing recorded.'));
    act.forEach(function (j) {
      var d = jobBlock(j, false);
      d.appendChild(el('div', 'tl-place', '📍 ' + j.geo.map(function (p) { return PLACES[p].name; }).join(' · ')));
      panel.appendChild(d);
    });

    panel.appendChild(el('h3', null, selected ? PLACES[selected].name + ', ' + PLACES[selected].country : 'Place'));
    if (!selected) { panel.appendChild(el('p', 'geo-empty', 'Click a pin to see everything linked to that place.')); return; }
    JOBS.filter(function (j) { return j.geo.indexOf(selected) >= 0; }).forEach(function (j) {
      panel.appendChild(jobBlock(j, true));
    });
  }

  slider.addEventListener('input', function () { stop(); render(); });

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    playBtn.textContent = '▶';
  }
  playBtn.addEventListener('click', function () {
    if (timer) return stop();
    if (+slider.value >= A.NOW_M) slider.value = minM;
    playBtn.textContent = '⏸';
    timer = setInterval(function () {
      slider.value = +slider.value + 1;
      render();
      if (+slider.value >= A.NOW_M) stop();
    }, 55);
  });

  function show() {
    load(function () {
      if (!map) init();
      setTimeout(function () { map.invalidateSize(); }, 0);
    });
  }
  window.addEventListener('viewchange', function (e) {
    if (e.detail === 'geo') show(); else stop();
  });
  if (location.hash === '#geo') show();
  renderPanel(A.NOW_M, JOBS.filter(function (j) { return active(j, A.NOW_M); }));
  dateOut.textContent = 'Today';
})();
