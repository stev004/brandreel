// regulate-trailer.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// Act 1 (0-8.5s): the onboarding's stress-cycle graph, one pen, one take (StressCycleChart.tsx order:
// baseline, THREAT, rise, fork COMPLETED + STUCK, release to REGULATED). Act 2 (8.5-20.5s): eight hard
// cuts on a 120bpm beat, 1.5s each, the white point at the same screen position on every cut.
// Act 3 (20.5-27s): the last breath out, the point comes to rest as the full stop of "regulate."
var TIMING = (function () {
  const { beats } = TK;
  const T = {
    dur: 27000,
    A: [540, 800],                                  // the match-cut anchor: the point sits here on every cut
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
    act2: 8500, flash: 1500, snap: 240,
    act3: 20500,
    exhale: [20500, 23000], clear: 22850,
    glide: [23000, 23800], wordmark: 23800, tag: 24500, cta: 24900,
    bpm1: [[0, 84], [800, 112], [4150, 112], [5700, 64]],
  };
  T.games = [
    { id: 'sigh', state: 'Anxious', game: 'Physiological Sigh' },
    { id: 'gauge', state: 'Anxious', game: 'Pressure Gauge' },
    { id: 'geode', state: 'Anxious', game: 'Geode Release' },
    { id: 'chaos', state: 'Angry', game: 'Chaos Release' },
    { id: 'tension', state: 'Angry', game: 'Tension Release' },
    { id: 'pendulum', state: 'Freeze', game: 'Pendulum' },
    { id: 'focus', state: 'Freeze', game: 'Focus Follow' },
    { id: 'breath', state: 'Balanced', game: 'Regulate Breath' },
  ];
  T.cuts = T.games.map((_, i) => T.act2 + i * T.flash);
  // taps / jolts land on the 8ths of the 120bpm grid inside a flash (local ms)
  T.taps = [250, 500, 750, 1000];
  T.gaugeTaps = [250, 500, 750, 1000, 1250];
  T.pendApex = 720;                                 // the bob arrives at the guide (the tap)
  T.tenseCount = [0, 500, 1000];                    // 5, 4, 3 on the beat (app: one per second)
  T.beats1 = beats(150, 7000, T.bpm1);             // Act 1 heartbeat
  T.pulse = []; for (let ms = T.act2; ms < T.act3; ms += 500) T.pulse.push(ms);   // Act 2: 120bpm
  return T;
})();
