#!/usr/bin/env node
// Score for regulate-balanced.html; every cue is read from regulate-balanced.timing.js.
// The calm one: no heartbeat, and no pitch glide anywhere (v1's A3->E4 glide read as a siren).
// v3 (09-28, "a bit loud and washy, needs to be gentle"): someone breathing quietly beside you,
// not a soundscape. The breath is dry and close - soft, dark filtered air (wide bandpass + a warm
// lowpass, no hiss) that draws in over the 4000ms inhale and lets go over the 8000ms exhale,
// following the column's airflow (the rate of T.fill), with a small pause at the turn.
// Under it, far back, a two-note fixed-pitch pad (D3 + A3) whose level and warmth ease up a little
// with the fill - the pitch never moves. Ticks barely there. Only a short, small room on a send
// (the breath gets none), then the full-stop tick and silence.
import { SR, makeBus, add, rng, biquad, lp1, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, lerp, tick, tone, pad, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-balanced'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 800)) * (1 - sm(P(ms, T.wordmark, 2000))), 0.06);

// a close, soft breath: wide bandpass (less whistle) into two warm one-pole lowpasses (no hiss wall)
function softBreath(bus, at, dur, f0, f1, env, amp, seed) {
  const r = rng(seed), bp = biquad('bp', f0, 0.6), lpA = lp1(1500), lpB = lp1(1500);
  add(bus, at, dur + 0.1, (i, t) => { const u = clamp(t / dur); if ((i & 31) === 0) bp.set(lerp(f0, f1, u)); return lpB(lpA(bp(r() * 2 - 1))) * env(u) * amp; });
}

// the full stop lifts off the sentence and glides to the foot of the column
tick(wet, s(T.detach), 3300, 0.018, 0.25);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1200, 450, u), (u) => Math.sin(Math.PI * u), 0.022, 61, (u) => lerp(0.25, 0, u));
for (let k = 0; k < 12; k += 2) tick(wet, s(T.colIn + k * 30), 2600 + (k % 4) * 90, 0.006, k < 4 ? -0.2 : 0.2);   // the ruler enters

// airflow = |d fill / dt|, normalised per phase, so the breath is loudest where the point moves fastest
const flow = (ms) => Math.abs(T.fill(ms + 5) - T.fill(ms - 5)) / 10;
const peak = (a, b) => { let m = 1e-9; for (let ms = a + 5; ms < b - 5; ms += 10) m = Math.max(m, flow(ms)); return m; };
const inPk = peak(T.inhale[0], T.inhale[1]), exPk = peak(T.exhale[0], T.exhale[1]);
softBreath(dry, s(T.inhale[0]), s(T.inhaleMs), 620, 820,
  (u) => sm(u / 0.2) * (0.3 + 0.7 * flow(T.inhale[0] + u * T.inhaleMs) / inPk) * (1 - sm((u - 0.8) / 0.14)), 0.5, 511);
softBreath(dry, s(T.exhale[0]), s(T.exhaleMs), 700, 420,
  (u) => sm((u - 0.02) / 0.12) * (0.4 + 0.6 * flow(T.exhale[0] + u * T.exhaleMs) / exPk) * Math.pow(1 - sm((u - 0.55) / 0.43), 1.2), 0.5, 512);

// the pad: two fixed-pitch warm voices (D3 slightly doubled, A3), 3 soft harmonics, dark lowpass that
// opens only a little with the fill. Mostly dry and low (distance = quiet + dark), a little to the room.
{ const a = T.inhale[0] - 600, b = T.exhale[1] + 1200;
  const V = [[146.83, 1], [147.1, 0.55], [220, 0.6]];
  const ph = V.map(() => 0), lpA = biquad('lp', 380, 0.5), lpB = biquad('lp', 380, 0.5);
  const sig = new Float32Array(Math.round(((b - a) / 1000) * SR) + 1);
  for (let i = 0; i < sig.length; i++) {
    const ms = a + (i / SR) * 1000, fl = T.fill(ms);
    if ((i & 31) === 0) { const c = lerp(360, 640, fl); lpA.set(c); lpB.set(c); }
    let v = 0;
    V.forEach(([f, g], k) => { ph[k] += (2 * Math.PI * f) / SR; v += (Math.sin(ph[k]) + Math.sin(2 * ph[k]) * 0.3 + Math.sin(3 * ph[k]) * 0.12) * g; });
    const env = sm(P(ms, a, 2200)) * (0.55 + 0.45 * fl) * (1 - sm(P(ms, T.exhale[1] - 1200, b - T.exhale[1] + 1200)));
    sig[i] = lpB(lpA(v)) * env * 0.011;
  }
  add(dry, s(a), s(b - a), (i) => sig[i] * 0.75);
  add(wet, s(a), s(b - a), (i) => sig[i] * 0.35); }

// ticks as each lights: barely there (inhale ticks climb, exhale ticks step down)
T.inLit.forEach((at, i) => tick(wet, s(at), 2300 + T.inTicks[i] * 700, 0.009, -0.2));
T.outLit.forEach((at, i) => tick(wet, s(at), 2300 + T.outTicks[i] * 700, 0.007, 0.2));
tone(wet, s(T.change + 280), 659.25, 0.012, 0, 0.4, 1.0);                                  // "Keep it that way."

// close (the house chord shares the pad's D and A, so the hand-off is seamless)
pad(wet, T.exhale[1] - 400, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.exhale[1] - 400, 2200)) * (1 - sm(P(ms, T.wordmark + 200, 2000))), 0.018);
air(wet, s(T.closeGlide[0]), s(T.closeGlide[1] - T.closeGlide[0]), (u) => lerp(1300, 450, u), (u) => Math.sin(Math.PI * u), 0.025, 63);
{ const fs = makeBus(T.dur / 1000); fullStop(fs, s(T.closeGlide[1])); mixInto(wet, fs, 0.5); }
// a short, small, dark room (was mix 0.44 / room 0.87: the wash)
reverb(wet, { mix: 0.14, room: 0.6, damp: 0.7, preDelayMs: 10 }); mixInto(dry, wet, 1); master(dry, 1.0);
writeWav(process.argv[2] || 'regulate-balanced.wav', dry);
