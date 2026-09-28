#!/usr/bin/env node
// Score for regulate-452-numb.html (v3); every cue is read from regulate-452-numb.timing.js.
// No music bed, no heartbeat: freeze is quiet. A bare key click as the frozen draft appears (and
// nothing after it: the cursor is dead), the colon dot's drop onto the apex, then the Pendulum's
// own tones exactly as the app synthesizes them (scripts/gen-bilateral-tones.js: apex 396Hz sine,
// 0.22s, 12ms attack, exponential decay to -60dB, peak -24dBFS; hit 528Hz, 0.30s, -18dBFS), hard
// panned to the side the bob arrives on; on each apex a soft light "lift" (filtered air + a quiet
// high sine) placed on the OPPOSITE side, where the word lights. The lift onto the full stop, the
// full-stop tick, silence.
import { SR, makeBus, add, rng, biquad, reverb, mixInto, master, writeWav } from '../bin/lib/dsp.mjs';
import { P, lerp, tick, air, room, fullStop, loadTiming } from '../bin/lib/sfx.mjs';
const T = loadTiming('regulate-452-numb'), s = (ms) => ms / 1000;
const dry = makeBus(T.dur / 1000), wet = makeBus(T.dur / 1000), tail = makeBus(T.dur / 1000);
const TAIL = 3.0;   // tone-tail return level (keeps the sparse score near -14 LUFS without limiting the app tones)
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// the app's tone, sample for sample (peak-normalised sine with a 12ms linear attack)
function appTone(bus, at, f, dur, peakDb, pan, gain = 1) {
  const atk = 0.012, rate = Math.log(1000) / (dur - atk), pk = 10 ** (peakDb / 20);
  let mx = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; mx = Math.max(mx, Math.abs(Math.sin(2 * Math.PI * f * t) * Math.min(1, t / atk) * Math.exp(-rate * Math.max(0, t - atk)))); }
  add(bus, at, dur, (i, t) => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / atk) * Math.exp(-rate * Math.max(0, t - atk)) * (pk / mx) * gain, { pan });
}

room(dry, 0, T.dur, (ms) => sm(P(ms, 0, 500)) * (1 - sm(P(ms, T.wordmark, 2500))), 0.12);
// the draft appears: one dry key/caret click, then nothing (the cursor is dead)
{ const r = rng(452), bp = biquad('bp', 3200, 2.2), lo = biquad('bp', 900, 3);
  add(dry, s(T.draft + 120), 0.06, (i, t) => (bp(r() * 2 - 1) * 1.6 * Math.exp(-t / 0.0022) + lo(r() * 2 - 1) * 0.9 * Math.exp(-t / 0.006)) * 0.16, { pan: 0.25 }); }
// the colon's dot drops onto the left apex; a soft catch as the arm takes it
air(wet, s(T.fall[0]), s(T.fall[1] - T.fall[0]), (u) => lerp(2200, 600, u), (u) => Math.sin(Math.PI * u), 0.05, 61, (u) => lerp(-0.1, -0.7, u));
tick(wet, s(T.fall[1]), 1500, 0.06, -0.7);
// the four passes: apex tone + hit tone, hard-panned (reverb is per-channel, so the pan holds)
T.apex.forEach((at, n) => {
  const pan = T.side[n];
  appTone(dry, s(at), 396, 0.22, -24, pan);
  appTone(dry, s(at), 528, 0.30, -18, pan);
  appTone(tail, s(at), 396, 0.22, -24, pan); appTone(tail, s(at), 528, 0.30, -18, pan);   // 100% wet: the room keeps each tone ringing on its own side
  // the word lights on the opposite side: a soft rising air + a faint high sine, under the app's tones
  const w = s(at + T.wakeLag), wp = -0.55 * pan;
  air(wet, w, 0.42, (u) => lerp(900, 3200, u), (u) => Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u), 0.05, 70 + n, wp);
  add(wet, w, 0.5, (i, t) => Math.sin(2 * Math.PI * 1584 * t) * Math.min(1, t / 0.03) * Math.exp(-t / 0.12) * 0.012, { pan: wp });
});
// the lift onto the full stop, then the signature
air(wet, s(T.glide[0]), s(T.glide[1] - T.glide[0]), (u) => lerp(700, 1800, u), (u) => Math.sin(Math.PI * u), 0.06, 62, 0.4);
{ const fs = makeBus(T.dur / 1000); fullStop(fs, s(T.land)); mixInto(wet, fs, 0.42); }   // the signature, sat under the app's tones
reverb(wet, { mix: 0.42, room: 0.86, damp: 0.4, preDelayMs: 22 }); mixInto(dry, wet, 1);
reverb(tail, { mix: 1, room: 0.9, damp: 0.45, preDelayMs: 30 }); mixInto(dry, tail, TAIL); master(dry, 1.1);
writeWav(process.argv[2] || 'regulate-452-numb.wav', dry);
