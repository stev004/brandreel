// animatic-strip.mjs - capture an animatic as a dense strip of frames (one run, ~80ms apart when the
// machine is idle), each named by the PAGE's own clock (the player's progress fill), then tile with:
//   ffmpeg -pattern_type glob -i 'f*.jpg' -filter_complex "crop=300:645:2:86,scale=150:-1,tile=10xN:padding=3" strip.png
// Usage: node bin/animatic-strip.mjs <file-or-url> <out-dir> <from-wall-ms> <to-wall-ms>
// Never merge two runs into one strip - a starved first run mislabels frames by seconds.
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url,outDir,fromMs,toMs]=process.argv.slice(2); mkdirSync(outDir,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(offset){
  const port=9800+Math.floor(Math.random()*150);
  const chrome=spawn(CH,['--headless=new','--disable-gpu','--hide-scrollbars','--window-size=420,700',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/sheet-${port}`,'about:blank'],{stdio:'ignore'});
  const wd=setTimeout(()=>{chrome.kill()},Number(toMs)+30000);
  let targets=[]; for(let i=0;i<40&&!targets.length;i++){try{targets=await (await fetch(`http://127.0.0.1:${port}/json`)).json()}catch{} if(!targets.length) await sleep(250);}
  const page=targets.find(t=>t.type==='page')||targets[0];
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res; ws.onerror=e=>rej(new Error('ws error')); ws.onclose=()=>rej(new Error('ws closed before open'));}).catch(e=>{console.error('devtools connect failed:',e.message); chrome.kill(); process.exit(4);});
  let id=0; const pending=new Map(); ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}};
  const send=(m,p={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
  await send('Page.enable'); await send('Page.navigate',{url});
  // page clock: read the player's timecode fill width instead of wall clock
  const t0=Date.now(); await sleep(Number(fromMs)+offset);
  while(Date.now()-t0<Number(toMs)){
    const r=await send('Page.captureScreenshot',{format:'jpeg',quality:60});
    const tc=await send('Runtime.evaluate',{expression:"document.querySelector('[data-fill=\"c3\"]').style.width",returnByValue:true});
    const pct=parseFloat((tc.result&&tc.result.value)||'0'); const pageMs=Math.round(pct/100*19600);
    writeFileSync(`${outDir}/f${String(pageMs).padStart(5,'0')}.jpg`,Buffer.from(r.data,'base64'));
  }
  ws.close(); clearTimeout(wd); chrome.kill();
}
await run(0);
console.log(readdirSync(outDir).sort().join(' '));
