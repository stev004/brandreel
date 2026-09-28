#!/usr/bin/env node
// Score for regulate-angry-held.html; every cue is read from regulate-angry-held.timing.js, which runs
// the SAME deterministic Chaos Release simulation as the picture: every rattle is a real collision
// (wall knocks lower, ball clacks higher, panned by where it happened). Heartbeat under the hook that
// climbs as the argument is held in; a low strain that rises with the squeeze and the charge; the
// burst; the shaking; milestone thumps at 75/50/25; nothing after zero, then the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, air, room, thump, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-angry-held'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-0.9, Math.min(0.9, (x - 540) / 480));
const cut = (ms) => 1 - sm(P(ms, T.zero, 40));   // zero: everything stops

room(dry, 0, T.zero + 60, (ms) => sm(P(ms, 0, 400)) * cut(ms), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.75], [T.comp[0], 0.85], [T.comp[1], 1.05], [T.burst, 1.05], [T.burst + 300, 0.7], [T.zero - 600, 0.4], [T.zero - 250, 0]]) });

// the argument lands on beats: low, close, unresolved
[[220, 0.05], [207.65, 0.055], [196, 0.06]].forEach(([f, a], i) => tone(wet, s(T.lineIn[i]), f, a, 0, 0.08, 0.9));

// held in: a low strain (sub + narrow band noise) that rises in pitch and weight with the squeeze,
// trembling as the block does; held at the top; cut dead by the burst
{ const r = rng(77), bp = biquad('bp', 180, 7), a = T.comp[0] - 200, b = T.burst + 30; let ph = 0;
  add(dry, s(a), s(b - a), (i, t) => {
    const ms = a + t * 1000, h = T.held(ms), f = lerp(46, 64, h);
    bp.set(lerp(160, 420, h)); ph += (2 * Math.PI * f) / SR;
    const trem = 1 + 0.25 * h * Math.sin(2 * Math.PI * 9 * t);
    const env = sm(P(ms, a, 500)) * (0.25 + 0.75 * h) * (1 - sm(P(ms, b - 30, 30)));
    return (Math.tanh(1.6 * Math.sin(ph)) * 0.32 + bp(r() * 2 - 1) * 0.9 * h) * trem * env;
  }); }
// the numeral ticks up as it loads: one faint tick per 10%
for (let v = 10; v <= 100; v += 10) { const tv = T.comp[0] + (T.comp[1] - T.comp[0]) * (v / 100); tick(wet, s(tv), 2600 + v * 6, 0.025 + v * 0.0003); }

// the instruction + the phone edge drawing in: a swish and one tick
air(wet, s(T.phone), 0.7, (u) => lerp(500, 1800, u), (u) => Math.sin(Math.PI * u), 0.06, 61);
tick(wet, s(T.mono), 3100, 0.05);

// the burst: a thump and a dry crackle spray from the block's centre out
thump(dry, s(T.burst), 96, 40, 0.9);
for (let k = 0; k < 14; k++) crackle(wet, s(T.burst + (k * T.RIPPLE) / 13), 0.24, ((k % 2 ? 1 : -1) * k) / 18, 900 + k);

// the charge: a low rumble that thins with the swarm and is gone at zero
{ const r = rng(612), lp = biquad('lp', 110, 0.8), a = T.burst;
  add(dry, s(a), s(T.zero - a) + 0.05, (i, t) => { const ms = a + t * 1000; return lp(r() * 2 - 1) * 1.3 * sm(P(ms, a, 200)) * (0.25 + 0.75 * T.charge(ms) / 100) * cut(ms); }); }

// each 110ms shake stroke: the phone in the hand (a short, dull grip knock)
T.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 520 : 700, 0.9); const g = J.k ? 0.22 : 0.38;
  add(dry, s(J.t), 0.06, (i, t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.018) * g * 3, { pan: 0 }); });

// collisions: every one is in the picture; the densest moments thin to one click per 6ms
{ const ev = [...T.events].sort((a, b) => a[0] - b[0]); let lastT = -1;
  for (const [t, kind, v, x] of ev) {
    if (t - lastT < 6) continue; lastT = t;
    const amp = Math.min(1, v / (1000 * T.S)) * 0.3, f = kind ? 2400 + (v % 900) : 1100 + (v % 500);
    const r = rng(Math.round(t * 13) + kind), bp = biquad('bp', f, 6); let ph = 0;
    add(dry, s(t), 0.03, (i, tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.6 + bp(r() * 2 - 1) * 3) * ar(tt, 0.0004, kind ? 0.004 : 0.007) * amp; }, { pan: panX(x) });
  } }

// milestone haptics (triggerMedium at 75 / 50 / 25)
T.milestones.forEach((m) => thump(dry, s(m), 92, 44, 0.75));

// after zero: nothing. Then the point lands.
fullStop(wet, s(T.fall[1]));
reverb(wet, { mix: 0.4, room: 0.84, damp: 0.4, preDelayMs: 20 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-angry-held.wav', dry);
