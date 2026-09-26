#!/usr/bin/env node
// Score + narration mix for regulate-polyvagal.html. Every cue is read from the same timing file
// the picture uses (itself cued to the narration's word timings), so sound, words and picture
// share one clock. The narration leads; the bed sits under it and is ducked by the voice's own
// envelope; sound events are small and literal (the ECG's beats, the sonar, rung knocks, the
// sigh's breaths, the Pendulum's hard-panned apex ticks), then one tick as the point lands.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, makeBus, add, rng, biquad, lp1, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, kf, lerp, heartbeatAt, thump, tick, wood, pad, breath, air, room, tone, crackle, fullStop } from '../bin/lib/sfx.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => readFileSync(join(here, f), 'utf8').replace(/if \(typeof module[^\n]*/, '');
const T = new Function(load('lib/timing-kit.js') + load('regulate-polyvagal.vo.js') + load('regulate-polyvagal.timing.js') + '\nreturn TIMING;')();
const c = T.c, s = (ms) => ms / 1000, sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const dur = T.dur / 1000;

// narration: 24k float -> 48k via ffmpeg (soxr), mono
const vo = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', join(here, '..', 'workspace', 'regulate-polyvagal', 'vo.wav'), '-af', 'aresample=48000:filter_size=64:cutoff=0.97', '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
if (vo.status !== 0) { console.error(String(vo.stderr)); process.exit(1); }
const V = process.env.NOVO ? new Float32Array(1) : new Float32Array(vo.stdout.buffer, vo.stdout.byteOffset, vo.stdout.byteLength / 4);

const dry = makeBus(dur), wet = makeBus(dur);
const win = (ms, a, b, fi = 800, fo = 1200) => sm(P(ms, a, fi)) * (1 - sm(P(ms, b, fo)));

// ---- bed: a low room, and a slow pad whose chord follows the rung we are on
room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 600)) * (1 - sm(P(ms, T.glide[1] + 1500, 2500))), 0.12);
const D = [73.42, 110, 146.83, 185, 220];                  // D2 A2 D3 F#3 A3: safe (warm, open)
const TENSE = [73.42, 110, 155.56, 207.65, 233.08];        // D2 A2 Eb3 Ab3 Bb3: mobilised (unsettled)
const LOW = [55, 82.41, 110, 130.81];                      // A1 E2 A2 C3: shut down (low, dim)
pad(wet, c.q, c.symp + 800, D, (ms) => win(ms, c.q, c.symp, 3000, 1500) * (1 - 0.5 * win(ms, c.ladder, c.ventral, 800, 800)), 0.028);
pad(wet, c.symp - 400, c.dorsal + 900, TENSE, (ms) => win(ms, c.symp - 400, c.dorsal, 1400, 1600), 0.022);
pad(wet, c.dorsal - 400, c.window + 1200, LOW, (ms) => win(ms, c.dorsal - 400, c.window, 2000, 1800), 0.03);
pad(wet, c.window - 600, T.dur, D, (ms) => win(ms, c.window - 600, T.glide[1] + 600, 2600, 3000), 0.026);
pad(wet, T.glide[0], T.dur, [146.83, 220, 293.66, 369.99, 440], (ms) => win(ms, T.glide[0], T.dur - 800, 900, 1800), 0.03);

// ---- s01: the pounding ECG (a thump on every drawn spike), then the flatline's low air
{
  const x0 = 96, x1 = 984, t0 = c.pound, t1 = c.numb - 100, beats = [];
  for (let k = 0; ; k++) { const x = x0 + 68 + 150 * k; if (x > x1) break; beats.push(t0 + ((x - x0) / (x1 - x0)) * (t1 - t0)); }
  heartbeatAt(dry, beats, { gain: () => 0.7, amp: 0.5, dub: 0.28 });
  air(wet, s(c.numb + 150), s(c.flaw + 900 - c.numb), (u) => lerp(600, 180, u), (u) => sm(u / 0.1) * (1 - sm((u - 0.7) / 0.3)), 0.12, 11);
  tone(wet, s(c.flaw), 293.66, 0.05, 0, 0.3, 1.6);
}
// ---- s02: sonar from the point
T.sonar.forEach((at, i) => { tone(wet, s(at), 880, 0.035, 0, 0.004, 0.5); tone(wet, s(at) + 0.02, 1318.5, 0.012, 0, 0.004, 0.3); });
tone(wet, s(c.safe), 440, 0.04, 0, 0.2, 1.8);
// ---- s03-s04: the body draws, the nerve runs down, traffic runs up
air(wet, s(c.theory), 3.6, (u) => lerp(300, 1400, u), (u) => Math.sin(Math.PI * u), 0.07, 21);
air(wet, s(c.runs), s(c.gut + 500 - c.runs), (u) => lerp(1800, 350, u), (u) => Math.sin(Math.PI * u), 0.08, 23);
air(wet, s(c.traffic + 300), s(c.ladder - c.traffic), (u) => lerp(300, 2400, u), (u) => sm(u / 0.2) * (1 - sm((u - 0.8) / 0.2)), 0.06, 25);
[c.wander, c.poly].forEach((at) => tone(wet, s(at), 587.33, 0.03, 0, 0.01, 0.8));
// ---- s05: the nerve straightens, rungs draw, the point drops a rung at a time
air(wet, s(c.ladder + 100), 1.5, (u) => lerp(500, 2000, u), (u) => Math.sin(Math.PI * u), 0.07, 31);
[0, 1, 2].forEach((i) => tick(wet, s(c.asLadder + i * 140), 2200 - i * 300, 0.06, 0));
[c.top, c.middle, c.bottom].forEach((at, i) => tone(wet, s(at), [587.33, 440, 293.66][i], 0.03, 0, 0.01, 0.7));
wood(dry, s(c.rung1 + 240), 0, 0.4, 620); wood(dry, s(c.rung2 + 240), 0, 0.45, 520);
// ---- s06-s08: callouts tick in; heart races in the middle rung, slows at the bottom
const calls = [c.think, c.face, c.voice6, c.breath6, c.stress6, c.heart7, c.breath7, c.muscles, c.jaw, c.hands, c.vision, c.thoughts, c.drops, c.limbs, c.flat, c.far];
calls.forEach((at, i) => tick(wet, s(at), 2600 + (i % 4) * 180, 0.03, (i % 2 ? 0.25 : -0.25)));
wood(dry, s(c.symp), 0, 0.3, 560); wood(dry, s(c.dorsal + 200), 0, 0.3, 420);
{ const b = []; for (let ms = c.heart7; ms < c.faces + 1200; ms += 60000 / 112) b.push(ms); heartbeatAt(dry, b, { gain: (ms) => 0.45 * win(ms, c.heart7, c.faces, 400, 1200), amp: 0.5 }); }
{ const b = []; for (let ms = c.dorsal + 800; ms < c.lazy; ms += 60000 / 54) b.push(ms); heartbeatAt(dry, b, { gain: (ms) => 0.28 * win(ms, c.dorsal + 800, c.lazy - 1200, 1200, 1200), amp: 0.5 }); }
air(wet, s(c.vision), 1.6, (u) => lerp(2500, 400, u), (u) => sm(u / 0.2) * (1 - u), 0.06, 41);
tone(wet, s(c.flight), 392, 0.04, -0.4, 0.01, 1.0); tone(wet, s(c.fight), 349.23, 0.04, 0.4, 0.01, 1.0);
thump(dry, s(c.settles + 460), 90, 45, 0.35);                        // the threat spike
air(wet, s(c.settles + 800), s(c.stuck - c.settles - 700), (u) => lerp(1500, 200, u), (u) => Math.sin(Math.PI * u) * 0.8, 0.05, 43);
{ const r = rng(45), lp = biquad('lp', 160, 0.9); add(dry, s(c.stuck), s(c.stuckEnd + 900 - c.stuck), (i, t) => lp(r() * 2 - 1) * sm(t / 0.3) * (1 - sm((t - 2.4) / 0.6)) * 0.25); }
[c.lazy, c.protect].forEach((at, i) => tone(wet, s(at), [220, 293.66][i], 0.035, 0, 0.1, 1.4));
tone(wet, s(c.freezeWord), 196, 0.04, 0, 0.02, 1.4);
// ---- s10: the wave; the window narrows and widens
air(wet, s(c.above), 1.4, (u) => lerp(800, 3000, u), (u) => Math.sin(Math.PI * u), 0.06, 51);
air(wet, s(c.belowW), 1.8, (u) => lerp(1200, 150, u), (u) => Math.sin(Math.PI * u), 0.07, 52);
air(wet, s(c.narrows), 1.3, (u) => lerp(2000, 700, u), (u) => Math.sin(Math.PI * u), 0.04, 53);
air(wet, s(c.widen), 1.6, (u) => lerp(500, 1800, u), (u) => Math.sin(Math.PI * u), 0.04, 54);
// ---- s11: each cell lands with a small tick; the rows get their own pitch
[[c.b0, 0], [c.b1, 1], [c.b2, 2], [c.e0, 0], [c.e1, 1], [c.e2, 2], [c.k0, 0], [c.k1, 1], [c.k2, 2]].forEach(([at, r]) => tick(wet, s(at), [2349, 1760, 1175][r], 0.05, lerp(-0.4, 0.4, r / 2)));
// ---- s12: exhale up the first arrow, a gentle lift up the second
breath(dry, s(c.exhale + 200), s(c.shutdown - c.exhale - 700), 900, 420, (u) => sm(u / 0.1) * Math.pow(1 - u, 0.9), 0.14, 61);
air(wet, s(c.under), 1.4, (u) => lerp(700, 120, u), (u) => sm(u / 0.3) * (1 - sm((u - 0.7) / 0.3)), 0.06, 62);
tone(wet, s(c.lift + 300), 440, 0.03, 0, 0.3, 1.0); tone(wet, s(c.lift + 1300), 587.33, 0.03, 0, 0.3, 1.0);
// ---- s13: the handle moves, each free tool sounds like itself
[c.tSigh, c.tChaos, c.tPend, c.tBreath].forEach((at) => wood(dry, s(at + 200), 0, 0.22, 700));
{ // The Sigh: in, sip in, (hold), long out - the app's fillAt proportions, compressed as the picture
  const sa = c.inhales - 150, sb = c.tChaos - 350, k = (sb - sa) / 9700;
  breath(dry, s(sa), s(2500 * k), 700, 1500, (u) => sm(u / 0.15) * (1 - sm((u - 0.8) / 0.2)), 0.16, 71);
  breath(dry, s(sa + 2500 * k), s(1200 * k), 1100, 1800, (u) => sm(u / 0.2) * (1 - sm((u - 0.7) / 0.3)), 0.12, 72);
  breath(dry, s(sa + 4700 * k), s(5000 * k), 1000, 380, (u) => sm(u / 0.08) * Math.pow(1 - u, 1.0), 0.16, 73);
}
{ // Chaos Release: the rattle builds, peaks on "shake", the heat leaves
  const r = rng(81), hp = biquad('hp', 900, 0.7);
  add(dry, s(c.tChaos + 300), s(c.tPend - c.tChaos), (i, t) => {
    const ms = c.tChaos + 300 + t * 1000, a = kf(ms, [[c.tChaos + 300, 0], [c.tChaos + 900, 0.35], [c.shake, 0.45], [c.shake + 300, 1], [c.shake + 1300, 1], [c.shake + 1800, 0]]);
    return hp(r() * 2 - 1) * (r() < 0.02 + 0.1 * a ? 1 : 0.05) * a * 0.18;
  });
  for (let i = 0; i < 12; i++) crackle(wet, s(c.shake + 900 + i * 85), 0.2, lerp(-0.8, 0.8, (i * 7 % 12) / 11), 90 + i);
  air(wet, s(c.shake + 900), 1.6, (u) => lerp(3000, 300, u), (u) => sm(u / 0.05) * Math.pow(1 - u, 1.4), 0.1, 83, (u) => lerp(-0.5, 0.5, u));
}
// Pendulum: apex tones hard-panned left/right, as the app does (right first)
T.pendApex.forEach((at, i) => { const pan = i % 2 ? -1 : 1; wood(dry, s(at), pan, 0.5, 880); tone(wet, s(at), i % 2 ? 523.25 : 659.25, 0.035, pan, 0.004, 0.5); });
{ // Regulate Breath: IN (1.6s) then OUT (3.2s), 1:2 like the app's 4:8
  const bi = c.fourIn - 200;
  breath(dry, s(bi), 1.6, 600, 1500, (u) => sm(u / 0.2) * (1 - sm((u - 0.85) / 0.15)), 0.14, 91);
  breath(dry, s(bi + 1600), 3.2, 1200, 400, (u) => sm(u / 0.1) * Math.pow(1 - u, 0.9), 0.14, 92);
}
// ---- s14: Notice. Name. Match. each lands on the point; the glide; the full stop
[c.notice, c.name, c.matchT].forEach((at, i) => tone(wet, s(at), [440, 493.88, 587.33][i], 0.03, 0, 0.01, 0.9));
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(1800, 500, u), (u) => Math.sin(Math.PI * u), 0.07, 95);
fullStop(wet, s(T.glide[1]));

// ---- mix: reverb the score, duck it under the voice's envelope, voice on top
reverb(wet, { mix: 0.4, room: 0.86, damp: 0.4, preDelayMs: 22 });
mixInto(dry, wet, 1);
const lead = 0, env = new Float32Array(dry.n); { let e = 0; const at = Math.exp(-1 / (0.01 * SR)), rl = Math.exp(-1 / (0.35 * SR)); for (let n = 0; n < dry.n; n++) { const x = Math.abs(V[n - lead] || 0); e = x > e ? at * e + (1 - at) * x : rl * e + (1 - rl) * x; env[n] = e; } }
const vlp = lp1(11500);
for (let n = 0; n < dry.n; n++) {
  const duck = 1 - 0.55 * Math.min(1, env[n] * 9);
  const v = vlp(V[n] || 0) * 1.0;
  dry.L[n] = dry.L[n] * duck * 0.9 + v; dry.R[n] = dry.R[n] * duck * 0.9 + v;
}
master(dry, 1.05);
writeWav(process.argv[2] || 'regulate-polyvagal.wav', dry);
