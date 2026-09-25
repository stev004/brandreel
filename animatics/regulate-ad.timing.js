// regulate-ad.timing.js - one clock for picture + score of the general ad. Needs lib/timing-kit.js.
var TIMING = (function () {
  const { beats } = TK;
  const T = {
    dur: 17000, P0: [540, 1000],
    swap: 1700, homeIn: 3600, taps: [4700, 5150, 5600, 6050], line: 6450,
    demo: 7700, pick: 8200, use: [8800, 11550], rate: [11600, 13100], slide: [12150, 12750],
    closeGlide: [13200, 13900], wordmark: 13900, tag: 14550, cta: 14950,
    bpm: [[0, 80], [1700, 90], [3600, 84], [8800, 112], [11550, 72]],
    rows: [
      { name: 'Anxious / Panic', sub: 'Overthinking, stressed, worried', tool: 'Physiological Sigh', c: '#D4A574' },
      { name: 'Numb / Freeze', sub: 'Shut down, disconnected, heavy', tool: 'Pendulum', c: '#7E9AA6' },
      { name: 'Angry / Frustrated', sub: 'Irritated, on edge, heated', tool: 'Chaos Release', c: '#C06C4D' },
      { name: 'Balanced / Flow', sub: 'Calm, present, grounded', tool: 'Regulate Breath', c: '#7FA77F' },
    ],
    rowY: [660, 865, 1070, 1275],
    charges: [[8800, 100], [9300, 84], [9750, 66], [10150, 46], [10500, 26], [10800, 10], [11100, 0]],   // shakes drive it: slow, then a cascade
  };
  T.beats = beats(400, T.closeGlide[0], T.bpm);
  T.charge = (t) => { if (t < T.charges[0][0]) return 100; for (let i = 1; i < T.charges.length; i++) { const [a, v] = T.charges[i], [a0, v0] = T.charges[i - 1]; if (t < a) return v0; } return 0; };
  // the USE beat: a Chaos Release burst from the point (seeded; bounces inside a frame below the steps)
  let seed = 23; const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const n = 44, px = [], py = [], vx = [], vy = [], r = [], frames = [], hits = [], rank = [];
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, sp = 1300 + rnd() * 1300; px[i] = T.P0[0]; py[i] = T.P0[1]; vx[i] = Math.cos(a) * sp; vy[i] = Math.sin(a) * sp; r[i] = 12 + 9 * rnd(); rank[i] = i; }
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rank[i], rank[j]] = [rank[j], rank[i]]; }
  const t0 = T.use[0], t1 = T.use[1], DT = 1000 / 240;
  for (let step = 0, t = t0; t <= t1; step++, t = t0 + step * DT) {
    for (const [bt] of T.charges.slice(1)) if (t >= bt && t < bt + DT) for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2; vx[i] += Math.cos(a) * 1200; vy[i] += Math.sin(a) * 1200; }
    for (let i = 0; i < n; i++) {
      const sp = Math.hypot(vx[i], vy[i]); if (sp > 2600) { vx[i] *= 2600 / sp; vy[i] *= 2600 / sp; }
      px[i] += vx[i] * DT / 1000; py[i] += vy[i] * DT / 1000;
      if (px[i] < 40 + r[i] || px[i] > 1040 - r[i]) { vx[i] = -vx[i]; px[i] = Math.max(40 + r[i], Math.min(1040 - r[i], px[i])); hits.push([t, px[i]]); }
      if (py[i] < 520 + r[i] || py[i] > 1560 - r[i]) { vy[i] = -vy[i]; py[i] = Math.max(520 + r[i], Math.min(1560 - r[i], py[i])); hits.push([t, px[i]]); }
    }
    if (step % 4 === 0) frames.push(Float32Array.from(px.flatMap((v, i) => [v, py[i]])));
  }
  T.removedAt = rank.map((k) => { const need = (k + 1) / n * 100; for (const [a, v] of T.charges) if (v < need) return a; return Infinity; });
  T.chaos = { n, r, hits, pos: (i, t) => { const f = Math.min(frames.length - 1, Math.max(0, Math.round((t - t0) * 0.06))); return [frames[f][2 * i], frames[f][2 * i + 1]]; } };
  return T;
})();
