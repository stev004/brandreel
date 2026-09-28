// regulate-452-numb.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// v2 (Steven 09-28: "needs to be clearer and how pendulum helps. lots of overlapping elements").
// The Pendulum here IS the app's metronome (regulate main, utils/bilateralRhythm.ts +
// app/bilateral-rhythm.tsx), ported line for line and stepped at 1ms:
//   HALF_SWING_MS 2000, HIT_WINDOW_MS 350, idle 0.58 / cap 0.85 of MAX_ANGLE, hitGrowth .25,
//   easeMs 800, relaxPerMissedPeak .75, angle = -amp * cos(pi * elapsed / 2000) (+ = right).
// MAX_ANGLE is the app's own on its reference iPhone (393x852pt): asin((393/2 - 16) / (0.52*852)).
// The run starts like the app's: elapsed 0 at the left apex (peak 0, untapped), then taps exactly
// on peaks 1, 2, 3, 4 (R L R L), so the swing grows the way it does in-game.
// v3 (Steven 09-28: "each swing should light up one opposing word at a time"): four passes, and each
// apex lights ONE word of the draft on the side opposite the bob, outside in (I'll, when, reply, properly).
var TIMING = (function () {
  const HALF = 2000, WIN = 350;
  const ARM = Math.round(0.52 * 852), MAX = (Math.asin((393 / 2 - 16) / ARM) * 180) / Math.PI;
  const MP = { idle: 0.58 * MAX, cap: 0.85 * MAX, growth: 0.25, ease: 800, relax: 0.75 };
  const T = {
    HALF, MAX, idle: MP.idle, cap: MP.cap,
    moment: 150, momentOut: 2250,   // "frozen on the same line." under the clock (the hook)
    draft: 2800,                    // the frozen draft rises in, bottom slot, dead cursor
    clockOut: 4200,                 // the clock leaves, both colon dots with it (v5: nothing stays behind)
    // v4 (Steven 09-28: "how do people watching it know its freeze?"): the state gets named in the
    // hook's slot, alone with the dead draft, before the Pendulum arrives. Everything after it
    // runs exactly as v3, shifted later by D.
    name: 4600, nameOut: 7000,      // "Not lazy. Frozen." (hook slot; ~1.6s settled read)
  };
  const D = 3250;                   // v3's fall began at 4350
  Object.assign(T, {
    // v5 (Steven 09-28: "the dot ... should drop perfectly onto the pendulum in a smooth and realistic
    // physics motion ... we don't want floating elements"): the colon's dots leave WITH the clock (nothing
    // hovers). When the name has gone, the white point is let go at the pivot's height, straight above
    // the left apex, and free-falls (constant g); the string draws down from the pivot and is waiting at
    // full length, so the point is caught exactly at the bob position (fall[1]), stretches the string and
    // settles on a damped spring before the swing starts on the game's own clock (release, unchanged).
    fall: [7380, 8020],             // free fall: pivot height -> the left apex (catch at fall[1])
    instr: 4700 + D, instrOut: 6350 + D,   // "Tap each side as the bob arrives" (top slot, under the label)
    hud: 6500 + D,                  // 00 / 30 / PASSES take the instruction's place under the label
    release: 5100 + D,              // reel ms of the game's elapsed 0
  });
  // the catch: radial string stretch (px, + = longer) tau ms after contact; a damped spring
  // (period 200ms, zeta .38) carrying ~40% of the impact speed, tapered to exactly 0 by release
  T.catchV = 1.53;                  // px/ms along the string at contact (impact ~3.8 px/ms)
  T.spring = (tau) => {
    if (tau <= 0) return 0;
    const w = (2 * Math.PI) / 200, z = 0.38, wd = w * Math.sqrt(1 - z * z), end = T.release - T.fall[1];
    const taper = tau >= end ? 0 : tau <= end - 90 ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (tau - end + 90)) / 90);
    return (T.catchV / wd) * Math.exp(-z * w * tau) * Math.sin(wd * tau) * taper;
  };
  T.tool = T.instr - 300;           // FREEZE · PENDULUM heads the top slot before the first swing and stays
  T.el = (t) => t - T.release;                   // reel ms -> the game's elapsed ms
  T.at = (e) => T.release + e;                   // the game's elapsed ms -> reel ms
  T.apex = [2000, 4000, 6000, 8000].map(T.at);    // the four taps: R L R L
  T.side = [1, -1, 1, -1];
  T.center = [1000, 3000, 5000, 7000].map(T.at);  // centre crossings: the arriving side's guide glows in
  T.wakeLag = 60;                                   // each apex lights one word (opposite side) this long after the tap
  // the fourth word completes the line and the cursor comes back: it blinks once a second
  // (a caret's own rate, the bob's apex-to-apex time)
  T.cursorOn = T.apex[3] + T.wakeLag;

  // ---- the app's metronome, stepped at 1ms from elapsed 0 (left apex, idle) past the third tap ----
  const N = 9000, hitAt = [2000, 4000, 6000, 8000];
  const AMP = new Float64Array(N + 1), TGT = new Float64Array(N + 1);
  const s = { e: 0, amp: MP.idle, tgt: MP.idle, last: -1 };
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
  const idx = (t) => Math.max(0, Math.min(N, Math.round(T.el(t))));
  T.amp = (t) => AMP[idx(t)];
  // degrees, + = right; held at the left apex (rotation = -idle, as the app starts) until release
  T.angle = (t) => (t <= T.release ? -MP.idle : -T.amp(t) * Math.cos((Math.PI * T.el(t)) / HALF));
  T.ampLast = T.amp(T.apex[3]);                     // the fourth tap's apex (left): the point lets go here
  T.angLast = T.side[3] * T.ampLast;                // ... as an angle (+ = right)
  // predictedPeakAmplitude(state at reel time t, upcoming peak): the guide arc's centre angle
  T.predict = (t, peakEl) => { const i = idx(t); return Math.max(0, TGT[i] + (AMP[i] - TGT[i]) * Math.exp(-Math.max(0, peakEl - T.el(t)) / MP.ease)); };

  // ---- the close ----
  T.letGo = T.apex[3];                              // the arm lets go at the fourth apex (zero velocity)
  T.hudOut = T.letGo + 250;
  T.glide = [T.letGo + 80, T.letGo + 1360];         // up onto the full stop (the whole cream line + blinking cursor hold ~1.3s before landing)
  T.land = T.glide[1];
  T.draftOut = T.land + 350;                        // the unstuck line holds past the landing, then leaves
  T.wordmark = T.land + 200; T.line = T.wordmark + 700; T.cta = T.wordmark + 1150;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  return T;
})();
