/* ============================================================
   effects.js — animaciones de victoria sobre un canvas a pantalla completa
   ------------------------------------------------------------
   FX.random(x, y)   → lanza un efecto aleatorio desde (x, y)
   FX.champion()     → traca final para el campeón
   Efectos: confeti, fuegos artificiales, humo, bengala, onda.
   ============================================================ */
const FX = (() => {
  const cv = document.getElementById('fx');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let parts = [];      // partículas
  let emitters = [];   // emisores con duración (bengalas, cohetes)
  let raf = null, last = 0;

  const PAL = ['#f1601f', '#ff8c42', '#ffb347', '#ffd166', '#ffffff', '#ff4d4d', '#ffe3c4'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function start() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, W, H);

    for (const e of emitters) { e.t += dt; e.fn(e, dt); }
    emitters = emitters.filter(e => e.t < e.dur);

    for (const p of parts) { p.t += dt; p.update(p, dt); }
    parts = parts.filter(p => p.t < p.ttl);

    for (const p of parts) {
      ctx.globalCompositeOperation = p.blend || 'source-over';
      p.draw(p);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (parts.length || emitters.length) raf = requestAnimationFrame(tick);
    else { raf = null; ctx.clearRect(0, 0, W, H); }
  }

  const fade = (p, tail = 0.5) => Math.max(0, Math.min(1, (p.ttl - p.t) / tail));

  /* ---------- CONFETI ---------- */
  const confettiUpdate = (p, dt) => {
    p.vy += 820 * dt;
    p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx * dt + Math.sin(p.t * p.fl) * 45 * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  };
  const confettiDraw = p => {
    ctx.save();
    ctx.globalAlpha = fade(p, 0.7);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    const h = Math.max(1.2, p.h * Math.abs(Math.cos(p.t * p.fl * 1.3)));
    ctx.fillRect(-p.w / 2, -h / 2, p.w, h);
    ctx.restore();
  };
  function confetti(x, y, n = 170, spread = 1) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x, y, t: 0, ttl: rnd(2.2, 3.4),
        vx: rnd(-420, 420) * spread, vy: rnd(-760, -220),
        rot: rnd(0, Math.PI * 2), vr: rnd(-9, 9), fl: rnd(4, 9),
        w: rnd(6, 11), h: rnd(4, 7), c: pick(PAL),
        update: confettiUpdate, draw: confettiDraw,
      });
    }
    start();
  }

  /* ---------- FUEGOS ARTIFICIALES ---------- */
  const sparkUpdate = (p, dt) => {
    p.px = p.x; p.py = p.y;
    p.vy += p.g * dt;
    const d = Math.pow(0.08, dt);  // rozamiento
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  };
  const sparkDraw = p => {
    const a = fade(p, 0.6) * (0.75 + 0.25 * Math.sin(p.t * 40));
    ctx.globalAlpha = a;
    ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  };
  function explode(x, y, color, n = 95) {
    const c2 = Math.random() < 0.5 ? color : pick(PAL);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(90, 460);
      parts.push({
        x, y, px: x, py: y, t: 0, ttl: rnd(0.9, 1.8),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 240,
        s: rnd(1.6, 3), c: Math.random() < 0.7 ? color : c2, blend: 'lighter',
        update: sparkUpdate, draw: sparkDraw,
      });
    }
    // destello central
    parts.push({ x, y, t: 0, ttl: 0.25, r: 6, c: '#fff', blend: 'lighter', update: () => {}, draw: flashDraw });
  }
  const flashDraw = p => {
    const k = 1 - p.t / p.ttl;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70 * k + 10);
    g.addColorStop(0, 'rgba(255,255,255,' + 0.9 * k + ')');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 80, 0, Math.PI * 2); ctx.fill();
  };
  const rocketUpdate = (p, dt) => {
    p.vy += p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // estela
    if (Math.random() < 0.9) parts.push({
      x: p.x + rnd(-1.5, 1.5), y: p.y, px: p.x, py: p.y + 6, t: 0, ttl: rnd(0.2, 0.45),
      vx: rnd(-20, 20), vy: rnd(40, 120), g: 0, s: 1.4, c: '#ffd9a8', blend: 'lighter',
      update: sparkUpdate, draw: sparkDraw,
    });
    if (p.t >= p.fuse) { explode(p.x, p.y, p.c); p.t = p.ttl; }
  };
  const rocketDraw = p => {
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
  };
  function fireworks(x, y, count = 4, delayStep = 0.22) {
    const g = 520;
    emitters.push({
      t: 0, dur: count * delayStep + 0.01, fired: 0,
      fn(e) {
        while (e.fired < count && e.t >= e.fired * delayStep) {
          const tx = Math.max(60, Math.min(W - 60, x + rnd(-260, 260)));
          const ty = Math.max(80, y + rnd(-120, 60));
          const d = H - ty + 10;
          const vy = -Math.sqrt(2 * g * d);
          parts.push({
            x: tx + rnd(-30, 30), y: H + 10, t: 0, ttl: 10, fuse: (-vy / g) * 0.96,
            vx: rnd(-25, 25), vy, g, c: pick(PAL.filter(c => c !== '#ffffff')),
            update: rocketUpdate, draw: rocketDraw,
          });
          e.fired++;
        }
      },
    });
    start();
  }

  /* ---------- HUMO ---------- */
  const smokeUpdate = (p, dt) => {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx += Math.sin(p.t * 1.7 + p.seed) * 20 * dt;
    p.vy *= Math.pow(0.5, dt);
    p.r += p.gr * dt;
  };
  const smokeDraw = p => {
    const k = p.t / p.ttl;
    const a = Math.sin(Math.PI * k) * p.a;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, 'rgba(' + p.c + ',' + a + ')');
    g.addColorStop(0.6, 'rgba(' + p.c + ',' + a * 0.45 + ')');
    g.addColorStop(1, 'rgba(' + p.c + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  };
  function smoke(x, y, n = 42) {
    for (let i = 0; i < n; i++) {
      const warm = Math.random() < 0.35;
      parts.push({
        x: x + rnd(-24, 24), y: y + rnd(-10, 10), t: 0, ttl: rnd(1.8, 3.2), seed: rnd(0, 9),
        vx: rnd(-55, 55), vy: rnd(-150, -50), r: rnd(8, 18), gr: rnd(38, 80),
        a: rnd(0.22, 0.4), c: warm ? '241,120,60' : '205,205,205',
        update: smokeUpdate, draw: smokeDraw,
      });
    }
    // brasas
    for (let i = 0; i < 18; i++) {
      parts.push({
        x: x + rnd(-20, 20), y, px: x, py: y, t: 0, ttl: rnd(0.8, 1.6),
        vx: rnd(-80, 80), vy: rnd(-260, -80), g: -60, s: rnd(1, 2), c: '#ffb347', blend: 'lighter',
        update: sparkUpdate, draw: sparkDraw,
      });
    }
    start();
  }

  /* ---------- BENGALA ---------- */
  function sparkler(x, y, dur = 1.7) {
    emitters.push({
      t: 0, dur, x, y,
      fn(e, dt) {
        const k = 1 - e.t / e.dur;
        const n = Math.ceil(1100 * dt * (0.4 + k));
        for (let i = 0; i < n; i++) {
          const a = rnd(0, Math.PI * 2), v = rnd(120, 760) * (0.5 + k);
          parts.push({
            x: e.x, y: e.y, px: e.x, py: e.y, t: 0, ttl: rnd(0.12, 0.55),
            vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520,
            s: rnd(0.8, 1.8), c: Math.random() < 0.6 ? '#fff6dc' : pick(['#ffd166', '#ffb347', '#f1601f']),
            blend: 'lighter', update: sparkUpdate, draw: sparkDraw,
          });
        }
        // núcleo brillante parpadeante
        ctx.globalCompositeOperation = 'lighter';
        const r = rnd(5, 11) * (0.5 + k);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,230,170,.7)');
        g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      },
    });
    start();
  }

  /* ---------- ONDA + ESTRELLAS ---------- */
  const ringDraw = p => {
    const k = p.t / p.ttl;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = p.c; ctx.lineWidth = 6 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 10 + p.R * Math.sqrt(k), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const starUpdate = (p, dt) => { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; };
  const starDraw = p => {
    ctx.save();
    ctx.globalAlpha = fade(p, 0.5);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? p.s * 0.45 : p.s;
      const a = (i / 10) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  function ring(x, y) {
    for (let i = 0; i < 3; i++) {
      parts.push({ x, y, t: -i * 0.12, ttl: 0.9, R: 220 + i * 40, c: i === 1 ? '#fff' : '#f1601f', blend: 'lighter', update: () => {}, draw: p => { if (p.t > 0) ringDraw(p); } });
    }
    for (let i = 0; i < 46; i++) {
      const a = rnd(0, Math.PI * 2), v = rnd(140, 520);
      parts.push({
        x, y, t: 0, ttl: rnd(0.9, 1.6), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120,
        rot: rnd(0, 6), vr: rnd(-8, 8), s: rnd(5, 11), c: pick(['#fff', '#ffd166', '#f1601f', '#ffb347']),
        update: starUpdate, draw: starDraw,
      });
    }
    start();
  }

  /* ---------- API ---------- */
  const EFFECTS = { confetti, fireworks, smoke, sparkler, ring };
  const NAMES = Object.keys(EFFECTS);
  let lastName = null;

  function random(x, y) {
    let name = pick(NAMES);
    if (name === lastName) name = pick(NAMES.filter(n => n !== lastName)); // evita repetir
    lastName = name;
    EFFECTS[name](x, y);
    return name;
  }

  function champion() {
    confetti(W * 0.15, H * 0.2, 220, 0.8);
    confetti(W * 0.85, H * 0.2, 220, 0.8);
    fireworks(W * 0.5, H * 0.35, 7, 0.28);
    setTimeout(() => sparkler(W * 0.25, H * 0.55, 2), 600);
    setTimeout(() => sparkler(W * 0.75, H * 0.55, 2), 900);
    setTimeout(() => ring(W * 0.5, H * 0.5), 1200);
    setTimeout(() => confetti(W * 0.5, H * 0.1, 260, 1.2), 1500);
  }

  return { random, champion, ...EFFECTS };
})();
