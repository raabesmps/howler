/*
 * Howler reference: screen 4b (the envelope burns from the centre outward, paper falls, powder piles up).
 * Canvas 2D, no dependencies. This is a design reference, not production code.
 * Dev: add ?burnT=5.5 to the URL to freeze the animation at 5.5 seconds.
 */
(function () {
  'use strict';
  var cv = document.getElementById('burn');
  if (!cv) return;
  var ctx = cv.getContext('2d');

  var EW = 300, EH = 210, N = EW * EH;
  var LOOP = 11.5, BURN_START = 0.7, BURN_LEN = 6.2;
  var W, H, DPR, CX, EX, EY, FLOOR;
  var HW = 330, HH = 64, HL;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function measure() {
    var r = cv.getBoundingClientRect();
    W = Math.round(r.width) || 390;
    H = Math.round(r.height) || 760;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * DPR;
    cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    EX = Math.round(CX - EW / 2);
    EY = 170;
    FLOOR = EY + EH + 190;
    HL = Math.round(CX - HW / 2);
  }

  /* ---------- noise ---------- */
  function rnd(ix, iy, s) { var v = Math.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
  function vnoise(x, y, s) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = rnd(ix, iy, s), b = rnd(ix + 1, iy, s), c = rnd(ix, iy + 1, s), d = rnd(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, s) { return vnoise(x / 38, y / 38, s) * 0.55 + vnoise(x / 17, y / 17, s + 1) * 0.3 + vnoise(x / 8, y / 8, s + 2) * 0.15; }
  function hash2(x, y) { var v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v); }
  function rr(a, b) { return a + Math.random() * (b - a); }

  /* ---------- envelope art (drawn once) ---------- */
  var art = document.createElement('canvas');
  art.width = EW; art.height = EH;
  var a = art.getContext('2d');
  a.fillStyle = '#b5391a'; a.fillRect(0, 0, EW, EH);
  a.fillStyle = '#8a2a12'; a.beginPath(); a.moveTo(0, 0); a.lineTo(150, 122); a.lineTo(300, 0); a.closePath(); a.fill();
  a.fillStyle = 'rgba(0,0,0,.2)'; a.beginPath(); a.moveTo(0, 210); a.lineTo(150, 88); a.lineTo(150, 92); a.lineTo(6, 210); a.closePath(); a.fill();
  a.save();
  a.shadowColor = 'rgba(255,91,31,.65)'; a.shadowBlur = 22;
  var sg = a.createRadialGradient(140, 94, 2, 150, 105, 32);
  sg.addColorStop(0, '#4a2a20'); sg.addColorStop(0.55, '#2a1410'); sg.addColorStop(1, '#160a07');
  a.fillStyle = sg; a.beginPath(); a.arc(150, 105, 32, 0, 6.2832); a.fill();
  a.restore();
  a.fillStyle = '#ffc247'; a.beginPath();
  [[40, 0], [100, 22], [20, 48], [90, 70], [30, 100], [0, 80], [70, 52], [0, 30]].forEach(function (p, i) {
    var px = 147 + p[0] * 0.06, py = 81 + p[1] * 0.48;
    if (i === 0) a.moveTo(px, py); else a.lineTo(px, py);
  });
  a.closePath(); a.fill();

  var envPix = a.getImageData(0, 0, EW, EH).data;
  for (var gi = 0; gi < N; gi++) {
    var gv = (rnd(gi % EW, (gi / EW) | 0, 5) - 0.5) * 16, gp = gi * 4;
    envPix[gp] += gv; envPix[gp + 1] += gv * 0.5; envPix[gp + 2] += gv * 0.4;
  }

  var dmap = new Float32Array(N), n2 = new Float32Array(N), maxd = 0;
  for (var y = 0; y < EH; y++) {
    for (var x = 0; x < EW; x++) {
      var dx = (x - 150) / 150, dy = (y - 105) / 105, i = y * EW + x;
      var d = Math.sqrt(dx * dx + dy * dy) + (fbm(x, y, 3) - 0.5) * 0.5;
      dmap[i] = d; if (d > maxd) maxd = d;
      n2[i] = fbm(x * 1.7, y * 1.7, 9);
    }
  }
  var T0 = -0.28, TEND = maxd + 0.23;

  var out = document.createElement('canvas'); out.width = EW; out.height = EH;
  var octx = out.getContext('2d');
  var img = octx.createImageData(EW, EH);

  /* ---------- sprites (soft vertical flame blobs) ---------- */
  function sprite(stops) {
    var c = document.createElement('canvas'); c.width = 32; c.height = 56;
    var g = c.getContext('2d'); g.translate(16, 34); g.scale(1, 1.45);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, 15);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 15, 0, 6.2832); g.fill();
    return c;
  }
  var SP = [
    sprite([[0, 'rgba(255,215,110,.9)'], [0.3, 'rgba(255,170,60,.75)'], [0.7, 'rgba(255,110,28,.28)'], [1, 'rgba(255,90,20,0)']]),
    sprite([[0, 'rgba(255,170,60,.95)'], [0.4, 'rgba(255,100,30,.6)'], [0.8, 'rgba(200,50,15,.2)'], [1, 'rgba(180,40,10,0)']]),
    sprite([[0, 'rgba(225,75,28,.75)'], [0.5, 'rgba(150,35,12,.32)'], [1, 'rgba(100,20,8,0)']])
  ];

  /* ---------- simulation state ---------- */
  var frags, grains, flames, sparks, heights, edge, fragAcc, flameAcc, sparkAcc, simTime, frameNo, burnT;
  var heapCv = document.createElement('canvas'); heapCv.width = HW; heapCv.height = HH;
  var heapCtx = heapCv.getContext('2d');
  var heapImg = heapCtx.createImageData(HW, HH);

  function reset() {
    frags = []; grains = []; flames = []; sparks = []; edge = [];
    heights = new Int16Array(HW);
    fragAcc = 0; flameAcc = 0; sparkAcc = 0; simTime = 0; frameNo = 0; burnT = T0;
  }

  function heapAt(x) {
    var c = Math.floor(x - HL);
    if (c < 0) c = 0; if (c > HW - 1) c = HW - 1;
    return heights[c];
  }

  function land(x) {
    var c = Math.floor(x - HL);
    if (c < 1) c = 1; if (c > HW - 2) c = HW - 2;
    for (var s = 0; s < 14; s++) {
      var h = heights[c];
      if (h - heights[c - 1] >= 2 && (Math.random() < 0.5 || h - heights[c + 1] < 2)) c--;
      else if (h - heights[c + 1] >= 2) c++;
      else if (h - heights[c - 1] >= 1 && Math.random() < 0.35) c--;
      else if (h - heights[c + 1] >= 1 && Math.random() < 0.35) c++;
      else break;
      if (c < 1) { c = 1; break; }
      if (c > HW - 2) { c = HW - 2; break; }
    }
    if (heights[c] < HH - 1) heights[c]++;
  }

  function spawnFragment() {
    if (edge.length < 2) return;
    var k = ((Math.random() * (edge.length / 2)) | 0) * 2;
    var x = EX + edge[k] + rr(-3, 3), y = EY + edge[k + 1] + rr(-2, 3);
    var size = rr(3.5, 11), pts = [], n = 5 + ((Math.random() * 2) | 0);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * 6.2832 + rr(-0.3, 0.3);
      pts.push([Math.cos(ang) * size * rr(0.55, 1), Math.sin(ang) * size * rr(0.45, 1)]);
    }
    frags.push({ x: x, y: y, vx: (CX - x) * 0.3 + rr(-14, 14), vy: rr(-30, 6), rot: rr(0, 6.28), w: rr(-5, 5), size: size, pts: pts, age: 0, life: rr(0.55, 1.35), ph: rr(0, 6.28) });
  }

  function crumble(f) {
    var n = Math.ceil(f.size * f.size * 0.5);
    for (var i = 0; i < n; i++) {
      grains.push({ x: f.x + rr(-f.size, f.size) * 0.6, y: f.y + rr(-f.size, f.size) * 0.5, vx: rr(-30, 30) + (CX - f.x) * 0.25, vy: rr(-50, -2), s: (Math.random() * 3) | 0 });
    }
  }

  /* ---------- burn pass: build the envelope image and the rim sample list ---------- */
  function burnPass(t, fr) {
    var data = img.data, ec = 0;
    edge.length = 0;
    for (var y = 0; y < EH; y++) {
      for (var x = 0; x < EW; x++) {
        var i = y * EW + x, p = i << 2, d = dmap[i] - t;
        if (d < 0) { data[p + 3] = 0; continue; }
        var r = envPix[p], g = envPix[p + 1], b = envPix[p + 2], al = 255;
        if (d < 0.2) {
          if (d < 0.022) {
            var f = d / 0.022, fl = n2[(i + fr * 53) % N];
            r = 255; g = (225 - 120 * f) * (0.8 + 0.3 * fl); b = 100 - 70 * f;
            if (d < 0.005) al = 255 * (d / 0.005);
            if ((i & 3) === 0 && ec < 600) { edge[ec++] = x; edge[ec++] = y; }
          } else if (d < 0.055) {
            var f2 = (d - 0.022) / 0.033;
            r = 255 - 215 * f2; g = 91 - 77 * f2; b = 31 - 23 * f2;
          } else {
            var f3 = (d - 0.055) / 0.145, s = f3 * f3 * (3 - 2 * f3);
            s = Math.min(1, s * (0.75 + 0.5 * n2[i]));
            r = 28 + (r - 28) * s; g = 14 + (g - 14) * s; b = 9 + (b - 9) * s;
          }
        }
        data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = al;
      }
    }
    octx.putImageData(img, 0, 0);
  }

  /* ---------- update ---------- */
  function update(dt) {
    var tl = simTime;
    frameNo++;
    var u = Math.max(0, Math.min(1, (tl - BURN_START) / BURN_LEN));
    burnT = T0 + (TEND - T0) * Math.pow(u, 1.12);
    burnPass(burnT, frameNo);
    var burning = u > 0 && u < 0.96 && edge.length > 0;

    if (burning) {
      fragAcc += dt * 21;
      while (fragAcc >= 1) { fragAcc -= 1; spawnFragment(); }
      flameAcc += dt * 420;
      while (flameAcc >= 1) {
        flameAcc -= 1;
        var k = ((Math.random() * (edge.length / 2)) | 0) * 2;
        flames.push({ x: EX + edge[k] + rr(-2, 2), y: EY + edge[k + 1] + rr(-1, 2), vx: rr(-12, 12), vy: -rr(55, 135), age: 0, life: rr(0.45, 0.95), size: rr(0.8, 1.5), ph: rr(0, 6.28) });
      }
      sparkAcc += dt * 26;
      while (sparkAcc >= 1) {
        sparkAcc -= 1;
        var k2 = ((Math.random() * (edge.length / 2)) | 0) * 2;
        sparks.push({ x: EX + edge[k2], y: EY + edge[k2 + 1], vx: rr(-30, 30), vy: -rr(80, 170), age: 0, life: rr(0.9, 2) });
      }
    }

    var i;
    for (i = flames.length - 1; i >= 0; i--) {
      var fl = flames[i]; fl.age += dt;
      if (fl.age >= fl.life) { flames.splice(i, 1); continue; }
      fl.x += (fl.vx + Math.sin(fl.age * 9 + fl.ph) * 14) * dt; fl.y += fl.vy * dt;
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var sp = sparks[i]; sp.age += dt;
      if (sp.age >= sp.life) { sparks.splice(i, 1); continue; }
      sp.vy += 40 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
    }
    for (i = frags.length - 1; i >= 0; i--) {
      var f = frags[i]; f.age += dt;
      f.vy += 300 * dt; f.vx *= (1 - 0.8 * dt); f.vx += (CX - f.x) * 1.4 * dt;
      f.x += (f.vx + Math.sin(f.age * 6 + f.ph) * 16) * dt; f.y += f.vy * dt; f.rot += f.w * dt;
      f.size *= (1 - 0.3 * dt);
      if (Math.random() < dt * 22) grains.push({ x: f.x + rr(-2, 2), y: f.y + rr(-1, 2), vx: rr(-10, 10) + (CX - f.x) * 0.15, vy: rr(0, 25), s: (Math.random() * 3) | 0 });
      if (f.age > f.life || f.size < 1.6 || f.y >= FLOOR - heapAt(f.x) - 3) { crumble(f); frags.splice(i, 1); }
    }
    for (i = grains.length - 1; i >= 0; i--) {
      var g = grains[i];
      g.vy += 420 * dt; g.vx *= (1 - 1.6 * dt); g.vx += (CX - g.x) * 1.5 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
      if (g.y >= FLOOR - heapAt(g.x)) { land(g.x); grains.splice(i, 1); }
    }
  }

  /* ---------- render ---------- */
  var GRAY = ['rgb(104,96,88)', 'rgb(78,72,66)', 'rgb(126,117,107)'];

  function render() {
    var tl = simTime;
    var fadeIn = Math.min(1, tl / 0.4);
    var fadeOut = tl > LOOP - 1.3 ? Math.max(0, (LOOP - tl) / 1.3) : 1;
    var life = fadeIn * fadeOut;
    var burnFrac = Math.max(0, Math.min(1, (burnT - T0) / (TEND - T0)));

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = life;

    // light from the fire
    var glowA = Math.sin(Math.min(1, burnFrac * 1.05) * Math.PI) * 0.5 + (burnFrac > 0 ? 0.08 : 0);
    if (glowA > 0.01) {
      var gr = ctx.createRadialGradient(CX, EY + EH / 2, 10, CX, EY + EH / 2, 300);
      gr.addColorStop(0, 'rgba(255,100,30,' + glowA + ')'); gr.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    // the envelope (with a little tremble just before it ignites)
    var trem = (tl > 0.25 && tl < BURN_START + 0.3) ? Math.sin(tl * 90) * 1.2 : 0;
    ctx.drawImage(out, EX + trem, EY);

    // powder heap
    var hd = heapImg.data; hd.fill(0);
    for (var c = 0; c < HW; c++) {
      var h = heights[c];
      for (var k = 0; k < h; k++) {
        var yy = HH - 1 - k, p = (yy * HW + c) * 4;
        var v = 52 + hash2(c, k) * 62 + (k >= h - 3 ? 24 : 0);
        hd[p] = v + 8; hd[p + 1] = v + 3; hd[p + 2] = v - 3; hd[p + 3] = 255;
      }
    }
    heapCtx.putImageData(heapImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(heapCv, HL, FLOOR - HH);
    ctx.imageSmoothingEnabled = true;

    // powder grains in the air
    var i, g;
    for (var s = 0; s < 3; s++) {
      ctx.fillStyle = GRAY[s];
      for (i = 0; i < grains.length; i++) {
        g = grains[i]; if (g.s !== s) continue;
        ctx.fillRect(g.x, g.y, 1.6, 1.6);
      }
    }

    // falling paper bits
    for (i = 0; i < frags.length; i++) {
      var f = frags[i], hot = Math.max(0, 1 - f.age / 0.9);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.beginPath();
      for (var q = 0; q < f.pts.length; q++) {
        var px = f.pts[q][0] * (f.size / Math.max(f.size, 1)) , py = f.pts[q][1];
        if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgb(' + ((38 + hot * 70) | 0) + ',' + ((24 + hot * 20) | 0) + ',' + (16 | 0) + ')';
      ctx.fill();
      if (hot > 0.05) { ctx.strokeStyle = 'rgba(255,150,50,' + (hot * 0.95) + ')'; ctx.lineWidth = 1.2; ctx.stroke(); }
      ctx.restore();
    }

    // flames and sparks (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < flames.length; i++) {
      var fl = flames[i], u = fl.age / fl.life;
      var spr = SP[u < 0.28 ? 0 : (u < 0.62 ? 1 : 2)];
      var sc = fl.size * (u < 0.2 ? 0.6 + u * 2 : 1 - (u - 0.2) * 0.9);
      var sw = 26 * sc, sh = 44 * sc;
      ctx.globalAlpha = life * (1 - u) * 0.55;
      ctx.drawImage(spr, fl.x - sw / 2, fl.y - sh * 0.62, sw, sh);
    }
    for (i = 0; i < sparks.length; i++) {
      var sk = sparks[i];
      ctx.globalAlpha = life * (1 - sk.age / sk.life);
      ctx.fillStyle = '#ffc247';
      ctx.fillRect(sk.x, sk.y, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /* ---------- driver ---------- */
  function simulateTo(T) {
    reset();
    var s = 0, dt = 1 / 60;
    while (s < T) { simTime = s; update(dt); s += dt; }
    simTime = T; render();
  }

  var raf = 0, last = 0, running = false;
  function tick(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.033); last = now;
    simTime += dt;
    if (simTime >= LOOP) { reset(); }
    update(dt); render();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  measure();
  reset();

  var m = /[?&]burnT=([\d.]+)/.exec(location.search);
  if (m) { simulateTo(parseFloat(m[1])); return; }
  if (reduce) { simulateTo(LOOP - 2.2); return; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0.1 }).observe(cv);
  } else { start(); }
  window.addEventListener('resize', function () { measure(); });
})();
