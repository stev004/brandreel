#!/usr/bin/env node
// regulate-1147-reel.sound.mjs - score for regulate-1147-reel.html (15.5s). Workday pressure:
// notifications stack in pitch, the heartbeat climbs with every tap on the gauge (wooden
// knocks, a tone rising with the needle, a rumble at the redline), then one long breath out as
// the needle falls; each ping cracks apart as it shatters; a major chord opens; the point
// lands on the full-stop tick. Usage: node animatics/regulate-1147-reel.sound.mjs <out.wav>
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeat, tick, wood, pad, breath, air, room, ping, crackle, thump, fullStop } from '../bin/lib/sfx.mjs';
const DUR = 15.5, dry = makeBus(DUR), wet = makeBus(DUR);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-1, Math.min(1, (x + 200 - 540) / 540));

room(dry, 0, 15500, (ms) => sm(P(ms, 0, 400)) * (1 - sm(P(ms, 13500, 1800))), 0.15);
heartbeat(dry, { startMs: 250, endMs: 11600, bpm: (ms) => kf(ms, [[0, 100], [5300, 104], [6900, 120], [7500, 116], [11500, 66]]), gain: (ms) => kf(ms, [[0, 0.7], [6900, 1.0], [9500, 0.6], [11500, 0]]) });
const PINGS = [[1.3, 880, 96], [1.9, 987.77, 330], [2.5, 1046.5, 140], [3.0, 1174.66, 420], [3.5, 1318.51, 180]];
PINGS.forEach(([at, f, x]) => ping(wet, at, f, 0.11, panX(x)));
air(wet, 4.6, 0.8, (u) => lerp(400, 1800, u), (u) => Math.sin(Math.PI * u), 0.1, 31);       // the arc draws
for (let k = 0; k < 11; k++) tick(wet, 4.8 + k * 0.03, 3400 + k * 40, 0.08, lerp(-0.6, 0.6, k / 10));
for (let i = 0; i < 8; i++) wood(dry, 5.3 + i * 0.2, 0.2, 0.45 + i * 0.04, 700 + i * 55);    // taps ratchet
{ // pressure tone rises with the needle, cut at the release
  let ph = 0;
  add(dry, 5.3, 2.3, (i, t) => { const ms = 5300 + t * 1000; const p = Math.min(0.96, Math.floor((ms - 5300) / 200 + 1) * 0.12); ph += (2 * Math.PI * (196 + 230 * p)) / SR; return Math.sin(ph) * 0.05 * sm(P(ms, 5300, 300)) * (1 - sm(P(ms, 7450, 60))); });
  const r = rng(41), lp = biquad('lp', 140, 0.9);
  add(dry, 6.7, 0.5, (i, t) => lp(r() * 2 - 1) * sm(t / 0.1) * (1 - sm((t - 0.35) / 0.1)) * 0.8);   // redline rumble
}
thump(dry, 7.5, 70, 40, 0.3);
air(wet, 7.5, 4.0, (u) => 3000 * Math.pow(1 - u, 1.6) + 150, (u) => sm(u / 0.03) * Math.pow(1 - u, 1.3), 0.4, 33, (u) => lerp(0.5, -0.6, u));
breath(dry, 7.6, 3.8, 1050, 460, (u) => sm(u / 0.1) * Math.pow(1 - u, 1.0), 0.45, 34);
[[7.8, 96], [8.3, 330], [8.8, 140], [9.3, 420], [9.8, 180]].forEach(([at, x], i) => { for (let k = 0; k < 3; k++) crackle(wet, at + 0.25 + k * 0.06, 0.35, panX(x), 50 + i * 7 + k); });
pad(wet, 8000, 13600, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, 8000, 2500)) * (1 - sm(P(ms, 11000, 2500))), 0.05);
air(wet, 11.9, 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 35);
fullStop(wet, 12.7);
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-1147-reel.wav', dry);
