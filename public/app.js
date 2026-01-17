(function () {
  "use strict";

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function now() {
    return new Date().getTime();
  }

  function createMaze(cols, rows) {
    var total = cols * rows;
    var visited = new Array(total);
    var walls = new Array(total);
    var i;
    for (i = 0; i < total; i++) {
      visited[i] = false;
      walls[i] = { n: true, e: true, s: true, w: true };
    }

    function idx(x, y) {
      return y * cols + x;
    }

    function neighbors(x, y) {
      var list = [];
      if (y > 0) list.push({ x: x, y: y - 1, dir: "n" });
      if (x < cols - 1) list.push({ x: x + 1, y: y, dir: "e" });
      if (y < rows - 1) list.push({ x: x, y: y + 1, dir: "s" });
      if (x > 0) list.push({ x: x - 1, y: y, dir: "w" });
      return list;
    }

    function removeWall(a, b, dir) {
      if (dir === "n") {
        walls[a].n = false;
        walls[b].s = false;
      } else if (dir === "e") {
        walls[a].e = false;
        walls[b].w = false;
      } else if (dir === "s") {
        walls[a].s = false;
        walls[b].n = false;
      } else if (dir === "w") {
        walls[a].w = false;
        walls[b].e = false;
      }
    }

    var stack = [];
    var startX = 0;
    var startY = 0;
    var start = idx(startX, startY);
    visited[start] = true;
    stack.push({ x: startX, y: startY });

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var curIndex = idx(cur.x, cur.y);
      var nbs = neighbors(cur.x, cur.y);
      var options = [];
      for (i = 0; i < nbs.length; i++) {
        var ni = idx(nbs[i].x, nbs[i].y);
        if (!visited[ni]) options.push(nbs[i]);
      }

      if (!options.length) {
        stack.pop();
        continue;
      }

      var pick = options[randInt(options.length)];
      var nextIndex = idx(pick.x, pick.y);
      removeWall(curIndex, nextIndex, pick.dir);
      visited[nextIndex] = true;
      stack.push({ x: pick.x, y: pick.y });
    }

    return { cols: cols, rows: rows, walls: walls };
  }

  function shortestPath(maze, sx, sy, gx, gy) {
    var cols = maze.cols;
    var rows = maze.rows;
    var total = cols * rows;
    var prev = new Array(total);
    var seen = new Array(total);
    var qx = [];
    var qy = [];
    var head = 0;
    var tail = 0;
    var i;
    for (i = 0; i < total; i++) {
      prev[i] = -1;
      seen[i] = false;
    }
    function idx(x, y) {
      return y * cols + x;
    }
    function push(x, y) {
      qx[tail] = x;
      qy[tail] = y;
      tail++;
    }
    function pop() {
      var x = qx[head];
      var y = qy[head];
      head++;
      return { x: x, y: y };
    }
    var s = idx(sx, sy);
    var g = idx(gx, gy);
    seen[s] = true;
    push(sx, sy);

    while (head < tail) {
      var cur = pop();
      var ci = idx(cur.x, cur.y);
      if (ci === g) break;
      var w = maze.walls[ci];
      if (!w.n && cur.y > 0) {
        var ni = idx(cur.x, cur.y - 1);
        if (!seen[ni]) {
          seen[ni] = true;
          prev[ni] = ci;
          push(cur.x, cur.y - 1);
        }
      }
      if (!w.e && cur.x < cols - 1) {
        var ei = idx(cur.x + 1, cur.y);
        if (!seen[ei]) {
          seen[ei] = true;
          prev[ei] = ci;
          push(cur.x + 1, cur.y);
        }
      }
      if (!w.s && cur.y < rows - 1) {
        var si = idx(cur.x, cur.y + 1);
        if (!seen[si]) {
          seen[si] = true;
          prev[si] = ci;
          push(cur.x, cur.y + 1);
        }
      }
      if (!w.w && cur.x > 0) {
        var wi = idx(cur.x - 1, cur.y);
        if (!seen[wi]) {
          seen[wi] = true;
          prev[wi] = ci;
          push(cur.x - 1, cur.y);
        }
      }
    }

    if (!seen[g]) return [];
    var path = [];
    var at = g;
    while (at !== -1) {
      path.push(at);
      at = prev[at];
    }
    path.reverse();
    return path;
  }

  function makeDots(el, level) {
    var maxDots = 8;
    var onCount = clamp(level, 1, maxDots);
    var html = "";
    var i;
    if (level > maxDots) {
      for (i = 0; i < maxDots - 1; i++) {
        html += '<i class="on"></i>';
      }
      html += '<i class="on more"></i>';
    } else {
      for (i = 0; i < maxDots; i++) {
        html += '<i class="' + (i < onCount ? "on" : "") + '"></i>';
      }
    }
    el.innerHTML = html;
  }

  function showToast(el, msg) {
    el.textContent = msg || "";
    if (!msg) return;
    el.className = "toast on";
    setTimeout(function () {
      el.className = "toast";
    }, 900);
  }

  var canvas = document.getElementById("mazeCanvas");
  var levelDots = document.getElementById("levelDots");
  var toast = document.getElementById("toast");
  var btnNew = document.getElementById("btnNew");
  var btnHint = document.getElementById("btnHint");
  var rememberToggle = document.getElementById("rememberToggle");

  var ctx = canvas.getContext("2d");
  var deviceRatio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  var audio = { ctx: null, unlocked: false, noiseBuf: null };

  var state = {
    level: 1,
    maze: null,
    px: 0,
    py: 0,
    gx: 0,
    gy: 0,
    hintOn: false,
    lastMoveAt: 0,
    winFlashUntil: 0,
    particles: [],
    lastFrameAt: 0,
    fireworksUntil: 0,
    obstacle: null,
    settings: { remember: false, tier: 1 }
  };

  var STORAGE = {
    remember: "ccMaze.remember",
    tier: "ccMaze.tier",
    level: "ccMaze.level"
  };

  function loadSettings() {
    var tier = parseInt(localStorage.getItem(STORAGE.tier) || "1", 10);
    tier = clamp(isNaN(tier) ? 1 : tier, 1, 5);
    var remember = localStorage.getItem(STORAGE.remember) === "1";
    state.settings.tier = tier;
    state.settings.remember = remember;
    if (rememberToggle) rememberToggle.checked = remember;
    setTierSelected(tier);
  }

  function saveSettings() {
    localStorage.setItem(STORAGE.tier, String(state.settings.tier));
    localStorage.setItem(STORAGE.remember, state.settings.remember ? "1" : "0");
  }

  function persistProgress() {
    if (!state.settings.remember) return;
    localStorage.setItem(STORAGE.level, String(state.level));
  }

  function tierToStartLevel(tier) {
    if (tier === 1) return 1;
    if (tier === 2) return 3;
    if (tier === 3) return 6;
    if (tier === 4) return 10;
    return 14;
  }

  function getInitialLevel() {
    if (state.settings.remember) {
      var saved = parseInt(localStorage.getItem(STORAGE.level) || "0", 10);
      if (!isNaN(saved) && saved > 0) return saved;
    }
    return tierToStartLevel(state.settings.tier);
  }

  function setTierSelected(tier) {
    var chips = document.querySelectorAll(".chip[data-tier]");
    var i;
    for (i = 0; i < chips.length; i++) {
      var t = parseInt(chips[i].getAttribute("data-tier") || "0", 10);
      chips[i].className = "chip" + (t === tier ? " on" : "");
    }
  }

  function levelToSize(level) {
    var base = 5;
    var step = Math.floor((level - 1) / 2);
    var size = base + step * 2;
    return clamp(size, 5, 19);
  }

  function generateForLevel() {
    var size = levelToSize(state.level);
    state.maze = createMaze(size, size);
    state.px = 0;
    state.py = 0;
    state.gx = size - 1;
    state.gy = size - 1;
    state.hintOn = state.level <= 2;
    state.winFlashUntil = 0;
    state.obstacle = null;
    makeDots(levelDots, state.level);
    showToast(toast, "");
    spawnObstacleIfNeeded();
    resize();
    draw();
  }

  function neighborsOpen(x, y) {
    var cols = state.maze.cols;
    var i = y * cols + x;
    var w = state.maze.walls[i];
    var list = [];
    if (!w.n && y > 0) list.push({ x: x, y: y - 1 });
    if (!w.e && x < cols - 1) list.push({ x: x + 1, y: y });
    if (!w.s && y < state.maze.rows - 1) list.push({ x: x, y: y + 1 });
    if (!w.w && x > 0) list.push({ x: x - 1, y: y });
    return list;
  }

  function cellIndex(x, y) {
    return y * state.maze.cols + x;
  }

  function bfsDistancesFrom(sx, sy) {
    var cols = state.maze.cols;
    var rows = state.maze.rows;
    var total = cols * rows;
    var dist = new Array(total);
    var qx = [];
    var qy = [];
    var head = 0;
    var tail = 0;
    var i;
    for (i = 0; i < total; i++) dist[i] = -1;
    dist[cellIndex(sx, sy)] = 0;
    qx[tail] = sx;
    qy[tail] = sy;
    tail++;
    while (head < tail) {
      var x = qx[head];
      var y = qy[head];
      head++;
      var di = dist[cellIndex(x, y)];
      var nbs = neighborsOpen(x, y);
      for (i = 0; i < nbs.length; i++) {
        var nx = nbs[i].x;
        var ny = nbs[i].y;
        var ni = cellIndex(nx, ny);
        if (dist[ni] !== -1) continue;
        dist[ni] = di + 1;
        qx[tail] = nx;
        qy[tail] = ny;
        tail++;
      }
    }
    return dist;
  }

  function spawnObstacleIfNeeded() {
    if (!state.maze) return;
    if (state.level < 10) return;
    var cols = state.maze.cols;
    var rows = state.maze.rows;
    var distFromStart = bfsDistancesFrom(0, 0);
    var best = [];
    var bestScore = -1;
    var x, y, i, s, gi;
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        if (x === 0 && y === 0) continue;
        if (x === state.gx && y === state.gy) continue;
        i = y * cols + x;
        s = distFromStart[i];
        if (s < 0) continue;
        gi = Math.abs(state.gx - x) + Math.abs(state.gy - y);
        if (s < Math.floor(cols * 0.7)) continue;
        if (gi < Math.floor(cols * 0.5)) continue;
        if (neighborsOpen(x, y).length < 2) continue;
        var score = s + gi * 0.6;
        if (score > bestScore) {
          bestScore = score;
          best = [{ x: x, y: y }];
        } else if (Math.abs(score - bestScore) < 1.5) {
          best.push({ x: x, y: y });
        }
      }
    }

    if (!best.length) {
      for (y = rows - 1; y >= 0; y--) {
        for (x = cols - 1; x >= 0; x--) {
          if (x === state.gx && y === state.gy) continue;
          if (neighborsOpen(x, y).length >= 2) {
            best.push({ x: x, y: y });
            break;
          }
        }
        if (best.length) break;
      }
    }

    var pick = best[randInt(best.length)];
    state.obstacle = {
      x: pick.x,
      y: pick.y,
      prevX: pick.x,
      prevY: pick.y,
      nextMoveAt: now() + 900 + randInt(700),
      paceMs: 520 + randInt(160)
    };
  }

  function startAtLevel(level) {
    state.level = Math.max(1, Math.floor(level || 1));
    generateForLevel();
    persistProgress();
  }

  function nextLevel() {
    state.level += 1;
    state.winFlashUntil = now() + 900;
    state.fireworksUntil = now() + 1200;
    spawnFireworks();
    playWinSound();
    generateForLevel();
    persistProgress();
  }

  function canMove(dir) {
    var cols = state.maze.cols;
    var rows = state.maze.rows;
    var i = state.py * cols + state.px;
    var w = state.maze.walls[i];
    if (dir === "up") return !w.n && state.py > 0;
    if (dir === "right") return !w.e && state.px < cols - 1;
    if (dir === "down") return !w.s && state.py < rows - 1;
    if (dir === "left") return !w.w && state.px > 0;
    return false;
  }

  function move(dir) {
    var t = now();
    if (t - state.lastMoveAt < 60) return;
    if (!state.maze) return;
    if (!canMove(dir)) {
      state.lastMoveAt = t;
      state.winFlashUntil = Math.max(state.winFlashUntil, t + 120);
      draw();
      return;
    }
    if (dir === "up") state.py -= 1;
    else if (dir === "right") state.px += 1;
    else if (dir === "down") state.py += 1;
    else if (dir === "left") state.px -= 1;
    state.lastMoveAt = t;
    if (state.obstacle && state.px === state.obstacle.x && state.py === state.obstacle.y) {
      gameOver();
      return;
    }
    if (state.px === state.gx && state.py === state.gy) {
      nextLevel();
    } else {
      draw();
    }
  }

  function gameOver() {
    state.winFlashUntil = now() + 260;
    state.fireworksUntil = 0;
    state.particles.length = 0;
    showToast(toast, "zailai");
    persistProgress();
    startAtLevel(state.level);
    if (navigator && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch (e) {}
    }
  }

  function resize() {
    if (!canvas || !ctx) return;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.floor(rect.width * deviceRatio));
    var h = Math.max(1, Math.floor(rect.height * deviceRatio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function spawnFireworks() {
    var w = canvas.width;
    var h = canvas.height;
    if (!w || !h) return;
    var colors = ["#ff4fa3", "#ff8bc5", "#ffd1ea", "#ffffff"];
    var count = 90;
    var i;
    var baseX = (state.gx + 0.5) / state.maze.cols;
    var baseY = (state.gy + 0.5) / state.maze.rows;
    var cx = w * (0.2 + 0.6 * baseX);
    var cy = h * (0.2 + 0.6 * baseY);
    for (i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (0.35 + Math.random() * 1.25) * Math.min(w, h) * 0.0024;
      state.particles.push({
        x: cx + (Math.random() - 0.5) * 22,
        y: cy + (Math.random() - 0.5) * 22,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - Math.random() * 0.5,
        life: 0,
        maxLife: 700 + Math.random() * 650,
        r: 1.6 + Math.random() * 2.2,
        c: colors[randInt(colors.length)]
      });
    }
  }

  function updateParticles(dtMs) {
    if (!state.particles.length) return;
    var g = dtMs * 0.0007;
    var i;
    for (i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.life += dtMs;
      if (p.life >= p.maxLife) {
        state.particles.splice(i, 1);
        continue;
      }
      p.vy += g;
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.vx *= 0.987;
      p.vy *= 0.987;
    }
  }

  function drawParticles() {
    if (!state.particles.length) return;
    var i;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var a = 1 - p.life / p.maxLife;
      a = a * a;
      ctx.globalAlpha = 0.82 * a;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, false);
      ctx.fill();
    }
    ctx.restore();
  }

  function unlockAudio() {
    if (audio.unlocked) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audio.ctx = new Ctx();
      if (audio.ctx && audio.ctx.state === "suspended" && audio.ctx.resume) {
        audio.ctx.resume();
      }
      audio.unlocked = true;
    } catch (e) {
      audio.unlocked = false;
    }
  }

  function getNoiseBuffer() {
    if (!audio.ctx) return null;
    if (audio.noiseBuf) return audio.noiseBuf;
    var sr = audio.ctx.sampleRate || 44100;
    var len = Math.floor(sr * 0.12);
    var buf = audio.ctx.createBuffer(1, len, sr);
    var data = buf.getChannelData(0);
    var i;
    for (i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    audio.noiseBuf = buf;
    return buf;
  }

  function playClap(atTime) {
    if (!audio.ctx) return;
    var buf = getNoiseBuffer();
    if (!buf) return;
    var src = audio.ctx.createBufferSource();
    src.buffer = buf;
    var filter = audio.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200 + Math.random() * 800;
    filter.Q.value = 0.6 + Math.random() * 0.8;
    var gain = audio.ctx.createGain();
    var t0 = atTime || audio.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.38 + Math.random() * 0.22, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.ctx.destination);
    src.start(t0);
    src.stop(t0 + 0.14);
  }

  function playWinSound() {
    if (!audio.unlocked || !audio.ctx) return;
    var base = audio.ctx.currentTime + 0.02;
    var i;
    for (i = 0; i < 12; i++) {
      playClap(base + Math.random() * 0.75);
    }
  }

  function updateObstacle(t) {
    if (!state.obstacle) return;
    if (t < state.obstacle.nextMoveAt) return;
    var o = state.obstacle;
    var nbs = neighborsOpen(o.x, o.y);
    if (!nbs.length) {
      o.nextMoveAt = t + o.paceMs;
      return;
    }

    var i;
    var options = [];
    for (i = 0; i < nbs.length; i++) {
      var nx = nbs[i].x;
      var ny = nbs[i].y;
      if (nx === state.px && ny === state.py) continue;
      if (nx === state.gx && ny === state.gy) continue;
      options.push(nbs[i]);
    }
    if (!options.length) {
      o.nextMoveAt = t + o.paceMs;
      return;
    }

    var best = null;
    var bestScore = -1e9;
    for (i = 0; i < options.length; i++) {
      var c = options[i];
      var back = c.x === o.prevX && c.y === o.prevY ? 1 : 0;
      var dp = Math.abs(c.x - state.px) + Math.abs(c.y - state.py);
      var dg = Math.abs(c.x - state.gx) + Math.abs(c.y - state.gy);
      var score = Math.random() * 0.9 + dp * 0.28 + dg * 0.06 - back * 0.7;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) best = options[randInt(options.length)];

    o.prevX = o.x;
    o.prevY = o.y;
    o.x = best.x;
    o.y = best.y;

    if (state.px === o.x && state.py === o.y) {
      gameOver();
      return;
    }

    var jitter = randInt(160) - 60;
    o.nextMoveAt = t + o.paceMs + jitter;
  }

  function drawHeart(x, y, r, fillStyle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r, r);
    ctx.beginPath();
    ctx.moveTo(0, 0.4);
    ctx.bezierCurveTo(-0.55, 0.05, -0.5, -0.35, -0.15, -0.3);
    ctx.bezierCurveTo(-0.03, -0.29, 0, -0.2, 0, -0.15);
    ctx.bezierCurveTo(0, -0.2, 0.03, -0.29, 0.15, -0.3);
    ctx.bezierCurveTo(0.5, -0.35, 0.55, 0.05, 0, 0.4);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  function drawSparkle(x, y, r, strokeStyle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(-r * 0.7, -r * 0.7);
    ctx.lineTo(r * 0.7, r * 0.7);
    ctx.moveTo(-r * 0.7, r * 0.7);
    ctx.lineTo(r * 0.7, -r * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!state.maze) return;
    var w = canvas.width;
    var h = canvas.height;
    var t = now();
    if (!state.lastFrameAt) state.lastFrameAt = t;
    var dt = clamp(t - state.lastFrameAt, 0, 50);
    state.lastFrameAt = t;
    updateParticles(dt);
    updateObstacle(t);
    ctx.clearRect(0, 0, w, h);

    var cols = state.maze.cols;
    var rows = state.maze.rows;
    var pad = Math.floor(Math.min(w, h) * 0.04);
    var boardW = w - pad * 2;
    var boardH = h - pad * 2;
    var cell = Math.floor(Math.min(boardW / cols, boardH / rows));
    var bw = cell * cols;
    var bh = cell * rows;
    var ox = Math.floor((w - bw) / 2);
    var oy = Math.floor((h - bh) / 2);

    var bgGrad = ctx.createLinearGradient(0, oy, 0, oy + bh);
    bgGrad.addColorStop(0, "rgba(255,255,255,0.95)");
    bgGrad.addColorStop(1, "rgba(255,232,244,0.88)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(ox - 8, oy - 8, bw + 16, bh + 16);

    var wallColor = "rgba(90,42,69,0.55)";
    var wallWidth = Math.max(2, Math.floor(cell * 0.12));
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = wallWidth;
    ctx.lineCap = "round";

    var i, x, y;
    for (y = 0; y < rows; y++) {
      for (x = 0; x < cols; x++) {
        i = y * cols + x;
        var wx = ox + x * cell;
        var wy = oy + y * cell;
        var ww = state.maze.walls[i];
        if (ww.n) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + cell, wy);
          ctx.stroke();
        }
        if (ww.e) {
          ctx.beginPath();
          ctx.moveTo(wx + cell, wy);
          ctx.lineTo(wx + cell, wy + cell);
          ctx.stroke();
        }
        if (ww.s) {
          ctx.beginPath();
          ctx.moveTo(wx, wy + cell);
          ctx.lineTo(wx + cell, wy + cell);
          ctx.stroke();
        }
        if (ww.w) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx, wy + cell);
          ctx.stroke();
        }
      }
    }

    var goalCx = ox + (state.gx + 0.5) * cell;
    var goalCy = oy + (state.gy + 0.5) * cell;
    drawHeart(goalCx, goalCy, cell * 0.32, "rgba(255,79,163,0.95)");

    if (state.hintOn) {
      var path = shortestPath(state.maze, state.px, state.py, state.gx, state.gy);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,79,163,0.95)";
      ctx.lineWidth = Math.max(2, Math.floor(cell * 0.16));
      ctx.lineCap = "round";
      ctx.beginPath();
      for (i = 0; i < path.length; i++) {
        var pi = path[i];
        var px = pi % cols;
        var py = Math.floor(pi / cols);
        var cx = ox + (px + 0.5) * cell;
        var cy = oy + (py + 0.5) * cell;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.restore();
      drawSparkle(ox + (state.px + 0.5) * cell, oy + (state.py + 0.5) * cell, cell * 0.26, "rgba(255,79,163,0.95)");
    }

    var playerCx = ox + (state.px + 0.5) * cell;
    var playerCy = oy + (state.py + 0.5) * cell;
    var pulse = 1 + 0.06 * Math.sin(t / 140);
    var pr = cell * 0.28 * pulse;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,79,163,0.88)";
    ctx.arc(playerCx, playerCy, pr, 0, Math.PI * 2, false);
    ctx.fill();

    if (state.obstacle) {
      var ox2 = ox + (state.obstacle.x + 0.5) * cell;
      var oy2 = oy + (state.obstacle.y + 0.5) * cell;
      var wob = 1 + 0.08 * Math.sin((t + (state.obstacle.x + state.obstacle.y) * 30) / 160);
      var rr = cell * 0.26 * wob;
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = "rgba(120,55,120,0.92)";
      ctx.beginPath();
      ctx.arc(ox2, oy2, rr, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(ox2 - rr * 0.25, oy2 - rr * 0.25, rr * 0.55, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(ox2 - rr * 0.22, oy2 - rr * 0.08, rr * 0.13, 0, Math.PI * 2, false);
      ctx.arc(ox2 + rr * 0.08, oy2 - rr * 0.08, rr * 0.13, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(90,42,69,0.95)";
      ctx.beginPath();
      ctx.arc(ox2 - rr * 0.2, oy2 - rr * 0.06, rr * 0.06, 0, Math.PI * 2, false);
      ctx.arc(ox2 + rr * 0.1, oy2 - rr * 0.06, rr * 0.06, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.restore();
    }

    if (t < state.winFlashUntil) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(255,79,163,1)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (t < state.fireworksUntil) {
      drawParticles();
    }
  }

  function bindPadButtons() {
    var buttons = document.querySelectorAll("[data-move]");
    var i;
    for (i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          move(btn.getAttribute("data-move"));
        });
      })(buttons[i]);
    }
  }

  function bindSwipe() {
    var startX = 0;
    var startY = 0;
    var startT = 0;
    var moved = false;
    var passiveOpt = false;

    (function () {
      var supportsPassive = false;
      try {
        var noop = function () {};
        var opts = Object.defineProperty({}, "passive", {
          get: function () {
            supportsPassive = true;
          }
        });
        window.addEventListener("test-passive", noop, opts);
        window.removeEventListener("test-passive", noop, opts);
      } catch (e) {}
      passiveOpt = supportsPassive ? { passive: true } : false;
    })();

    function onStart(e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = now();
      moved = false;
    }

    function onMove(e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 18) moved = true;
    }

    function onEnd(e) {
      var dt = now() - startT;
      if (!moved || dt > 800) return;
      var endX = startX;
      var endY = startY;
      if (e.changedTouches && e.changedTouches.length) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
      }
      var dx = endX - startX;
      var dy = endY - startY;
      var adx = Math.abs(dx);
      var ady = Math.abs(dy);
      if (Math.max(adx, ady) < 26) return;
      if (adx > ady) move(dx > 0 ? "right" : "left");
      else move(dy > 0 ? "down" : "up");
    }

    document.addEventListener("touchstart", onStart, passiveOpt);
    document.addEventListener("touchmove", onMove, passiveOpt);
    document.addEventListener("touchend", onEnd, passiveOpt);
  }

  function bindKeyboard() {
    document.addEventListener("keydown", function (e) {
      var k = e.key || e.keyCode;
      if (k === "ArrowUp" || k === 38) move("up");
      else if (k === "ArrowRight" || k === 39) move("right");
      else if (k === "ArrowDown" || k === 40) move("down");
      else if (k === "ArrowLeft" || k === 37) move("left");
    });
  }

  function bindButtons() {
    btnNew.addEventListener("click", function () {
      generateForLevel();
      showToast(toast, "↻");
    });
    btnHint.addEventListener("click", function () {
      state.hintOn = !state.hintOn;
      showToast(toast, state.hintOn ? "✨" : "");
      draw();
    });

    if (rememberToggle) {
      rememberToggle.addEventListener("change", function () {
        state.settings.remember = !!rememberToggle.checked;
        saveSettings();
        if (state.settings.remember) persistProgress();
      });
    }

    var chips = document.querySelectorAll(".chip[data-tier]");
    var i;
    for (i = 0; i < chips.length; i++) {
      (function (el) {
        el.addEventListener("click", function () {
          var t = parseInt(el.getAttribute("data-tier") || "1", 10);
          t = clamp(isNaN(t) ? 1 : t, 1, 5);
          state.settings.tier = t;
          setTierSelected(t);
          saveSettings();
          if (!state.settings.remember) {
            startAtLevel(getInitialLevel());
            showToast(toast, "♡");
          }
        });
      })(chips[i]);
    }
  }

  function tick() {
    draw();
    window.requestAnimationFrame(tick);
  }

  window.addEventListener("resize", function () {
    resize();
    draw();
  });

  bindPadButtons();
  bindSwipe();
  bindKeyboard();
  bindButtons();
  document.addEventListener("touchend", unlockAudio, false);
  document.addEventListener("click", unlockAudio, false);
  loadSettings();
  startAtLevel(getInitialLevel());
  window.requestAnimationFrame(tick);
})();
