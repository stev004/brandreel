// regulate-612-angry.timing.js - one clock + the Chaos Release run, shared by picture and score.
// Needs lib/timing-kit.js first. The ball simulation is deterministic (seeded, the game's own 60Hz
// step), so the browser and the score compute the identical run: every rattle is a real collision.
// Physics constants are components/ShakeGame.tsx (app main) scaled pt -> px by T.S.
var TIMING = (function () {
  const { beats, E, P, lerp } = TK;
  const T = {
    bpm: [[0, 100], [1500, 108], [3600, 116], [4300, 124], [10000, 124]],
    italic: 300, italicOut: 3450, clockOut: 3550, hud: 3650,
    S: 2.04,                                          // 393pt app screen -> 800px playfield
    field: { x0: 140, y0: 236, x1: 940, y1: 1460 },   // the game's walls (screen edges), safe-area fit
    // the argument, replayed: [text, x, y (top), px, opacity, blur] far -> near
    lines: [
      { text: 'fine.', x: 646, y: 900, size: 42, o: 0.62, blur: 1.2, z: 0.2 },
      { text: 'you always do this', x: 150, y: 1010, size: 56, o: 0.72, blur: 0.6, z: 0.55 },
      { text: 'forget it', x: 352, y: 1144, size: 72, o: 0.95, blur: 0, z: 1 },
    ],
    // shaking bouts: [first jolt ms, jolts at the 110ms cooldown, charge from, charge to]
    bouts: [[4300, 6, 100, 92], [5200, 8, 92, 79], [6270, 8, 79, 58], [7290, 11, 58, 31], [8590, 13, 31, 0]],
    cooldown: 110,   // SHAKE_BURST_COOLDOWN_MS
    update: 60,      // Accelerometer.setUpdateInterval(60): the charge drains per sensor update
    maxBalls: 80,    // MAX_BALLS
  };
  T.beats = beats(400, 10000, T.bpm);
  const after1s = T.beats.filter((b) => b >= 950);
  T.lineIn = [after1s[0], after1s[2], after1s[4]];

  // ---- charge: drains in steps, one per sensor update, only while shaking ----
  const B = T.bouts.map(([st, n, c0, c1]) => { const end = st + (n - 1) * T.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / T.update) + 1 }; });
  T.charge = (t) => { let c = 100; for (const b of B) { if (t < b.st) break; const k = Math.min(b.nU, Math.floor((t - b.st) / T.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
  const LB = B[B.length - 1]; T.zero = LB.st + (LB.nU - 1) * T.update;
  T.bound = (t) => Math.round((T.charge(t) / 100) * T.maxBalls);      // visibleBallCount, as the game
  T.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) { const tj = b.st + k * T.cooldown; if (tj < T.zero) T.jolts.push({ t: tj, b: bi, k }); } });
  const updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) updates.push(b.st + k * T.update); });
  T.milestones = [75, 50, 25].map((v) => updates.find((u) => T.charge(u) <= v));   // triggerMedium
  T.shatter = [B[0].st, B[1].st, B[2].st];

  // ---- after zero: stillness, the point falls, the close ----
  T.hudOut = T.zero + 750;
  T.fall = [T.zero + 950, T.zero + 1800];
  T.closeGlide = T.fall;
  T.wordmark = T.fall[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  T.beats = T.beats.filter((b) => b < T.zero - 250);

  // lines drift, never still (far drifts least)
  T.drift = (i, t) => { const z = T.lines[i].z; return [9 * (0.5 + z) * Math.sin(t / 1700 + i * 2.1), -(0.3 + z) * 4 * (t / 1000) + 5 * Math.sin(t / 1250 + i * 1.3)]; };

  // glyph centres relative to each line's top-left: [char, cx, cy, width], measured from Inter 400 at
  // the sizes above in Chrome (window.__measure() in the animatic) and baked here so Node can run the sim.
  T.glyphs = [[['f', 8, 25.2, 16], ['i', 21, 25.2, 10], ['n', 38.5, 25.2, 25], ['e', 63.5, 25.2, 25], ['.', 81, 25.2, 12]],
    [['y', 15.5, 33.6, 31], ['o', 48, 33.6, 34], ['u', 81.5, 33.6, 33], ['a', 129.5, 33.6, 31], ['l', 152, 33.6, 14], ['w', 182, 33.6, 46], ['a', 220.5, 33.6, 31], ['y', 251.5, 33.6, 31], ['s', 283, 33.6, 30], ['d', 330, 33.6, 34], ['o', 364, 33.6, 34], ['t', 406, 33.6, 18], ['h', 431.5, 33.6, 33], ['i', 455, 33.6, 14], ['s', 477, 33.6, 30]],
    [['f', 13.5, 43.2, 27], ['o', 48.5, 43.2, 43], ['r', 83.5, 43.2, 27], ['g', 119, 43.2, 44], ['e', 162, 43.2, 42], ['t', 195, 43.2, 24], ['i', 235.5, 43.2, 17], ['t', 256, 43.2, 24]]];

  // ---- the balls: each glyph shatters into its share of the swarm ----
  let seed = 612; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const N = T.bound(T.shatter[2]);   // every ball is out by the last shatter, when the charge still holds N
  const G = []; T.glyphs.forEach((gl, li) => gl.forEach((g, gi) => G.push({ li, gi, w: g[3], n: 0 })));
  const base = Math.floor(N / G.length); G.forEach((g) => (g.n = base));
  [...G].sort((a, b) => b.w - a.w).slice(0, N - base * G.length).forEach((g) => g.n++);
  // glyph shatter order ripples out from the line's centre, 9ms per glyph
  T.glyphAt = T.glyphs.map((gl, li) => { const mid = (gl.length - 1) / 2; return gl.map((g, gi) => T.shatter[li] + Math.round(Math.abs(gi - mid)) * 9); });
  const S = T.S, F = T.field, balls = [];
  G.forEach(({ li, gi, n }) => {
    const L = T.lines[li], g = T.glyphs[li][gi], tb = T.glyphAt[li][gi], d = T.drift(li, tb);
    for (let k = 0; k < n; k++) balls.push({ li, tb, x0: L.x + d[0] + g[1] + (rnd() - 0.5) * g[3] * 0.6, y0: L.y + d[1] + g[2] + (rnd() - 0.5) * L.size * 0.35,
      r: ((rnd() * 8 + 10) * S) / 2, col: rnd() > 0.5 ? 0 : 1 });
  });
  const rank = balls.map((_, i) => i); for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  balls.forEach((b, i) => (b.rank = rank[i]));
  T.balls = balls; T.N = N;
  T.alive = (i, t) => t >= balls[i].tb && balls[i].rank < T.bound(t);

  // the game's step: integrate, walls (restitution .92-.98 + tangential jitter), damping .999,
  // speed floor re-energize toward the charge-bound target speed, then equal-mass collisions (.9).
  const n0 = Math.ceil(T.shatter[0] * 0.06), n1 = Math.ceil(T.zero * 0.06) + 2, frames = [], events = [];
  const x = balls.map((b) => b.x0), y = balls.map((b) => b.y0), vx = balls.map(() => 0), vy = balls.map(() => 0), born = balls.map(() => false);
  const impulse = (i, m) => { const f = 0.6 + rnd() * 0.8, a = rnd() * Math.PI * 2; vx[i] += Math.cos(a) * m * 260 * S * f; vy[i] += Math.sin(a) * m * 260 * S * f; const sp = Math.hypot(vx[i], vy[i]), cap = 1200 * S; if (sp > cap) { vx[i] *= cap / sp; vy[i] *= cap / sp; } };
  let ji = 0; const dt = 1 / 60;
  for (let n = n0; n <= n1; n++) {
    const t = n / 0.06, live = balls.map((_, i) => T.alive(i, t));
    const m = 1.05 + 0.35 * Math.sin(n * 0.7);   // shake force in g, above SHAKE_THRESHOLD .35
    balls.forEach((b, i) => { if (!born[i] && t >= b.tb) { born[i] = true; impulse(i, m); } });
    while (ji < T.jolts.length && T.jolts[ji].t <= t) { const J = T.jolts[ji++]; balls.forEach((b, i) => { if (born[i] && live[i] && b.tb < J.t) impulse(i, m); }); }
    const ratio = Math.max(0, Math.min(1, T.charge(t) / 100)), target = (100 + 260 * ratio) * S;
    for (let i = 0; i < balls.length; i++) {
      if (!born[i] || !live[i]) continue;
      const r = balls[i].r, sp0 = Math.hypot(vx[i], vy[i]); let wall = false;
      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      if (x[i] - r < F.x0 || x[i] + r > F.x1) { wall = true; vx[i] = -vx[i] * (0.92 + rnd() * 0.06); vy[i] += (rnd() - 0.5) * 6 * S; x[i] = x[i] - r < F.x0 ? F.x0 + r : F.x1 - r; }
      if (y[i] - r < F.y0 || y[i] + r > F.y1) { wall = true; vy[i] = -vy[i] * (0.92 + rnd() * 0.06); vx[i] += (rnd() - 0.5) * 6 * S; y[i] = y[i] - r < F.y0 ? F.y0 + r : F.y1 - r; }
      if (wall && sp0 > 180 * S && t < T.zero) events.push([t, 0, sp0, x[i]]);
      vx[i] *= 0.999; vy[i] *= 0.999;
      const sp = Math.hypot(vx[i], vy[i]);
      if (sp < target * 0.85) { const a = rnd() * Math.PI * 2, acc = Math.min(target * 0.08, target - sp); vx[i] += Math.cos(a) * acc; vy[i] += Math.sin(a) * acc; }
    }
    for (let i = 0; i < balls.length; i++) {
      if (!born[i] || !live[i]) continue;
      for (let j = i + 1; j < balls.length; j++) {
        if (!born[j] || !live[j]) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i], md = balls[i].r + balls[j].r, d2 = dx * dx + dy * dy;
        if (d2 >= md * md) continue;
        let d = Math.sqrt(d2), nx = 0, ny = 1; if (d > 0.001) { nx = dx / d; ny = dy / d; } else d = 0;
        const sep = (md - d) * 0.52; x[i] -= nx * sep; y[i] -= ny * sep; x[j] += nx * sep; y[j] += ny * sep;
        const rel = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
        if (rel < 0) { const imp = -(1 + 0.9) * rel * 0.5; vx[i] -= nx * imp; vy[i] -= ny * imp; vx[j] += nx * imp; vy[j] += ny * imp; if (-rel > 150 * S && t < T.zero) events.push([t, 1, -rel, (x[i] + x[j]) / 2]); }
      }
    }
    const f = new Float32Array(balls.length * 2); for (let i = 0; i < balls.length; i++) { f[2 * i] = x[i]; f[2 * i + 1] = y[i]; } frames.push(f);
  }
  T.events = events;
  T.posAt = (i, t) => { const f = frames[Math.max(0, Math.min(frames.length - 1, Math.round(t * 0.06) - n0))]; return [f[2 * i], f[2 * i + 1]]; };
  return T;
})();
