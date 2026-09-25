#!/usr/bin/env node
// Score for regulate-ad.html; cues from regulate-ad.timing.js. The point "sitting still" pings like
// sonar on every heartbeat; the home builds with soft ticks; each tap rises a step (D E F# A) as
// its state resolves to a tool; the loop plays out (the tap, a Chaos Release burst with its rattle
// and pops, the rating rising to regulated); one chord; the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, pad, air, room, thump, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-ad'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 300)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.12);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.7], [T.homeIn, 0.5], [T.use[0], 0.85], [T.use[1], 0.35], [T.closeGlide[0], 0]]) });
T.beats.filter((b) => b < T.homeIn).forEach((b) => tone(wet, s(b) + 0.01, 587.33, 0.05, 0, 0.004, 0.5));   // sonar pings
air(wet, s(T.swap), 0.7, (u) => lerp(600, 2000, u), (u) => Math.sin(Math.PI * u), 0.07, 501);
for (let k = 0; k < 4; k++) tick(wet, s(T.homeIn + 300 + k * 90), 2400 + k * 150, 0.07, -0.3);
[587.33, 659.25, 739.99, 880].forEach((f, k) => { tick(dry, s(T.taps[k]), 3000, 0.1, -0.5); tone(wet, s(T.taps[k]) + 0.02, f, 0.06, -0.3, 0.01, 0.6); air(wet, s(T.taps[k]) + 0.06, 0.35, (u) => lerp(3000, 900, u), (u) => sm(u / 0.2) * (1 - u), 0.05, 510 + k, 0.2); });
pad(wet, T.line - 300, T.use[0] + 400, [146.83, 220, 293.66], (ms) => sm(P(ms, T.line - 300, 1200)) * (1 - sm(P(ms, T.use[0] - 200, 500))), 0.035);
tick(dry, s(T.pick), 3000, 0.1, -0.5); tone(wet, s(T.pick) + 0.02, 523.25, 0.06, -0.3, 0.01, 0.5);
thump(dry, s(T.use[0]), 96, 40, 1.0);
air(dry, s(T.use[0]) - 0.03, 0.3, (u) => lerp(5200, 900, u), (u) => sm(u / 0.15) * (1 - u), 0.45, 520);
{ let last = -1; for (const [t, x] of T.chaos.hits) { if (t - last < 7) continue; last = t; const f = 1900 + ((t * 7) % 900), r = rng(Math.round(t)), bp = biquad('bp', f, 6); let ph = 0;
    add(dry, s(t), 0.03, (i, tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.6 + bp(r() * 2 - 1) * 3) * ar(tt, 0.0004, 0.006) * 0.18; }, { pan: Math.max(-0.9, Math.min(0.9, (x - 540) / 520)) }); } }
T.removedAt.forEach((rm, i) => { if (!isFinite(rm)) return; let ph = 0; const f0 = 700 + (i % 7) * 60; add(wet, s(rm) + (i % 5) * 0.012, 0.08, (k, t) => { ph += (2 * Math.PI * (f0 + 900 * Math.min(1, t / 0.03))) / SR; return Math.sin(ph) * ar(t, 0.001, 0.02) * 0.06; }); });
pad(wet, T.use[1] - 200, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.use[1] - 200, 1500)) * (1 - sm(P(ms, T.wordmark, 2400))), 0.055);
{ let ph = 0; add(wet, s(T.slide[0]), s(T.slide[1] - T.slide[0]) + 0.2, (i, t) => { const u = Math.min(1, t / 0.65); ph += (2 * Math.PI * lerp(440, 659.25, sm(u))) / SR; return Math.sin(ph) * 0.045 * Math.sin(Math.PI * Math.min(1, t / 0.85)); }); }
tick(wet, s(T.slide[1]), 2637, 0.08);
air(wet, s(T.closeGlide[0]), 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 530);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-ad.wav', dry);
