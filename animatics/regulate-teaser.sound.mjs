#!/usr/bin/env node
// Score for regulate-teaser.html; cues from regulate-teaser.timing.js. A heartbeat that speeds up
// as each state whips past (each state has its own sound: the gauge's ratchet knocks and redline
// rumble, the pendulum's hard-panned apex ticks, Chaos Release's burst and real rattle, the breath
// out), then a hard cut to silence - and one chord, and the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, wood, pad, breath, air, room, thump, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-teaser'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 300)) * (1 - sm(P(ms, T.wordmark, 2000))), 0.12);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.75], [T.silence - 300, 1.0]]) });
T.seg.forEach(([a, b], i) => { air(dry, s(a) - 0.05, 0.28, (u) => lerp(6000, 1200, u), (u) => sm(u / 0.2) * (1 - u), 0.45, 400 + i, (u) => lerp(0.7, -0.7, u)); });
{ const [a] = T.seg[0]; for (let k = 0; k < 4; k++) wood(dry, s(a + 150 + k * 190), -0.2, 0.55 + k * 0.06, 760 + k * 90);
  let ph = 0; add(dry, s(a), 1.35, (i, t) => { const ms = a + t * 1000; ph += (2 * Math.PI * (200 + 180 * sm(P(ms, a + 150, 800)))) / SR; return Math.sin(ph) * 0.05 * sm(t / 0.1) * (1 - sm((t - 1.2) / 0.1)); });
  const r = rng(3), lp = biquad('lp', 140, 0.9); add(dry, s(a + 900), 0.45, (i, t) => lp(r() * 2 - 1) * sm(t / 0.05) * (1 - sm((t - 0.35) / 0.1)) * 0.8); }
{ const [a, b] = T.seg[1]; for (let k = 0; a + k * 550 < b - 100; k++) wood(dry, s(a + k * 550), k % 2 ? -0.85 : 0.85, 0.7); }
{ const [a] = T.seg[2]; thump(dry, s(a), 96, 40, 1.0); let last = -1;
  for (const [t, x] of T.chaos.hits) { if (t - last < 8 || t > T.seg[2][1]) continue; last = t; const f = 1800 + ((t * 7) % 900); const r = rng(Math.round(t)); const bp = biquad('bp', f, 6); let ph = 0;
    add(dry, s(t), 0.03, (i, tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.6 + bp(r() * 2 - 1) * 3) * ar(tt, 0.0004, 0.006) * 0.2; }, { pan: Math.max(-0.9, Math.min(0.9, (x - 540) / 520)) }); } }
{ const [a] = T.seg[3]; breath(dry, s(a + 150), 1.15, 1100, 480, (u) => sm(u / 0.1) * Math.pow(1 - u, 0.9), 0.6, 44); }
pad(wet, T.silence + 200, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.silence + 200, 1500)) * (1 - sm(P(ms, T.wordmark, 2200))), 0.05);
air(wet, s(T.glide[0]), 0.8, (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.07, 450);
fullStop(wet, s(T.glide[1]));
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-teaser.wav', dry);
