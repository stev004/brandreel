// regulate-trailer.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// Act 1 (0-8.5s, UNCHANGED - Steven loves it): the onboarding's stress-cycle graph, one pen, one take
// (StressCycleChart.tsx order: baseline, THREAT, rise, fork COMPLETED + STUCK, release to REGULATED).
// Act 2 (8.5-27.7s) on a 75bpm pulse (800ms beat): the check-in bridge (3 beats), then five game
// beats (Chaos Release 5 beats = 4.0s, the others 4 beats = 3.2s), every cut on the beat. Act 3 (27.7s-end): the Sigh's long exhale
// carries the point to rest as the full stop of "regulate."
var TIMING = (function () {
  const { beats } = TK;
  const T = {
    A: [540, 800],                                  // Act 1's anchor: the point waits here under the line
    // ---- Act 1 (StressCycleChart AT offsets, re-timed so the spike lands by 1.0s and the plateau holds)
    baseLabel: 200, threatLabel: 820,
    rise: [300, 1000],                              // app: 900ms Easing.in(quad); here 700ms (0.78x)
    apex: 1000,
    fork: 1000, complete: [1000, 2100], stuck: [1000, 2450],   // app: 1100 out-cubic / 1450 linear (same)
    completedLabel: 2050, stuckLabel: 2400,
    born: 4000,                                     // plateau held 2450 -> 4050 (1.6s), then the point is born
    release: [4150, 5350],                          // app: 1200ms out-cubic (same)
    regLabel: 5250,
    act1Out: 6350,                                  // REGULATED held 1.0s
    toAnchor: [6350, 7250], line: 6550,
    act2: 8500,
    bpm1: [[0, 84], [800, 112], [4150, 112], [5700, 64]],
    // ---- Act 2
    beat: 800,                                      // 75bpm
    snap: 240,
    // bridge: the home check-in, "How are you, really?", the four state tiles; Angry is pressed
    bridge: { lineOut: 8500, pointOut: [8500, 300], head: 8800, rows: 9000, rowStep: 90, press: 10100, fly: [10380, 10880] },
    beatLen: 3200,
  };
  T.games = [
    { id: 'chaos', state: 'Angry', col: '#C06C4D', game: 'Chaos Release', plus: false, felt: 'Still fuming?', ans: 'Shake the charge out.', ansAt: 2800, len: 4000, ansY: 1372 },
    { id: 'gauge', state: 'Anxious', col: '#D4A574', game: 'Pressure Gauge', plus: true, felt: 'Wound tight?', ans: 'Push it to the redline. Let it out slow.', ansAt: 1800 },
    { id: 'pendulum', state: 'Numb', col: '#7E9AA6', game: 'Pendulum', plus: false, felt: 'Gone numb?', ans: 'Follow the swing back.', ansAt: 1600 },
    { id: 'grounding', state: 'Numb', col: '#7E9AA6', game: '5-4-3-2-1 Grounding', plus: true, felt: 'Somewhere else?', ans: 'Name what’s around you. Come back to the room.', ansAt: 1700 },
    { id: 'sigh', state: 'Anxious', col: '#D4A574', game: 'Physiological Sigh', plus: false, felt: 'Can’t catch your breath?', ans: 'Two breaths in.\nOne long breath out.', ansAt: 2500 },
  ];
  T.firstCut = T.act2 + 3 * T.beat;                 // 10900
  // Chaos Release runs 5 beats (4.0s: the phone's 900ms draw-in, the app's line read, two shake bouts,
  // the answer read); the others 4 beats. Every cut stays on the 800ms grid.
  T.cuts = []; { let c = T.firstCut; T.games.forEach((g) => { T.cuts.push(c); c += g.len || T.beatLen; }); T.act3 = c; }   // 27700
  // per-game cues (local ms from the game's cut)
  // 1 CHAOS RELEASE: the 6:12 PM Angry reels' phone + game, copied from their FAMILY BLOCK
  // (regulate-angry-reply.timing.js): the same iPhone body 408x852 (radius 62), screen 390x834 (radius 53),
  // 9px bezel, 100x28 island, 900ms two-halves draw-in, HUD positions, 110ms shake strokes, 60ms sensor
  // drain steps and the ShakeGame.tsx step. Geometry is the family's native px; the picture scales the
  // whole phone uniformly by k about its centre and lifts it so the body top sits at y = top. The run is
  // deterministic and shared with the score: every rattle is a collision in the picture.
  {
    const CH = (T.chaos = {
      body: { x0: 336, y0: 597, x1: 744, y1: 1449, rx: 62 }, screen: { x0: 345, y0: 606, x1: 735, y1: 1440, rx: 53 },
      island: { w: 100, h: 28, top: 620 }, num: { px: 127, cy: 1088 }, lab: { y: 1160 }, cue: { y: 1316 }, drawIn: 900,
      k: 0.9, top: 510,
      len: T.games[0].len, phoneIn: 40, ballsIn: 330, hudIn: 360, cueIn: 520, shake: 1400,
      cooldown: 110, update: 60, maxBalls: 80,
      bouts: [[0, 8, 100, 85], [850, 7, 85, 68]],      // [ms after the first stroke, strokes, charge from, to]
    });
    const { body, screen } = CH;
    CH.pivot = [540, (body.y0 + body.y1) / 2];
    CH.dy = CH.top - (CH.pivot[1] + (body.y0 - CH.pivot[1]) * CH.k);
    CH.S = (screen.x1 - screen.x0) / 393;
    CH.field = { x0: screen.x0, x1: screen.x1, y0: Math.round(screen.y0 + (59 * (screen.y1 - screen.y0)) / 852), y1: screen.y1 };
    CH.cueOut = CH.shake - 120;
    const seeded = (s) => () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const B = (CH.B = CH.bouts.map(([o, n, c0, c1]) => { const st = CH.shake + o, end = st + (n - 1) * CH.cooldown; return { st, n, c0, c1, end, nU: Math.floor((end - st) / CH.update) + 1 }; }));
    CH.charge = (u) => { let c = 100; for (const b of B) { if (u < b.st) break; const k = Math.min(b.nU, Math.floor((u - b.st) / CH.update) + 1); c = b.c0 - ((b.c0 - b.c1) * k) / b.nU; } return Math.max(0, c); };
    const LB = B[B.length - 1]; CH.stop = LB.st + (LB.nU - 1) * CH.update;
    CH.bound = (u) => Math.round((CH.charge(u) / 100) * CH.maxBalls);
    CH.jolts = []; B.forEach((b, bi) => { for (let k = 0; k < b.n; k++) CH.jolts.push({ t: b.st + k * CH.cooldown, b: bi, k }); });
    CH.updates = []; B.forEach((b) => { for (let k = 0; k < b.nU; k++) CH.updates.push(b.st + k * CH.update); });
    CH.milestones = [75, 50, 25].map((v) => CH.updates.find((u) => CH.charge(u) <= v)).filter((u) => u != null);
    // the swarm at full charge: 80 balls (10-18pt, #C06C4D / #B54B32), scattered over the field and set
    // moving at the game's starting speeds (100-360pt/s), fading in across the glass as it draws in
    const rnd = seeded(612), S = CH.S, F = CH.field, cap = 1200 * S;
    const balls = (CH.balls = Array.from({ length: CH.maxBalls }, () => {
      const r = ((rnd() * 8 + 10) * S) / 2, a = rnd() * Math.PI * 2, sp = (100 + rnd() * 260) * S;
      return { tb: CH.ballsIn + Math.floor(rnd() * 240), r, x0: F.x0 + r + rnd() * (F.x1 - F.x0 - 2 * r), y0: F.y0 + r + rnd() * (F.y1 - F.y0 - 2 * r), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col: rnd() > 0.5 ? 0 : 1 };
    }));
    const rank = balls.map((_, i) => i); for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
    balls.forEach((b, i) => (b.rank = rank[i]));
    CH.alive = (i, u) => u >= balls[i].tb && balls[i].rank < CH.bound(u);
    CH.gone = balls.map((b) => { const u = CH.updates.find((x) => Math.round((CH.charge(x) / 100) * CH.maxBalls) <= b.rank); return u == null ? Infinity : u; });
    // ShakeGame.tsx's step (the family's T.simulate): integrate, walls (restitution .92-.98 + tangential
    // jitter), damping .999, speed floor toward the charge-bound target, equal-mass collisions (.9); each
    // stroke kicks every live ball in its own direction at m x 260pt/s x .6-1.4, capped 1200pt/s
    const n0 = Math.floor(CH.ballsIn * 0.06), n1 = Math.ceil(CH.len * 0.06) + 1, frames = [], events = [];
    const x = balls.map((b) => b.x0), y = balls.map((b) => b.y0), vx = balls.map((b) => b.vx), vy = balls.map((b) => b.vy);
    let ji = 0; const dt = 1 / 60;
    for (let n = n0; n <= n1; n++) {
      const u = n / 0.06, live = balls.map((_, i) => CH.alive(i, u)), m = 1.05 + 0.35 * Math.sin(n * 0.7);
      while (ji < CH.jolts.length && CH.jolts[ji].t <= u) { ji++; balls.forEach((b, i) => { if (!live[i]) return; const f = 0.6 + rnd() * 0.8, a = rnd() * Math.PI * 2; vx[i] += Math.cos(a) * m * 260 * S * f; vy[i] += Math.sin(a) * m * 260 * S * f; const sp = Math.hypot(vx[i], vy[i]); if (sp > cap) { vx[i] *= cap / sp; vy[i] *= cap / sp; } }); }
      const target = (100 + 260 * Math.max(0, Math.min(1, CH.charge(u) / 100))) * S;
      for (let i = 0; i < balls.length; i++) {
        if (!live[i]) continue;
        const r = balls[i].r, sp0 = Math.hypot(vx[i], vy[i]); let wall = false;
        x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        if (x[i] - r < F.x0 || x[i] + r > F.x1) { wall = true; vx[i] = -vx[i] * (0.92 + rnd() * 0.06); vy[i] += (rnd() - 0.5) * 6 * S; x[i] = x[i] - r < F.x0 ? F.x0 + r : F.x1 - r; }
        if (y[i] - r < F.y0 || y[i] + r > F.y1) { wall = true; vy[i] = -vy[i] * (0.92 + rnd() * 0.06); vx[i] += (rnd() - 0.5) * 6 * S; y[i] = y[i] - r < F.y0 ? F.y0 + r : F.y1 - r; }
        if (wall && sp0 > 180 * S) events.push([u, 0, sp0 / S, x[i]]);
        vx[i] *= 0.999; vy[i] *= 0.999;
        const sp = Math.hypot(vx[i], vy[i]);
        if (sp < target * 0.85) { const a = rnd() * Math.PI * 2, acc = Math.min(target * 0.08, target - sp); vx[i] += Math.cos(a) * acc; vy[i] += Math.sin(a) * acc; }
      }
      for (let i = 0; i < balls.length; i++) {
        if (!live[i]) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (!live[j]) continue;
          const dx = x[j] - x[i], dy = y[j] - y[i], md = balls[i].r + balls[j].r, d2 = dx * dx + dy * dy;
          if (d2 >= md * md) continue;
          let d = Math.sqrt(d2), nx = 0, ny = 1; if (d > 0.001) { nx = dx / d; ny = dy / d; } else d = 0;
          const sep = (md - d) * 0.52; x[i] -= nx * sep; y[i] -= ny * sep; x[j] += nx * sep; y[j] += ny * sep;
          const rel = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
          if (rel < 0) { const imp = -(1 + 0.9) * rel * 0.5; vx[i] -= nx * imp; vy[i] -= ny * imp; vx[j] += nx * imp; vy[j] += ny * imp; if (-rel > 150 * S) events.push([u, 1, -rel / S, (x[i] + x[j]) / 2]); }
        }
      }
      const f = new Float32Array(balls.length * 2); for (let i = 0; i < balls.length; i++) { f[2 * i] = x[i]; f[2 * i + 1] = y[i]; } frames.push(f);
    }
    CH.events = events;   // [local ms, 0 wall | 1 ball, impact speed in pt/s, x px (native)]
    CH.posAt = (i, u) => { const f = frames[Math.max(0, Math.min(frames.length - 1, Math.round(u * 0.06) - n0))]; return [f[2 * i], f[2 * i + 1]]; };
  }
  T.gauge = { taps: Array.from({ length: 12 }, (_, k) => 300 + k * 100), peak: 1400, hold: 400, fall: 2400 };   // app: +1%/tap, 400ms hold, 6000ms out-cubic fall
  T.pend = { half: 1600, e0: 800, hits: [800, 2400] };      // app HALF_SWING_MS 2000 -> 1600 (1.25x)
  T.ground = { entries: [320, 580, 840, 1100, 1360], type: 220 };
  // Sigh: the app's 10.7s breath at 0.5x: inhale 1250, sip 600, hold 500, exhale 2500 (local)
  T.sigh = { start: 150, k: 0.5 };
  const sC = T.cuts[4], sB = (ms) => sC + T.sigh.start + ms * T.sigh.k;
  T.sighIn1 = [sB(0), sB(2500)]; T.sighSip = [sB(2500), sB(3700)]; T.sighHold = [sB(3700), sB(4700)];
  T.exhale = [sB(4700), sB(9700)];                  // 26200 -> 28700
  T.textOut = T.act3 + 1000;                        // felt / answer / label clear (answer read 1.7s)
  T.whiten = [T.act3, T.act3 + 1200];               // the amber comet becomes the white point
  T.curveOut = [T.act3 + 1300, 700];
  T.glide = [T.exhale[1], T.exhale[1] + 800]; T.wordmark = T.glide[1];
  T.tag = T.wordmark + 700; T.cta = T.wordmark + 1100;
  T.dur = T.cta + 1800;
  T.beats1 = beats(150, 7000, T.bpm1);             // Act 1 heartbeat
  T.pulse = []; for (let ms = T.act2; ms < T.cuts[4] + 2 * T.beat + 1; ms += T.beat) T.pulse.push(ms);   // stops before the Sigh's hold
  return T;
})();
