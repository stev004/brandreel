// regulate-angry-loud.timing.js - one clock + the Chaos Release run, shared by picture and score.
// Needs lib/timing-kit.js first. The ball simulation is deterministic (seeded, the game's own 60Hz
// step), so the browser and the score compute the identical run: every rattle is a real collision.
// Physics constants are components/ShakeGame.tsx (app main) scaled pt -> px by T.S.
// Started from regulate-612-angry.timing.js (same physics); Direction 2 "Loud." changes the story:
// one line replayed four times on heartbeats, each 1.4x larger; the stack shatters top-down.
var TIMING = (function () {
  const { beats, E, P, lerp } = TK;
  const T = {
    bpm: [[0, 100], [2100, 100], [4700, 124], [20000, 124]],   // the heartbeat climbs with the replays
    italic: 250, italicOut: 1850,
    S: 1.934,                                         // 393pt app screen -> 760px playfield
    field: { x0: 160, y0: 236, x1: 920, y1: 1460 },   // the game's walls (the phone's edges), safe-area fit with jolt margin
    // the replay, four times: [px, top y, opacity]; each 1.4x the last, centred, stacking down the frame
    // w = measured line width (Inter 500, letter-spacing -0.01em) so the lines centre without layout
    lines: [
      { size: 52, y: 650, o: 0.62, w: 192 },
      { size: 73, y: 736, o: 0.74, w: 269 },
      { size: 102, y: 853, o: 0.88, w: 376 },
      { size: 143, y: 1013, o: 1, w: 527 },
    ],
    text: 'forget it',
    cooldown: 110,   // SHAKE_BURST_COOLDOWN_MS
    update: 60,      // Accelerometer.setUpdateInterval(60): the charge drains per sensor update
    maxBalls: 80,    // MAX_BALLS
  };
  T.lines.forEach((L) => (L.x = 540 - L.w / 2));
  const allBeats = beats(400, 20000, T.bpm);
  // replays land on heartbeats once the hook has been read: two beats, two beats, then one (it speeds up)
  const i0 = allBeats.findIndex((b) => b >= 2150);
  T.lineIn = [allBeats[i0], allBeats[i0 + 2], allBeats[i0 + 4], allBeats[i0 + 5]];
  T.born = T.lineIn[3];                 // the charge numeral is born with the fourth replay, at 100
  T.clockOut = T.born + 220;            // the clock blows out as it lands (after its snap); its lower dot is the point
  T.instr = T.born + 1450;              // Shake it out instead.
  T.instrMono = T.instr + 260;          // SHAKE YOUR DEVICE TO DRAIN THE CHARGE
  T.edge = T.instr + 420;               // the device's edge draws in
  T.shake = T.instr + 1300;

  // shaking bouts relative to T.shake: [offset, jolts at the 110ms cooldown, charge from, charge to]
  // the first four each break one replay, top-down; then two bouts drain the rest
  T.bouts = [[0, 5, 100, 93], [580, 5, 93, 85], [1160, 6, 85, 74], [1740, 7, 74, 61], [2560, 9, 61, 30], [3500, 10, 30, 0]]
    .map(([o, n, a, b]) => [T.shake + o, n, a, b]);

  // ---- charge: drains in steps, one per sensor update, only while shaking ----
  const B = T.bouts.map(([st, n, c0, c1]) => { const end = st + (n - 1) * T.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / T.update) + 1 }; });
  T.charge = (t) => { let c = 100; for (const b of B) { if (t < b.st) break; const k = Math.min(b.nU, Math.floor((t - b.st) / T.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
  const LB = B[B.length - 1]; T.zero = LB.st + (LB.nU - 1) * T.update;
  T.bound = (t) => Math.round((T.charge(t) / 100) * T.maxBalls);      // visibleBallCount, as the game
  T.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) { const tj = b.st + k * T.cooldown; if (tj < T.zero) T.jolts.push({ t: tj, b: bi, k }); } });
  const updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) updates.push(b.st + k * T.update); });
  T.milestones = [75, 50, 25].map((v) => updates.find((u) => T.charge(u) <= v));   // triggerMedium
  T.shatter = [B[0].st, B[1].st, B[2].st, B[3].st];

  // ---- after zero: stillness, the point falls, the close ----
  T.hudOut = T.zero + 600;
  T.fall = [T.zero + 850, T.zero + 1600];
  T.wordmark = T.fall[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 1700) / 100) * 100;
  T.beats = allBeats.filter((b) => b < T.shake - 150);

  // glyph centres relative to each line's top-left: [char, cx, cy, width], measured from Inter 500
  // (letter-spacing -0.01em) at the four sizes in Chrome and baked here so Node can run the sim.
  T.glyphs = [
    [['f', 9.5, 31.2, 19], ['o', 34.5, 31.2, 31], ['r', 60, 31.2, 20], ['g', 86, 31.2, 32], ['e', 116, 31.2, 30], ['t', 139.5, 31.2, 17], ['i', 168.5, 31.2, 13], ['t', 183.5, 31.2, 17]],
    [['f', 13.5, 43.8, 27], ['o', 48.5, 43.8, 43], ['r', 84, 43.8, 28], ['g', 120.5, 43.8, 45], ['e', 163, 43.8, 42], ['t', 197, 43.8, 24], ['i', 236, 43.8, 18], ['t', 257, 43.8, 24]],
    [['f', 19, 61.2, 38], ['o', 68.5, 61.2, 61], ['r', 117, 61.2, 38], ['g', 168, 61.2, 62], ['e', 228.5, 61.2, 59], ['t', 275, 61.2, 34], ['i', 330.5, 61.2, 25], ['t', 359, 61.2, 34]],
    [['f', 26.5, 85.8, 53], ['o', 95.5, 85.8, 85], ['r', 165, 85.8, 54], ['g', 235.5, 85.8, 87], ['e', 320.5, 85.8, 83], ['t', 384.5, 85.8, 47], ['i', 462.5, 85.8, 35], ['t', 503.5, 85.8, 47]]];

  // ---- the balls: each glyph shatters into its share of the swarm (bigger replay, more balls) ----
  let seed = 1400; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const N = T.bound(T.shatter[3]);   // every ball is out by the last shatter, when the charge still holds N
  const G = []; T.glyphs.forEach((gl, li) => gl.forEach((g, gi) => G.push({ li, gi, w: g[3], n: 0 })));
  const W = G.reduce((a, g) => a + g.w, 0);
  G.forEach((g) => (g.n = Math.floor((N * g.w) / W)));
  [...G].sort((a, b) => b.w - a.w).slice(0, N - G.reduce((a, g) => a + g.n, 0)).forEach((g) => g.n++);
  // glyph shatter order ripples out from the line's centre, 9ms per glyph
  T.glyphAt = T.glyphs.map((gl, li) => { const mid = (gl.length - 1) / 2; return gl.map((g, gi) => T.shatter[li] + Math.round(Math.abs(gi - mid)) * 9); });
  const S = T.S, F = T.field, balls = [];
  G.forEach(({ li, gi, n }) => {
    const L = T.lines[li], g = T.glyphs[li][gi], tb = T.glyphAt[li][gi];
    for (let k = 0; k < n; k++) balls.push({ li, tb, x0: L.x + g[1] + (rnd() - 0.5) * g[3] * 0.6, y0: L.y + g[2] + (rnd() - 0.5) * L.size * 0.35,
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
