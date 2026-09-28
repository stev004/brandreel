// regulate-1147-v2.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// rev2 (Fable critique): the inbox drives the gauge - each ping lands on a heartbeat and kicks the
// needle up with a 120ms overshoot; no taps, no dead hold; the gauge leaves as soon as it settles.
var TIMING = (function () {
  const { beats, solve, E, P, kf } = TK;
  const T = {
    bpm: [[0, 98], [1400, 108], [3800, 124], [4700, 118], [8900, 66]],
    arc: [700, 1300], ticks: 900, red: 1150, needle: [1100, 1450], clockOut: 2200,
    kick: 0.18, thresholds: [0.72, 0.56, 0.4, 0.24, 0.1],
  };
  T.beats = beats(200, 9400, T.bpm);
  T.pingIn = T.beats.filter((b) => b >= 1450).slice(0, 5);
  T.tremble = [T.pingIn[4] + 250, T.pingIn[4] + 850];
  // rev3 (09-28 app audit): the app's release is a slow out-cubic exhale (6s in-game); the reel's
  // SETTLE fall read as a 1s drop under "Let it out slow.", so it now falls out-cubic over 3.8s.
  T.fall = [T.pingIn[4] + 1050, T.pingIn[4] + 4850];
  const K = (k) => (k <= 0 ? 0 : k < 90 ? 1.15 * E.SNAP(k / 90) : k < 240 ? 1.15 - 0.15 * E.HOUSE((k - 90) / 150) : 1);
  T.pressure = (t) => { if (t < T.fall[0]) { let p = 0; for (const b of T.pingIn) p += T.kick * K(t - b); return p; } return 0.9 * Math.pow(1 - P(t, T.fall[0], T.fall[1] - T.fall[0]), 3); };
  T.shatterAt = T.thresholds.map((th) => solve((t) => -T.pressure(t), -th, T.fall[0], T.fall[1]));
  T.gaugeOut = T.fall[0] + 4000;               // leave as soon as the needle has settled
  T.closeGlide = [T.fall[0] + 4200, T.fall[0] + 5000];
  T.wordmark = T.closeGlide[1]; T.line = T.wordmark + 650; T.cta = T.wordmark + 1100;
  T.dur = Math.ceil((T.cta + 2100) / 100) * 100;
  T.beats = T.beats.filter((b) => b < T.fall[1]);
  return T;
})();
