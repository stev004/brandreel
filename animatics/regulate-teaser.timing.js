// regulate-teaser.timing.js - one clock for picture + score. Needs lib/timing-kit.js first.
// The point never moves; four states flash around it on an accelerating heartbeat; then silence.
var TIMING = (function () {
  const { beats } = TK;
  const T = {
    dur: 9600, P0: [540, 1000],
    seg: [[0, 1500, 'anx'], [1500, 2900, 'frz'], [2900, 4200, 'ang'], [4200, 5600, 'bal']],   // mid-motion at frame 0
    whip: 220, silence: 5600, line: 5850, glide: [6550, 7250], wordmark: 7250, tag: 7800, cta: 8100,
    bpm: [[0, 96], [1500, 108], [2900, 122], [4200, 132], [5600, 132]],
  };
  T.beats = beats(200, T.silence, T.bpm);
  // chaos burst: 36 particles leave the point, bounce off the frame (seeded, simple)
  let seed = 11; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const n = 36, px = [], py = [], vx = [], vy = [], r = [], frames = [], hits = [];
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = 1500 + rnd() * 1300; px[i] = T.P0[0]; py[i] = T.P0[1]; vx[i] = Math.cos(a) * s; vy[i] = Math.sin(a) * s; r[i] = 12 + 9 * rnd(); }
  const t0 = T.seg[2][0], t1 = T.seg[2][1] + 300, DT = 1000 / 240;
  for (let step = 0, t = t0; t <= t1; step++, t = t0 + step * DT) {
    for (let i = 0; i < n; i++) {
      vx[i] *= 0.9985; vy[i] *= 0.9985; px[i] += vx[i] * DT / 1000; py[i] += vy[i] * DT / 1000;
      if (px[i] < 30 + r[i] || px[i] > 1050 - r[i]) { vx[i] = -vx[i]; px[i] = Math.max(30 + r[i], Math.min(1050 - r[i], px[i])); hits.push([t, px[i]]); }
      if (py[i] < 600 + r[i] || py[i] > 1890 - r[i]) { vy[i] = -vy[i]; py[i] = Math.max(600 + r[i], Math.min(1890 - r[i], py[i])); hits.push([t, px[i]]); }
    }
    if (step % 4 === 0) frames.push(Float32Array.from([...px.map((v, i) => [v, py[i]])].flat()));
  }
  T.chaos = { n, r, frames, hits, pos: (i, t) => { const f = Math.min(frames.length - 1, Math.max(0, Math.round((t - t0) * 0.06))); return [frames[f][2 * i], frames[f][2 * i + 1]]; } };
  return T;
})();
