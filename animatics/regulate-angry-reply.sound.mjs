#!/usr/bin/env node
// Score for regulate-angry-reply.html; every cue is read from regulate-angry-reply.timing.js, which
// runs the SAME deterministic Chaos Release simulation as the picture: every rattle is a real
// collision (wall knocks lower, ball clacks higher, panned by where it happened). A heartbeat that
// climbs under the draft; a key click per typed letter (harder and lower as the draft heats up), a
// lighter, faster tick per deleted one; a low charge that builds with every keystroke and thins with
// the swarm; grip knocks per shake stroke; milestone thumps at 75/50/25; nothing after zero; then
// the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, air, room, thump, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-angry-reply'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-0.9, Math.min(0.9, (x - 540) / 480));
const cut = (ms) => 1 - sm(P(ms, T.zero, 40));   // zero: everything stops
const L = T.lines, last = L[L.length - 1];

room(dry, 0, T.zero + 60, (ms) => sm(P(ms, 0, 400)) * cut(ms), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.75], [L[1].start, 0.9], [last.start, 1.05], [T.shatter, 0.8], [T.zero - 600, 0.45], [T.zero - 250, 0]]) });

// the phone draws in: a soft swish
air(wet, s(T.phoneIn), 0.7, (u) => lerp(600, 2200, u), (u) => Math.sin(Math.PI * u), 0.06, 41);

// the draft: a dry key click per letter; hotter lines hit harder and lower
T.keys.forEach(({ t, li, j }) => {
  const h = L[li].heat, r = rng(Math.round(t * 7) + j), bp = biquad('bp', lerp(3400, 2100, h) + (j % 3) * 120, 4), lp = biquad('lp', 260, 0.8);
  const x = T.textX + (j / L[li].n) * 300, g = lerp(0.16, 0.34, h);
  add(dry, s(t), 0.05, (i, tt) => (bp(r() * 2 - 1) * 2.4 * ar(tt, 0.0004, 0.006) + lp(r() * 2 - 1) * 3 * h * ar(tt, 0.001, 0.014)) * g, { pan: panX(x) * 0.5 });
});
// deleting: lighter, quicker ticks
T.dels.forEach(({ t }, k) => tick(dry, s(t), 2600 + (k % 4) * 90, 0.05, -0.1));

// the charge: a low rumble that builds with every keystroke and thins with the swarm, gone at zero
{ const r = rng(612), lp = biquad('lp', 110, 0.8), a = L[0].start;
  const lvl = (ms) => (ms < T.shatter ? T.load(ms) / 100 : T.charge(ms) / 100);
  add(dry, s(a), s(T.zero - a) + 0.05, (i, t) => { const ms = a + t * 1000; return lp(r() * 2 - 1) * 1.3 * sm(P(ms, a, 500)) * (0.1 + 0.9 * lvl(ms)) * cut(ms); }); }
// the charge tops out at 100: one thump
thump(dry, s(last.done), 88, 42, 0.6);

// the instruction: a breath of air under "Shake it out instead."
air(wet, s(T.instr), 0.8, (u) => lerp(1800, 700, u), (u) => Math.sin(Math.PI * u), 0.05, 57);
[0, 220].forEach((d, k) => tick(wet, s(T.instrMono + d), 2900 + k * 140, 0.05, 0));

// each 110ms shake stroke: the phone in the hand (a short, dull grip knock)
T.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 520 : 700, 0.9); const g = J.k ? 0.22 : 0.38;
  add(dry, s(J.t), 0.06, (i, t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.018) * g * 3, { pan: 0 }); });

// the draft shatters: a dry crackle per letter, panned where it broke
T.glyphs.forEach((g, gi) => crackle(wet, s(T.glyphAt[gi]), 0.22, panX(T.textX + g[1]), 700 + gi));

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
writeWav(process.argv[2] || 'regulate-angry-reply.wav', dry);
