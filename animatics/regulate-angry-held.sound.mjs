#!/usr/bin/env node
// Score for regulate-angry-held.html; every cue is read from regulate-angry-held.timing.js, which runs
// the SAME deterministic Chaos Release simulation as the picture: every rattle is a real collision.
// Story layer: a heartbeat under the hook that climbs as the argument is held in; each line lands as a
// low, unresolved tone; a low strain rises with the squeeze and the charge (one soft tick per 10%);
// the burst is a deep thump and a spray of crackle from the block's centre out. The palette and
// finishing chain are the FAMILY SOUND BLOCK, shared with -reply and -loud: nothing after zero (true
// silence), then the full-stop tick.
const ID = 'regulate-angry-held';
// ==== FAMILY SOUND BLOCK: byte-identical in regulate-angry-reply / -loud / -held .sound.mjs (refine 09-28) ====
// One palette for the three Angry reels: the same heartbeat voice, grip knock per shake stroke,
// collision rattle, shatter, instruction cue, phone swish, milestone thump, charge bed and full stop,
// and one finishing chain. Every event is windowed (>=1ms fade in, 6ms fade out) so nothing clicks.
import { SR, makeBus, add, rng, biquad, lp1, reverb, mixInto, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const T = loadTiming(ID), s = (ms) => ms / 1000, DUR = T.dur / 1000;
const dry = makeBus(DUR), wet = makeBus(DUR), fx = makeBus(DUR), sig = makeBus(DUR);   // fx: every click/rattle (low-passed); sig: the full stop alone
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hsh = (n) => { n = (n | 0) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 16), 0x85ebca6b); n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const SCX = (T.FAM.screen.x0 + T.FAM.screen.x1) / 2, SCW = (T.FAM.screen.x1 - T.FAM.screen.x0) / 2;
const panX = (x) => Math.max(-0.8, Math.min(0.8, ((x - SCX) / SCW) * 0.8));   // across the phone's glass: hard left edge .. hard right edge
const ar = (t, a, r) => (t < a ? t / a : Math.exp(-(t - a) / r));
// a click-free event: fn(t) mono, windowed with a raised fade in and a 6ms fade out at its end
function ev(bus, atMs, dur, fn, { pan = 0, fin = 0.0015, fout = 0.006 } = {}) {
  add(bus, s(atMs), dur, (i, t) => fn(t) * sm(t / fin) * sm((dur - t) / fout), { pan });
}

// THE HEARTBEAT VOICE: a pitched body (96 -> 54 Hz) softly saturated, a 2.8x partial (150-270 Hz) and a
// 220 Hz knock, so a phone speaker plays it (not sub only). deep: the milestone / landing thump.
function heart(bus, atMs, amp, { deep = false, pan = 0, seed = 1 } = {}) {
  const f0 = deep ? 82 : 96, f1 = deep ? 44 : 54, r = rng(Math.round(atMs * 7) + seed), kn = biquad('bp', deep ? 190 : 220, 1.4), lp = biquad('lp', 1400, 0.7);
  let a = 0, b = 0;
  ev(bus, atMs, 0.45, (t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.03); a += (2 * Math.PI * f) / SR; b += (2 * Math.PI * f * 2.8) / SR;
    const body = (Math.tanh(1.8 * Math.sin(a)) / Math.tanh(1.8)) * ar(t, 0.005, deep ? 0.12 : 0.095);
    const mid = Math.sin(b) * ar(t, 0.004, 0.06) * (deep ? 0.8 : 1.1);
    const knock = kn(r() * 2 - 1) * ar(t, 0.004, 0.022) * 0.3;
    return lp(body * 0.6 + mid + knock) * amp;
  }, { pan, fin: 0.003 });
}
// lub-dub on the timing file's beats (the picture pulses on the same list)
function heartbeats(beatsMs, gain, amp = 0.5) {
  beatsMs.forEach((ms, i) => { const g = gain(ms); if (g <= 0.01) return; const per = (beatsMs[i + 1] ?? ms + 800) - ms; heart(dry, ms, amp * g); heart(dry, ms + per * 0.3, amp * 0.58 * g, { seed: 2 }); });
}
// a soft sine tick (keys deleted, the numeral loading): no sharp edge, never above 2.2 kHz
function softTick(bus, atMs, f, amp, pan = 0) { let a = 0; ev(bus, atMs, 0.05, (t) => { a += (2 * Math.PI * f) / SR; return Math.sin(a) * ar(t, 0.0012, 0.008) * amp; }, { pan, fin: 0.0012 }); }
// each 110ms shake stroke: the phone in the hand (a short, dull grip knock); the first of a bout harder
function grips() { T.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 460 : 600, 0.9), g = J.k ? 0.38 : 0.6; ev(dry, J.t, 0.07, (t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.016) * g, { fin: 0.002 }); }); }
// collisions: every one is in the picture, thinned to the strongest per 16ms and softened where the
// swarm is dense, so it rattles instead of hissing; wall knocks lower, ball clacks higher, panned by x
function rattles() {
  const ev0 = [...T.events].sort((a, b) => a[0] - b[0]), kept = [];
  for (const e of ev0) { const k = kept[kept.length - 1]; if (k && e[0] - k[0] < 16) { if (e[2] > k[2]) kept[kept.length - 1] = e; } else kept.push(e); }
  kept.forEach(([t, kind, v, x], n) => {
    const h = hsh(Math.round(t * 13) + kind), dens = kept.filter((q) => Math.abs(q[0] - t) < 120).length;
    const f = kind ? 1500 + 700 * h : 820 + 260 * h, amp = 0.2 * Math.pow(Math.min(1, v / 900), 0.8) * (0.85 + 0.3 * hsh(n + 7)) / Math.sqrt(Math.max(1, dens / 6));
    const r = rng(Math.round(t * 31) + n), bp = biquad('bp', f * 1.02, 8); let ph = 0;
    ev(fx, t, 0.05, (tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.5 + bp(r() * 2 - 1) * 2) * ar(tt, 0.001, kind ? 0.005 : 0.009) * amp; }, { pan: panX(x), fin: 0.001 });
  });
  return kept.length;
}
// a letter breaking into balls: a short, sparse crackle, band-limited (no hiss)
function shatter(atMs, pan, amp, seed) { const r = rng(seed), bp = biquad('bp', 2400, 1.2); ev(fx, atMs, 0.12, (t) => bp(r() * 2 - 1) * (r() < 0.12 ? 1 : 0.12) * ar(t, 0.001, 0.035) * amp * 2.2, { pan, fin: 0.001 }); }
// air: a filtered-noise swell (the phone drawing in, a clock leaving)
function air(bus, atMs, dur, c0, c1, amp, seed) { const r = rng(seed), lp = biquad('lp', c0, 0.8); ev(bus, atMs, dur, (t) => { lp.set(lerp(c0, c1, t / dur)); return lp(r() * 2 - 1) * Math.sin((Math.PI * t) / dur) * amp; }, { fin: 0.01, fout: 0.02 }); }
const swish = (atMs) => air(wet, atMs, 0.9, 600, 2000, 0.05, 41);
// THE INSTRUCTION CUE, identical in all three: a breath of air under "Shake it out instead." and one
// soft wooden tock as the app's line appears
function cue() {
  air(wet, T.instr, 0.8, 1600, 600, 0.045, 57);
  let a = 0, b = 0; ev(wet, T.instrMono, 0.3, (t) => { a += (2 * Math.PI * 660) / SR; b += (2 * Math.PI * 1320) / SR; return (Math.sin(a) * ar(t, 0.003, 0.07) + Math.sin(b) * ar(t, 0.002, 0.03) * 0.3) * 0.07; }, { fin: 0.003 });
}
const milestones = () => T.milestones.forEach((m) => heart(dry, m, 0.6, { deep: true, seed: 5 }));   // triggerMedium at 75 / 50 / 25
// the charge: a low bed that follows the numeral, gone at zero
function bed(fromMs, lvl) { const r = rng(612), lp = biquad('lp', 140, 0.8), d = s(T.zero - fromMs) + 0.02; ev(dry, fromMs, d, (t) => lp(r() * 2 - 1) * 0.9 * sm(t / 0.5) * (0.12 + 0.88 * lvl(fromMs + t * 1000)), { fin: 0.02, fout: 0.03 }); }
// room tone under everything until zero
function roomTone() { const r = rng(99), a = lp1(240), b = lp1(240); ev(dry, 0, s(T.zero), (t) => b(a(r() * 2 - 1)) * 0.13 * sm(t / 0.4), { fin: 0.01, fout: 0.04 }); }

// ---- the finishing chain, identical: fx low-passed (~5.5 kHz, 12 dB/oct), reverb on wet, HF tamed
// above 12 kHz, then TRUE SILENCE from zero to the full stop (nothing rings over), then the full stop
// on its own bus. Then the master is fitted to the delivery chain. bin/render-reel.sh gains the mix to
// -13.4 LUFS and runs a -1.62 dBFS sample-peak limiter before AAC 256k; its loudness lands at -14 only
// if that limiter takes a little off, and AAC adds up to ~0.25 dB of overshoot wherever the signal sits
// on that ceiling. So: everything above 250 Hz is true-peak limited 4 dB under where that limiter sits
// (it only ever touches the low heartbeat and thump bodies), the whole mix is limited to a
// peak-to-loudness ratio PLR, and each candidate PLR is run through the exact render chain (loudnorm
// measure, volume, alimiter, AAC 256k, loudnorm) until the master measures -13.55..-14.4 LUFS with its
// true peak at or under -1.55 dBTP. Deterministic: the same score always picks the same master.
const HF_HEAD = 7.8, PLRS = [14.4, 13.8, 15.0, 13.2, 15.6, 12.8, 16.2, 14.1, 14.7, 13.5, 15.3];
function throughChain(bus) {   // bin/render-reel.sh's audio path, reproduced exactly
  const d = mkdtempSync(join(tmpdir(), 'angry-')), raw = join(d, 'raw.wav'), mas = join(d, 'm.wav'), aac = join(d, 'a.m4a');
  const j = (f) => { const e = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']).stderr.toString(); return JSON.parse(e.slice(e.lastIndexOf('{'), e.lastIndexOf('}') + 1)); };
  writeWav(raw, bus); const G = Math.round((-14 - +j(raw).input_i + 0.6) * 100) / 100;
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `volume=${G}dB,alimiter=limit=0.83:attack=2:release=60:level=disabled`, '-c:a', 'pcm_s24le', mas]);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mas, '-c:a', 'aac', '-b:a', '256k', aac]);
  const o = j(aac); rmSync(d, { recursive: true, force: true }); return { I: +o.input_i, TP: +o.input_tp };
}
function lufs(bus) {   // ITU-R BS.1770-4 integrated loudness at 48 kHz
  const kw = () => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0, u1 = 0, u2 = 0, z1 = 0, z2 = 0; return (x) => { const y = 1.53512485958697 * x - 2.69169618940638 * x1 + 1.19839281085285 * x2 + 1.69065929318241 * y1 - 0.73248077421585 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; const z = y - 2 * u1 + u2 + 1.99004745483398 * z1 - 0.99007225036621 * z2; u2 = u1; u1 = y; z2 = z1; z1 = z; return z; }; };
  const fl = kw(), fr = kw(), N = bus.n, sq = new Float64Array(N);
  for (let n = 0; n < N; n++) { const l = fl(bus.L[n]), r = fr(bus.R[n]); sq[n] = l * l + r * r; }
  const blk = 0.4 * SR, hop = 0.1 * SR, zs = []; let acc = 0; const cum = new Float64Array(N + 1); for (let n = 0; n < N; n++) cum[n + 1] = cum[n] + sq[n];
  for (let st = 0; st + blk <= N; st += hop) zs.push((cum[st + blk] - cum[st]) / blk);
  const ld = (z) => -0.691 + 10 * Math.log10(z), a = zs.filter((z) => ld(z) > -70), ma = a.reduce((x, y) => x + y, 0) / a.length;
  const g = a.filter((z) => ld(z) > ld(ma) - 10); acc = g.reduce((x, y) => x + y, 0) / g.length; return ld(acc);
}
function tpAt(ch, n) { const x0 = ch[n - 1] ?? 0, x1 = ch[n], x2 = ch[n + 1] ?? 0, x3 = ch[n + 2] ?? 0; let m = Math.abs(x1);   // 4x Hermite peak estimate
  for (const u of [0.25, 0.5, 0.75]) { const c1 = 0.5 * (x2 - x0), c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3, c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2); m = Math.max(m, Math.abs(((c3 * u + c2) * u + c1) * u + x1)); } return m; }
function limit(bus, ceil) {   // stereo-linked lookahead true-peak limiter: 2ms look-ahead, smoothed, 90ms release
  const N = bus.n, L = Math.round(0.002 * SR), req = new Float32Array(N), m = new Float32Array(N), g = new Float32Array(N), rel = 1 - Math.exp(-1 / (0.09 * SR));
  for (let n = 0; n < N; n++) { const p = Math.max(tpAt(bus.L, n), tpAt(bus.R, n)); req[n] = p > ceil ? ceil / p : 1; }
  const dq = []; for (let n = N - 1; n >= 0; n--) { while (dq.length && req[dq[dq.length - 1]] >= req[n]) dq.pop(); dq.push(n); while (dq[0] > n + L) dq.shift(); m[n] = req[dq[0]]; }
  let r = 1; for (let n = 0; n < N; n++) { r = Math.min(m[n], r + (1 - r) * rel); g[n] = r; }
  let sum = 0; const q = []; for (let n = 0; n < N; n++) { q.push(g[n]); sum += g[n]; if (q.length > L) sum -= q.shift(); const k = sum / q.length; bus.L[n] *= k; bus.R[n] *= k; }
}
function finish(out) {
  for (const ch of ['L', 'R']) { const a = biquad('lp', 5500, 0.707), b = biquad('lp', 5500, 0.707); for (let n = 0; n < fx.n; n++) fx[ch][n] = b(a(fx[ch][n])); }
  mixInto(dry, fx, 1); mixInto(wet, fx, 0.12);
  reverb(wet, { mix: 0.4, room: 0.84, damp: 0.45, preDelayMs: 20 }); mixInto(dry, wet, 1);
  const z0 = Math.round(s(T.zero) * SR), z1 = z0 + Math.round(0.06 * SR);   // zero: a 60ms fade to true silence, and it stays silent
  for (const ch of ['L', 'R']) { const hp = biquad('hp', 25, 0.707), lp = biquad('lp', 12000, 0.707); const c = dry[ch]; for (let n = 0; n < dry.n; n++) c[n] = lp(hp(c[n])) * (n < z0 ? 1 : n < z1 ? 1 - sm((n - z0) / (z1 - z0)) : 0); }
  fullStop(sig, s(T.fall[1])); reverb(sig, { mix: 0.4, room: 0.84, damp: 0.45, preDelayMs: 20 });
  const f0 = Math.round(s(T.fall[1]) * SR); for (const ch of ['L', 'R']) for (let n = 0; n < f0; n++) sig[ch][n] = 0;
  mixInto(dry, sig, 1);
  const I0 = lufs(dry), g0 = Math.pow(10, (-18 - I0) / 20); for (const ch of ['L', 'R']) for (let n = 0; n < dry.n; n++) dry[ch][n] *= g0;
  const lf = makeBus(DUR), hf = makeBus(DUR), db = (x) => Math.pow(10, x / 20);
  for (const ch of ['L', 'R']) { const a = biquad('lp', 250, 0.707), b = biquad('lp', 250, 0.707); for (let n = 0; n < dry.n; n++) { const l = b(a(dry[ch][n])); lf[ch][n] = l; hf[ch][n] = dry[ch][n] - l; } }
  const master = (plr) => {
    let I = -18, mixed;
    for (let it = 0; it < 3; it++) {   // the ceilings follow the limited mix's own loudness
      const h = { L: Float32Array.from(hf.L), R: Float32Array.from(hf.R), n: hf.n }; limit(h, db(I + HF_HEAD));
      mixed = { L: new Float32Array(dry.n), R: new Float32Array(dry.n), n: dry.n };
      for (const ch of ['L', 'R']) for (let n = 0; n < dry.n; n++) mixed[ch][n] = lf[ch][n] + h[ch][n];
      limit(mixed, db(I + plr)); const I2 = lufs(mixed); if (Math.abs(I2 - I) < 0.05) { I = I2; break; } I = I2;
    }
    for (const ch of ['L', 'R']) for (let n = z1; n < f0; n++) mixed[ch][n] = 0;   // true silence, exactly
    return mixed;
  };
  let best = null;
  for (const plr of PLRS) {
    const m = master(plr), r = throughChain(m), miss = Math.max(0, r.TP + 1.55) * 4 + Math.max(0, r.I + 13.55) + Math.max(0, -14.4 - r.I);
    console.error(`${ID}: PLR ${plr} -> ${r.I} LUFS, ${r.TP} dBTP through the render chain`);
    if (!best || miss < best.miss) best = { m, r, plr, miss };
    if (miss === 0) break;
  }
  writeWav(out, best.m);
  console.error(`${ID}: master PLR ${best.plr} (${best.r.I} LUFS, ${best.r.TP} dBTP); silence ${(s(T.zero) + 0.06).toFixed(2)}s..${s(T.fall[1]).toFixed(2)}s`);
}
// ==== END FAMILY SOUND BLOCK ====

roomTone();
heartbeats(T.beats, (ms) => kf(ms, [[0, 0.95], [T.comp[0], 1.05], [T.comp[1], 1.3], [T.burst, 1.25], [T.burst + 300, 0.9], [T.zero - 900, 0.5], [T.zero - 400, 0]]));

// the argument lands on beats: low, close, unresolved
[[220, 0.05], [207.65, 0.055], [196, 0.06]].forEach(([f, amp], i) => { let a = 0, b = 0; ev(wet, T.lineIn[i], 2.4, (t) => { a += (2 * Math.PI * f) / SR; b += (2 * Math.PI * f * 2.01) / SR; const e = t < 0.08 ? sm(t / 0.08) : Math.exp(-(t - 0.08) / 0.9); return (Math.sin(a) + Math.sin(b) * 0.18) * e * amp; }, { fin: 0.01, fout: 0.1 }); });

// held in: a low strain (saturated sub + narrow band noise) that rises in pitch and weight with the
// squeeze, trembling as the block does; held at the top; cut by the burst (40ms fade)
{ const r = rng(77), bp = biquad('bp', 180, 7), a = T.comp[0] - 200, b = T.burst + 30; let ph = 0;
  ev(dry, a, s(b - a), (t) => {
    const ms = a + t * 1000, h = T.held(ms), f = lerp(46, 64, h);
    bp.set(lerp(160, 420, h)); ph += (2 * Math.PI * f) / SR;
    const trem = 1 + 0.25 * h * Math.sin(2 * Math.PI * 9 * t);
    return (Math.tanh(1.6 * Math.sin(ph)) * 0.3 + bp(r() * 2 - 1) * 0.8 * h) * trem * sm((ms - a) / 500) * (0.25 + 0.75 * h);
  }, { fin: 0.02, fout: 0.04 }); }
for (let v = 10; v <= 100; v += 10) softTick(wet, T.comp[0] + (T.comp[1] - T.comp[0]) * (v / 100), 1500 + v * 6, 0.025 + v * 0.0003);   // the numeral loads

swish(T.phone);
cue();
// the burst: a deep thump and a crackle spray from the block's centre out
heart(dry, T.burst, 0.75, { deep: true, seed: 40 });
for (let k = 0; k < 14; k++) shatter(T.burst + (k * T.RIPPLE) / 13, ((k % 2 ? 1 : -1) * k) / 18, 0.22, 900 + k);
bed(T.burst, (ms) => T.charge(ms) / 100);
grips();
rattles();
milestones();
finish(process.argv[2] || `${ID}.wav`);
