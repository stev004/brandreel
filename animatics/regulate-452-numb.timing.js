// regulate-452-numb.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// The Pendulum here IS the app's metronome (regulate main, utils/bilateralRhythm.ts +
// app/bilateral-rhythm.tsx, 2026-09-28), ported line for line and stepped at 1ms:
//   HALF_SWING_MS 2000, HIT_WINDOW_MS 350, idle 0.58 / cap 0.85 of MAX_ANGLE, hitGrowth .25,
//   easeMs 800, relaxPerMissedPeak .75, angle = -amp * cos(pi * elapsed / 2000) (+ = right).
// MAX_ANGLE is the app's own on its reference iPhone (393x852pt): asin((393/2 - 16) / (0.52*852)).
// The reel joins the run at elapsed 2000 (peak 1, the right apex: where the cursor sits) and taps
// exactly on peaks 2..5, so the four passes are L R L R and the swing grows the way it does in-game.
var TIMING = (function () {
  const { P } = TK;
  const HALF = 2000, WIN = 350;
  const ARM = Math.round(0.52 * 852), MAX = (Math.asin((393 / 2 - 16) / ARM) * 180) / Math.PI;
  const MP = { idle: 0.58 * MAX, cap: 0.85 * MAX, growth: 0.25, ease: 800, relax: 0.75 };
  const T = {
    HALF, MAX, idle: MP.idle, cap: MP.cap,
    click: 1900,                 // the stuck cursor gives one bare click
    grow: [1950, 2750],          // the cursor bar extends up into the arm; its foot becomes the point
    dim: [2000, 2750],           // clock, moment line and sentence fall back to ~20%
    hud: 2300, instr: 2560,      // FREEZE · PENDULUM / 00 / 30 / PASSES, then the instruction
    release: 2800,               // reel ms of elapsed 2000
  };
  T.el = (t) => 2000 + (t - T.release);           // reel ms -> the game's elapsed ms
  T.at = (e) => T.release + (e - 2000);           // the game's elapsed ms -> reel ms
  T.apex = [4000, 6000, 8000, 10000].map(T.at);    // the four taps: L R L R
  T.side = [-1, 1, -1, 1];
  T.center = [3000, 5000, 7000, 9000].map(T.at);   // center crossings: the arriving side's guide glows in
  // the colon starts blinking again after the second pass, in the bob's time: every apex and every
  // centre crossing (1s apart - the seconds come back)
  T.colon = []; for (let e = 6000; e <= 10000; e += 1000) T.colon.push(T.at(e));

  // ---- the app's metronome, stepped at 1ms from elapsed 2000 (idle) to past the fourth apex ----
  const N = 8400, hitAt = [4000, 6000, 8000, 10000];
  const AMP = new Float64Array(N + 1), TGT = new Float64Array(N + 1);
  const s = { e: 2000, amp: MP.idle, tgt: MP.idle, last: -1 };
  AMP[0] = s.amp; TGT[0] = s.tgt;
  for (let i = 1; i <= N; i++) {
    if (hitAt.includes(s.e)) {                        // registerMetronomeTap exactly on the peak
      s.last = Math.round(s.e / HALF); s.tgt = Math.min(MP.cap, s.tgt + MP.growth * (MP.cap - s.tgt));
    }
    const a = s.e, b = a + 1;                         // stepMetronome(dt = 1)
    for (let k = Math.floor((a - WIN) / HALF) + 1; k <= Math.floor((b - WIN) / HALF); k++) if (s.last !== k) s.tgt = MP.idle + (s.tgt - MP.idle) * MP.relax;
    s.amp = s.tgt + (s.amp - s.tgt) * Math.exp(-1 / MP.ease);
    s.e = b; AMP[i] = s.amp; TGT[i] = s.tgt;
  }
  const idx = (t) => Math.max(0, Math.min(N, Math.round(T.el(t) - 2000)));
  T.amp = (t) => AMP[idx(t)];
  // degrees, + = right; held at the right apex until release
  T.angle = (t) => (t <= T.release ? MP.idle : -T.amp(t) * Math.cos((Math.PI * T.el(t)) / HALF));
  T.amp4 = T.amp(T.apex[3]);                        // the fourth apex: the point drops from here
  // predictedPeakAmplitude(state at reel time t, upcoming peak): the guide arc's centre angle
  T.predict = (t, peakEl) => { const i = idx(t); return Math.max(0, TGT[i] + (AMP[i] - TGT[i]) * Math.exp(-Math.max(0, peakEl - T.el(t)) / MP.ease)); };

  // ---- the close ----
  T.letGo = T.apex[3];                              // the arm lets go at the fourth apex (zero velocity)
  T.drop = [T.letGo + 80, T.letGo + 630];           // straight down onto the full stop
  T.land = T.drop[1];
  T.exit = T.land + 550;                            // the settled frame holds, then the scene leaves
  T.wordmark = T.exit + 200; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  return T;
})();
