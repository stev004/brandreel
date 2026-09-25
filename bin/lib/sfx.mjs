// sfx.mjs - the Regulate sound kit: motifs shared by every reel score, so the brand
// sounds like one thing. Built on dsp.mjs; all deterministic. Times in seconds.
//
// The signature is fullStop(): one soft tick when the white point comes to rest as the
// full stop in "regulate." - the last sound in every reel, then silence.
import { SR, add, rng, ar, smooth, lp1, biquad } from './dsp.mjs';

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const P = (t, a, d) => clamp((t - a) / d);
export const lerp = (a, b, p) => a + (b - a) * p;
export const kf = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [t1, v1] = keys[i], [t0, v0] = keys[i - 1]; if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0))); } return keys[keys.length - 1][1]; };

// A heartbeat thump: sub body saturated for 150-250Hz harmonics + knock, so phones play it.
export function thump(bus, at, f0, f1, amp, pan = 0) {
  const lp = lp1(220); const r = rng(Math.round(at * 1e4) + 3); const kn = biquad('bp', 280, 1.4);
  let ph = 0;
  add(bus, at, 0.42, (i, t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.035); ph += (2 * Math.PI * f) / SR;
    const s = Math.sin(ph) * ar(t, 0.004, 0.085);
    return (Math.tanh(2.2 * s) / Math.tanh(2.2) * 0.85 + lp(r() * 2 - 1) * ar(t, 0.001, 0.012) * 1.6 + kn(r() * 2 - 1) * ar(t, 0.001, 0.028) * 1.1) * amp;
  }, { pan });
}
// Lub-dub on a bpm(ms) and gain(ms) schedule from startMs to endMs.
export function heartbeat(bus, { startMs, endMs, bpm, gain, amp = 0.55 }) {
  let ms = startMs;
  while (ms < endMs) { const g = gain(ms), per = 60000 / bpm(ms); if (g > 0.01) { thump(bus, ms / 1000, 78, 44, amp * g); thump(bus, (ms + per * 0.3) / 1000, 70, 50, amp * 0.58 * g); } ms += per; }
}
// A short sine tick (UI, ratchets, ticks entering).
export function tick(bus, at, f, amp, pan = 0) { let ph = 0; add(bus, at, 0.08, (i, t) => { ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * ar(t, 0.0008, 0.009) * amp; }, { pan }); }
// A wooden knock (pendulum apex, gauge taps).
export function wood(bus, at, pan, amp, f = 940) { const r = rng(Math.round(at * 997)); const bp = biquad('bp', f * 2, 5); let ph = 0; add(bus, at, 0.12, (i, t) => { ph += (2 * Math.PI * f) / SR; return (bp(r() * 2 - 1) * 2.2 * ar(t, 0.0006, 0.012) + Math.sin(ph) * ar(t, 0.001, 0.03) * 0.5) * amp; }, { pan }); }
// Breath: band-passed noise with a moving centre and an envelope over u in [0,1].
export function breath(bus, at, dur, f0, f1, env, amp, seed) {
  const r = rng(seed); const bp = biquad('bp', f0, 0.9); const lp = lp1(3500);
  add(bus, at, dur + 0.1, (i, t) => { const u = clamp(t / dur); bp.set(lerp(f0, f1, u)); return lp(bp(r() * 2 - 1)) * env(u) * amp; });
}
// Air: a filtered-noise swell (pull-backs, falls). cut(u) gives the lowpass cutoff.
export function air(bus, at, dur, cut, env, amp, seed, pan = 0) {
  const r = rng(seed); const lp = biquad('lp', 400, 0.8);
  add(bus, at, dur, (i, t) => { const u = clamp(t / dur); lp.set(cut(u)); return lp(r() * 2 - 1) * env(u) * amp; }, typeof pan === 'function' ? { panFn: (t) => pan(clamp(t / dur)) } : { pan });
}
// A soft notification: two quick sine blips a fifth apart (not any platform's sound).
export function ping(bus, at, f, amp, pan = 0) {
  let a = 0, b = 0;
  add(bus, at, 0.5, (i, t) => { a += (2 * Math.PI * f) / SR; b += (2 * Math.PI * f * 1.5) / SR; return Math.sin(a) * ar(t, 0.002, 0.07) * amp + (t > 0.085 ? Math.sin(b) * ar(t - 0.085, 0.002, 0.11) * amp * 0.8 : 0); }, { pan });
}
// A soft pitched pluck-like tone for thoughts arriving (sine + octave, slow attack).
export function tone(bus, at, f, amp, pan = 0, attack = 0.12, decay = 0.9) {
  let a = 0, b = 0;
  add(bus, at, attack + decay * 4, (i, t) => { a += (2 * Math.PI * f) / SR; b += (2 * Math.PI * f * 2.01) / SR; const e = t < attack ? smooth(t / attack) : Math.exp(-(t - attack) / decay); return (Math.sin(a) + Math.sin(b) * 0.18) * e * amp; }, { pan });
}
// A held pad (chord), faded in/out by env(ms) given in absolute ms.
export function pad(bus, atMs, endMs, freqs, env, amp) {
  const ph = freqs.map(() => 0);
  add(bus, atMs / 1000, (endMs - atMs) / 1000, (i, t) => { const ms = atMs + t * 1000; let s = 0; freqs.forEach((f, k) => { ph[k] += (2 * Math.PI * f) / SR; s += Math.sin(ph[k]) / (1 + k * 0.6); }); return s * env(ms) * amp; });
}
// Fracture: a tiny crackle burst (words shattering).
export function crackle(bus, at, amp, pan = 0, seed = 1) {
  const r = rng(seed); const hp = biquad('hp', 2500, 0.7);
  add(bus, at, 0.25, (i, t) => { const n = r() * 2 - 1; const g = r() < 0.08 ? 1 : 0.15; return hp(n) * g * ar(t, 0.001, 0.05) * amp; }, { pan });
}
// Room tone: very quiet low noise bed, env(ms).
export function room(bus, atMs, endMs, env, amp, seed = 99) {
  const r = rng(seed); const lp = lp1(240); const lp2 = lp1(240);
  add(bus, atMs / 1000, (endMs - atMs) / 1000, (i, t) => lp2(lp(r() * 2 - 1)) * env(atMs + t * 1000) * amp);
}
// THE SIGNATURE: the full stop lands.
export function fullStop(bus, at) {
  let a = 0, b = 0, c = 0;
  add(bus, at, 1.2, (i, t) => { a += (2 * Math.PI * 1318.5) / SR; b += (2 * Math.PI * 2637) / SR; c += (2 * Math.PI * 329.6) / SR; return Math.sin(a) * ar(t, 0.002, 0.14) * 0.3 + Math.sin(b) * ar(t, 0.001, 0.05) * 0.1 + Math.sin(c) * ar(t, 0.004, 0.22) * 0.18; });
}

// Load an animatic's timing file (the same one its HTML loads), so picture and score share cues.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export function loadTiming(id) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'animatics');
  const src = readFileSync(join(dir, 'lib', 'timing-kit.js'), 'utf8').replace(/if \(typeof module[^\n]*/, '') + '\n' + readFileSync(join(dir, `${id}.timing.js`), 'utf8');
  return new Function(src + '\nreturn TIMING;')();
}

// Heartbeat on explicit beat times (from a timing file), so the picture's pulses and the audio agree.
export function heartbeatAt(bus, beatsMs, { gain, amp = 0.55, dub = 0.3 }) {
  beatsMs.forEach((ms, i) => { const g = gain(ms); if (g <= 0.01) return; const per = (beatsMs[i + 1] ?? ms + 800) - ms; thump(bus, ms / 1000, 78, 44, amp * g); thump(bus, (ms + per * dub) / 1000, 70, 50, amp * 0.58 * g); });
}
