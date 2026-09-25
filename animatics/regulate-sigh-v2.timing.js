// regulate-sigh-v2.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
var TIMING = (function () {
  const { beats } = TK;
  const T = {
    dur: 16000,
    strike: [1250, 1850],          // the point strikes through "meditate"
    hookOut: 2300,
    glide: [2400, 3100],           // strike end -> start of the breath curve
    curveDraw: [2900, 3500],
    travel: 3500,
    seg: [1600, 700, 450, 3600],   // inhale, one more sip, hold, long exhale (the app's 10.7s cycle, compressed)
    annotate: 9950, headline: 10200,
    exit: 11950, closeGlide: [12100, 12900], wordmark: 12900, tag: 13600, cta: 14000,
    bpm: [[0, 96], [2500, 100], [5800, 92], [9850, 66]], beatWindow: [150, 11900],
  };
  T.cycle = T.seg.reduce((a, b) => a + b, 0);
  T.segAt = T.seg.map((_, i) => T.travel + T.seg.slice(0, i).reduce((a, b) => a + b, 0));
  T.beats = beats(T.beatWindow[0], T.beatWindow[1], T.bpm);
  return T;
})();
