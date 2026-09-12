#!/usr/bin/env node
// animatic-frames.mjs - capture an HTML animatic at real wall-clock times with
// headless Chrome over the DevTools protocol. The in-app Browser pane freezes
// CSS animations while hidden and --virtual-time-budget stalls rAF players, so
// this is the one reliable way to see an animatic frame without a human watching.
// Usage: node bin/animatic-frames.mjs <file-or-url> <out-dir> <ms> [<ms> ...]
// Frames are named by the ACTUAL elapsed ms at capture (each capture costs ~2s).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, outDir, ...rest] = process.argv.slice(2);
if (!url || !outDir || rest.length === 0) { console.error('usage: animatic-frames.mjs <url> <out-dir> <ms...>'); process.exit(1); }
const times = rest.map(Number);
// WATCHDOG: never hang - a stuck Chrome or socket exits non-zero after the frames could have been taken.
const budget = Math.max(...times) + 25000;
setTimeout(() => { console.error(`watchdog: exceeded ${budget}ms`); try { chrome.kill(); } catch {} process.exit(3); }, budget).unref();
const port = 9500 + Math.floor(Math.random() * 400);
const profile = `/tmp/animatic-frames-${port}`;
mkdirSync(outDir, { recursive: true });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=900,760', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 40 && targets.length === 0; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {} if (targets.length === 0) await sleep(250); }
if (targets.length === 0) { console.error('chrome did not expose a target'); chrome.kill(); process.exit(2); }
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url });
const t0 = Date.now();
for (const t of times) {
  const wait = t0 + t - Date.now(); if (wait > 0) await sleep(wait);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const actual = Date.now() - t0;
  writeFileSync(`${outDir}/t${actual}.png`, Buffer.from(r.data, 'base64'));
  console.log(`frame requested ${t}ms captured at ${actual}ms`);
}
ws.close(); chrome.kill(); process.exit(0);
