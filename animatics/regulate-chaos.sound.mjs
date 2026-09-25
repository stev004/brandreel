#!/usr/bin/env node
// Score for regulate-chaos.html. Reads regulate-chaos.timing.js, which runs the SAME deterministic
// particle simulation as the picture: every rattle is a real collision (wall knocks lower, ball
// clacks higher, panned by where it happened); every shake is a whoosh and a thump; every particle
// that leaves pops; at 0% the noise drops away to one chord; the rating slides up; the full stop.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, pad, air, room, thump, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-chaos'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-0.9, Math.min(0.9, (x - 540) / 520));

room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 300)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.12);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.7], [T.bursts[0] - 100, 1.0], [T.bursts[8], 0.7], [T.calm[0] + 300, 0]]) });

// collisions: the densest moments are thinned to one click per 5ms (loudest wins)
const ev = [...T.events].sort((a, b) => a[0] - b[0]); let lastT = -1;
for (const [t, kind, v, x] of ev) {
  if (t - lastT < 5) continue; lastT = t;
  const amp = Math.min(1, v / 2200) * (t < T.bursts[0] ? 0.16 : 0.22), f = kind ? 2600 + (v % 900) : 1300 + (v % 500);
  const r = rng(Math.round(t * 13) + kind); const bp = biquad('bp', f, 6); let ph = 0;
  add(dry, s(t), 0.03, (i, tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.6 + bp(r() * 2 - 1) * 3) * ar(tt, 0.0004, kind ? 0.004 : 0.007) * amp; }, { pan: panX(x) });
}
// pressure: a low swell while the walls close in, cut by the first shake
{ const B0 = T.bursts[0], r = rng(5), lp = biquad('lp', 120, 0.9); add(dry, 1.2, s(B0) - 1.15, (i, t) => { const ms = 1200 + t * 1000; return lp(r() * 2 - 1) * sm(P(ms, 1200, B0 - 1400)) * (1 - sm(P(ms, B0 - 20, 40))) * 1.1; }); }
// shakes: a swish of the phone plus a thump
T.bursts.forEach((b, i) => {
  const g = i === 0 ? 1.2 : lerp(0.9, 0.55, i / T.bursts.length);
  air(dry, s(b) - 0.04, 0.34, (u) => lerp(5200, 900, u), (u) => sm(u / 0.15) * (1 - u), 0.5 * g, 200 + i, (u) => lerp(-0.4, 0.4, u));
  thump(dry, s(b), 88, 42, 0.55 * g);
});
// pops: each particle that leaves
T.removedAt.forEach((rm, i) => { if (!isFinite(rm)) return; let ph = 0; const f0 = 700 + (i % 7) * 60; add(wet, s(rm), 0.08, (k, t) => { ph += (2 * Math.PI * (f0 + 900 * Math.min(1, t / 0.03))) / SR; return Math.sin(ph) * ar(t, 0.001, 0.02) * 0.07; }, { pan: (i % 9 - 4) / 5 }); });
// 0%: the noise is gone; one chord opens under the calm point
pad(wet, T.calm[0], T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.calm[0], 1800)) * (1 - sm(P(ms, T.closeGlide[0], 1600))), 0.06);
air(wet, s(T.calm[1]), 0.4, (u) => lerp(1800, 600, u), (u) => Math.sin(Math.PI * u), 0.07, 301);
{ let ph = 0; add(wet, s(T.rate.slide[0]), s(T.rate.slide[1] - T.rate.slide[0]) + 0.2, (i, t) => { const u = Math.min(1, t / 0.7); ph += (2 * Math.PI * lerp(440, 659.25, sm(u))) / SR; return Math.sin(ph) * 0.045 * Math.sin(Math.PI * Math.min(1, t / 0.9)); }); }
tick(wet, s(T.rate.slide[1]), 2637, 0.08);
air(wet, s(T.closeGlide[0]), 0.75, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 302);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-chaos.wav', dry);
