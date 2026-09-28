// regulate-trailer.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// Act 1 (0-8.5s, UNCHANGED - Steven loves it): the onboarding's stress-cycle graph, one pen, one take
// (StressCycleChart.tsx order: baseline, THREAT, rise, fork COMPLETED + STUCK, release to REGULATED).
// Act 2 (8.5-26.9s) on a 75bpm pulse (800ms beat): the check-in bridge (3 beats), then five game
// beats of 4 beats (3.2s) each, every cut on a downbeat. Act 3 (26.9s-end): the Sigh's long exhale
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
    { id: 'chaos', state: 'Angry', col: '#C06C4D', game: 'Chaos Release', plus: false, felt: 'Still fuming?', ans: 'Shake the charge out.', ansAt: 2000 },
    { id: 'gauge', state: 'Anxious', col: '#D4A574', game: 'Pressure Gauge', plus: true, felt: 'Wound tight?', ans: 'Push it to the redline. Let it out slow.', ansAt: 1800 },
    { id: 'pendulum', state: 'Numb', col: '#7E9AA6', game: 'Pendulum', plus: false, felt: 'Gone numb?', ans: 'Follow the swing back.', ansAt: 1600 },
    { id: 'grounding', state: 'Numb', col: '#7E9AA6', game: '5-4-3-2-1 Grounding', plus: true, felt: 'Somewhere else?', ans: 'Name what’s around you. Come back to the room.', ansAt: 1700 },
    { id: 'sigh', state: 'Anxious', col: '#D4A574', game: 'Physiological Sigh', plus: false, felt: 'Can’t catch your breath?', ans: 'Two breaths in.\nOne long breath out.', ansAt: 2500 },
  ];
  T.firstCut = T.act2 + 3 * T.beat;                 // 10900
  T.cuts = T.games.map((_, i) => T.firstCut + i * T.beatLen);
  T.act3 = T.firstCut + 5 * T.beatLen;             // 26900
  // per-game cues (local ms from the game's cut)
  T.chaos = { shake: [300, 2300], upd: 60 };       // accelerometer updates every 60ms while shaking (app)
  T.gauge = { taps: Array.from({ length: 12 }, (_, k) => 300 + k * 100), peak: 1400, hold: 400, fall: 2400 };   // app: +1%/tap, 400ms hold, 6000ms out-cubic fall
  T.pend = { half: 1600, e0: 800, hits: [800, 2400] };      // app HALF_SWING_MS 2000 -> 1600 (1.25x)
  T.ground = { entries: [320, 580, 840, 1100, 1360], type: 220 };
  // Sigh: the app's 10.7s breath at 0.5x: inhale 1250, sip 600, hold 500, exhale 2500 (local)
  T.sigh = { start: 150, k: 0.5 };
  const sC = T.cuts[4], sB = (ms) => sC + T.sigh.start + ms * T.sigh.k;
  T.sighIn1 = [sB(0), sB(2500)]; T.sighSip = [sB(2500), sB(3700)]; T.sighHold = [sB(3700), sB(4700)];
  T.exhale = [sB(4700), sB(9700)];                  // 26200 -> 28700
  T.textOut = 27900;                                // felt / answer / label clear (answer read 1.7s)
  T.whiten = [26900, 28100];                        // the amber comet becomes the white point
  T.curveOut = [28200, 700];
  T.glide = [T.exhale[1], T.exhale[1] + 800]; T.wordmark = T.glide[1];
  T.tag = T.wordmark + 700; T.cta = T.wordmark + 1100;
  T.dur = T.cta + 1800;
  T.beats1 = beats(150, 7000, T.bpm1);             // Act 1 heartbeat
  T.pulse = []; for (let ms = T.act2; ms < T.cuts[4] + 2 * T.beat + 1; ms += T.beat) T.pulse.push(ms);   // stops before the Sigh's hold
  return T;
})();
