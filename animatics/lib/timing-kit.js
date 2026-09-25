// timing-kit.js - helpers shared by <reel>.timing.js files. A timing file is plain JS that
// defines `var TIMING`; the animatic loads it with <script src>, the score loads it in Node via
// loadTiming() in bin/lib/sfx.mjs. One file, so picture and sound can never drift apart.
var TK = (function () {
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-7) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } let lo = 0, hi = 1; for (let i = 0; i < 40 && Math.abs(sx(t) - x) > 1e-7; i++) { if (x > sx(t)) lo = t; else hi = t; t = (lo + hi) / 2; } return sy(t); };
  }
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const P = (t, a, d) => clamp((t - a) / d);
  const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const lerp = (a, b, p) => a + (b - a) * p;
  // smooth keyframes for schedules (bpm, gains)
  const sched = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [t1, v1] = keys[i], [t0, v0] = keys[i - 1]; if (t <= t1) return lerp(v0, v1, sm((t - t0) / (t1 - t0))); } return keys[keys.length - 1][1]; };
  // heartbeat: beat times (ms) from a bpm schedule
  const beats = (from, to, bpm) => { const out = []; let ms = from; while (ms < to) { out.push(ms); ms += 60000 / sched(ms, bpm); } return out; };
  // first time f(t) >= v on [a, b] for a monotonic f (bisection)
  const solve = (f, v, a, b) => { let lo = a, hi = b; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) >= v) hi = m; else lo = m; } return hi; };
  const E = { HOUSE: bez(0.2, 0.7, 0.2, 1), SETTLE: bez(0.22, 1, 0.36, 1), INOUT: bez(0.45, 0.05, 0.55, 0.95), SNAP: bez(0.3, 0, 0, 1), EASE_IN: bez(0.42, 0, 1, 1) };
  return { bez, clamp, P, sm, lerp, sched, beats, solve, E };
})();
if (typeof module !== 'undefined') module.exports = TK;
