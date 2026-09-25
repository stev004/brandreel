// regulate-3am-v2.timing.js - the single clock for picture + score. Needs lib/timing-kit.js first.
// rev2 (Fable critique): no dead hold after the last thought; exhale 5.0s; column at x 670, taller.
var TIMING = (function () {
  const { beats, solve, E, P, lerp } = TK;
  const T = {
    bpm: [[0, 88], [1500, 96], [4200, 108], [5200, 100], [10200, 60]],
    column: { x: 670, top: 760, bot: 1500 },
    thoughtTops: [820, 960, 1100, 1240, 1380],
    hookDrift: [0, 1000],             // clock opens large and low, drifts up as the thoughts come
  };
  T.beats = beats(250, 12500, T.bpm);
  T.thoughtIn = T.beats.filter((b) => b >= 1000).slice(0, 5);
  T.clockOut = T.thoughtIn[4] + 700;                    // move on the moment the last thought lands
  T.glide = [T.clockOut + 200, T.clockOut + 900];      // colon dot -> top of the column
  T.exhale = [T.glide[1] + 400, T.glide[1] + 5400];    // one long breath out, 5.0s
  T.closeGlide = [T.exhale[1] + 400, T.exhale[1] + 1200];
  T.wordmark = T.closeGlide[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  T.beats = T.beats.filter((b) => b < T.exhale[1]);
  T.pointY = (t) => lerp(T.column.top, T.column.bot, E.INOUT(P(t, T.exhale[0], T.exhale[1] - T.exhale[0])));
  T.dissolveAt = T.thoughtTops.map((y) => solve(T.pointY, y + 22, T.exhale[0], T.exhale[1]));
  return T;
})();
