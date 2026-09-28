#!/usr/bin/env node
// Score for regulate-angry-loud.html; every cue is read from regulate-angry-loud.timing.js, which runs
// the SAME deterministic Chaos Release simulation as the picture: every rattle is a real collision
// (wall knocks lower, ball clacks higher, panned by where it happened). A heartbeat that climbs
// 100 -> 124 bpm and gets louder under the hook; each replay of "forget it" lands as a hit ~1.4x
// harder and brighter than the last; the charge is born as a low sub on the fourth; grip knocks per
// shake stroke, glyph crackle as each replay breaks, milestone thumps at 75/50/25, nothing after
// zero, then the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, air, room, thump, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-angry-loud'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-0.9, Math.min(0.9, (x - 540) / 480));
const cut = (ms) => 1 - sm(P(ms, T.zero, 40));   // zero: everything stops

room(dry, 0, T.zero + 60, (ms) => sm(P(ms, 0, 400)) * cut(ms), 0.15);
// the heartbeat gets louder with every replay, then gives way to the shaking
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.7], [T.lineIn[0], 0.75], [T.lineIn[3], 1.05], [T.shake - 700, 0.9], [T.shake - 150, 0.5]]) });

// the replays: the same hit each time, 1.4x louder, brighter and closer (a slammed low chord + a
// dry transient whose cutoff opens with each replay)
T.lineIn.forEach((at, i) => {
  const g = Math.pow(1.4, i) / Math.pow(1.4, 3);   // 0.36 .. 1
  tone(wet, s(at), 196, 0.07 * g, 0, 0.012, 0.7 + 0.15 * i);
  tone(wet, s(at), 293.66, 0.035 * g, 0, 0.012, 0.5 + 0.1 * i);
  thump(dry, s(at), 110, 48, 0.5 * g);
  const r = rng(1400 + i), lp = biquad('lp', 900 * Math.pow(1.6, i), 0.8);
  add(dry, s(at), 0.12, (k, t) => lp(r() * 2 - 1) * ar(t, 0.0015, 0.03 + 0.01 * i) * 0.9 * g);
});

// the clock blows out; the charge is born: a swish and a sub under the numeral
air(wet, s(T.clockOut), 0.5, (u) => lerp(1800, 400, u), (u) => Math.sin(Math.PI * u), 0.09, 61);
thump(dry, s(T.clockOut + 430), 62, 36, 0.55);
tick(wet, s(T.clockOut + 600), 3000, 0.05, 0);

// the instruction + the device's edge drawing in
tick(wet, s(T.instr), 2900, 0.05, 0); tick(wet, s(T.instrMono), 3200, 0.045, 0);
air(wet, s(T.edge), 0.9, (u) => lerp(600, 2200, u), (u) => Math.sin(Math.PI * u), 0.05, 71);

// the charge: a low rumble from the moment it's born, thinning with the swarm, gone at zero
{ const r = rng(1401), lp = biquad('lp', 110, 0.8), a = T.clockOut + 430;
  add(dry, s(a), s(T.zero - a) + 0.05, (i, t) => { const ms = a + t * 1000; return lp(r() * 2 - 1) * 1.3 * sm(P(ms, a, 700)) * (0.25 + 0.75 * T.charge(ms) / 100) * cut(ms); }); }

// each 110ms shake stroke: the phone in the hand (a short, dull grip knock)
T.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 520 : 700, 0.9); const g = J.k ? 0.22 : 0.38;
  add(dry, s(J.t), 0.06, (i, t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.018) * g * 3, { pan: 0 }); });

// the replays shatter: a dry crackle per glyph, panned where it broke (louder replay, louder break)
T.glyphs.forEach((gl, li) => gl.forEach((g, gi) => crackle(wet, s(T.glyphAt[li][gi]), 0.12 + 0.05 * li, panX(T.lines[li].x + g[1]), 700 + li * 40 + gi)));

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
writeWav(process.argv[2] || 'regulate-angry-loud.wav', dry);
