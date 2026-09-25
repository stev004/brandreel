#!/usr/bin/env node
// Score for regulate-1147-v2.html; every cue is read from regulate-1147-v2.timing.js.
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, wood, pad, breath, air, room, ping, crackle, thump, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-1147-v2'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 400)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.7], [T.pingIn[4], 1.0], [T.fall[0] + 1500, 0.6], [T.fall[1], 0]]) });
[880, 987.77, 1046.5, 1174.66, 1318.51].forEach((f, i) => { ping(wet, s(T.pingIn[i]), f, 0.1, -0.35); if (i) tick(wet, s(T.pingIn[i]) + 0.01, 1900, 0.05, -0.2); });  // lands + the stack ratchets
air(wet, s(T.arc[0]), 0.7, (u) => lerp(400, 1800, u), (u) => Math.sin(Math.PI * u), 0.09, 91);   // the gauge draws
for (let k = 0; k < 11; k++) tick(wet, s(T.ticks + k * 30), 3400 + k * 40, 0.08, lerp(-0.6, 0.6, k / 10));
T.pingIn.forEach((tp, i) => wood(dry, s(tp) + 0.02, 0.15, 0.5 + i * 0.05, 700 + i * 80));   // each ping kicks the needle
{ let ph = 0; const a = T.pingIn[0], b = T.fall[0];
  add(dry, s(a), s(b - a) + 0.1, (i, t) => { const ms = a + t * 1000; ph += (2 * Math.PI * (196 + 230 * T.pressure(ms))) / SR; return Math.sin(ph) * 0.05 * sm(P(ms, a, 300)) * (1 - sm(P(ms, b - 50, 60))); });
  const r = rng(41), lp = biquad('lp', 140, 0.9);
  add(dry, s(T.tremble[0]), s(T.tremble[1] - T.tremble[0]), (i, t) => lp(r() * 2 - 1) * sm(t / 0.08) * (1 - sm((t - 0.45) / 0.15)) * 0.8); }
thump(dry, s(T.fall[0]), 70, 40, 0.3);
air(wet, s(T.fall[0]), s(T.fall[1] - T.fall[0]), (u) => 3000 * Math.pow(1 - u, 1.6) + 150, (u) => sm(u / 0.03) * Math.pow(1 - u, 1.3), 0.4, 93, (u) => lerp(0.5, -0.6, u));
breath(dry, s(T.fall[0] + 100), s(T.fall[1] - T.fall[0] - 200), 1050, 460, (u) => sm(u / 0.1) * Math.pow(1 - u, 1.0), 0.45, 94);
T.shatterAt.forEach((at, i) => { for (let k = 0; k < 3; k++) crackle(wet, s(at) + 0.2 + k * 0.055, 0.35, -0.35, 60 + i * 7 + k); });
pad(wet, T.fall[0] + 300, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.fall[0] + 300, 2500)) * (1 - sm(P(ms, T.fall[1] - 800, 2600))), 0.05);
air(wet, s(T.closeGlide[0]), 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 95);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-1147-v2.wav', dry);
