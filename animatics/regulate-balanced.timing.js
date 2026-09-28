// regulate-balanced.timing.js - the single clock for picture + score. Needs lib/timing-kit.js first.
// One honest Regulate Breath cycle, no compression: the app's 4000ms inhale and 8000ms exhale
// (app/breathing.tsx, pattern 'vagal') on the app's own turnaround easing (RN Easing.ease =
// bezier(.42,0,1,1): inhale Easing.out(ease), exhale Easing.in(ease)).
var TIMING = (function () {
  const { bez, solve, P } = TK;
  const ease = bez(0.42, 0, 1, 1);
  const T = {
    column: { x: 540, top: 640, bot: 1400 },   // new column stops above y 1440 (safe area)
    detach: 550,                               // the hook's full stop lifts off the line
    glide: [650, 1450],                        // full stop -> foot of the column
    colIn: 780,                                // track draws in under the travelling point (app: 450ms track, ticks +30ms, chrome +650ms)
    inhaleMs: 4000, exhaleMs: 8000,
  };
  T.inhale = [1500, 1500 + T.inhaleMs];
  T.exhale = [T.inhale[1], T.inhale[1] + T.exhaleMs];
  // breath fill 0..1 exactly as the app drives the column
  T.fill = (t) => {
    if (t <= T.inhale[0]) return 0;
    if (t < T.inhale[1]) return 1 - ease(1 - P(t, T.inhale[0], T.inhaleMs));
    if (t < T.exhale[1]) return 1 - ease(P(t, T.exhale[0], T.exhaleMs));
    return 0;
  };
  T.pointY = (t) => T.column.bot - T.fill(t) * (T.column.bot - T.column.top);
  // the app's tick positions: index / (n - 1) from the foot. Each lights as the point passes it.
  T.inTicks = [0, 1, 2, 3].map((k) => k / 3);
  T.outTicks = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k / 7);
  T.inLit = T.inTicks.map((f) => (f <= 0 ? T.inhale[0] : solve(T.fill, f, T.inhale[0], T.inhale[1])));
  T.outLit = T.outTicks.map((f) => (f >= 1 ? T.exhale[0] : solve((t) => -T.fill(t), -f, T.exhale[0], T.exhale[1])));
  // mid-fall (the point passes the column's middle): the hook line becomes the effect
  T.change = solve((t) => -T.fill(t), -0.5, T.exhale[0], T.exhale[1]);
  T.settle = T.exhale[1] + 200;               // rests at the foot
  T.colOut = T.exhale[1] + 50;                // the column leaves around it
  T.closeGlide = [T.settle, T.settle + 800];
  T.wordmark = T.closeGlide[1]; T.line = T.wordmark + 600; T.sub = T.line + 500; T.cta = T.sub + 500;
  T.dur = Math.ceil((T.cta + 1900) / 100) * 100;   // v4: three lines under the wordmark, each gets read
  return T;
})();
