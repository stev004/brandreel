// regulate-angry-reply.timing.js - one clock + the Chaos Release run, shared by picture and score.
// Direction 1 "Typing the reply you won't send." (2026-09-28). Needs lib/timing-kit.js first.
// The draft types itself on heartbeats and every keystroke loads the charge (0 -> 34 -> 67 -> 100);
// deleting a line never gives any back. Then the phone is shaken: the ball simulation below is
// deterministic (seeded, the game's own 60Hz step), so the browser and the score compute the
// identical run: every rattle is a real collision. Physics constants are components/ShakeGame.tsx
// (app main) scaled pt -> px by T.S (the phone outline is the game's screen edge).
var TIMING = (function () {
  const { beats, P } = TK;
  const T = {
    bpm: [[0, 96], [1500, 104], [3000, 114], [4600, 124], [6600, 128], [12000, 128]],
    phone: { x0: 310, y0: 630, x1: 770, y1: 1460, rx: 64 },
    phoneIn: 1250, numIn: 1500, cursorIn: 1600,
    base: 830,          // the draft's baseline (every line sits on it, so the cursor never jumps)
    textX: 344,         // the draft's left edge inside the phone
    // the draft, retyped bigger and hotter: [text, px, heat 0 cream .. 1 Angry, charge when typed]
    lines: [
      { text: 'fine.', size: 36, heat: 0, to: 34, ms: 80, hold: 430, del: 38 },
      { text: 'you always do this', size: 44, heat: 0.45, to: 67, ms: 42, hold: 470, del: 16 },
      { text: 'forget it', size: 76, heat: 1, to: 100, ms: 55 },
    ],
    cooldown: 110,   // SHAKE_BURST_COOLDOWN_MS
    update: 60,      // Accelerometer.setUpdateInterval(60): the charge drains per sensor update
    maxBalls: 80,    // MAX_BALLS
  };
  T.S = (T.phone.x1 - T.phone.x0) / 393;   // 393pt app screen -> the phone outline's width
  T.field = { x0: T.phone.x0, y0: T.phone.y0, x1: T.phone.x1, y1: T.phone.y1 };
  const allBeats = beats(300, 13000, T.bpm);
  const onBeat = (ms) => allBeats.find((b) => b >= ms);

  // ---- the draft: each line starts on a heartbeat, types, holds, is deleted (the last one stays) ----
  let at = 1780; T.keys = []; T.dels = [];
  T.lines.forEach((L, i) => {
    L.start = onBeat(at); L.n = L.text.length;
    L.keyAt = [...L.text].map((_, k) => L.start + k * L.ms); L.done = L.keyAt[L.n - 1];
    L.keyAt.forEach((k, j) => { if (L.text[j] !== ' ') T.keys.push({ t: k, li: i, j }); });
    if (L.hold != null) { L.delAt = L.done + L.hold; L.dels = [...L.text].map((_, k) => L.delAt + k * L.del); L.gone = L.dels[L.n - 1] + L.del; L.dels.forEach((d) => T.dels.push({ t: d, li: i })); at = L.gone + 40; }
  });
  const LAST = T.lines[T.lines.length - 1];
  // chars on screen for line i at t
  T.typed = (i, t) => { const L = T.lines[i]; if (t < L.start) return 0; let n = L.keyAt.filter((k) => k <= t).length; if (L.dels) n -= L.dels.filter((d) => d <= t).length; return Math.max(0, n); };
  T.activeLine = (t) => { for (let i = T.lines.length - 1; i >= 0; i--) if (t >= T.lines[i].start) return i; return -1; };
  // the argument loads the charge, keystroke by keystroke; deleting gives none of it back
  T.load = (t) => { let c = 0; T.lines.forEach((L, i) => { const from = i ? T.lines[i - 1].to : 0; const k = L.keyAt.filter((x) => x <= t).length; if (k) c = from + ((L.to - from) * k) / L.n; }); return c; };

  // ---- the instruction beat, then the shake ----
  T.hookOut = LAST.done + 320;
  T.instr = T.hookOut + 150;            // Shake it out instead.
  T.instrMono = T.instr + 200;          // SHAKE YOUR DEVICE TO DRAIN THE CHARGE
  const s0 = T.instrMono + 950;        // read time, then the first stroke
  // shaking bouts: [first jolt ms, jolts at the 110ms cooldown, charge from, charge to]
  T.bouts = [[s0, 8, 100, 86], [s0 + 800, 9, 86, 66], [s0 + 1650, 10, 66, 42], [s0 + 2550, 11, 42, 20], [s0 + 3500, 12, 20, 0]];
  T.instrOut = s0 + 250;

  // ---- charge: drains in steps, one per sensor update, only while shaking ----
  const B = T.bouts.map(([st, n, c0, c1]) => { const end = st + (n - 1) * T.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / T.update) + 1 }; });
  T.charge = (t) => { let c = 100; for (const b of B) { if (t < b.st) break; const k = Math.min(b.nU, Math.floor((t - b.st) / T.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
  T.shown = (t) => (t < B[0].st ? Math.round(T.load(t)) : Math.ceil(T.charge(t)));
  const LB = B[B.length - 1]; T.zero = LB.st + (LB.nU - 1) * T.update;
  T.bound = (t) => Math.round((T.charge(t) / 100) * T.maxBalls);      // visibleBallCount, as the game
  T.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) { const tj = b.st + k * T.cooldown; if (tj < T.zero) T.jolts.push({ t: tj, b: bi, k }); } });
  const updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) updates.push(b.st + k * T.update); });
  T.milestones = [75, 50, 25].map((v) => updates.find((u) => T.charge(u) <= v));   // triggerMedium
  T.shatter = B[0].st;

  // ---- after zero: stillness, everything else leaves, the point falls, the close ----
  T.hudOut = T.zero + 650;
  T.fall = [T.zero + 950, T.zero + 1800];
  T.wordmark = T.fall[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  T.beats = allBeats.filter((b) => b < T.zero - 250);

  // glyph centres of "forget it" relative to its line's top-left: [char, cx, cy, width], measured
  // from Inter 400 at 72px in Chrome (regulate-612-angry, window.__measure()) and scaled to LAST.size.
  const k72 = LAST.size / 72;
  T.glyphs = [['f', 13.5, 43.2, 27], ['o', 48.5, 43.2, 43], ['r', 83.5, 43.2, 27], ['g', 119, 43.2, 44], ['e', 162, 43.2, 42], ['t', 195, 43.2, 24], ['i', 235.5, 43.2, 17], ['t', 256, 43.2, 24]]
    .map(([c, x, y, w]) => [c, x * k72, 0.6 * LAST.size, w * k72]);
  T.lineTop = (size) => T.base - 0.864 * size;   // Inter: line-height 1 puts the baseline at .864em

  // ---- the balls: each letter of the draft shatters into its share of the swarm ----
  let seed = 612; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const N = T.bound(T.shatter);   // the swarm the charge holds at the first stroke
  const G = T.glyphs.map((g, gi) => ({ gi, w: g[3], n: 0 }));
  const base = Math.floor(N / G.length); G.forEach((g) => (g.n = base));
  [...G].sort((a, b) => b.w - a.w).slice(0, N - base * G.length).forEach((g) => g.n++);
  // shatter ripples out from the word's centre, 9ms per glyph
  const mid = (T.glyphs.length - 1) / 2;
  T.glyphAt = T.glyphs.map((g, gi) => T.shatter + Math.round(Math.abs(gi - mid)) * 9);
  const S = T.S, F = T.field, balls = [], top = T.lineTop(LAST.size);
  G.forEach(({ gi, n }) => {
    const g = T.glyphs[gi], tb = T.glyphAt[gi];
    for (let k = 0; k < n; k++) balls.push({ tb, x0: T.textX + g[1] + (rnd() - 0.5) * g[3] * 0.6, y0: top + g[2] + (rnd() - 0.5) * LAST.size * 0.35,
      r: ((rnd() * 8 + 10) * S) / 2, col: rnd() > 0.5 ? 0 : 1 });
  });
  const rank = balls.map((_, i) => i); for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  balls.forEach((b, i) => (b.rank = rank[i]));
  T.balls = balls; T.N = N;
  T.alive = (i, t) => t >= balls[i].tb && balls[i].rank < T.bound(t);

  // the game's step: integrate, walls (restitution .92-.98 + tangential jitter), damping .999,
  // speed floor re-energize toward the charge-bound target speed, then equal-mass collisions (.9).
  const n0 = Math.ceil(T.shatter * 0.06), n1 = Math.ceil(T.zero * 0.06) + 2, frames = [], events = [];
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
