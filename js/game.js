(function () {
  var arena = document.getElementById('arena');
  var overlay = document.getElementById('g-overlay');
  var startBtn = document.getElementById('g-start');
  var typedEl = document.getElementById('g-typed');
  var hud = {
    score: document.getElementById('g-score'), level: document.getElementById('g-level'),
    lives: document.getElementById('g-lives'), best: document.getElementById('g-best'),
    kpm: document.getElementById('g-kpm')
  };
  var CAT = window.TECH_CATEGORY, COLOR = window.CATEGORY_COLOR;
  var MAX_LIVES = 5;

  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // Build the word pool from every keyword in the profile (job tech + extras) and from the Atlas
  // (node titles and a curated word list per area). Built on first use, so script order does not matter.
  var SKIP = ['The industry', 'The company', 'Company map', 'Our offering', 'How to read it', 'Sources', 'Inputs', 'Content',
    'Foundations', 'Presentation', 'Interaction', 'Specs evolution', 'JS ecosystem', 'CSS ecosystem', 'Java ecosystem',
    'Frameworks', 'Methods', 'Size', 'Scale', 'Balance', 'Main user goal', 'Key steps', 'Entry point', 'First use', 'No results',
    'Market', 'Customers', 'Market overview'];
  var pool = null;
  function buildPool() {
    var seen = {}, out = [];
    function add(w, color) {
      var k = norm(w);
      if (k.length < 2 || k.length > 16 || seen[k]) return;      // long words only show up at higher levels (see spawn)
      seen[k] = 1;
      out.push({ text: w, key: k, color: color });
    }
    window.JOBS.forEach(function (j) { j.tech.forEach(function (w) { if (norm(w).length <= 14) add(w, COLOR[CAT[w] || 'Other']); }); });
    window.EXTRA_KEYWORDS.forEach(function (w) { if (norm(w).length <= 14) add(w, COLOR.Other); });
    var A = window.ATLAS;
    if (A) {
      (function walk(node, depth, hue) {
        hue = node.hue != null ? node.hue : hue;
        var color = 'hsl(' + hue + ' 70% 62%)';
        if (depth >= 5 && SKIP.indexOf(node.title) < 0) add(node.title, color);     // below "(me)" only: no cosmic levels
        (A.keywords && A.keywords[node.id] || []).forEach(function (w) { add(w, color); });
        node.children.forEach(function (c) { walk(c, depth + 1, hue); });
      })(A.root, 0, 265);
    }
    return out;
  }
  function getPool() { return pool || (pool = buildPool()); }
  function maxLen(level) { return Math.min(16, 8 + level * 2); }      // level 1: 10 letters ... level 4+: 16

  var HISTORY_KEY = 'pgu-keyword-history', HISTORY_MAX = 100;
  var history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) {}
  var best = history.reduce(function (m, r) { return Math.max(m, r.score); }, 0);

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
  }

  var words, target, score, lives, level, killed, running, paused, last, spawnIn, raf;
  var elapsed, keysOk, keysAll;

  function kpm() { return elapsed >= 3 ? Math.round(keysOk / (elapsed / 60)) : 0; }

  function reset() {
    arena.querySelectorAll('.fw').forEach(function (n) { n.remove(); });
    words = []; target = null; score = 0; lives = MAX_LIVES; level = 1; killed = 0;
    elapsed = 0; keysOk = 0; keysAll = 0;
    spawnIn = 0; typedEl.textContent = ' ';
    updateHud();
  }

  function updateHud() {
    hud.score.textContent = score;
    hud.level.textContent = level;
    hud.lives.textContent = new Array(lives + 1).join('♥') + new Array(MAX_LIVES - lives + 1).join('♡');
    hud.best.textContent = best;
    hud.kpm.textContent = kpm();
  }

  function spawn() {
    var P = getPool(), cap = maxLen(level), w;
    function pick() { return P[Math.floor(Math.random() * P.length)]; }
    w = pick();
    // avoid duplicates on screen, and words too long for the current level
    for (var tries = 0; tries < 20 && (w.key.length > cap || words.some(function (x) { return x.key === w.key; })); tries++) w = pick();
    if (w.key.length > cap || words.some(function (x) { return x.key === w.key; })) return;
    var node = document.createElement('div');
    node.className = 'fw';
    node.style.setProperty('--c', w.color);
    var done = document.createElement('span'); done.className = 'done';
    var rest = document.createElement('span'); rest.textContent = w.text;
    node.appendChild(done); node.appendChild(rest);
    arena.appendChild(node);
    var maxX = Math.max(0, arena.clientWidth - node.offsetWidth - 8);
    var o = { text: w.text, key: w.key, node: node, done: done, rest: rest, x: 4 + Math.random() * maxX, y: -30, progress: 0 };
    words.push(o);
    place(o);
  }

  function place(o) { o.node.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px)'; }

  // Render matched prefix: consume `progress` alphanumerics, carrying punctuation along.
  function paint(o) {
    var n = 0, i = 0, t = o.text;
    while (i < t.length && n < o.progress) { if (/[a-z0-9]/i.test(t[i])) n++; i++; }
    while (i < t.length && n === o.progress && o.progress > 0 && !/[a-z0-9]/i.test(t[i])) i++;
    o.done.textContent = t.slice(0, i);
    o.rest.textContent = t.slice(i);
  }

  function setTarget(o) {
    if (target) { target.node.classList.remove('target'); target.progress = 0; paint(target); }
    target = o;
    if (o) o.node.classList.add('target');
    typedEl.textContent = o ? '▸ ' + o.text : ' ';
  }

  function remove(o) {
    o.node.remove();
    words.splice(words.indexOf(o), 1);
    if (target === o) { target = null; typedEl.textContent = ' '; }
  }

  function loseLife() {
    lives--;
    arena.classList.remove('hit'); void arena.offsetWidth; arena.classList.add('hit');
    updateHud();
    if (lives <= 0) gameOver();
  }

  function tick(ts) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    if (paused) { last = ts; return; }
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    var speed = 62 + level * 10, h = arena.clientHeight;
    elapsed += dt;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = Math.max(0.6, 2.0 - level * 0.16);
      hud.kpm.textContent = kpm(); }
    for (var i = words.length - 1; i >= 0; i--) {
      var o = words[i];
      o.y += speed * dt;
      place(o);
      if (o.y > h - 30) { remove(o); loseLife(); if (!running) return; }
    }
  }

  function start() {
    reset();
    overlay.hidden = true;
    running = true; paused = false; last = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);
    var run = {
      t: Date.now(), score: score, level: level, words: killed, kpm: kpm(),
      acc: keysAll ? Math.round(keysOk / keysAll * 100) : 0, secs: Math.round(elapsed)
    };
    var prevBestKpm = history.reduce(function (m, r) { return Math.max(m, r.kpm); }, 0);
    var newScore = score > best, newKpm = run.kpm > prevBestKpm;
    history.unshift(run);
    history = history.slice(0, HISTORY_MAX);
    saveHistory();
    best = Math.max(best, score);
    updateHud();
    renderBoard();
    overlay.innerHTML = '';
    var h = document.createElement('h2'); h.textContent = 'Game over';
    var p = document.createElement('p'); p.textContent = 'Score ' + score + ' · level ' + level + ' · ' + killed + ' keywords typed · ' + run.kpm + ' keys/min · ' + run.acc + '% accuracy' +
      (newScore ? ' · new best score!' : '') + (newKpm ? ' · new best speed!' : '');
    overlay.appendChild(h); overlay.appendChild(p); overlay.appendChild(startBtn);
    startBtn.textContent = 'Play again';
    overlay.hidden = false;
  }

  function pause(on) {
    if (!running) return;
    paused = on;
    if (on) {
      overlay.innerHTML = '';
      var h = document.createElement('h2'); h.textContent = 'Paused';
      var p = document.createElement('p'); p.textContent = 'Press Esc to resume.';
      overlay.appendChild(h); overlay.appendChild(p);
      overlay.hidden = false;
    } else overlay.hidden = true;
  }

  document.addEventListener('keydown', function (e) {
    if (location.hash !== '#game') return;
    if (e.key === 'Escape') { pause(!paused); return; }
    if (!running || paused) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'Backspace') { setTarget(null); return; }
    if (e.key.length !== 1) return;
    var k = e.key.toLowerCase();
    if (!/[a-z0-9]/.test(k)) return; // punctuation optional
    keysAll++;

    if (!target) {
      // pick the lowest word starting with this letter
      var cand = null;
      words.forEach(function (o) { if (o.key[0] === k && (!cand || o.y > cand.y)) cand = o; });
      if (!cand) return;
      setTarget(cand);
    } else if (target.key[target.progress] !== k) {
      return;
    }
    keysOk++;
    target.progress++;
    paint(target);
    if (target.progress >= target.key.length) {
      score += target.key.length * 10 * level;
      killed++;
      var newLevel = 1 + Math.floor(killed / 8);
      if (newLevel > level) { level = newLevel; if (lives < MAX_LIVES) lives++; }
      remove(target);
      updateHud();
    }
  });

  function fmtDate(t) {
    var d = new Date(t);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function fmtTime(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function cell(tr, text, cls) {
    var td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td);
  }

  function renderBoard() {
    var rec = document.getElementById('g-records'), body = document.getElementById('g-history');
    rec.textContent = ''; body.textContent = '';
    document.getElementById('g-empty').hidden = history.length > 0;
    document.querySelector('.history').hidden = history.length === 0;
    document.getElementById('g-clear').hidden = history.length === 0;
    if (!history.length) return;
    function max(f) { return history.reduce(function (m, r) { return Math.max(m, r[f]); }, 0); }
    var bs = max('score'), bk = max('kpm');
    [['Best score', bs], ['Best keys/min', bk], ['Best level', max('level')], ['Games played', history.length]]
      .forEach(function (r) {
        var li = document.createElement('li');
        var b = document.createElement('b'); b.textContent = r[1];
        var s = document.createElement('span'); s.textContent = r[0];
        li.appendChild(b); li.appendChild(s); rec.appendChild(li);
      });
    history.slice(0, 15).forEach(function (r) {
      var tr = document.createElement('tr');
      cell(tr, fmtDate(r.t));
      cell(tr, r.score, r.score === bs ? 'best' : '');
      cell(tr, r.level); cell(tr, r.words);
      cell(tr, r.kpm, r.kpm === bk ? 'best' : '');
      cell(tr, r.acc + '%'); cell(tr, fmtTime(r.secs));
      body.appendChild(tr);
    });
  }

  document.getElementById('g-clear').addEventListener('click', function () {
    if (!confirm('Delete all game history stored in this browser?')) return;
    history = []; best = 0; saveHistory(); renderBoard(); updateHud();
  });

  reset();
  renderBoard();
  startBtn.addEventListener('click', start);
  window.addEventListener('viewchange', function (e) { if (e.detail !== 'game') pause(true); });
  window.addEventListener('blur', function () { pause(true); });
})();
