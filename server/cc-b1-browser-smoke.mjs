/** Browser-level creator proof, not just a synthetic HTTP smoke. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root=path.resolve('.');
const work=path.resolve(process.env.CC_B1_BROWSER_DATA_DIR || '.morpho-cc-b1-browser-smoke');
await fs.mkdir(work,{recursive:true});
const log={}, children=[];
function launch(name,file,args=[],env={}){
  const p=spawn(process.execPath,[file,...args],{cwd:root,shell:false,
    stdio:['ignore','pipe','pipe'],env:{...process.env,...env}});
  log[name]='';
  for(const x of [p.stdout,p.stderr]) x.on('data',d=>{log[name]+=d.toString()});
  children.push(p);return p;
}
async function ready(url,process){
  for(let i=0;i<120;i++){
    if(process.exitCode!==null) throw Error('Child exited before health: '+url);
    try {if((await fetch(url)).ok)return;} catch {}
    await new Promise(r=>setTimeout(r,250));
  }
  throw Error('Timed out waiting for '+url);
}
async function stop(p){
  if(!p||p.exitCode!==null||p.signalCode!==null)return;
  p.kill('SIGTERM');
  await new Promise(resolve=>{p.once('close',resolve);
    setTimeout(()=>{if(p.exitCode===null)p.kill('SIGKILL')},3500).unref();});
}
let browser,bridge;
try{
  bridge=launch('bridge','server/cc-b1-local.mjs');
  await ready('http://127.0.0.1:8767/cc-b1/health',bridge);
  const vite=launch('vite','node_modules/vite/bin/vite.js',
    ['--host','127.0.0.1','--port','5173','--strictPort']);
  await ready('http://127.0.0.1:5173/',vite);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  const toggle=page.getByRole('button',{name:'CC-B1 · 身体の断面積を変えて声を聴く（ローカル実験）'});
  await toggle.click();
  const section=page.locator('section[aria-labelledby="cc-b1-heading"]');
  await section.waitFor();
  const ratio=section.getByLabel('第9区間の面積倍率（Coreで物理検証済みの二択）');
  await ratio.selectOption('1.10');
  await section.getByRole('button',{name:'この身体の声を新規生成'}).click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:180000});
  assert.equal(await section.locator('.compare-card audio').count(),2);
  assert.match(await section.locator('strong').last().textContent(),/第9区間/);
  const audio=section.locator('.compare-card audio').last();
  const played=await audio.evaluate(async element=>{
    if(element.readyState<1)await new Promise((resolve,reject)=>{
      element.addEventListener('loadedmetadata',resolve,{once:true});
      element.addEventListener('error',reject,{once:true});element.load();
    });
    await element.play();await new Promise(resolve=>setTimeout(resolve,140));
    return {duration:element.duration,elapsed:element.currentTime};
  });
  assert.ok(played.duration>=0.49 && played.duration<=0.51,JSON.stringify(played));
  assert.ok(played.elapsed>0,JSON.stringify(played));
  await page.reload({waitUntil:'domcontentloaded'});
  await toggle.click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:30000});
  assert.equal(await section.locator('.compare-card audio').count(),2);
  await stop(bridge);
  bridge=launch('restart','server/cc-b1-local.mjs');
  await ready('http://127.0.0.1:8767/cc-b1/health',bridge);
  await page.reload({waitUntil:'domcontentloaded'});
  await toggle.click();
  await section.locator('.compare-card audio').nth(1).waitFor({timeout:30000});
  assert.equal(await section.locator('.compare-card audio').count(),2);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(work,'cc-b1-browser.png'),fullPage:true});
  console.log('CC-B1 BROWSER PASS: real edit, physical Core pair, decoded audio, page & bridge restart');
}finally{
  await browser?.close().catch(()=>{});
  for(const p of [...children].reverse())await stop(p);
  for(const [name,value] of Object.entries(log))await fs.writeFile(path.join(work,name+'.log'),value);
}
