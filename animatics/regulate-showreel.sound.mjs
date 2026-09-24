#!/usr/bin/env node
// regulate-showreel.sound.mjs - the reel's sound design, synthesized (no samples,
// no licences, bit-identical every run). Cue times are the animatic's clock
// (animatics/regulate-showreel.html); change one, change both.
//
// The score IS the mechanic: a heartbeat that starts fast and slows in step with
// the picture (96 -> 116 at the threat -> 56, then gone); one tension tone left
// unresolved from the spike until the gauge lets go; the Pendulum's four
// channels honoured - its apex ticks are hard-panned left/right, the bilateral
// mechanic itself, with air that follows the bob across the stereo field; the
// breath is a breath; the release trace is heard as irregular crackle that
// becomes one consonant fifth as the line turns coherent, then nothing. One
// soft tick when the point stops. The last thing you hear is silence.
//
// Usage: node animatics/regulate-showreel.sound.mjs <out.wav>
import { SR, makeBus, add, rng, ar, smooth, lp1, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';

const out = process.argv[2] || 'regulate-showreel.wav';
const DUR = 18.0;
const dry = makeBus(DUR), wet = makeBus(DUR);

// ---- shared easing (same curves as the picture) ----
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-7) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } return sy(t); };
}
const HOUSE = cubicBezier(0.2, 0.7, 0.2, 1), SETTLE = cubicBezier(0.22, 1, 0.36, 1);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const P = (t, a, d) => clamp((t - a) / d);
const lerp = (a, b, p) => a + (b - a) * p;
const kf = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [t1, v1] = keys[i], [t0, v0] = keys[i - 1]; if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0))); } return keys[keys.length - 1][1]; };

// ---------------------------------------------------------------------------
// 1. Heartbeat - lub-dub, felt more than heard. BPM follows the regulation arc.
// ---------------------------------------------------------------------------
const bpm = (ms) => kf(ms, [[0, 94], [1000, 100], [1500, 116], [3200, 108], [4900, 100], [5600, 88], [7700, 74], [10950, 62], [12900, 56]]);
const hbGain = (ms) => kf(ms, [[0, 0.0], [300, 0.9], [4900, 1.0], [7700, 0.8], [11400, 0.6], [12400, 0.38], [13250, 0.0]]);
// Phones cannot play 50Hz: the body is saturated for harmonics (150-250Hz) and
// carries a short knock, so the beat reads on a phone speaker as well as a sub.
function thump(at, f0, f1, amp, pan = 0) {
  const lp = lp1(220); const r = rng(Math.round(at * 1e4)); const kn = biquad('bp', 280, 1.4);
  let ph = 0;
  add(dry, at, 0.42, (i, t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.035);
    ph += (2 * Math.PI * f) / SR;
    const s = Math.sin(ph) * ar(t, 0.004, 0.085);
    const body = Math.tanh(2.2 * s) / Math.tanh(2.2);
    const click = lp(r() * 2 - 1) * ar(t, 0.001, 0.012) * 1.6;
    const knock = kn(r() * 2 - 1) * ar(t, 0.001, 0.028) * 1.1;
    return (body * 0.85 + click + knock) * amp;
  }, { pan });
}
{
  let ms = 260;
  while (ms < 13250) {
    const g = hbGain(ms); const per = 60000 / bpm(ms);
    if (g > 0.01) { thump(ms / 1000, 78, 44, 0.55 * g); thump((ms + per * 0.3) / 1000, 70, 50, 0.32 * g); }
    ms += per;
  }
}

// ---------------------------------------------------------------------------
// 2. The threat (1.00-1.24s) and the response that never finished
// ---------------------------------------------------------------------------
{ // the spike: a fast rising whip, then the landing
  let ph = 0; const bp = biquad('bp', 2000, 1.2); const r = rng(11);
  add(dry, 1.0, 0.26, (i, t) => { const u = t / 0.24; const f = 180 * Math.pow(9, clamp(u)); ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.12 + bp(r() * 2 - 1) * 0.2) * smooth(u * 4) * (1 - smooth((u - 0.85) / 0.15)); }, { gain: 0.9 });
  thump(1.24, 96, 38, 1.15); // the apex lands
  let p2 = 0; add(wet, 1.24, 0.9, (i, t) => { p2 += (2 * Math.PI * 2637) / SR; return Math.sin(p2) * ar(t, 0.002, 0.16) * 0.22 + Math.sin(p2 * 1.5) * ar(t, 0.002, 0.09) * 0.08; });
}
{ // unresolved: two close high partials beating, held from the apex until the gauge lets go
  let a = 0, b = 0; const r = rng(23); const hs = biquad('bp', 6500, 2);
  add(dry, 1.3, 3.66, (i, t) => {
    const ms = 1300 + t * 1000;
    const env = smooth(P(ms, 1300, 800)) * lerp(1, 1.9, smooth(P(ms, 4100, 780))) * (1 - smooth(P(ms, 4890, 60)));
    a += (2 * Math.PI * 1760) / SR; b += (2 * Math.PI * 1771) / SR;
    return (Math.sin(a) + Math.sin(b)) * 0.018 * env + hs(r() * 2 - 1) * 0.02 * env;
  }, { gain: 1 });
}

// ---------------------------------------------------------------------------
// 3. The pull back (2.8-3.7s) - air, widening
// ---------------------------------------------------------------------------
for (const [pan, seed] of [[-0.7, 31], [0.7, 32]]) {
  const r = rng(seed); const lp = biquad('lp', 400, 0.7);
  add(wet, 2.75, 1.3, (i, t) => { const u = t / 1.2; lp.set(300 + 1400 * Math.sin(Math.PI * clamp(u))); return lp(r() * 2 - 1) * Math.sin(Math.PI * clamp(u)) * 0.22; }, { pan });
}

// ---------------------------------------------------------------------------
// 4. Pressure Gauge - ticks ratchet in, the jolt grinds, the fall lets it all go
// ---------------------------------------------------------------------------
function tick(at, f, amp, pan = 0, bus = wet) { let ph = 0; add(bus, at, 0.08, (i, t) => { ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * ar(t, 0.0008, 0.009) * amp; }, { pan }); }
for (let k = 0; k < 11; k++) tick((4150 + k * 30) / 1000, 3400 + k * 40, 0.1, lerp(-0.6, 0.6, k / 10));
{ // jolt rumble while pressure is at the redline
  const r = rng(41); const lp = biquad('lp', 140, 0.9);
  add(dry, 4.1, 0.9, (i, t) => { const ms = 4100 + t * 1000; return lp(r() * 2 - 1) * smooth(P(ms, 4100, 300)) * (1 - smooth(P(ms, 4860, 60))) * 0.9; }, { gain: 0.8 });
}
{ // the fall: needle sweeps right -> left, a long release
  const r = rng(43); const lp = biquad('lp', 3000, 0.8);
  add(wet, 4.9, 1.0, (i, t) => { const u = SETTLE(clamp(t / 0.65)); lp.set(3200 * Math.pow(1 - u, 1.4) + 160); return lp(r() * 2 - 1) * (1 - u) * smooth(t / 0.02) * 0.55; }, { panFn: (t) => lerp(0.6, -0.7, SETTLE(clamp(t / 0.65))) });
  thump(4.9, 70, 40, 0.35);
}

// ---------------------------------------------------------------------------
// 5. Pendulum - apex ticks hard-panned (bilateral), air follows the bob
// ---------------------------------------------------------------------------
const T_C = 5550, PERIOD = 1200;
const ampC = (ms) => (15 + 75 * Math.exp(-(ms - T_C) / 420)) * (1 - smooth(P(ms, 7350, 300)));
const lenC = (ms) => lerp(372, 780, HOUSE(P(ms, T_C, 800)));
const bobX = (ms) => 540 - lenC(ms) * Math.sin((ampC(ms) * Math.cos((2 * Math.PI * (ms - T_C)) / PERIOD) * Math.PI) / 180);
function wood(at, pan, amp) { const r = rng(Math.round(at * 997)); const bp = biquad('bp', 1900, 5); let ph = 0; add(dry, at, 0.12, (i, t) => { ph += (2 * Math.PI * 940) / SR; return (bp(r() * 2 - 1) * 2.2 * ar(t, 0.0006, 0.012) + Math.sin(ph) * ar(t, 0.001, 0.03) * 0.5) * amp; }, { pan }); tick(at, 1880, amp * 0.25, pan); }
wood(5.55, -0.85, 0.35);
[[6.15, 0.85], [6.75, -0.85], [7.35, 0.85]].forEach(([at, pan], i) => wood(at, pan, [0.7, 0.62, 0.55][i]));
{
  const r = rng(51); const bp = biquad('bp', 700, 0.8); let prev = bobX(T_C);
  add(wet, 5.55, 2.2, (i, t) => { const ms = T_C + t * 1000; const x = bobX(ms); const v = Math.abs(x - prev) * SR / 1000; prev = x; bp.set(500 + v * 900); return bp(r() * 2 - 1) * clamp(v / 1.6) * 0.5; }, { panFn: (t) => clamp((bobX(T_C + t * 1000) - 540) / 380, -1, 1) });
}

// ---------------------------------------------------------------------------
// 6. Regulate Breath - ticks, inhale 1s, exhale 2s
// ---------------------------------------------------------------------------
for (let k = 0; k < 12; k++) tick((7700 + k * 30) / 1000, 2600 + (k % 4) * 90, 0.07, k < 4 ? -0.3 : 0.3);
function breath(at, dur, f0, f1, env, amp, seed) {
  const r = rng(seed); const bp = biquad('bp', f0, 0.9); const lp = lp1(3500);
  add(dry, at, dur + 0.1, (i, t) => { const u = clamp(t / dur); bp.set(lerp(f0, f1, u)); return lp(bp(r() * 2 - 1)) * env(u) * amp; });
}
breath(7.95, 1.0, 700, 1300, (u) => smooth(u / 0.35) * (1 - smooth((u - 0.8) / 0.2)), 0.55, 61);
breath(8.95, 2.0, 1150, 520, (u) => smooth(u / 0.18) * Math.pow(1 - u, 1.2), 0.62, 62);

// ---------------------------------------------------------------------------
// 7. Release - out of the column; crackle becomes a consonant fifth, then flat
// ---------------------------------------------------------------------------
thump(10.95, 64, 42, 0.2);
{ // irregular crackle while the trace is dysregulated
  const r = rng(71);
  let ms = 11000;
  while (ms < 11900) { const g = 1 - smooth(P(ms, 11450, 450)); tick(ms / 1000, 2200 + r() * 2600, 0.05 + 0.07 * g * r(), (r() * 2 - 1) * 0.5); ms += 22 + r() * 70; }
}
{ // coherence: G3 + D4, arriving with the sine, fading as the line goes flat
  let a = 0, b = 0, c = 0;
  add(wet, 11.4, 2.8, (i, t) => {
    const ms = 11400 + t * 1000;
    const env = smooth(P(ms, 11500, 650)) * (1 - smooth(P(ms, 12500, 1150)));
    a += (2 * Math.PI * 196) / SR; b += (2 * Math.PI * 293.66) / SR; c += (2 * Math.PI * 392) / SR;
    return (Math.sin(a) * 0.5 + Math.sin(b) * 0.36 + Math.sin(c) * 0.08) * env * 0.08;
  });
}

// ---------------------------------------------------------------------------
// 8. The full stop - one soft tick as the point comes to rest. Then nothing.
// ---------------------------------------------------------------------------
{
  let a = 0, b = 0, c = 0;
  add(wet, 13.9, 1.2, (i, t) => { a += (2 * Math.PI * 1318.5) / SR; b += (2 * Math.PI * 2637) / SR; c += (2 * Math.PI * 329.6) / SR; return (Math.sin(a) * ar(t, 0.002, 0.14) * 0.3 + Math.sin(b) * ar(t, 0.001, 0.05) * 0.1 + Math.sin(c) * ar(t, 0.004, 0.22) * 0.18); });
}

// ---- mix ----
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 });
mixInto(dry, wet, 1.0);
master(dry, 1.1);
writeWav(out, dry);
console.log(`wrote ${out} (${DUR}s, ${SR}Hz, 24-bit stereo)`);
