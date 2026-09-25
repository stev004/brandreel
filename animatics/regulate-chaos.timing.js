// regulate-chaos.timing.js - clock + physics for the Chaos Release reel, shared by picture and score.
// Needs lib/timing-kit.js first. The particle simulation is deterministic (seeded, fixed 240Hz step),
// so the browser and the score compute the identical run: the score sonifies the real collisions.
var TIMING = (function () {
  const { beats, E, P, lerp, sched } = TK;
  const T = {
    dur: 15500,
    bpm: [[0, 104], [3400, 118], [4300, 124], [9000, 96], [9800, 72]],
    hookSwap: 2200, shakeText: 3150,
    bursts: [4300, 5250, 6100, 6850, 7450, 7950, 8350, 8700, 9000],   // slow first, then a cascade
    charges: [100, 90, 80, 68, 55, 41, 27, 14, 6, 0],
    hud: 3950, hudOut: 9500, calm: [9500, 10100],
    rate: { in: 10100, onScale: 10350, slide: [10800, 11400], out: 11900 },
    closeGlide: [12000, 12700], wordmark: 12700, tag: 13350, cta: 13750,
    N: 80,
  };
  T.beats = beats(250, 9900, T.bpm);
  // charge: 100 until the first shake, then each shake drains it a step (settle curve)
  T.charge = (t) => { let c = 100; T.bursts.forEach((b, i) => { const u = E.SETTLE(P(t, b, 450)); if (t > b) c = lerp(T.charges[i], T.charges[i + 1], u); }); return c; };
  // the box: pressurised and shrinking, then the walls give on the first shake
  T.walls = (t) => {
    const B0 = T.bursts[0];
    if (t < B0) { const u = P(Math.max(0, t), 0, B0 - 100); return [lerp(110, 170, u), lerp(860, 960, u), lerp(970, 910, u), lerp(1740, 1680, u)]; }
    const u = E.HOUSE(P(t, B0, 380)); return [lerp(170, 30, u), lerp(960, 150, u), lerp(910, 1050, u), lerp(1680, 1890, u)];
  };

  // ---- deterministic simulation ----
  let seed = 7; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const N = T.N, r = [], x = [], y = [], vx = [], vy = [], col = [];
  for (let i = 0; i < N; i++) {
    r[i] = 12 + 10 * rnd(); col[i] = rnd() < 0.5 ? 0 : 1;
    x[i] = 140 + (i % 10) * 76 + rnd() * 20; y[i] = 900 + Math.floor(i / 10) * 96 + rnd() * 20;
    const a = rnd() * Math.PI * 2, s = 700 + rnd() * 450; vx[i] = Math.cos(a) * s; vy[i] = Math.sin(a) * s;
  }
  // removal order: a shuffled rank; the survivor (rank 0) is the last one standing
  const rank = Array.from({ length: N }, (_, i) => i); for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  T.survivor = rank.indexOf(0); T.col = col; T.r = r;
  const alive = (i, t) => rank[i] < Math.max(1, Math.round((N * T.charge(t)) / 100));
  T.removedAt = new Array(N).fill(Infinity);
  const DT = 1000 / 240, SIM_END = T.calm[1] + 400, frames = [], events = [];
  let burstIdx = 0;
  const PRE = 1500; // pre-roll so frame 0 is already alive, not a starting grid
  for (let step = 0, t = -PRE; t <= SIM_END; step++, t = step * DT - PRE) {
    if (burstIdx < T.bursts.length && t >= T.bursts[burstIdx]) { for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, s = 1300 + rnd() * 500; vx[i] += Math.cos(a) * s; vy[i] += Math.sin(a) * s; } burstIdx++; }
    const [x0, y0, x1, y1] = T.walls(t), dt = DT / 1000;
    for (let i = 0; i < N; i++) {
      if (t >= 0 && T.removedAt[i] === Infinity && !alive(i, t)) T.removedAt[i] = t;
      if (T.removedAt[i] < t) continue;
      const sp = Math.hypot(vx[i], vy[i]);
      if (i === T.survivor && t > T.calm[0]) { vx[i] *= 0.985; vy[i] *= 0.985; }
      else { const floor = t < T.bursts[0] ? 820 : 380, cap = 2400; const k = sp < floor ? floor / Math.max(sp, 1) : sp > cap ? cap / sp : 0.9995; vx[i] *= k; vy[i] *= k; }
      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      if (x[i] - r[i] < x0) { x[i] = x0 + r[i]; if (vx[i] < 0) { if (-vx[i] > 500) (t >= 0) && events.push([t, 0, -vx[i], x[i]]); vx[i] = -vx[i]; } }
      if (x[i] + r[i] > x1) { x[i] = x1 - r[i]; if (vx[i] > 0) { if (vx[i] > 500) (t >= 0) && events.push([t, 0, vx[i], x[i]]); vx[i] = -vx[i]; } }
      if (y[i] - r[i] < y0) { y[i] = y0 + r[i]; if (vy[i] < 0) { if (-vy[i] > 500) (t >= 0) && events.push([t, 0, -vy[i], x[i]]); vy[i] = -vy[i]; } }
      if (y[i] + r[i] > y1) { y[i] = y1 - r[i]; if (vy[i] > 0) { if (vy[i] > 500) (t >= 0) && events.push([t, 0, vy[i], x[i]]); vy[i] = -vy[i]; } }
    }
    for (let i = 0; i < N; i++) {
      if (T.removedAt[i] < t) continue;
      for (let j = i + 1; j < N; j++) {
        if (T.removedAt[j] < t) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i], d = Math.hypot(dx, dy), m = r[i] + r[j];
        if (d >= m || d === 0) continue;
        const nx = dx / d, ny = dy / d, rel = (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
        const push = (m - d) / 2; x[i] -= nx * push; y[i] -= ny * push; x[j] += nx * push; y[j] += ny * push;
        if (rel > 0) { vx[i] -= rel * nx; vy[i] -= rel * ny; vx[j] += rel * nx; vy[j] += rel * ny; if (rel > 350) (t >= 0) && events.push([t, 1, rel, (x[i] + x[j]) / 2]); }
      }
    }
    if (t >= -0.001 && step % 4 === 0) { const f = new Float32Array(N * 2); for (let i = 0; i < N; i++) { f[2 * i] = x[i]; f[2 * i + 1] = y[i]; } frames.push(f); }
  }
  T.frames = frames; T.events = events; T.simEnd = SIM_END;
  T.posAt = (i, t) => { const f = Math.min(frames.length - 1, Math.max(0, Math.round(t * 0.06))); return [frames[f][2 * i], frames[f][2 * i + 1]]; };
  return T;
})();
