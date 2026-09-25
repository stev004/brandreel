#!/usr/bin/env node
// Score for regulate-3am-v2.html; every cue is read from regulate-3am-v2.timing.js.
import { makeBus, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, pad, breath, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-3am-v2'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 600)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.7], [T.clockOut, 0.95], [T.exhale[0], 0.85], [T.exhale[1] - 1500, 0.45], [T.exhale[1] + 400, 0]]) });
const PANS = [-0.55, -0.2, -0.45, -0.3, -0.4], NOTES = [440, 523.25, 622.25, 659.25, 698.46];
T.thoughtIn.forEach((at, i) => tone(wet, s(at), NOTES[i], 0.06, PANS[i], 0.35, 1.3));
pad(dry, T.thoughtIn[0], T.exhale[0] + 2400, [220, 233.08, 329.63], (ms) => sm(P(ms, T.thoughtIn[0], 3200)) * (1 - sm(P(ms, T.exhale[0], 2400))), 0.035);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(600, 2200, u), (u) => Math.sin(Math.PI * u), 0.1, 71, (u) => lerp(-0.1, 0.45, u));   // colon dot -> column
for (let k = 0; k < 12; k++) tick(wet, s(T.glide[1] + k * 30), 2600 + (k % 4) * 90, 0.07, 0.4);
breath(dry, s(T.exhale[0]), s(T.exhale[1] - T.exhale[0]), 1050, 470, (u) => sm(u / 0.08) * Math.pow(1 - u, 0.9), 0.55, 304);
pad(wet, T.exhale[0] + 300, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.exhale[0] + 300, 3000)) * (1 - sm(P(ms, T.exhale[1], 2600))), 0.05);
T.dissolveAt.forEach((at, i) => air(wet, s(at), 1.3, (u) => lerp(2600, 300, u), (u) => sm(u / 0.15) * (1 - u), 0.15, 40 + i, PANS[i]));
air(wet, s(T.closeGlide[0]), 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 72);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.44, room: 0.87, damp: 0.4, preDelayMs: 24 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-3am-v2.wav', dry);
