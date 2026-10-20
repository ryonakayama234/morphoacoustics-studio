/** Isolated, localhost-only, exact-Core-pinned branch3 physical preview bridge.
 * This does not touch CC-A2/v0/v1 or claim independently adopted physics.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCoreRevision } from './core-revision.mjs';
import { assertNoIgnoredToolExecutables } from './cc-a2-server.mjs';
import { CORE_SHA, sha, verifyPair } from './og-aud1-verify.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CORE=path.resolve(process.env.MORPHO_CORE_DIR||path.join(ROOT,'..','morphoacoustics'));
const DATA=path.resolve(process.env.MORPHO_OG_AUD1_DATA_DIR||path.join(ROOT,'.morpho-og-aud1-data'));
const PYTHON=process.env.MORPHO_PYTHON||'python';
const PORT=Number(process.env.MORPHO_OG_AUD1_PORT||8767);
const BODY=['small_C','large_C'];
const FILES=['raw_U_m3_s.npy',...BODY.flatMap(b=>[
  b+'/raw_p_Ain_Pa.npy',b+'/monitor_48k_pcm16.wav',b+'/all_six_port_p_Pa_u_m3s.npy'])];
let busy=false,activeChild=null;

function writeJson(res,status,data) {
  const bytes=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Content-Length':bytes.length,'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'});
  res.end(bytes);
}
function fail(code,message){return {code,message};}
async function inputJson(req) {
  if(!(req.headers['content-type']||'').startsWith('application/json'))
    throw new Error('INVALID: JSON only');
  const data=[];let n=0;
  for await (const part of req) {
    n+=part.length;
    if(n>4096) throw new Error('INVALID: request too large');
    data.push(part);
  }
  const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(data));
  const json=JSON.parse(text);
  if(!json||typeof json!=='object'||Array.isArray(json)
      ||Object.keys(json).sort().join(',')!=='character_id,schema'
      ||json.schema!=='og-aud1.preview.request.v0'
      ||typeof json.character_id!=='string'
      ||!/^[A-Za-z0-9_.:-]{1,80}$/.test(json.character_id)) {
    throw new Error('INVALID: exact fixed-preview request required');
  }
  return json;
}
async function freshRead(file,size) {
  const st=await fs.lstat(file);
  if(!st.isFile()||st.isSymbolicLink()||st.size<=0||st.size>size)
    throw new Error('FAILED: invalid fresh artifact file');
  return fs.readFile(file);
}
async function executeCore(destination) {
  verifyCoreRevision(CORE,CORE_SHA);
  assertNoIgnoredToolExecutables(CORE);
  return new Promise((resolve,reject)=>{
    const child=spawn(PYTHON,[path.join(CORE,'tools/og_aud1_preview.py'),destination],{
      cwd:CORE,shell:false,stdio:['ignore','pipe','pipe'],
      env:{...process.env,PYTHONPATH:path.join(CORE,'src'),
        PYTHONPYCACHEPREFIX:path.join(path.dirname(destination),'pycache')},
    });
    activeChild=child;
    let stderr='',stdout='',settled=false;
    const timer=setTimeout(()=>child.kill('SIGKILL'),180000);
    function finish(e) {
      if(settled) return;
      settled=true;clearTimeout(timer);
      if(activeChild===child) activeChild=null;
      if(e) reject(e); else resolve(stdout);
    }
    child.stdout.on('data',x=>{
      stdout+=x.toString('utf8');
      if(stdout.length>100000) child.kill('SIGKILL');
    });
    child.stderr.on('data',x=>{
      stderr+=x.toString('utf8');
      if(stderr.length>100000) child.kill('SIGKILL');
    });
    child.once('error',finish);
    child.once('close',code=>{
      try {
        if(code!==0) throw new Error('FAILED: real Core run: '+stderr.slice(0,1200));
        verifyCoreRevision(CORE,CORE_SHA);
        finish();
      }catch(e){finish(e)}
    });
  });
}
async function archiveArtifact(bytes,ext) {
  const hex=sha(bytes).slice(7);
  const p=path.join(DATA,'artifacts',hex+ext);
  try {
    await fs.writeFile(p,bytes,{flag:'wx'});
  }catch(e) {
    if(e?.code!=='EEXIST') throw e;
    if(sha(await freshRead(p,6_000_000)).slice(7)!==hex)
      throw new Error('FAILED: existing content address corrupted');
  }
  return '/og-aud1/artifacts/'+hex+ext;
}
async function takeFiles(dir) {
  const manifestBytes=await freshRead(path.join(dir,'manifest.json'),50000);
  const manifest=JSON.parse(manifestBytes.toString('utf8'));
  const files={};
  for(const rel of FILES){
    // allowlisted literal relative paths, not manifest-provided paths.
    files[rel]=await freshRead(path.join(dir,rel),5_000_000);
  }
  verifyPair(manifest,files,CORE_SHA);
  return {manifest,manifestBytes,files};
}
export async function performPair(request) {
  const id=randomUUID();
  const root=path.join(DATA,'runs',id);
  await fs.mkdir(root,{recursive:false});
  const dir=path.join(root,'fresh-pair');
  await executeCore(dir);
  const {manifest,manifestBytes,files}=await takeFiles(dir);
  const rawSha=manifest.source_sha256;
  const records=[];
  const source_ref=await archiveArtifact(files['raw_U_m3_s.npy'],'.npy');
  for(const item of manifest.records) {
    records.push({
      body:item.body, c_area_m2:item.c_area_m2,
      graph_snapshot:item.graph,
      diagnostic:item.diagnostic,
      source_ref,
      raw_pressure_ref:await archiveArtifact(files[item.raw_pressure_path],'.npy'),
      all_ports_ref:await archiveArtifact(files[item.six_port_path],'.npy'),
      audio_ref:await archiveArtifact(files[item.wave_path],'.wav'),
    });
  }
  const manifest_ref=await archiveArtifact(manifestBytes,'.json');
  const take={
    schema:'og-aud1.preview.take-pair.v0',pair_id:id,
    created_at:new Date().toISOString(),
    status:'PREVIEW_UNADOPTED',physical_claim:manifest.physical_claim,
    request,core_commit:CORE_SHA,source_sha256:rawSha,
    shared_playback_gain_inverse_pa:manifest.shared_playback_gain_inverse_pa,
    relative_raw_pressure_rms_difference:manifest.relative_raw_pressure_rms_difference,
    manifest_ref,records,
  };
  // Single atomic marker: any prior failure leaves *zero playable Takes*.
  const tmp=path.join(DATA,'takes',id+'.json.stage');
  const final=path.join(DATA,'takes',id+'.json');
  await fs.writeFile(tmp,JSON.stringify(take,null,2),{flag:'wx'});
  await fs.rename(tmp,final);
  return take;
}
async function listTakes() {
  const names=(await fs.readdir(path.join(DATA,'takes'))).filter(x=>
    /^[0-9a-f-]{36}\.json$/.test(x));
  const takes=[];
  for(const name of names) {
    const item=JSON.parse(await fs.readFile(path.join(DATA,'takes',name),'utf8'));
    if(item.core_commit!==CORE_SHA||item.schema!=='og-aud1.preview.take-pair.v0')
      continue; // incompatible foreign revision is never a replayable Take.
    const refs=[item.manifest_ref,...item.records.flatMap(x=>[
      x.source_ref,x.raw_pressure_ref,x.all_ports_ref,x.audio_ref])];
    for(const ref of refs) {
      if(typeof ref!=='string'||!/^\/og-aud1\/artifacts\/[a-f0-9]{64}\.(npy|wav|json)$/.test(ref))
        throw new Error('FAILED: archived reference invalid');
      const basename=ref.split('/').at(-1);
      const bytes=await freshRead(path.join(DATA,'artifacts',basename),6_000_000);
      if(sha(bytes).slice(7)!==basename.slice(0,64))
        throw new Error('FAILED: archived reference tampered');
    }
    takes.push(item);
  }
  return takes.sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-50);
}
export async function startServer() {
  if(!Number.isInteger(PORT)||PORT<1024||PORT>65535) throw new Error('INVALID_PORT');
  verifyCoreRevision(CORE,CORE_SHA);
  assertNoIgnoredToolExecutables(CORE);
  for(const name of ['runs','takes','artifacts'])
    await fs.mkdir(path.join(DATA,name),{recursive:true});
  const server=createServer(async(req,res)=>{
    try {
      // Local reverse-proxy only: no cross-origin performed requests.
      const origin=req.headers.origin;
      if(origin&&!['http://127.0.0.1:5173','http://localhost:5173'].includes(origin))
        return writeJson(res,403,fail('ORIGIN','Unknown origin'));
      if(req.method==='GET'&&req.url==='/og-aud1/health')
        return writeJson(res,200,{status:'preview',core_commit:CORE_SHA,adopted:false});
      if(req.method==='GET'&&req.url==='/og-aud1/takes')
        return writeJson(res,200,await listTakes());
      if(req.method==='GET'&&/^\/og-aud1\/artifacts\/[a-f0-9]{64}\.(npy|wav|json)$/.test(req.url||'')){
        const name=req.url.slice('/og-aud1/artifacts/'.length);
        const bytes=await freshRead(path.join(DATA,'artifacts',name),6_000_000);
        if(sha(bytes).slice(7)!==name.slice(0,64))
          return writeJson(res,500,fail('FAILED','Artifact checksum mismatch'));
        const mime=name.endsWith('.wav')?'audio/wav':name.endsWith('.json')?
          'application/json':'application/octet-stream';
        res.writeHead(200,{'Content-Type':mime,'Content-Length':bytes.length,
          'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
        return res.end(bytes);
      }
      if(req.method!=='POST'||req.url!=='/og-aud1/perform')
        return writeJson(res,404,fail('NOT_FOUND','Unknown endpoint'));
      if(busy) return writeJson(res,429,fail('BUSY','Only one physical pair per server'));
      busy=true;
      try{
        const request=await inputJson(req);
        const take=await performPair(request);
        return writeJson(res,200,take);
      }finally{busy=false}
    }catch(e){
      return writeJson(res,400,fail('FAILED',e instanceof Error?e.message:String(e)));
    }
  });
  server.requestTimeout=15000;
  server.headersTimeout=10000;
  function shutdown(){
    activeChild?.kill('SIGTERM');
    server.close();
  }
  process.once('SIGINT',shutdown);
  process.once('SIGTERM',shutdown);
  server.listen(PORT,'127.0.0.1',()=>console.log('OG-AUD1 research preview on 127.0.0.1:'+PORT));
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  startServer().catch(e=>{console.error(e);process.exitCode=1});
