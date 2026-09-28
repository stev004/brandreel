#!/usr/bin/env node
// Score for regulate-612-angry.html; every cue is read from regulate-612-angry.timing.js, which runs
// the SAME deterministic Chaos Release simulation as the picture: every rattle is a real collision
// (wall knocks lower, ball clacks higher, panned by where it happened). Heartbeat under the hook,
// a low charge that thins with the swarm, milestone thumps at 75/50/25, nothing after zero, then
// the full-stop tick.
import { SR, makeBus, add, rng, ar, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, tick, tone, air, room, thump, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-612-angry'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const panX = (x) => Math.max(-0.9, Math.min(0.9, (x - 540) / 480));
const cut = (ms) => 1 - sm(P(ms, T.zero, 40));   // zero: everything stops

room(dry, 0, T.zero + 60, (ms) => sm(P(ms, 0, 400)) * cut(ms), 0.15);
heartbeatAt(dry, T.beats, { gain: (ms) => kf(ms, [[0, 0.75], [T.hud, 1.0], [T.shatter[0], 0.8], [T.zero - 600, 0.45], [T.zero - 250, 0]]) });

// the replayed lines land on beats: low, close, unresolved
const L = T.lines;
[[220, 0.05], [207.65, 0.055], [196, 0.06]].forEach(([f, a], i) => tone(wet, s(T.lineIn[i]), f, a, panX(L[i].x + 150), 0.08, 0.9));

// the clock leaves, the HUD draws in: a swish and a tick per element
air(wet, s(T.clockOut), 0.6, (u) => lerp(500, 1900, u), (u) => Math.sin(Math.PI * u), 0.08, 61);
[100, 160, 200, 320, 450].forEach((d, k) => tick(wet, s(T.hud + d), 2900 + k * 110, 0.06, [-0.5, 0.5, 0, 0, 0][k]));

// the charge: a low rumble that thins with the swarm and is gone at zero
{ const r = rng(612), lp = biquad('lp', 110, 0.8), a = T.hud;
  add(dry, s(a), s(T.zero - a) + 0.05, (i, t) => { const ms = a + t * 1000; return lp(r() * 2 - 1) * 1.3 * sm(P(ms, a, 700)) * (0.25 + 0.75 * T.charge(ms) / 100) * cut(ms); }); }

// each 110ms shake stroke: the phone in the hand (a short, dull grip knock)
T.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 520 : 700, 0.9); const g = J.k ? 0.22 : 0.38;
  add(dry, s(J.t), 0.06, (i, t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.018) * g * 3, { pan: 0 }); });

// the lines shatter: a dry crackle per glyph, panned where it broke
T.glyphs.forEach((gl, li) => gl.forEach((g, gi) => crackle(wet, s(T.glyphAt[li][gi]), 0.2, panX(L[li].x + g[1]), 700 + li * 40 + gi)));

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
writeWav(process.argv[2] || 'regulate-612-angry.wav', dry);
