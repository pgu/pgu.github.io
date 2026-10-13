(function () {
  var arena = document.getElementById('arena');
  var overlay = document.getElementById('g-overlay');
  var startBtn = document.getElementById('g-start');
  var typedEl = document.getElementById('g-typed');
  var hud = {
    score: document.getElementById('g-score'), level: document.getElementById('g-level'),
    lives: document.getElementById('g-lives'), best: document.getElementById('g-best')
  };
  var CAT = window.TECH_CATEGORY, COLOR = window.CATEGORY_COLOR;
  var MAX_LIVES = 5;

  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // Build the word pool from every keyword in the profile.
  var pool = (function () {
    var seen = {}, out = [];
    function add(w) {
      var k = norm(w);
      if (k.length < 2 || k.length > 14 || seen[k]) return;
      seen[k] = 1;
      out.push({ text: w, key: k, color: COLOR[CAT[w] || 'Other'] });
    }
    window.JOBS.forEach(function (j) { j.tech.forEach(add); });
    window.EXTRA_KEYWORDS.forEach(add);
    return out;
  })();

  var best = 0;
  try { best = +localStorage.getItem('pgu-keyword-best') || 0; } catch (e) {}
  hud.best.textContent = best;

  var words, target, score, lives, level, killed, running, paused, last, spawnIn, raf;

  function reset() {
    arena.querySelectorAll('.fw').forEach(function (n) { n.remove(); });
    words = []; target = null; score = 0; lives = MAX_LIVES; level = 1; killed = 0;
    spawnIn = 0; typedEl.textContent = ' ';
    updateHud();
  }

  function updateHud() {
    hud.score.textContent = score;
    hud.level.textContent = level;
    hud.lives.textContent = new Array(lives + 1).join('♥') + new Array(MAX_LIVES - lives + 1).join('♡');
    hud.best.textContent = best;
  }

  function spawn() {
    var w = pool[Math.floor(Math.random() * pool.length)];
    // avoid duplicates on screen
    for (var tries = 0; tries < 10 && words.some(function (x) { return x.key === w.key; }); tries++) {
      w = pool[Math.floor(Math.random() * pool.length)];
    }
    if (words.some(function (x) { return x.key === w.key; })) return;
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
    var speed = 38 + level * 9, h = arena.clientHeight;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = Math.max(0.7, 2.4 - level * 0.18); }
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
    if (score > best) {
      best = score;
      try { localStorage.setItem('pgu-keyword-best', best); } catch (e) {}
    }
    updateHud();
    overlay.innerHTML = '';
    var h = document.createElement('h2'); h.textContent = 'Game over';
    var p = document.createElement('p'); p.textContent = 'Score ' + score + ' · level ' + level + ' · ' + killed + ' keywords typed';
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

    if (!target) {
      // pick the lowest word starting with this letter
      var cand = null;
      words.forEach(function (o) { if (o.key[0] === k && (!cand || o.y > cand.y)) cand = o; });
      if (!cand) return;
      setTarget(cand);
    } else if (target.key[target.progress] !== k) {
      return;
    }
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

  startBtn.addEventListener('click', start);
  window.addEventListener('viewchange', function (e) { if (e.detail !== 'game') pause(true); });
  window.addEventListener('blur', function () { pause(true); });
})();
