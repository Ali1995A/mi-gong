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
    var maxDots = 10;
    var onCount = clamp(level, 1, maxDots);
    var html = "";
    var i;
    for (i = 0; i < maxDots; i++) {
      html += '<i class="' + (i < onCount ? "on" : "") + '"></i>';
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

  var ctx = canvas.getContext("2d");
  var deviceRatio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  var state = {
    level: 1,
    maze: null,
    px: 0,
    py: 0,
    gx: 0,
    gy: 0,
    hintOn: false,
    lastMoveAt: 0,
    winFlashUntil: 0
  };

  function levelToSize(level) {
    var base = 5;
    var step = Math.floor((level - 1) / 2);
    var size = base + step * 2;
    return clamp(size, 5, 19);
  }

  function newGame(keepLevel) {
    if (!keepLevel) state.level = 1;
    var size = levelToSize(state.level);
    state.maze = createMaze(size, size);
    state.px = 0;
    state.py = 0;
    state.gx = size - 1;
    state.gy = size - 1;
    state.hintOn = state.level <= 2;
    state.winFlashUntil = 0;
    makeDots(levelDots, state.level);
    showToast(toast, "");
    resize();
    draw();
  }

  function nextLevel() {
    state.level += 1;
    var size = levelToSize(state.level);
    state.maze = createMaze(size, size);
    state.px = 0;
    state.py = 0;
    state.gx = size - 1;
    state.gy = size - 1;
    state.hintOn = state.level <= 2;
    state.winFlashUntil = now() + 900;
    makeDots(levelDots, state.level);
    showToast(toast, "★");
    resize();
    draw();
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
    if (state.px === state.gx && state.py === state.gy) {
      nextLevel();
    } else {
      draw();
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
    ctx.clearRect(0, 0, w, h);

    var cols = state.maze.cols;
    var rows = state.maze.rows;
    var pad = Math.floor(Math.min(w, h) * 0.06);
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
    ctx.fillRect(ox - 10, oy - 10, bw + 20, bh + 20);

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
    var t = now();
    var pulse = 1 + 0.06 * Math.sin(t / 140);
    var pr = cell * 0.28 * pulse;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,79,163,0.88)";
    ctx.arc(playerCx, playerCy, pr, 0, Math.PI * 2, false);
    ctx.fill();

    if (t < state.winFlashUntil) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(255,79,163,1)";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
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
      newGame(true);
      showToast(toast, "↻");
    });
    btnHint.addEventListener("click", function () {
      state.hintOn = !state.hintOn;
      showToast(toast, state.hintOn ? "✨" : "");
      draw();
    });
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
  newGame(false);
  window.requestAnimationFrame(tick);
})();
