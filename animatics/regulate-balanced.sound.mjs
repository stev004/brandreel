#!/usr/bin/env node
// Score for regulate-balanced.html; every cue is read from regulate-balanced.timing.js.
// The calm one: no heartbeat, and no pitch glide anywhere (v1's A3->E4 glide read as a siren).
// v4 (09-28, Steven: "the breathing just feels so sharp and loud and harsh. should be toned down"):
// the breath is now felt more than heard. Two soft, dark layers of noise per phase - an air layer
// through a steep 8-pole lowpass that moves gently between ~380 and ~760Hz (no bandpass, no hiss,
// nothing near 1.5kHz), and a warm body layer under 170Hz - split L/R on decorrelated seeds so it
// sits around you rather than in one ear. Every edge is a long cosine fade (1.6s in on the inhale,
// a quiet gap at the turn, 1.6s back in on the exhale, a 4s let-go), and it sits well under the pad.
// v3 (09-28, "a bit loud and washy, needs to be gentle"): someone breathing quietly beside you,
// not a soundscape. The breath follows the column's airflow (the rate of T.fill) loosely.
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

// a soft, low breath: steep lowpass air (4 cascaded 2-pole lowpasses, cutoff eased between c0 and c1)
// over a warm sub-170Hz body; a gentle highpass keeps it out of the mud. No bandpass, so no whistle.
const cf = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));   // cosine fade 0 -> 1
function softBreath(bus, at, dur, c0, c1, env, amp, seed, pan) {
  const r = rng(seed), lps = [0, 1, 2, 3].map(() => biquad('lp', c0, 0.6)), hp = biquad('hp', 70, 0.6), bA = lp1(170), bB = lp1(170);
  add(bus, at, dur + 0.05, (i, t) => {
    const u = clamp(t / dur);
    if ((i & 63) === 0) { const c = lerp(c0, c1, cf(u)); lps.forEach((f) => f.set(c)); }
    const n = r() * 2 - 1; let a = n; for (const f of lps) a = f(a);
    return hp(a * 0.9 + bB(bA(n)) * 1.6) * env(u) * amp;
  }, { pan });
}

// with the breath ~12dB down, mastering lifts everything else; FX pulls the ticks, airs, cue tone and
// the full-stop tick back so they land no louder than v3 in the final (ticks barely there)
const FX = 0.45;

// the full stop lifts off the sentence and glides to the foot of the column
tick(wet, s(T.detach), 3300, 0.018 * FX, 0.25);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1200, 450, u), (u) => Math.sin(Math.PI * u), 0.022 * FX, 61, (u) => lerp(0.25, 0, u));
for (let k = 0; k < 12; k += 2) tick(wet, s(T.colIn + k * 30), 2600 + (k % 4) * 90, 0.006 * FX, k < 4 ? -0.2 : 0.2);   // the ruler enters

// airflow = |d fill / dt|, normalised per phase, so the breath is loudest where the point moves fastest
const BREATH = 0.07, PADG = 2;   // v4: the pad carries the cycle now, the breath sits ~9dB under it
const flow = (ms) => Math.abs(T.fill(ms + 5) - T.fill(ms - 5)) / 10;
const peak = (a, b) => { let m = 1e-9; for (let ms = a + 5; ms < b - 5; ms += 10) m = Math.max(m, flow(ms)); return m; };
const inPk = peak(T.inhale[0], T.inhale[1]), exPk = peak(T.exhale[0], T.exhale[1]);
// the inhale fades in over its first 1.6s and is gone by the turn; the exhale fades back in over 1.6s
// and lets go over its last 4s. Airflow only nudges the level (0.75..1), it never shapes an edge.
const inEnv = (u) => cf(u / 0.4) * (1 - cf((u - 0.6) / 0.4)) * (0.75 + 0.25 * flow(T.inhale[0] + u * T.inhaleMs) / inPk);
const exEnv = (u) => cf(u / 0.2) * (1 - cf((u - 0.5) / 0.5)) * (0.75 + 0.25 * flow(T.exhale[0] + u * T.exhaleMs) / exPk);
[[-0.35, 511], [0.35, 521]].forEach(([pan, seed]) => {
  softBreath(dry, s(T.inhale[0]), s(T.inhaleMs), 420, 760, inEnv, BREATH, seed, pan);
  softBreath(dry, s(T.exhale[0]), s(T.exhaleMs), 700, 380, exEnv, BREATH, seed + 1, pan);
});

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
  add(dry, s(a), s(b - a), (i) => sig[i] * 0.75 * PADG);
  add(wet, s(a), s(b - a), (i) => sig[i] * 0.35 * PADG); }

// ticks as each lights: barely there (inhale ticks climb, exhale ticks step down)
T.inLit.forEach((at, i) => tick(wet, s(at), 2300 + T.inTicks[i] * 700, 0.009 * FX, -0.2));
T.outLit.forEach((at, i) => tick(wet, s(at), 2300 + T.outTicks[i] * 700, 0.007 * FX, 0.2));
tone(wet, s(T.change + 280), 659.25, 0.012 * FX, 0, 0.4, 1.0);                                  // "Keep it that way."

// close (the house chord shares the pad's D and A, so the hand-off is seamless)
pad(wet, T.exhale[1] - 400, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.exhale[1] - 400, 2200)) * (1 - sm(P(ms, T.wordmark + 200, 2000))), 0.018 * 0.6);
air(wet, s(T.closeGlide[0]), s(T.closeGlide[1] - T.closeGlide[0]), (u) => lerp(1300, 450, u), (u) => Math.sin(Math.PI * u), 0.025 * FX, 63);
{ const fs = makeBus(T.dur / 1000); fullStop(fs, s(T.closeGlide[1])); mixInto(wet, fs, 0.5 * FX); }
// a short, small, dark room (was mix 0.44 / room 0.87: the wash)
reverb(wet, { mix: 0.14, room: 0.6, damp: 0.7, preDelayMs: 10 }); mixInto(dry, wet, 1); master(dry, 1.0);
writeWav(process.argv[2] || 'regulate-balanced.wav', dry);
