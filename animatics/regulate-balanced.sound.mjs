#!/usr/bin/env node
// Score for regulate-balanced.html; every cue is read from regulate-balanced.timing.js.
// The calm one: no heartbeat. One sustained tone follows the breath fill exactly - it rises a
// fifth (A3 -> E4) over the 4000ms inhale and eases back over the 8000ms exhale - soft clicks as
// each tick lights, then the full-stop tick and silence.
import { SR, makeBus, add, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, lerp, tick, tone, pad, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-balanced'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 500)) * (1 - sm(P(ms, T.wordmark, 2000))), 0.1);

// the full stop lifts off the sentence and glides to the foot of the column
tick(wet, s(T.detach), 3300, 0.05, 0.35);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1600, 500, u), (u) => Math.sin(Math.PI * u), 0.06, 61, (u) => lerp(0.35, 0, u));
for (let k = 0; k < 12; k++) tick(wet, s(T.colIn + k * 30), 2600 + (k % 4) * 90, 0.025, k < 4 ? -0.3 : 0.3);   // the ruler enters

// the tone: frequency = 220 * 1.5^fill, so it sits on the column's own curve
{ const a = T.inhale[0] - 250, b = T.closeGlide[0] + 600; let p1 = 0, p2 = 0, p3 = 0;
  add(dry, s(a), s(b - a), (i, t) => {
    const ms = a + t * 1000, fl = T.fill(ms), f = 220 * Math.pow(1.5, fl);
    p1 += (2 * Math.PI * f) / SR; p2 += (2 * Math.PI * (f * 1.0035)) / SR; p3 += (2 * Math.PI * f * 2) / SR;
    const env = sm(P(ms, a, 700)) * (1 - sm(P(ms, T.exhale[1] - 200, b - T.exhale[1] + 200))) * (0.8 + 0.2 * fl);
    return (Math.sin(p1) * 0.6 + Math.sin(p2) * 0.4 + Math.sin(p3) * 0.12) * env * 0.07;
  }); }

// soft clicks as each tick lights: inhale ticks climb, exhale ticks step down
T.inLit.forEach((at, i) => tick(wet, s(at), 2300 + T.inTicks[i] * 700, 0.06, -0.3));
T.outLit.forEach((at, i) => tick(wet, s(at), 2300 + T.outTicks[i] * 700, 0.05, 0.3));
tone(wet, s(T.change + 280), 659.25, 0.03, 0, 0.3, 1.2);                                   // "Keep it that way."

// close
pad(wet, T.exhale[1] - 400, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.exhale[1] - 400, 1800)) * (1 - sm(P(ms, T.wordmark + 200, 2200))), 0.04);
air(wet, s(T.closeGlide[0]), s(T.closeGlide[1] - T.closeGlide[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.07, 63);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.44, room: 0.87, damp: 0.4, preDelayMs: 24 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-balanced.wav', dry);
