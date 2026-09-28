// regulate-angry-held.timing.js - one clock + the Chaos Release run, shared by picture and score.
// Needs lib/timing-kit.js first. Direction 3, "Held.": holding it in compresses the argument into a
// block and loads the charge 0 -> 100; shaking bursts the block into the game's red balls and drains
// 100 -> 0. The ball simulation is deterministic (seeded, the game's own 60Hz step), so the browser
// and the score compute the identical run: every rattle is a real collision.
// Physics constants are components/ShakeGame.tsx (app main) scaled pt -> px by T.S.
var TIMING = (function () {
  const { beats, E, P, lerp } = TK;
  const T = {
    italic: 150, italicOut: 1750, clockOut: 1850,
    S: 1.63,                                          // 393pt app screen -> 640px phone
    field: { x0: 220, y0: 236, x1: 860, y1: 1200 },   // the phone's screen edges = the game's walls
    // the argument, held: words of the three lines (loose) and of the two-line block (tight)
    lines: [['fine.'], ['you', 'always', 'do', 'this'], ['forget', 'it']],
    brickLines: [[0, 1, 2], [3, 4, 5, 6]],            // word indices: "fine. you always" / "do this forget it"
    block: { cx: 540, cy: 700, fs: 64, gap: 112 },
    cooldown: 110,   // SHAKE_BURST_COOLDOWN_MS
    update: 60,      // Accelerometer.setUpdateInterval(60): the charge drains per sensor update
    maxBalls: 80,    // MAX_BALLS
  };

  // ---- the held phase: three lines on heartbeats, then the squeeze loads the charge ----
  const pre = beats(300, 4000, [[0, 92], [2000, 100], [4000, 112]]);
  const after = (ms) => pre.find((b) => b >= ms);
  T.lineIn = [after(2050)]; T.lineIn.push(after(T.lineIn[0] + 520)); T.lineIn.push(after(T.lineIn[1] + 520));
  T.comp = [T.lineIn[2] + 480, T.lineIn[2] + 480 + 2000];   // the squeeze: 0 -> 100
  T.numIn = T.comp[0] - 120;
  T.instr = T.comp[1] + 300; T.mono = T.instr + 260; T.phone = T.instr + 120;
  T.burst = T.instr + 1450;                                  // first shake: the block bursts
  T.held = (t) => E.INOUT(P(t, T.comp[0], T.comp[1] - T.comp[0]));

  // shaking bouts: [first jolt ms (from burst), jolts at the 110ms cooldown, charge from, charge to]
  T.bouts = [[0, 5, 100, 90], [650, 7, 90, 73], [1350, 8, 73, 49], [2100, 8, 49, 23], [2900, 9, 23, 0]].map(([o, n, a, b]) => [T.burst + o, n, a, b]);
  T.headOut = T.bouts[2][0];                                 // the instruction leaves once the shaking is established

  // ---- charge: rises with the squeeze; then drains in steps, one per sensor update, only while shaking ----
  const B = T.bouts.map(([st, n, c0, c1]) => { const end = st + (n - 1) * T.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / T.update) + 1 }; });
  T.charge = (t) => { if (t < T.burst) return 100 * T.held(t); let c = 100; for (const b of B) { if (t < b.st) break; const k = Math.min(b.nU, Math.floor((t - b.st) / T.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
  const LB = B[B.length - 1]; T.zero = LB.st + (LB.nU - 1) * T.update;
  T.bound = (t) => (t < T.burst ? 0 : Math.round((T.charge(t) / 100) * T.maxBalls));   // visibleBallCount, as the game
  T.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) { const tj = b.st + k * T.cooldown; if (tj < T.zero) T.jolts.push({ t: tj, b: bi, k }); } });
  const updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) updates.push(b.st + k * T.update); });
  T.milestones = [75, 50, 25].map((v) => updates.find((u) => T.charge(u) <= v));   // triggerMedium

  // ---- after zero: stillness, the point falls, the close ----
  T.hudOut = T.zero + 600;
  T.fall = [T.zero + 800, T.zero + 1650];
  T.wordmark = T.fall[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2000) / 100) * 100;

  // heartbeat: calm under the hook, climbing as it is held, fading out under the shaking
  T.bpm = [[0, 92], [2000, 100], [T.comp[0], 110], [T.comp[1], 134], [T.burst, 134], [T.burst + 1400, 112], [T.zero, 90]];
  T.beats = beats(300, T.zero, T.bpm).filter((b) => b < T.zero - 250);

  // the tight block's rect (measured in Chrome at full squeeze, window.__measure()), for the burst
  T.brick = { x0: 358, x1: 722, y0: 666, y1: 741 };
  const BR = T.brick, bcx = (BR.x0 + BR.x1) / 2, bcy = (BR.y0 + BR.y1) / 2;
  T.RIPPLE = 120; T.RIPPLE_D = 215;   // burst ripples out from the block's centre over 120ms
  T.rippleAt = (x, y) => T.burst + Math.round(Math.min(1, Math.hypot(x - bcx, y - bcy) / T.RIPPLE_D) * T.RIPPLE);

  // ---- the balls: the block bursts from the inside into the game's full swarm ----
  let seed = 612; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const S = T.S, F = T.field, balls = [], N = T.maxBalls;
  for (let k = 0; k < N; k++) {
    const x0 = lerp(BR.x0 + 10, BR.x1 - 10, rnd()), y0 = lerp(BR.y0 + 8, BR.y1 - 8, rnd());
    balls.push({ x0, y0, tb: T.rippleAt(x0, y0), r: ((rnd() * 8 + 10) * S) / 2, col: rnd() > 0.5 ? 0 : 1 });
  }
  const rank = balls.map((_, i) => i); for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  balls.forEach((b, i) => (b.rank = rank[i]));
  T.balls = balls; T.N = N;
  T.alive = (i, t) => t >= balls[i].tb && balls[i].rank < T.bound(t);

  // the game's step: integrate, walls (restitution .92-.98 + tangential jitter), damping .999,
  // speed floor re-energize toward the charge-bound target speed, then equal-mass collisions (.9).
  // Birth: each ball leaves the block outward (a burst from the inside); every later jolt kicks every
  // ball in its own random direction, as the game.
  const n0 = Math.ceil(T.burst * 0.06), n1 = Math.ceil(T.zero * 0.06) + 2, frames = [], events = [];
  const x = balls.map((b) => b.x0), y = balls.map((b) => b.y0), vx = balls.map(() => 0), vy = balls.map(() => 0), born = balls.map(() => false);
  const cap = 1200 * S;
  const kick = (i, m, a) => { const f = 0.6 + rnd() * 0.8; vx[i] += Math.cos(a) * m * 260 * S * f; vy[i] += Math.sin(a) * m * 260 * S * f; const sp = Math.hypot(vx[i], vy[i]); if (sp > cap) { vx[i] *= cap / sp; vy[i] *= cap / sp; } };
  let ji = 0; const dt = 1 / 60;
  for (let n = n0; n <= n1; n++) {
    const t = n / 0.06, live = balls.map((_, i) => T.alive(i, t));
    const m = 1.05 + 0.35 * Math.sin(n * 0.7);   // shake force in g, above SHAKE_THRESHOLD .35
    balls.forEach((b, i) => { if (!born[i] && t >= b.tb) { born[i] = true; kick(i, m * 1.25, Math.atan2(b.y0 - bcy, (b.x0 - bcx) * 0.45) + (rnd() - 0.5) * 0.9); } });
    while (ji < T.jolts.length && T.jolts[ji].t <= t) { const J = T.jolts[ji++]; balls.forEach((b, i) => { if (born[i] && live[i] && b.tb < J.t) kick(i, m, rnd() * Math.PI * 2); }); }
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
