#!/usr/bin/env node
// Score for regulate-trailer.html; every cue is read from regulate-trailer.timing.js.
// Act 1: a heartbeat that climbs at THREAT, holds high under STUCK, and settles at RELEASE.
// Act 2: a 75bpm pulse (cuts on the beat; Chaos Release 5 beats, the others 4), each game carries its own gesture. Act 3: the Sigh's
// long breath out, the house full-stop tick, then silence.
import { spawnSync } from 'node:child_process';
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, thump, tick, wood, pad, breath, air, room, ping, tone, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-trailer'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000), fx = makeBus(T.dur / 1000);   // fx: Chaos Release's rattles (low-passed, as the Angry reels)
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const C = T.cuts, B = T.beat;

// ---------------- ACT 1 ----------------
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 300)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.15);
heartbeatAt(dry, T.beats1, { gain: (ms) => kf(ms, [[0, 0.6], [T.apex, 0.95], [T.release[0], 0.95], [T.release[1], 0.5], [T.act1Out + 300, 0.2], [T.act2 - 600, 0]]) });
air(wet, s(T.rise[0]), s(T.rise[1] - T.rise[0]), (u) => lerp(300, 2600, u * u), (u) => sm(u / 0.2) * (1 - sm((u - 0.9) / 0.1)), 0.1, 11);   // the rise
thump(dry, s(T.apex), 90, 42, 0.45);                                                       // THREAT lands
ping(wet, s(T.apex) + 0.01, 1318.5, 0.05, 0);
// STUCK: a held, slightly beating drone under the plateau; it lets go at RELEASE
{ let a = 0, b = 0; add(dry, s(T.fork), s(T.release[0] + 400 - T.fork), (i, t) => { const ms = T.fork + t * 1000; a += (2 * Math.PI * 110) / SR; b += (2 * Math.PI * 113.5) / SR;
  return (Math.sin(a) + Math.sin(b) * 0.8) * 0.035 * sm(P(ms, T.fork, 600)) * (1 - sm(P(ms, T.release[0], 400))); }); }
tone(wet, s(T.completedLabel), 392, 0.035, -0.3, 0.1, 0.8);
tone(wet, s(T.stuckLabel), 277.18, 0.035, 0.3, 0.1, 0.8);
tick(wet, s(T.born), 2637, 0.07); tone(wet, s(T.born), 659.25, 0.05, 0.2, 0.02, 0.6);          // the point is born
breath(dry, s(T.release[0]), s(T.release[1] - T.release[0]) + 0.4, 1100, 450, (u) => sm(u / 0.1) * Math.pow(1 - u, 1.2), 0.4, 12);
air(wet, s(T.release[0]), s(T.release[1] - T.release[0]), (u) => 2600 * Math.pow(1 - u, 1.5) + 200, (u) => sm(u / 0.05) * Math.pow(1 - u, 1.3), 0.14, 13, (u) => lerp(0.2, 0.5, u));
pad(wet, T.release[0] + 300, T.act2, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.release[0] + 300, 1500)) * (1 - sm(P(ms, T.act2 - 1500, 1400))), 0.045);
tone(wet, s(T.regLabel), 587.33, 0.04, 0.4, 0.05, 0.9);
air(wet, s(T.toAnchor[0]), s(T.toAnchor[1] - T.toAnchor[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.06, 14);
tone(wet, s(T.line), 293.66, 0.045, 0, 0.2, 1.1);


// ---------------- ACT 2: the check-in bridge + five game beats on a 75bpm pulse ----------------
const BT = T.bridge;
const X = T.cuts[1] - (T.cuts[0] + T.beatLen);   // Chaos Release's extra beat: later accents keep their place in each game beat
T.pulse.forEach((ms, i) => { const down = (ms - T.act2 - (ms >= T.cuts[1] ? X : 0)) % (4 * B) === 0 || ms === T.act2; const g = sm(P(ms, T.act2, 1600)) * 0.7 + 0.3;
  thump(dry, s(ms), down ? 92 : 80, 46, (down ? 0.34 : 0.21) * g); tick(wet, s(ms + B / 2), 2400, 0.01, i % 2 ? 0.3 : -0.3); });
pad(wet, T.act2, T.act3 + 400, [146.83, 220, 293.66], (ms) => sm(P(ms, T.act2, 1500)) * (1 - sm(P(ms, C[4] + 1200, 1600))), 0.026);
C.forEach((c, i) => air(wet, s(c) - 0.002, 0.16, (u) => lerp(3200, 800, u), (u) => Math.exp(-u * 5), 0.05, 30 + i));   // each cut
// bridge: the rows arrive, the Angry row is pressed, its tile flies up
[0, 1, 2, 3].forEach((k) => tone(wet, s(BT.rows + k * BT.rowStep + 60), [587.33, 659.25, 739.99, 880][k], 0.018, -0.3 + k * 0.2, 0.01, 0.35));
wood(dry, s(BT.press), 0, 0.3, 520);
air(wet, s(BT.fly[0]), s(BT.fly[1] - BT.fly[0]), (u) => lerp(700, 2200, u), (u) => Math.sin(Math.PI * u), 0.05, 21);

// 1 CHAOS RELEASE: the 6:12 PM Angry reels' sound palette (their FAMILY SOUND BLOCK in
// regulate-angry-reply.sound.mjs): the phone's swish as it draws in, the soft wooden tock as the app's
// line appears, a grip knock per 110ms shake stroke, the collision rattle (every one a collision in the
// picture: the same deterministic run, T.chaos), a deep thump at the 75 milestone.
{ const CH = T.chaos, c0 = C[0], sm2 = sm, hsh = (n) => { n = (n | 0) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 16), 0x85ebca6b); n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const ar = (t, a, r) => (t < a ? t / a : Math.exp(-(t - a) / r));
  const ev = (bus, atMs, dur, fn, { pan = 0, fin = 0.0015, fout = 0.006 } = {}) => add(bus, s(atMs), dur, (i, t) => fn(t) * sm2(t / fin) * sm2((dur - t) / fout), { pan });
  const SCX = (CH.screen.x0 + CH.screen.x1) / 2, SCW = (CH.screen.x1 - CH.screen.x0) / 2, panX = (x) => clamp(((x - SCX) / SCW) * 0.8, -0.8, 0.8);
  const end = c0 + CH.len;   // the hard cut: nothing of the game rings past it
  // the heartbeat voice's deep thump (the milestone haptic)
  const heart = (atMs, amp) => { const r = rng(Math.round(atMs * 7) + 5), kn = biquad('bp', 190, 1.4), lp = biquad('lp', 1400, 0.7); let a = 0, b = 0;
    ev(dry, atMs, 0.45, (t) => { const f = 44 + 38 * Math.exp(-t / 0.03); a += (2 * Math.PI * f) / SR; b += (2 * Math.PI * f * 2.8) / SR;
      return lp((Math.tanh(1.8 * Math.sin(a)) / Math.tanh(1.8)) * ar(t, 0.005, 0.12) * 0.6 + Math.sin(b) * ar(t, 0.004, 0.06) * 0.8 + kn(r() * 2 - 1) * ar(t, 0.004, 0.022) * 0.3) * amp; }, { fin: 0.003 }); };
  air(wet, s(c0 + CH.phoneIn), 0.9, (u) => lerp(600, 2000, u), (u) => Math.sin(Math.PI * u), 0.05, 41);                    // the phone draws in
  { let a = 0, b = 0; ev(wet, c0 + CH.cueIn, 0.3, (t) => { a += (2 * Math.PI * 660) / SR; b += (2 * Math.PI * 1320) / SR; return (Math.sin(a) * ar(t, 0.003, 0.07) + Math.sin(b) * ar(t, 0.002, 0.03) * 0.3) * 0.07; }, { fin: 0.003 }); }
  CH.jolts.forEach((J) => { const r = rng(Math.round(J.t)), lp = biquad('lp', J.k ? 460 : 600, 0.9), g = J.k ? 0.38 : 0.6; ev(dry, c0 + J.t, 0.07, (t) => lp(r() * 2 - 1) * ar(t, 0.002, 0.016) * g, { fin: 0.002 }); });
  // collisions thinned to the strongest per 16ms and softened where the swarm is dense; wall knocks lower,
  // ball clacks higher, panned by x across the glass. Quieter before the first stroke and as the charge settles.
  const gain = (u) => kf(u, [[0, 0.4], [CH.shake - 60, 0.4], [CH.shake, 1], [CH.stop + 150, 1], [CH.stop + 700, 0.4]]);
  const ev0 = [...CH.events].filter((e) => c0 + e[0] < end - 50).sort((a, b) => a[0] - b[0]), kept = [];
  for (const e of ev0) { const k = kept[kept.length - 1]; if (k && e[0] - k[0] < 16) { if (e[2] > k[2]) kept[kept.length - 1] = e; } else kept.push(e); }
  kept.forEach(([u, kind, v, x], n) => {
    const h = hsh(Math.round(u * 13) + kind), dens = kept.filter((q) => Math.abs(q[0] - u) < 120).length;
    const f = kind ? 1500 + 700 * h : 820 + 260 * h, amp = gain(u) * 0.2 * Math.pow(Math.min(1, v / 900), 0.8) * (0.85 + 0.3 * hsh(n + 7)) / Math.sqrt(Math.max(1, dens / 6));
    const r = rng(Math.round(u * 31) + n), bp = biquad('bp', f * 1.02, 8); let ph = 0;
    ev(fx, c0 + u, 0.05, (tt) => { ph += (2 * Math.PI * f) / SR; return (Math.sin(ph) * 0.5 + bp(r() * 2 - 1) * 2) * ar(tt, 0.001, kind ? 0.005 : 0.009) * amp; }, { pan: panX(x), fin: 0.001 });
  });
  CH.milestones.forEach((m) => heart(c0 + m, 0.6)); }

// 2 PRESSURE GAUGE: taps climb with the needle, a hum rises with pressure, the redline lands,
// then the long breath out as it falls
{ const g = T.gauge, c = C[1];
  g.taps.forEach((tp, k) => wood(dry, s(c + tp), -0.15 + (k % 2) * 0.3, 0.28 + k * 0.012, 700 + k * 45));
  let ph = 0; const d = (g.peak + g.hold + 300 - g.taps[0]) / 1000;
  add(dry, s(c + g.taps[0]), d, (i, t) => { const ms = g.taps[0] + t * 1000, u = clamp((ms - g.taps[0]) / (g.peak - g.taps[0])); ph += (2 * Math.PI * (130 + 130 * u)) / SR; return Math.sin(ph) * 0.05 * u * sm(t / 0.1) * (1 - sm(P(ms, g.peak + g.hold, 300))); });
  thump(dry, s(c + g.peak), 84, 42, 0.26); tone(wet, s(c + g.peak), 880, 0.04, 0.3, 0.005, 0.5);
  breath(dry, s(c + g.peak + g.hold), s(g.fall) + 0.3, 1100, 420, (u) => sm(u / 0.08) * Math.pow(1 - u, 1.2), 0.42, 43);
  air(wet, s(c + g.peak + g.hold), s(g.fall), (u) => 2000 * Math.pow(1 - u, 1.6) + 250, (u) => sm(u / 0.05) * Math.pow(1 - u, 1.4), 0.07, 44); }

// 3 PENDULUM: the app's hard-panned apex tones (right, then left) and the hit tone on each tap;
// a soft air follows the swing across the stereo field
{ const c = C[2], pan = (u) => Math.sin((Math.PI * (u + T.pend.e0)) / T.pend.half - Math.PI / 2) * -0.8;
  T.pend.hits.forEach((h, k) => { const p = k === 0 ? 0.9 : -0.9; tone(wet, s(c + h), 440, 0.065, p, 0.004, 0.55); tone(wet, s(c + h) + 0.02, 659.25, 0.03, p, 0.004, 0.4); wood(dry, s(c + h), p, 0.14, 900); });
  air(wet, s(c), 3.2, (u) => 700 + 500 * Math.abs(Math.sin((Math.PI * (u * 3200 + T.pend.e0)) / T.pend.half - Math.PI / 2)), (u) => 0.6 * sm(u / 0.06) * (1 - sm((u - 0.9) / 0.1)), 0.045, 62, (u) => pan(u * 3200)); }

// 4 GROUNDING: soft steps, one per thing named, climbing
T.ground.entries.forEach((e, k) => { tone(wet, s(C[3] + e), [392, 440, 493.88, 587.33, 659.25][k], 0.032, -0.4 + k * 0.2, 0.01, 0.5); tick(wet, s(C[3] + e), 1600, 0.02, -0.4 + k * 0.2); });

// 5 SIGH: two breaths in (the long first, the short sip), the hold, then the long breath out
breath(dry, s(T.sighIn1[0]), s(T.sighIn1[1] - T.sighIn1[0]), 700, 1500, (u) => sm(u / 0.25) * (1 - sm((u - 0.8) / 0.2)), 0.42, 71);
breath(dry, s(T.sighSip[0]), s(T.sighSip[1] - T.sighSip[0]), 1500, 2300, (u) => sm(u / 0.2) * (1 - sm((u - 0.7) / 0.3)), 0.42, 72);

// ---------------- ACT 3: the out-breath, rest, full stop, silence ----------------
breath(dry, s(T.exhale[0]), s(T.exhale[1] - T.exhale[0]), 1050, 420, (u) => sm(u / 0.08) * Math.pow(1 - u, 1.0), 0.5, 81);
air(wet, s(T.exhale[0]), s(T.exhale[1] - T.exhale[0]), (u) => 1900 * Math.pow(1 - u, 1.5) + 220, (u) => sm(u / 0.05) * Math.pow(1 - u, 1.2), 0.08, 82);
pad(wet, T.act3 - 700, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.act3 - 700, 1800)) * (1 - sm(P(ms, T.glide[1] - 400, 2400))), 0.05);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 83);
fullStop(wet, s(T.glide[1]));
for (const ch of ['L', 'R']) { const a = biquad('lp', 5500, 0.707), b = biquad('lp', 5500, 0.707); for (let n = 0; n < fx.n; n++) fx[ch][n] = b(a(fx[ch][n])); }
mixInto(dry, fx, 1); mixInto(wet, fx, 0.12);
reverb(wet, { mix: 0.4, room: 0.84, damp: 0.4, preDelayMs: 20 }); mixInto(dry, wet, 1); master(dry, 1.1);
// Peak control for the -1.5 dBTP ceiling: bin/render-reel.sh gains the mix to -14 LUFS and sample-limits
// at -1.6 dBFS, and the AAC encode then overshoots to ~-1.3 dBTP. So limit here first, smoothly (5ms
// look-ahead, 80ms release, peaks read on a 4x interpolated signal), to 10.2 dB above the mix's own
// integrated loudness (measured with ffmpeg, twice); the render's limiter then has nothing left to catch.
{ const out = process.argv[2] || 'regulate-trailer.wav';
  const lufs = () => { writeWav(out, dry); const r = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }); const m = /"input_i"\s*:\s*"(-?[\d.]+)"/.exec(r.stderr || ''); return m ? +m[1] : null; };
  for (let pass = 0; pass < 2; pass++) {
    const I = lufs(); if (I == null) break;
    const ceil = Math.pow(10, (I + 10.2) / 20), N = dry.n, look = Math.round(0.005 * SR), rel = Math.exp(-1 / (0.08 * SR));
    const need = new Float32Array(N);
    for (let n = 0; n < N; n++) { let pk = 0; for (const ch of [dry.L, dry.R]) { const a = ch[n], b = ch[n + 1] ?? a, c = ch[n - 1] ?? a; const i1 = (-c + 9 * a + 9 * b - (ch[n + 2] ?? b)) / 16; pk = Math.max(pk, Math.abs(a), Math.abs(i1)); } need[n] = pk > ceil ? ceil / pk : 1; }
    const m = new Float32Array(N); const q = [];               // min of need[] over [n, n + look]
    for (let n = N - 1; n >= 0; n--) { while (q.length && need[q[q.length - 1]] >= need[n]) q.pop(); q.push(n); while (q[0] > n + look) q.shift(); m[n] = need[q[0]]; }
    let cur = 1; for (let n = 0; n < N; n++) { cur = m[n] < cur ? m[n] : m[n] + (cur - m[n]) * rel; m[n] = cur; }   // instant down, 80ms release
    let acc = 0; for (let n = 0; n < N; n++) { acc += m[n] - (n >= look ? m[n - look] : 1); const gg = (acc + look) / look; dry.L[n] *= gg; dry.R[n] *= gg; }   // 5ms ramp
  }
  writeWav(out, dry); }
