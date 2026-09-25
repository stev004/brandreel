#!/usr/bin/env node
// regulate-sigh-reel.sound.mjs - score for regulate-sigh-reel.html (16.5s). The breath IS the
// score: a nasal inhale, one more sip, a held beat of silence, a long mouth exhale; the
// heartbeat slows under it; captions tick as they change; a major chord opens on the exhale;
// the point lands on the full-stop tick. Usage: node animatics/regulate-sigh-reel.sound.mjs <out.wav>
import { makeBus, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeat, tick, tone, pad, breath, air, room, fullStop } from '../bin/lib/sfx.mjs';
const DUR = 16.5, dry = makeBus(DUR), wet = makeBus(DUR);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

room(dry, 0, 16500, (ms) => sm(P(ms, 0, 500)) * (1 - sm(P(ms, 14500, 1800))), 0.15);
heartbeat(dry, { startMs: 150, endMs: 12600, bpm: (ms) => kf(ms, [[0, 96], [2600, 100], [6400, 92], [10400, 68]]), gain: (ms) => kf(ms, [[0, 0.6], [2600, 0.8], [6400, 0.7], [10400, 0.45], [12500, 0]]) });
tone(wet, 0.45, 293.66, 0.05, 0, 0.3, 1.2);                     // "Neither could we."
air(wet, 2.7, 0.9, (u) => lerp(300, 1600, u), (u) => Math.sin(Math.PI * u), 0.12, 21);   // the curve draws
[3.4, 5.1, 5.9, 6.4].forEach((at, i) => tick(wet, at, 2400 + i * 120, 0.07));        // captions change
breath(dry, 3.4, 1.7, 1100, 1900, (u) => sm(u / 0.3) * (1 - sm((u - 0.85) / 0.15)), 0.5, 11);   // inhale
breath(dry, 5.1, 0.8, 1700, 2300, (u) => sm(u / 0.25) * (1 - sm((u - 0.7) / 0.3)), 0.45, 12);   // one more sip
breath(dry, 6.4, 4.0, 1100, 470, (u) => sm(u / 0.12) * Math.pow(1 - u, 1.1), 0.6, 13);          // long exhale
pad(wet, 6400, 14000, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, 6400, 2500)) * (1 - sm(P(ms, 11200, 2600))), 0.05);
air(wet, 12.5, 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 22);   // the glide
fullStop(wet, 13.3);
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-sigh-reel.wav', dry);
