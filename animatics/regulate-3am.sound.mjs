#!/usr/bin/env node
// regulate-3am.sound.mjs - score for the KEPT 3:04 AM animatic (rev5d, 19.6s). Picture untouched;
// cue times read from its CSS (header + second style block). The night is a room tone and a
// heartbeat; each thought arrives as a soft tone that stacks into a dissonant cluster; the
// exhale resolves it to a major chord while each thought leaves on a breath of air; the
// countdown ticks once a second; the wordmark lands on the full-stop tick. Then silence.
// Usage: node animatics/regulate-3am.sound.mjs <out.wav>
import { makeBus, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeat, tick, tone, pad, breath, air, room, fullStop } from '../bin/lib/sfx.mjs';
const DUR = 19.6, dry = makeBus(DUR), wet = makeBus(DUR);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

room(dry, 0, 19600, (ms) => sm(P(ms, 0, 800)) * (1 - sm(P(ms, 17200, 1800))), 0.15);
heartbeat(dry, { startMs: 500, endMs: 16600, bpm: (ms) => kf(ms, [[0, 84], [4500, 100], [7900, 100], [15900, 60]]), gain: (ms) => kf(ms, [[0, 0], [600, 0.75], [7900, 0.9], [14800, 0.55], [16500, 0]]) });
// five thoughts: 1.6 2.6 3.6 4.0 4.5s, panned by where they sit, stacking toward a minor second
const TH = [[1.6, 440, -0.6], [2.6, 523.25, -0.3], [3.6, 622.25, -0.5], [4.0, 659.25, -0.65], [4.5, 698.46, -0.1]];
TH.forEach(([at, f, pan]) => tone(wet, at, f, 0.055, pan, 0.5, 1.4));
pad(dry, 1600, 10200, [220, 233.08, 329.63], (ms) => sm(P(ms, 1600, 3000)) * (1 - sm(P(ms, 7900, 2200))), 0.035);   // unease under the thoughts
pad(wet, 8000, 17600, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, 8000, 3000)) * (1 - sm(P(ms, 14500, 3000))), 0.05); // the exhale resolves
for (let k = 0; k < 12; k++) tick(wet, 7.0 + k * 0.03, 2600 + (k % 4) * 90, 0.07, k < 4 ? -0.2 : 0.35);
breath(dry, 7.9, 8.0, 1050, 480, (u) => sm(u / 0.1) * Math.pow(1 - u, 0.9), 0.5, 304);
[[7.9, -0.6], [8.8, -0.3], [9.7, -0.5], [10.6, -0.65], [11.5, -0.1]].forEach(([at, pan], i) => air(wet, at, 1.6, (u) => lerp(2400, 300, u), (u) => sm(u / 0.2) * (1 - u), 0.16, 40 + i, pan));
for (let s = 0; s < 8; s++) tick(dry, 7.9 + s, 1760, 0.035, 0.35);   // 8s ... 1s
fullStop(wet, 17.4);
reverb(wet, { mix: 0.45, room: 0.87, damp: 0.4, preDelayMs: 24 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-3am.wav', dry);
