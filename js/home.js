(function () {
  var P = window.PROFILE, JOBS = window.JOBS;
  var CAT = window.TECH_CATEGORY, COLOR = window.CATEGORY_COLOR;
  var now = new Date();
  var NOW_M = now.getFullYear() * 12 + now.getMonth();
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var state = { tech: null, cat: null, query: '' };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function mIdx(d) { return d ? d[0] * 12 + d[1] - 1 : NOW_M; }
  function fmt(d) { return d ? MONTHS[d[1] - 1] + ' ' + d[0] : 'Present'; }
  function category(t) { return CAT[t] || 'Other'; }
  function color(t) { return COLOR[category(t)]; }
  function duration(job) {
    var m = mIdx(job.end) - mIdx(job.start) + 1, y = Math.floor(m / 12), r = m % 12, out = [];
    if (y) out.push(y + ' yr' + (y > 1 ? 's' : ''));
    if (r) out.push(r + ' mo');
    return out.join(' ');
  }
  function workJobs() { return JOBS.filter(function (j) { return j.kind === 'work'; }); }

  /* ---------- hero ---------- */
  function renderHero() {
    $('name').textContent = P.name;
    $('title').textContent = P.title + ' · ' + P.tagline;
    $('summary').textContent = P.summary;
    $('meta').textContent = P.location + ' · ' + P.languages.join(' · ');
    P.links.forEach(function (l) {
      var a = el('a', null, l.label);
      a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      $('links').appendChild(a);
    });
  }

  /* ---------- tech chips ---------- */
  function techChip(t) {
    var c = el('button', 'chip', t);
    c.style.setProperty('--c', color(t));
    c.title = category(t) + ' — click to filter timeline';
    c.addEventListener('click', function () { setTech(t); go('timeline'); });
    return c;
  }

  /* ---------- timeline ---------- */
  var details = [];     // { ul, more } of every card that has details, for the global expand / collapse

  function setOpen(d, open) {
    d.ul.hidden = !open;
    d.more.textContent = open ? 'Hide details ▴' : 'Show details ▾';
  }
  function syncExpandAll() {
    var all = details.length && details.every(function (d) { return !d.ul.hidden; });
    $('tl-expand').textContent = all ? 'Collapse all details ▴' : 'Expand all details ▾';
    $('tl-expand').disabled = !details.length;
  }

  function renderTimeline() {
    var ol = $('timeline');
    ol.textContent = '';
    details = [];
    JOBS.forEach(function (j) {
      var li = el('li', 'tl-item ' + j.kind + (j.end ? '' : ' current'));
      li.dataset.id = j.id;
      var card = el('div', 'tl-card');
      var head = el('div', 'tl-head');
      var left = el('div');
      left.appendChild(el('span', 'tl-role', j.role));
      left.appendChild(document.createTextNode(' · '));
      left.appendChild(el('span', 'tl-org', j.org));
      head.appendChild(left);
      head.appendChild(el('div', 'tl-when', fmt(j.start) + ' – ' + fmt(j.end) + ' · ' + duration(j)));
      card.appendChild(head);
      card.appendChild(el('div', 'tl-place', j.place));
      if (j.blurb) card.appendChild(el('p', 'tl-blurb', j.blurb));
      if (j.points.length) {
        var ul = el('ul', 'tl-points');
        ul.hidden = true;
        j.points.forEach(function (p) { ul.appendChild(el('li', null, p)); });
        var more = el('button', 'tl-more', 'Show details ▾');
        var d = { ul: ul, more: more };
        details.push(d);
        more.addEventListener('click', function () { setOpen(d, ul.hidden); syncExpandAll(); });
        card.appendChild(more);
        card.appendChild(ul);
      }
      if (j.tech.length) {
        var tt = el('div', 'tl-tech');
        j.tech.forEach(function (t) { tt.appendChild(techChip(t)); });
        card.appendChild(tt);
      }
      li.appendChild(card);
      ol.appendChild(li);
    });
    applyTimelineFilter();
    syncExpandAll();
  }

  function applyTimelineFilter() {
    var bar = $('filter-bar');
    JOBS.forEach(function (j) {
      var li = document.querySelector('.tl-item[data-id="' + j.id + '"]');
      if (!li) return;
      var on = !state.tech || j.tech.indexOf(state.tech) >= 0;
      li.classList.toggle('dim', !on);
      Array.prototype.forEach.call(li.querySelectorAll('.chip'), function (c) {
        c.classList.toggle('on', c.textContent === state.tech);
      });
    });
    bar.hidden = !state.tech;
    if (state.tech) {
      var n = JOBS.filter(function (j) { return j.tech.indexOf(state.tech) >= 0; }).length;
      bar.textContent = '';
      var s = el('span');
      s.appendChild(document.createTextNode('Highlighting '));
      s.appendChild(el('b', null, state.tech));
      s.appendChild(document.createTextNode(' — ' + n + ' role' + (n === 1 ? '' : 's')));
      var b = el('button', null, 'Clear ✕');
      b.addEventListener('click', function () { setTech(null); });
      bar.appendChild(s); bar.appendChild(b);
    }
  }

  function setTech(t) {
    state.tech = t;
    applyTimelineFilter();
    Array.prototype.forEach.call(document.querySelectorAll('.tm-row'), function (r) {
      r.classList.toggle('sel', r.dataset.tech === t);
    });
  }

  /* ---------- tech map ---------- */
  function techIndex() {
    var idx = {};
    workJobs().forEach(function (j) {
      j.tech.forEach(function (t) {
        var e = idx[t] || (idx[t] = { name: t, spans: [], months: 0 });
        e.spans.push(j);
        e.months += mIdx(j.end) - mIdx(j.start) + 1;
      });
    });
    return Object.keys(idx).map(function (k) { return idx[k]; });
  }

  function renderCatChips() {
    var box = $('tech-cats');
    box.textContent = '';
    Object.keys(COLOR).forEach(function (c) {
      var b = el('button', 'chip' + (state.cat === c ? ' on' : ''), c);
      b.style.setProperty('--c', COLOR[c]);
      b.addEventListener('click', function () {
        state.cat = state.cat === c ? null : c;
        renderCatChips(); renderTechMap();
      });
      box.appendChild(b);
    });
  }

  function renderTechMap() {
    var box = $('tech-map');
    box.textContent = '';
    var all = techIndex();
    var minM = Math.min.apply(null, workJobs().map(function (j) { return mIdx(j.start); }));
    var span = NOW_M - minM + 1, startY = Math.floor(minM / 12), endY = now.getFullYear();
    var q = state.query.toLowerCase();

    var axis = el('div', 'tm-axis');
    axis.appendChild(el('div'));
    var years = el('div', 'tm-years');
    for (var y = startY + 1; y <= endY; y += 3) {
      var i = el('i', null, String(y));
      i.style.left = ((y * 12 - minM) / span * 100) + '%';
      years.appendChild(i);
    }
    axis.appendChild(years);
    box.appendChild(axis);

    Object.keys(COLOR).forEach(function (cat) {
      if (state.cat && state.cat !== cat) return;
      var items = all.filter(function (t) {
        return category(t.name) === cat && (!q || t.name.toLowerCase().indexOf(q) >= 0);
      }).sort(function (a, b) { return b.months - a.months || a.name.localeCompare(b.name); });
      if (!items.length) return;
      var h = el('div', 'tm-cat', cat);
      h.style.setProperty('--c', COLOR[cat]);
      box.appendChild(h);
      items.forEach(function (t) {
        var row = el('div', 'tm-row' + (state.tech === t.name ? ' sel' : ''));
        row.dataset.tech = t.name;
        row.appendChild(el('div', 'tm-name', t.name));
        var track = el('div', 'tm-track');
        track.style.setProperty('--years', String(span / 12));
        track.style.setProperty('--c', COLOR[cat]);
        t.spans.forEach(function (j) {
          var bar = el('div', 'tm-bar');
          bar.style.left = ((mIdx(j.start) - minM) / span * 100) + '%';
          bar.style.width = ((mIdx(j.end) - mIdx(j.start) + 1) / span * 100) + '%';
          bar.title = j.role + ' @ ' + j.org + ' (' + fmt(j.start) + ' – ' + fmt(j.end) + ')';
          track.appendChild(bar);
        });
        row.appendChild(track);
        row.addEventListener('click', function () { showTechDetail(t); });
        box.appendChild(row);
      });
    });
    if (box.children.length === 1) box.appendChild(el('p', null, 'No match.'));
  }

  function showTechDetail(t) {
    setTech(t.name);
    var d = $('tech-detail');
    d.textContent = '';
    var firstY = Math.min.apply(null, t.spans.map(function (j) { return j.start[0]; }));
    var yrs = Math.max(1, Math.round(t.months / 12));
    d.appendChild(el('b', null, t.name));
    d.appendChild(document.createTextNode(' · ' + category(t.name) + ' · since ' + firstY + ' · ~' + yrs + ' yr' + (yrs > 1 ? 's' : '') + ' across ' +
      t.spans.length + ' role' + (t.spans.length > 1 ? 's' : '') + ': ' +
      t.spans.map(function (j) { return j.org; }).join(', ') + '. '));
    var a = el('a', null, 'Show in timeline →');
    a.href = '#timeline';
    d.appendChild(a);
  }

  /* ---------- routing ---------- */
  var VIEWS = ['timeline', 'tech', 'geo', 'game', 'atlas', 'atlas-canvas', 'canvas'];
  function go(v) { if (location.hash !== '#' + v) location.hash = v; else route(); }
  function route() {
    var v = location.hash.replace('#', '');
    if (VIEWS.indexOf(v) < 0) v = 'timeline';
    VIEWS.forEach(function (n) { $('view-' + n).hidden = n !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs a[data-view]'), function (a) {
      a.classList.toggle('active', a.dataset.view === v);
    });
    window.dispatchEvent(new CustomEvent('viewchange', { detail: v }));
  }

  window.App = { techChip: techChip, fmt: fmt, mIdx: mIdx, duration: duration, NOW_M: NOW_M, MONTHS: MONTHS };

  $('tl-expand').addEventListener('click', function () {
    var open = !details.every(function (d) { return !d.ul.hidden; });     // everything open already -> close all, else open all
    details.forEach(function (d) { setOpen(d, open); });
    syncExpandAll();
  });

  renderHero();
  renderTimeline();
  renderCatChips();
  renderTechMap();
  $('tech-search').addEventListener('input', function (e) { state.query = e.target.value; renderTechMap(); });
  window.addEventListener('hashchange', route);
  route();
})();
