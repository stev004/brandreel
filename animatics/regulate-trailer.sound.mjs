#!/usr/bin/env node
// Score for regulate-trailer.html; every cue is read from regulate-trailer.timing.js.
// Act 1: a heartbeat that climbs at THREAT, holds high under STUCK, and settles at RELEASE.
// Act 2: a 75bpm pulse (cuts every 4 beats), each game carries its own gesture. Act 3: the Sigh's
// long breath out, the house full-stop tick, then silence.
import { spawnSync } from 'node:child_process';
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, thump, tick, wood, pad, breath, air, room, ping, tone, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-trailer'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
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
T.pulse.forEach((ms, i) => { const down = (ms - T.act2) % (4 * B) === 0 || ms === T.act2; const g = sm(P(ms, T.act2, 1600)) * 0.7 + 0.3;
  thump(dry, s(ms), down ? 92 : 80, 46, (down ? 0.34 : 0.21) * g); tick(wet, s(ms + B / 2), 2400, 0.01, i % 2 ? 0.3 : -0.3); });
pad(wet, T.act2, T.act3 + 400, [146.83, 220, 293.66], (ms) => sm(P(ms, T.act2, 1500)) * (1 - sm(P(ms, C[4] + 1200, 1600))), 0.026);
C.forEach((c, i) => air(wet, s(c) - 0.002, 0.16, (u) => lerp(3200, 800, u), (u) => Math.exp(-u * 5), 0.05, 30 + i));   // each cut
// bridge: the rows arrive, the Angry row is pressed, its tile flies up
[0, 1, 2, 3].forEach((k) => tone(wet, s(BT.rows + k * BT.rowStep + 60), [587.33, 659.25, 739.99, 880][k], 0.018, -0.3 + k * 0.2, 0.01, 0.35));
wood(dry, s(BT.press), 0, 0.3, 520);
air(wet, s(BT.fly[0]), s(BT.fly[1] - BT.fly[0]), (u) => lerp(700, 2200, u), (u) => Math.sin(Math.PI * u), 0.05, 21);

// 1 CHAOS: a rattle on every accelerometer impulse, the swarm's wall clicks, a low shake rumble
{ const [a, b] = T.chaos.shake; const m = (ms) => { if (ms < a || ms > b) return 0; const e = sm(P(ms, a, 200)) * (1 - sm(P(ms, b - 200, 200))); return e * (4.6 * Math.abs(Math.sin((2 * Math.PI * 3 * (ms - a)) / 1000)) + 1.4); };
  for (let ms = 0; ms < b + 60; ms += T.chaos.upd) { const f = m(ms); if (f <= 0.35) continue; const r = rng(500 + ms), bp = biquad('bp', 1500 + 500 * ((ms / 60) % 3), 1.1), pan = ((ms / 60) % 2 ? 0.35 : -0.35);
    add(dry, s(C[0] + ms), 0.09, (i, t) => bp(r() * 2 - 1) * Math.exp(-t / 0.022) * Math.min(1, t / 0.002) * 0.16 * (f / 6), { pan }); }
  for (let ms = a; ms < b; ms += 1000 / 3) thump(dry, s(C[0] + ms + 80), 70, 40, 0.16, 0);
  for (let k = 0; k < 22; k++) { const ms = 150 + k * 130 + (k * 37) % 50; if (ms > 3000) break; tick(wet, s(C[0] + ms), 1100 + (k * 173) % 700, 0.02 * (ms < b ? 1 : 0.5), ((k * 7) % 5) / 2.5 - 0.8); } }

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
