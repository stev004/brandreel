#!/usr/bin/env node
// Score for regulate-trailer.html; every cue is read from regulate-trailer.timing.js.
// Act 1: a heartbeat that climbs at THREAT, holds high under STUCK, and settles at RELEASE.
// Act 2: a 120bpm pulse, each cut carries its game's own gesture. Act 3: the breath out, the
// house full-stop tick, then silence.
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, thump, tick, wood, pad, breath, air, room, ping, tone, crackle, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-trailer'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000);
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const C = T.cuts;

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

// ---------------- ACT 2: 120bpm pulse ----------------
T.pulse.forEach((ms, i) => { const down = i % 3 === 0; thump(dry, s(ms), down ? 96 : 84, 46, down ? 0.5 : 0.3); tick(wet, s(ms + 250), 5200, 0.018, i % 2 ? 0.4 : -0.4); });
C.forEach((c, i) => air(wet, s(c) - 0.002, 0.18, (u) => lerp(5000, 900, u), (u) => Math.exp(-u * 5), 0.08, 30 + i));   // each hard cut
// 1 sigh: the sip (short top-up inhale), then the hold
breath(dry, s(C[0] + 240), 1.2, 1700, 2300, (u) => sm(u / 0.2) * (1 - sm((u - 0.75) / 0.25)), 0.55, 41);
// 2 gauge: five taps drive the needle, pitch rises with pressure; ping at the redline
T.gaugeTaps.forEach((tp, k) => wood(dry, s(C[1] + tp), -0.2 + k * 0.1, 0.5 + k * 0.06, 760 + k * 90));
{ let ph = 0; add(dry, s(C[1] + 250), 1.25, (i, t) => { const u = Math.min(1, t / 1.0); ph += (2 * Math.PI * (196 + 240 * u)) / SR; return Math.sin(ph) * 0.045 * sm(t / 0.1) * (1 - sm((t - 1.1) / 0.15)); }); }
ping(wet, s(C[1] + 1250), 1174.66, 0.07, 0.3);
// 3 geode: taps + glassy cracks
T.taps.forEach((tp, k) => { wood(dry, s(C[2] + tp), 0, 0.5, 1200 + k * 60); for (let j = 0; j < 2; j++) crackle(wet, s(C[2] + tp) + 0.03 + j * 0.05, 0.4, -0.3 + k * 0.2, 70 + k * 3 + j); });
tone(wet, s(C[2] + 1150), 1567.98, 0.05, 0, 0.01, 0.7);
// 4 chaos: a rattle on every shake
{ const r = rng(51), bp = biquad('bp', 2200, 0.8);
  add(dry, s(C[3] + 250), 1.05, (i, t) => { const env = Math.pow(Math.abs(Math.sin(2 * Math.PI * t * 4)), 3) * (1 - sm((t - 0.7) / 0.35)); return bp(r() * 2 - 1) * env * 0.5; }); }
[312, 562, 812, 1062].forEach((k, j) => { crackle(wet, s(C[3] + k), 0.35, j % 2 ? 0.5 : -0.5, 90 + j); thump(dry, s(C[3] + k), 70, 40, 0.18, j % 2 ? 0.3 : -0.3); });
// 5 tension: a clench that tightens, ticks on the count
{ const r = rng(61), lp = biquad('lp', 180, 0.9); let ph = 0;
  add(dry, s(C[4]), 1.5, (i, t) => { const u = t / 1.5; ph += (2 * Math.PI * (70 + 40 * u * u)) / SR; return (Math.sin(ph) * 0.06 + lp(r() * 2 - 1) * 0.35) * u * u * (1 - sm((t - 1.44) / 0.05)); }); }
T.tenseCount.forEach((c, k) => tick(wet, s(C[4] + c), 1760 - k * 80, 0.08));
// 6 pendulum: the app's apex tone as the bob reaches the guide (right), a soft tap
tone(wet, s(C[5] + T.pendApex), 523.25, 0.08, 0.6, 0.01, 0.5); wood(dry, s(C[5] + T.pendApex), 0.6, 0.35, 880);
air(wet, s(C[5]), 1.44, (u) => 900 + 700 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u) * 0.8, 0.05, 62, (u) => Math.sin(Math.PI * u) * 0.6);
// 7 focus follow: a slow calming pulse (the press-and-hold rhythm) and a drifting glide
{ let ph = 0; add(wet, s(C[6] + 100), 1.4, (i, t) => { ph += (2 * Math.PI * 440) / SR; return Math.sin(ph) * 0.04 * (0.6 + 0.4 * Math.sin(2 * Math.PI * t * 2)) * sm(t / 0.15) * (1 - sm((t - 1.2) / 0.2)); }, { panFn: (t) => Math.sin(t * 2) * 0.5 }); }
// 8 breath: the inhale up the column, ticks enter
for (let k = 0; k < 12; k++) tick(wet, s(C[7] + 40 + k * 22), 3000 + k * 40, 0.035, k < 4 ? -0.4 : 0.4);
breath(dry, s(C[7] + 240), 1.26, 1100, 1900, (u) => sm(u / 0.3) * (1 - sm((u - 0.85) / 0.15)), 0.5, 71);

// ---------------- ACT 3: out-breath, rest, full stop, silence ----------------
breath(dry, s(T.exhale[0]), s(T.exhale[1] - T.exhale[0]), 1050, 460, (u) => sm(u / 0.1) * Math.pow(1 - u, 1.0), 0.5, 81);
pad(wet, T.act3, T.dur, [146.83, 220, 293.66, 369.99], (ms) => sm(P(ms, T.act3, 1500)) * (1 - sm(P(ms, T.glide[1] - 400, 2400))), 0.05);
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.08, 83);
fullStop(wet, s(T.glide[1]));
reverb(wet, { mix: 0.4, room: 0.84, damp: 0.4, preDelayMs: 20 }); mixInto(dry, wet, 1); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-trailer.wav', dry);
