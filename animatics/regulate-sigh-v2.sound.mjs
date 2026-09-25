#!/usr/bin/env node
// Score for regulate-sigh-v2.html; every cue is read from regulate-sigh-v2.timing.js.
import { makeBus, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, pad, breath, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-sigh-v2'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 400)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.65], [T.hookOut, 0.8], [T.segAt[3], 0.7], [T.annotate, 0.4], [T.exit, 0]]) });
tone(wet, 0.35, 293.66, 0.05, 0, 0.3, 1.2);                                                     // "Neither could we."
air(wet, s(T.strike[0]), s(T.strike[1] - T.strike[0]), (u) => lerp(900, 4000, u), (u) => sm(u / 0.1) * (1 - sm((u - 0.7) / 0.3)), 0.14, 81, (u) => lerp(-0.4, 0.4, u));   // the strike
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(2200, 500, u), (u) => Math.sin(Math.PI * u), 0.1, 82, (u) => lerp(0.4, -0.5, u));
T.segAt.forEach((at, i) => tick(wet, s(at), 2400 + i * 120, 0.07));
breath(dry, s(T.segAt[0]), s(T.seg[0]), 1100, 1900, (u) => sm(u / 0.3) * (1 - sm((u - 0.85) / 0.15)), 0.5, 11);
breath(dry, s(T.segAt[1]), s(T.seg[1]), 1700, 2300, (u) => sm(u / 0.25) * (1 - sm((u - 0.7) / 0.3)), 0.45, 12);
breath(dry, s(T.segAt[3]), s(T.seg[3]), 1100, 470, (u) => sm(u / 0.12) * Math.pow(1 - u, 1.1), 0.6, 13);
pad(wet, T.segAt[3], T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.segAt[3], 2500)) * (1 - sm(P(ms, T.annotate + 800, 2600))), 0.05);
[T.annotate + 100, T.annotate + 200].forEach((at) => tick(wet, s(at), 3200, 0.05));             // brackets draw
air(wet, s(T.closeGlide[0]), 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 83);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-sigh-v2.wav', dry);
