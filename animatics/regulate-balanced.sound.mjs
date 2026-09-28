#!/usr/bin/env node
// Score for regulate-balanced.html; every cue is read from regulate-balanced.timing.js.
// The calm one: no heartbeat, and no pitch glide anywhere (v1's A3->E4 glide read as a siren).
// The breath is air, not a tone: filtered noise that draws in over the 4000ms inhale and lets go
// over the 8000ms exhale, loudness following the column's own airflow (the rate of T.fill).
// Under it, a fixed-pitch warm pad (D3 / A3 / D4, slightly detuned, the house close chord's root)
// whose loudness and brightness (lowpass cutoff) swell with the fill and ease with the exhale -
// the pitch never moves. Soft clicks as each tick lights, then the full-stop tick and silence.
import { SR, makeBus, add, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, lerp, tick, tone, pad, breath, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-balanced'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 500)) * (1 - sm(P(ms, T.wordmark, 2000))), 0.1);

// the full stop lifts off the sentence and glides to the foot of the column
tick(wet, s(T.detach), 3300, 0.05, 0.35);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1600, 500, u), (u) => Math.sin(Math.PI * u), 0.06, 61, (u) => lerp(0.35, 0, u));
for (let k = 0; k < 12; k++) tick(wet, s(T.colIn + k * 30), 2600 + (k % 4) * 90, 0.025, k < 4 ? -0.3 : 0.3);   // the ruler enters

// airflow = |d fill / dt|, normalised per phase, so the breath is loudest where the point moves fastest
const flow = (ms) => Math.abs(T.fill(ms + 5) - T.fill(ms - 5)) / 10;
const peak = (a, b) => { let m = 1e-9; for (let ms = a + 5; ms < b - 5; ms += 10) m = Math.max(m, flow(ms)); return m; };
const inPk = peak(T.inhale[0], T.inhale[1]), exPk = peak(T.exhale[0], T.exhale[1]);
breath(dry, s(T.inhale[0]), s(T.inhaleMs), 1000, 1500,
  (u) => sm(u / 0.1) * (0.35 + 0.65 * flow(T.inhale[0] + u * T.inhaleMs) / inPk) * (1 - sm((u - 0.86) / 0.14)), 0.42, 511);
breath(dry, s(T.exhale[0]), s(T.exhaleMs), 1050, 520,
  (u) => sm(u / 0.08) * (0.5 + 0.5 * flow(T.exhale[0] + u * T.exhaleMs) / exPk) * (1 - sm((u - 0.88) / 0.12)), 0.46, 512);

// the pad: fixed pitch, soft saw-ish voices (6 harmonics, 1/h) through a lowpass that opens with the fill
{ const a = T.inhale[0] - 400, b = T.exhale[1] + 900;
  const V = [[146.83, 1], [147.25, 0.7], [220, 0.75], [220.55, 0.5], [293.66, 0.4], [294.2, 0.3]];
  const ph = V.map(() => 0), lpA = biquad('lp', 500, 0.6), lpB = biquad('lp', 500, 0.6);
  add(wet, s(a), s(b - a), (i, t) => {
    const ms = a + t * 1000, fl = T.fill(ms);
    if ((i & 31) === 0) { const c = lerp(420, 1700, fl); lpA.set(c); lpB.set(c); }
    let v = 0;
    V.forEach(([f, g], k) => { ph[k] += (2 * Math.PI * f) / SR; let x = 0; for (let h = 1; h <= 6; h++) x += Math.sin(h * ph[k]) / h; v += x * g; });
    const env = sm(P(ms, a, 900)) * (0.4 + 0.6 * fl) * (1 - sm(P(ms, T.exhale[1] - 300, b - T.exhale[1] + 300)));
    return lpB(lpA(v)) * env * 0.022;
  }); }

// soft clicks as each tick lights: inhale ticks climb, exhale ticks step down
T.inLit.forEach((at, i) => tick(wet, s(at), 2300 + T.inTicks[i] * 700, 0.045, -0.3));
T.outLit.forEach((at, i) => tick(wet, s(at), 2300 + T.outTicks[i] * 700, 0.038, 0.3));
tone(wet, s(T.change + 280), 659.25, 0.03, 0, 0.3, 1.2);                                   // "Keep it that way."

// close (the house chord shares the pad's D and A, so the hand-off is seamless)
pad(wet, T.exhale[1] - 400, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.exhale[1] - 400, 1800)) * (1 - sm(P(ms, T.wordmark + 200, 2200))), 0.04);
air(wet, s(T.closeGlide[0]), s(T.closeGlide[1] - T.closeGlide[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.07, 63);
fullStop(wet, s(T.closeGlide[1]));
reverb(wet, { mix: 0.44, room: 0.87, damp: 0.4, preDelayMs: 24 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-balanced.wav', dry);
