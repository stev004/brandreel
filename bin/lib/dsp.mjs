// dsp.mjs - tiny deterministic synthesis kit for sound-designed animatics.
// Everything is a pure function of sample index and a fixed seed, so a render
// is bit-identical run to run. Stereo float buffers in, 24-bit WAV out.
import { writeFileSync } from 'node:fs';

export const SR = 48000;

export function makeBus(seconds) {
  const n = Math.ceil(seconds * SR);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

// Seeded PRNG (mulberry32) - noise is reproducible.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Equal-power pan, p in [-1, 1].
export const panGains = (p) => { const a = ((p + 1) / 2) * (Math.PI / 2); return [Math.cos(a), Math.sin(a)]; };

// Add a mono signal fn(i, tSec) -> sample to the bus from startSec for durSec.
export function add(bus, startSec, durSec, fn, { gain = 1, pan = 0, panFn = null } = {}) {
  const s0 = Math.max(0, Math.round(startSec * SR));
  const n = Math.min(bus.n - s0, Math.round(durSec * SR));
  let [gl, gr] = panGains(pan);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const v = fn(i, t) * gain;
    if (panFn) [gl, gr] = panGains(panFn(t));
    bus.L[s0 + i] += v * gl;
    bus.R[s0 + i] += v * gr;
  }
}

// Envelopes
export const expDecay = (t, tau) => Math.exp(-t / tau);
export const ar = (t, a, r) => (t < a ? t / a : Math.exp(-(t - a) / r));
export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// attack/hold/release window (linear-in-smoothstep), for pads and swells
export const ahr = (t, a, h, r) => (t < a ? smooth(t / a) : t < a + h ? 1 : 1 - smooth((t - a - h) / r));

// One-pole filters as stateful closures
export function lp1(cutHz) { let y = 0; const k = 1 - Math.exp((-2 * Math.PI * cutHz) / SR); return (x, c) => { const kk = c ? 1 - Math.exp((-2 * Math.PI * c) / SR) : k; y += kk * (x - y); return y; }; }
export function hp1(cutHz) { const lp = lp1(cutHz); return (x) => x - lp(x); }

// RBJ biquad (bandpass constant 0 dB peak / lowpass / highpass)
export function biquad(type, f0, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, b0, b1, b2, a1, a2;
  const set = (f) => {
    const w = (2 * Math.PI * f) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let B0, B1, B2; const A0 = 1 + al;
    if (type === 'lp') { B0 = (1 - c) / 2; B1 = 1 - c; B2 = (1 - c) / 2; }
    else if (type === 'hp') { B0 = (1 + c) / 2; B1 = -(1 + c); B2 = (1 + c) / 2; }
    else { B0 = al; B1 = 0; B2 = -al; }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * c) / A0; a2 = (1 - al) / A0;
  };
  set(f0);
  const f = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  f.set = set;
  return f;
}

// Karplus-Strong plucked string - warm, organic, not "synth".
export function pluck(freq, seed = 7, damp = 0.996, bright = 0.5) {
  const r = rng(seed); const N = Math.max(2, Math.round(SR / freq)); const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = r() * 2 - 1;
  const lp = lp1(2000 + bright * 6000); for (let i = 0; i < N; i++) buf[i] = lp(buf[i]);
  let idx = 0;
  return () => { const a = buf[idx], b = buf[(idx + 1) % N]; const v = damp * 0.5 * (a + b); buf[idx] = v; idx = (idx + 1) % N; return a; };
}

// Stereo reverb (Freeverb-style: 8 combs + 4 allpasses per side, detuned R).
export function reverb(bus, { mix = 0.25, room = 0.84, damp = 0.35, preDelayMs = 18 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round((x * SR) / 44100));
  const apT = [556, 441, 341, 225].map((x) => Math.round((x * SR) / 44100));
  const side = (input, spread) => {
    const out = new Float32Array(input.length);
    const pre = Math.round((preDelayMs / 1000) * SR);
    const combs = combT.map((l) => ({ b: new Float32Array(l + spread), i: 0, f: 0 }));
    const aps = apT.map((l) => ({ b: new Float32Array(l + spread), i: 0 }));
    for (let n = 0; n < input.length; n++) {
      const x = (n >= pre ? input[n - pre] : 0) * 0.015;
      let s = 0;
      for (const c of combs) { const y = c.b[c.i]; c.f = y * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; s += y; }
      for (const a of aps) { const bo = a.b[a.i]; const y = -s + bo; a.b[a.i] = s + bo * 0.5; a.i = (a.i + 1) % a.b.length; s = y; }
      out[n] = s;
    }
    return out;
  };
  const wl = side(bus.L, 0), wr = side(bus.R, 23);
  for (let n = 0; n < bus.n; n++) { bus.L[n] = bus.L[n] * (1 - mix) + wl[n] * mix * 3; bus.R[n] = bus.R[n] * (1 - mix) + wr[n] * mix * 3; }
}

export function mixInto(dst, src, gain = 1) { for (let n = 0; n < dst.n; n++) { dst.L[n] += src.L[n] * gain; dst.R[n] += src.R[n] * gain; } }

// Gentle master: DC block + soft-knee tanh limiter to keep peaks civil before loudnorm.
export function master(bus, drive = 1.2) {
  for (const ch of [bus.L, bus.R]) { const hp = hp1(22); for (let n = 0; n < ch.length; n++) ch[n] = Math.tanh(hp(ch[n]) * drive) / Math.tanh(drive); }
}

export function writeWav(path, bus) {
  const n = bus.n, bytes = 3, data = Buffer.alloc(n * 2 * bytes);
  let o = 0;
  for (let i = 0; i < n; i++) for (const ch of [bus.L, bus.R]) {
    const v = Math.max(-1, Math.min(1, ch[i])); let s = Math.round(v * 8388607); if (s < 0) s += 16777216;
    data[o++] = s & 255; data[o++] = (s >> 8) & 255; data[o++] = (s >> 16) & 255;
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2 * bytes, 28); h.writeUInt16LE(2 * bytes, 32); h.writeUInt16LE(24, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
}
