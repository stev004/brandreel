#!/usr/bin/env node
// animatic-render.mjs - frame-exact capture of a SEEKABLE HTML animatic to a
// 60fps MP4. Unlike animatic-frames.mjs (wall-clock, for CSS-animated mocks),
// this drives the page's own clock: the animatic must expose
// window.__seek(ms) that draws the frame at that time synchronously, and
// window.__durationMs. No CSS animations or transitions may drive the picture.
// Usage: node bin/animatic-render.mjs <file-or-url> <out.mp4> [--fps 60] [--from ms] [--to ms] [--audio file.wav] [--frames-dir dir]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const [src, out] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!src || !out) { console.error('usage: animatic-render.mjs <file-or-url> <out.mp4> [--fps 60] [--from ms] [--to ms] [--audio wav] [--frames-dir dir]'); process.exit(1); }
const fps = Number(flag('fps', 60));
const audio = flag('audio');
const framesDir = flag('frames-dir');
const url = /^[a-z]+:\/\//.test(src) ? src : pathToFileURL(resolve(src)).href;
const W = 1080, H = 1920;

const port = 9100 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`,
  '--font-render-hinting=none', '--disable-lcd-text', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/animatic-render-${port}`, 'about:blank'], { stdio: 'ignore' });
const kill = () => { try { chrome.kill(); } catch {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 60 && targets.length === 0; i++) { try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === 'page'); } catch {} if (!targets.length) await sleep(250); }
if (!targets.length) { console.error('chrome did not expose a page target'); kill(); process.exit(2); }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
for (let i = 0; i < 120; i++) { if (await evaluate('typeof window.__seek === "function" && document.readyState === "complete"').catch(() => false)) break; await sleep(250); }
await evaluate('(window.__ready || document.fonts.ready).then(() => document.fonts.size)');
await evaluate('window.__capture = true; true');
const duration = await evaluate('window.__durationMs');
const stills = flag('stills');
if (stills) { // --stills 1300,2400,... --frames-dir dir : one PNG per time, no video
  mkdirSync(framesDir || out, { recursive: true });
  for (const ms of stills.split(',').map(Number)) {
    await evaluate(`window.__seek(${ms}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${framesDir || out}/s${String(ms).padStart(5, '0')}.png`, Buffer.from(shot.data, 'base64'));
  }
  console.log(`wrote ${stills.split(',').length} stills`); ws.close(); kill(); process.exit(0);
}
const from = Number(flag('from', 0)), to = Number(flag('to', duration));
const n = Math.round(((to - from) / 1000) * fps);
console.log(`rendering ${n} frames @ ${fps}fps (${from}-${to}ms of ${duration}ms) from ${url}`);
if (framesDir) mkdirSync(framesDir, { recursive: true });

const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-'];
if (audio) ffArgs.push('-ss', String(from / 1000), '-i', audio);
ffArgs.push('-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', String(fps),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709');
if (audio) ffArgs.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
ffArgs.push('-movflags', '+faststart', out);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((r) => ff.on('close', r));

const t0 = Date.now();
for (let f = 0; f < n; f++) {
  const ms = from + (f * 1000) / fps;
  await evaluate(`window.__seek(${ms}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const buf = Buffer.from(shot.data, 'base64');
  if (framesDir) writeFileSync(`${framesDir}/f${String(f).padStart(5, '0')}.png`, buf);
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 60 === 0) process.stdout.write(`\r  frame ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
const code = await ffDone;
ws.close(); kill();
console.log(`\n${code === 0 ? 'wrote' : 'ffmpeg failed for'} ${out} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(code === 0 ? 0 : 5);
