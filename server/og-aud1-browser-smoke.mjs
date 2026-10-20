/** Chromium automated proof to the manual Gate-D checkpoint; does not test perception. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=path.resolve('.');
const core=process.env.MORPHO_CORE_DIR;
assert.ok(core,'Pinned Core required');
const work=path.resolve(process.env.MORPHO_OG_AUD1_BROWSER_DATA_DIR||'.morpho-og-aud1-browser-smoke');
await fs.mkdir(work,{recursive:true});
const processes=[],logs={};
function launch(name,file,env={},args=[]){
  const child=spawn(process.execPath,[file,...args],{
    cwd:root,shell:false,stdio:['ignore','pipe','pipe'],env:{...process.env,...env},
  });
  logs[name]='';
  for(const stream of [child.stdout,child.stderr])
    stream.on('data',part=>{logs[name]=(logs[name]+part.toString()).slice(-100000)});
  processes.push(child);
  return child;
}
async function ready(uri,process){
  for(let i=0;i<100;i++){
    if(process.exitCode!==null)throw new Error('Process exited '+uri);
    try{if((await fetch(uri)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('Timeout '+uri);
}
async function stop(proc){
  if(!proc||proc.exitCode!==null||proc.signalCode!==null)return;
  proc.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve=>proc.once('close',resolve)),
    new Promise(resolve=>setTimeout(resolve,4000))
  ]);
  if(proc.exitCode===null)proc.kill('SIGKILL');
}
let browser,bridge;
try {
  bridge=launch('physical-bridge','server/og-aud1-server.mjs',{
    MORPHO_CORE_DIR:core,MORPHO_OG_AUD1_DATA_DIR:work,
  });
  await ready('http://127.0.0.1:8767/og-aud1/health',bridge);
  const vite=launch('vite','node_modules/vite/bin/vite.js',{},[
    '--host','127.0.0.1','--port','5173','--strictPort'
  ]);
  await ready('http://127.0.0.1:5173/',vite);
  browser=await chromium.launch({headless:true,args:['--no-sandbox',
    '--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  const opener=page.getByRole('button',{name:'OG-AUD1 · 3器官の物理A/B実験を開く／閉じる'});
  await opener.click();
  const section=page.locator('section[aria-labelledby="og-aud1-heading"]');
  await section.waitFor();
  assert.equal(await section.locator('svg').count(),2);
  await section.getByRole('button',{name:'2身体の物理Takeを新規Perform'}).click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:200000});
  assert.equal(await section.locator('.compare-card audio').count(),2);
  const aud=section.locator('.compare-card audio').first();
  const audioRef=await aud.getAttribute('src');
  assert.match(audioRef||'',/^\/og-aud1\/artifacts\/[a-f0-9]{64}\.wav$/);
  const bytes=Buffer.from(await(await fetch('http://127.0.0.1:8767'+audioRef)).arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),audioRef.split('/').at(-1).slice(0,64));
  const playback=await aud.evaluate(async element=>{
    if(element.readyState<1)await new Promise((resolve,reject)=>{
      element.addEventListener('loadedmetadata',resolve,{once:true});
      element.addEventListener('error',reject,{once:true});
      element.load();
    });
    await element.play();
    await new Promise(resolve=>setTimeout(resolve,200));
    return {duration:element.duration,currentTime:element.currentTime};
  });
  assert.ok(playback.duration>=.99&&playback.duration<=1.01);
  assert.ok(playback.currentTime>0);
  const count=await section.locator('select option').count();
  assert.ok(count>=2);
  await page.reload();
  await opener.click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:15000});
  await stop(bridge);
  bridge=launch('physical-restart','server/og-aud1-server.mjs',{
    MORPHO_CORE_DIR:core,MORPHO_OG_AUD1_DATA_DIR:work,
  });
  await ready('http://127.0.0.1:8767/og-aud1/health',bridge);
  await page.reload();
  await opener.click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:15000});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(work,'og-aud1-browser.png'),fullPage:true});
  console.log('PASS OG-AUD1 automatic Chromium: typed graph, fresh real A/B, audio decode/play, reload+restart');
}finally{
  await browser?.close().catch(()=>{});
  for(const proc of [...processes].reverse())await stop(proc);
  for(const [name,content] of Object.entries(logs))
    await fs.writeFile(path.join(work,name+'.log'),content);
}
