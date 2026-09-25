// reel-kit.js - shared kit for seekable 1080x1920 brand reels (brandreel animatics).
// Everything draws from one clock: window.__seek(ms) renders a frame synchronously,
// so bin/animatic-render.mjs captures frame-exact 60fps. No CSS animation, no springs.
// Lifted from animatics/regulate-showreel.html (the KEPT reference, 2026-09-25).
(function () {
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-7) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 40; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-7) break; if (x > v) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const E = {
    HOUSE: cubicBezier(0.2, 0.7, 0.2, 1),     // site EASE / app HOUSE_EASE
    SETTLE: cubicBezier(0.22, 1, 0.36, 1),    // draws, needle falls
    INOUT: cubicBezier(0.45, 0.05, 0.55, 0.95),
    EASE_IN: cubicBezier(0.42, 0, 1, 1),
    SNAP: cubicBezier(0.3, 0, 0, 1),
    SHATTER: cubicBezier(0.45, 0, 0.85, 0.6), // motion-drafts fracture curve
    LIN: (x) => x,
  };
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, p) => a + (b - a) * p;
  const P = (t, a, d) => clamp((t - a) / d);
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) { const [t1, v1, e = E.HOUSE] = keys[i], [t0, v0] = keys[i - 1]; if (t <= t1) return lerp(v0, v1, e((t - t0) / (t1 - t0))); }
    return keys[keys.length - 1][1];
  }
  function hash(n) { n |= 0; n = (n << 13) ^ n; return 1 - ((Math.imul(n, (Math.imul(Math.imul(n, n), 15731) + 789221) | 0) + 1376312589) & 0x7fffffff) / 1073741824; }
  function vnoise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 1013), hash(i + 1 + seed * 1013), u); }
  function fbm(x, seed) { return vnoise(x, seed) * 0.6 + vnoise(x * 2.3, seed + 7) * 0.28 + vnoise(x * 5.1, seed + 13) * 0.12; }

  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || $('g')).appendChild(e); return e; }
  function A(e, attrs) { for (const k in attrs) e.setAttribute(k, attrs[k]); }
  function show(e, o) { e.style.visibility = o > 0.002 ? 'visible' : 'hidden'; e.style.opacity = o > 0.002 ? o.toFixed(4) : 0; }
  function place(e, x, y, o, { dy = 0, dx = 0, blur = 0, ax = 0, rot = 0 } = {}) {
    show(e, o); if (o <= 0.002) return;
    e.style.transform = `translate(${x + dx}px,${y + dy}px)` + (ax ? ` translateX(${-ax * 100}%)` : '') + (rot ? ` rotate(${rot}deg)` : '');
    e.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
  }
  // house entrance: 620ms, rise 42px (14pt x3), blur to sharp; exit rises 28px with blur
  function riseV(t, at, outAt = Infinity, { dur = 620, dy = 42, blur = 10, outDur = 520, outDy = -28, outBlur = 8 } = {}) {
    const pin = at <= -1e8 ? 1 : E.HOUSE(P(t, at, dur)), pout = E.HOUSE(P(t, outAt, outDur));
    return { o: pin * (1 - pout), dy: lerp(dy, 0, pin) + outDy * pout, blur: blur * (1 - pin) + outBlur * pout };
  }
  function rise(e, t, x, y, at, outAt, opts = {}) { const r = riseV(t, at, outAt, opts); place(e, x, y, r.o * (opts.max ?? 1), { dy: r.dy, blur: r.blur, ax: opts.ax || 0 }); }
  function splitWords(el) {
    const out = [];
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const p of ch.textContent.split(/(\s+)/)) { if (!p) continue; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); continue; } const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s); out.push(s); }
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      }
    };
    walk(el); return out;
  }
  function headline(el, words, t, x, y, at, outAt, stagger = 70, opts = {}) {
    el.style.visibility = 'visible'; el.style.opacity = 1; el.style.transform = `translate(${x}px,${y}px)` + (opts.ax ? ` translateX(${-opts.ax * 100}%)` : '');
    let any = false;
    words.forEach((w, i) => {
      const r = riseV(t, at <= -1e8 ? at : at + i * stagger, outAt + i * 35, { dur: 620, dy: 42, blur: 12 });
      any = any || r.o > 0.002;
      w.style.opacity = r.o.toFixed(4); w.style.transform = `translateY(${r.dy.toFixed(2)}px)`; w.style.filter = r.blur > 0.05 ? `blur(${r.blur.toFixed(2)}px)` : 'none';
    });
    if (!any) el.style.visibility = 'hidden';
  }
  const path = (pts) => { if (!pts.length) return ''; let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`; for (let i = 1; i < pts.length; i++) d += `L${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`; return d; };

  // The signature: the white point IS Playfair's full stop at the wordmark size.
  function wordmark(host, { dotPx = 22, cx = 540, yDot = 960 } = {}) {
    const cv = document.createElement('canvas').getContext('2d');
    const f = (px) => `500 ${px}px "Playfair Display"`;
    cv.font = f(200); const dm = cv.measureText('.');
    const FS = Math.round((200 * dotPx) / (dm.actualBoundingBoxLeft + dm.actualBoundingBoxRight));
    cv.font = f(FS);
    const full = cv.measureText('regulate.').width, dot = cv.measureText('.'), fm = cv.measureText('regulate');
    const x0 = cx - full / 2, pre = full - dot.width;
    const dotCx = (dot.actualBoundingBoxRight - dot.actualBoundingBoxLeft) / 2, dotCy = (dot.actualBoundingBoxDescent - dot.actualBoundingBoxAscent) / 2;
    const baseY = yDot - dotCy, a = fm.fontBoundingBoxAscent, d = fm.fontBoundingBoxDescent;
    const top = baseY - ((FS - (a + d)) / 2 + a);
    const word = 'regulate';
    host.innerHTML = '';
    const letters = [...word].map((ch, i) => { const el = document.createElement('div'); el.className = 't wm'; el.style.fontSize = FS + 'px'; el.textContent = ch; host.appendChild(el); return { el, x: x0 + cv.measureText(word.slice(0, i)).width }; });
    const R = (dot.actualBoundingBoxLeft + dot.actualBoundingBoxRight) / 2;
    return {
      FS, R, xF: x0 + pre + dotCx, yF: yDot, top,
      draw(t, at) { letters.forEach((L, i) => { const r = riseV(t, at + i * 40, Infinity, { dur: 700, dy: 26, blur: 12 }); place(L.el, L.x, top, r.o, { dy: r.dy, blur: r.blur }); }); },
    };
  }

  // Player: seekable for capture, rAF for viewing, optional synced audio (<audio id="snd">).
  function start({ duration, render, fonts, init }) {
    let playing = false, t0 = 0, cur = 0, raf = 0, ready = false;
    const scrub = $('scrub'), tc = $('tc'), btn = $('play'), snd = $('snd');
    scrub.max = duration;
    const draw = (ms) => { cur = ms; render(clamp(ms, 0, duration)); scrub.value = ms; tc.textContent = (ms / 1000).toFixed(2) + 's'; };
    const loop = (now) => { if (!playing) return; let ms = now - t0; if (ms >= duration) { t0 = now; ms = 0; if (snd) { snd.currentTime = 0; } } draw(ms); raf = requestAnimationFrame(loop); };
    const play = () => { playing = true; btn.textContent = 'Pause'; t0 = performance.now() - cur; if (snd && snd.src) { snd.currentTime = cur / 1000; snd.play().catch(() => {}); } raf = requestAnimationFrame(loop); };
    const pause = () => { playing = false; btn.textContent = 'Play'; cancelAnimationFrame(raf); if (snd) snd.pause(); };
    btn.onclick = () => (playing ? pause() : play());
    scrub.oninput = () => { pause(); draw(+scrub.value); };
    addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
    const fit = () => {
      const cap = window.__capture === true; document.body.classList.toggle('capture', cap);
      const wrap = $('wrap'); if (cap) { wrap.style.transform = 'none'; wrap.style.left = '0'; wrap.style.top = '0'; return; }
      const s = Math.min((innerHeight - 64) / 1920, (innerWidth - 24) / 1080);
      wrap.style.left = '50%'; wrap.style.top = '6px'; wrap.style.transform = `translateX(-50%) scale(${s})`;
    };
    addEventListener('resize', fit);
    window.__durationMs = duration;
    window.__seek = (ms) => { if (playing) pause(); if (!ready) { init(); ready = true; } if (window.__capture && !document.body.classList.contains('capture')) fit(); draw(ms); };
    window.__ready = Promise.all((fonts || []).map((f) => document.fonts.load(f))).then(() => document.fonts.ready)
      .then(() => { if (!ready) { init(); ready = true; } fit(); draw(0); return true; });
  }

  window.Reel = { cubicBezier, E, clamp, lerp, P, smooth, kf, hash, vnoise, fbm, $, S, A, show, place, riseV, rise, splitWords, headline, path, wordmark, start };
})();
