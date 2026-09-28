// regulate-angry-held.timing.js - one clock + the Chaos Release run, shared by picture and score.
// Direction 3 "Held." (2026-09-28; family refine 09-28). Needs lib/timing-kit.js first. Holding it in
// compresses the argument into a block and loads the charge 0 -> 100; shaking bursts the block into the
// game's red balls and drains 100 -> 0. The phone, playfield, drain, physics and close are the FAMILY
// BLOCK below, identical in the three Angry reels.
var TIMING = (function () {
  const { beats, E, P, lerp } = TK;
  const T = {
    italicOut: 1750, clockOut: 1850,
    // the argument, held: words of the three lines (loose) and of the two-line block (tight)
    lines: [['fine.'], ['you', 'always', 'do', 'this'], ['forget', 'it']],
    brickLines: [[0, 1, 2], [3, 4, 5, 6]],            // word indices: "fine. you always" / "do this forget it"
    block: { cx: 540, cy: 826, fs: 52, gap: 91 },
  };
  // ==== FAMILY BLOCK: byte-identical in regulate-angry-reply / -loud / -held .timing.js (refine 09-28) ====
  // One phone, one playfield, one drain, one close for the three Angry reels, so they read as a set.
  // Geometry is px on the 1080x1920 frame. The phone is an iPhone-proportioned silhouette: body 408 x 852
  // (2.09:1, as a real iPhone body), screen 390 x 834 (~19.2:9), 9px bezel, centred, inside the Instagram
  // safe area (y 236..1470, clear of x > 940) with the header (clock + headline) above it.
  const FAM = (T.FAM = {
    body: { x0: 336, y0: 597, x1: 744, y1: 1449, rx: 62 },     // the device edge: 2px cream hairline at 22%
    screen: { x0: 345, y0: 606, x1: 735, y1: 1440, rx: 53 },   // the glass: cream at 3% over the ground
    island: { w: 100, h: 28, top: 620 },                       // Dynamic Island, 14px under the glass top
    clock: { px: 160, inkTop: 242 },                           // the hook's timestamp (digit ink top)
    head: { px: 58, gap: 90 },                                 // headline ink top = clock baseline + 90
    num: { px: 127, cy: 1088 }, lab: { y: 1160 }, cue: { y: 1316 },   // the game's HUD (ShakeGame.tsx)
    drawIn: 900,                                               // the phone's draw-in, same motion everywhere
  });
  T.S = (FAM.screen.x1 - FAM.screen.x0) / 393;                 // 393pt app screen -> px (0.99 px/pt)
  // the game's playfield is the screen under the top safe inset (SafeContainer edges=['top'], 59pt)
  T.field = { x0: FAM.screen.x0, x1: FAM.screen.x1, y0: Math.round(FAM.screen.y0 + (59 * (FAM.screen.y1 - FAM.screen.y0)) / 852), y1: FAM.screen.y1 };
  T.cooldown = 110;   // SHAKE_BURST_COOLDOWN_MS: one stroke (jolt) per 110ms
  T.update = 60;      // Accelerometer.setUpdateInterval(60): the charge drains one step per sensor update
  T.maxBalls = 80;    // MAX_BALLS
  T.seeded = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // the instruction beat, identical in all three: "Shake it out instead." in the headline slot, the
  // app's line inside the phone 260ms later, 1.5s to read both, then the first stroke. The app's line
  // is gone before any ball can reach it; the white point hides as the game takes over (gone by the
  // first stroke + 60ms, before the first ball has left its letter).
  T.beat = (instr) => { T.instr = instr; T.instrMono = instr + 260; T.shake = instr + 1500; T.monoOut = T.shake - 120; T.ptHide = T.shake - 160; };

  // the drain: bouts [ms after the first stroke, strokes at the 110ms cooldown, charge from, to];
  // pre(t) is the numeral before the first stroke (story); after it the charge is the game's.
  T.drain = (bouts, pre) => {
    const B = (T.B = bouts.map(([o, n, c0, c1]) => { const st = T.shake + o, end = st + (n - 1) * T.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / T.update) + 1 }; }));
    T.charge = (t) => { if (t < B[0].st) return pre ? pre(t) : 100; let c = 100; for (const b of B) { if (t < b.st) break; const k = Math.min(b.nU, Math.floor((t - b.st) / T.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
    const LB = B[B.length - 1]; T.zero = LB.st + (LB.nU - 1) * T.update;
    T.bound = (t) => (t < B[0].st ? 0 : Math.round((T.charge(t) / 100) * T.maxBalls));   // visibleBallCount
    T.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) { const tj = b.st + k * T.cooldown; if (tj < T.zero) T.jolts.push({ t: tj, b: bi, k }); } });
    T.updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) T.updates.push(b.st + k * T.update); });
    T.milestones = [75, 50, 25].map((v) => T.updates.find((u) => T.charge(u) <= v));      // triggerMedium
  };

  // the game's step (ShakeGame.tsx): integrate, walls (restitution .92-.98 + tangential jitter), damping
  // .999, speed floor toward the charge-bound target, equal-mass collisions (.9). Each stroke kicks every
  // visible ball in its own random direction at m x 260pt/s x .6-1.4, capped 1200pt/s. Deterministic,
  // so the score reads the same run: every rattle is a real collision. birth(b) -> [angle, force] or null.
  T.simulate = (balls, { seed = 612, birth = null } = {}) => {
    const rnd = T.seeded(seed), S = T.S, F = T.field, cap = 1200 * S;
    T.balls = balls; T.N = balls.length;
    T.alive = (i, t) => t >= balls[i].tb && balls[i].rank < T.bound(t);
    // when each ball leaves (the charge drops through its index); the picture fades it over 90ms
    T.gone = balls.map((b) => { const u = T.updates.find((x) => x >= b.tb && Math.round((T.charge(x) / 100) * T.maxBalls) <= b.rank); return u == null ? b.tb : u; });
    const n0 = Math.ceil(T.shake * 0.06), n1 = Math.ceil(T.zero * 0.06) + 8, frames = [], events = [];
    const x = balls.map((b) => b.x0), y = balls.map((b) => b.y0), vx = balls.map(() => 0), vy = balls.map(() => 0), born = balls.map(() => false);
    const kick = (i, m, a) => { const f = 0.6 + rnd() * 0.8; vx[i] += Math.cos(a) * m * 260 * S * f; vy[i] += Math.sin(a) * m * 260 * S * f; const sp = Math.hypot(vx[i], vy[i]); if (sp > cap) { vx[i] *= cap / sp; vy[i] *= cap / sp; } };
    let ji = 0; const dt = 1 / 60;
    for (let n = n0; n <= n1; n++) {
      const t = n / 0.06, live = balls.map((_, i) => T.alive(i, t));
      const m = 1.05 + 0.35 * Math.sin(n * 0.7);   // shake force in g, above SHAKE_THRESHOLD .35
      balls.forEach((b, i) => { if (!born[i] && t >= b.tb) { born[i] = true; const d = birth && birth(b); if (d) kick(i, m * d[1], d[0]); else kick(i, m, rnd() * Math.PI * 2); } });
      while (ji < T.jolts.length && T.jolts[ji].t <= t) { const J = T.jolts[ji++]; balls.forEach((b, i) => { if (born[i] && live[i] && b.tb < J.t) kick(i, m, rnd() * Math.PI * 2); }); }
      const ratio = Math.max(0, Math.min(1, T.charge(t) / 100)), target = (100 + 260 * ratio) * S;
      for (let i = 0; i < balls.length; i++) {
        if (!born[i] || !live[i]) continue;
        const r = balls[i].r, sp0 = Math.hypot(vx[i], vy[i]); let wall = false;
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (x[i] - r < F.x0 || x[i] + r > F.x1) { wall = true; vx[i] = -vx[i] * (0.92 + rnd() * 0.06); vy[i] += (rnd() - 0.5) * 6 * S; x[i] = x[i] - r < F.x0 ? F.x0 + r : F.x1 - r; }
        if (y[i] - r < F.y0 || y[i] + r > F.y1) { wall = true; vy[i] = -vy[i] * (0.92 + rnd() * 0.06); vx[i] += (rnd() - 0.5) * 6 * S; y[i] = y[i] - r < F.y0 ? F.y0 + r : F.y1 - r; }
        if (wall && sp0 > 180 * S && t < T.zero) events.push([t, 0, sp0 / S, x[i]]);
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
          if (rel < 0) { const imp = -(1 + 0.9) * rel * 0.5; vx[i] -= nx * imp; vy[i] -= ny * imp; vx[j] += nx * imp; vy[j] += ny * imp; if (-rel > 150 * S && t < T.zero) events.push([t, 1, -rel / S, (x[i] + x[j]) / 2]); }
        }
      }
      const f = new Float32Array(balls.length * 2); for (let i = 0; i < balls.length; i++) { f[2 * i] = x[i]; f[2 * i + 1] = y[i]; } frames.push(f);
    }
    T.events = events;   // [ms, 0 wall | 1 ball, impact speed in pt/s, x px]
    T.posAt = (i, t) => { const f = frames[Math.max(0, Math.min(frames.length - 1, Math.round(t * 0.06) - n0))]; return [f[2 * i], f[2 * i + 1]]; };
  };

  // after zero, identical in all three: the last ball leaves; the 0 holds in stillness and silence;
  // phone, HUD and header leave; the white point re-emerges alone; it falls into the full stop.
  T.close = () => {
    T.hudOut = T.zero + 700; T.ptBack = T.zero + 1050; T.fall = [T.zero + 1700, T.zero + 2550];
    T.wordmark = T.fall[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
    T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  };
  // ==== END FAMILY BLOCK ====
  // ---- the held phase: three lines on heartbeats, then the squeeze loads the charge ----
  const pre = beats(300, 4000, [[0, 92], [2000, 100], [4000, 112]]);
  const after = (ms) => pre.find((b) => b >= ms);
  T.lineIn = [after(2050)]; T.lineIn.push(after(T.lineIn[0] + 520)); T.lineIn.push(after(T.lineIn[1] + 520));
  T.comp = [T.lineIn[2] + 520, T.lineIn[2] + 520 + 2000];   // the squeeze: 0 -> 100
  T.numIn = T.comp[0] - 120;
  T.held = (t) => E.INOUT(P(t, T.comp[0], T.comp[1] - T.comp[0]));
  T.beat(T.comp[1] + 350);
  T.phone = T.instr + 120;
  T.burst = T.shake;                                         // first stroke: the block bursts

  // five bouts drain 100 -> 0; before the burst the numeral is the squeeze (the reel's metaphor)
  T.drain([[0, 5, 100, 90], [650, 7, 90, 73], [1350, 8, 73, 49], [2100, 8, 49, 23], [2900, 9, 23, 0]], (t) => 100 * T.held(t));
  T.shown = (t) => (t < T.burst ? Math.round(T.charge(t)) : Math.ceil(T.charge(t)));
  T.close();

  // heartbeat: calm under the hook, climbing as it is held, easing off under the shaking
  T.bpm = [[0, 92], [2000, 100], [T.comp[0], 110], [T.comp[1], 134], [T.burst, 134], [T.burst + 1400, 112], [T.zero, 90]];
  T.beats = beats(300, T.zero, T.bpm).filter((b) => b < T.zero - 400);

  // the tight block's rect at full squeeze (measured in Chrome, window.__measure()), for the burst
  T.brick = { x0: 393, x1: 687, y0: 798, y1: 860 };
  const BR = T.brick, bcx = (BR.x0 + BR.x1) / 2, bcy = (BR.y0 + BR.y1) / 2;
  T.RIPPLE = 120; T.RIPPLE_D = Math.hypot(BR.x1 - bcx, BR.y1 - bcy);   // the burst ripples out from the centre over 120ms
  T.rippleAt = (x, y) => T.burst + Math.round(Math.min(1, Math.hypot(x - bcx, y - bcy) / T.RIPPLE_D) * T.RIPPLE);

  // ---- the balls: the block bursts from the inside into the game's full swarm ----
  const rnd = T.seeded(612), balls = [];
  for (let k = 0; k < T.maxBalls; k++) {
    const x0 = lerp(BR.x0 + 8, BR.x1 - 8, rnd()), y0 = lerp(BR.y0 + 6, BR.y1 - 6, rnd());
    balls.push({ x0, y0, tb: T.rippleAt(x0, y0), r: ((rnd() * 8 + 10) * T.S) / 2, col: rnd() > 0.5 ? 0 : 1 });
  }
  const rank = balls.map((_, i) => i); for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  balls.forEach((b, i) => (b.rank = rank[i]));
  // birth: each ball leaves the block outward (a burst from the inside); later strokes are the game's
  T.simulate(balls, { seed: 614, birth: (b) => [Math.atan2(b.y0 - bcy, (b.x0 - bcx) * 0.45) + (rnd() - 0.5) * 0.9, 1.25] });
  return T;
})();
