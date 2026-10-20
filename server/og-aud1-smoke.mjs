/** Real Core→Studio trust and persistence smoke (no mocks, no precomputed WAV). */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CORE_SHA, SOURCE_SHA } from './og-aud1-verify.mjs';

const url='http://127.0.0.1:'+(process.env.MORPHO_OG_AUD1_PORT||'8767');
async function get(endpoint){
  const response=await fetch(url+endpoint,{cache:'no-store'});
  assert.equal(response.status,200,endpoint);
  return response.json();
}
async function bytes(ref){
  assert.match(ref,/^\/og-aud1\/artifacts\/[a-f0-9]{64}\.(wav|npy|json)$/);
  const response=await fetch(url+ref);
  assert.equal(response.status,200,ref);
  const data=Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(data).digest('hex'),ref.split('/').at(-1).slice(0,64));
  return data;
}
const health=await get('/og-aud1/health');
assert.equal(health.core_commit,CORE_SHA);
assert.equal(health.adopted,false);
const response=await fetch(url+'/og-aud1/perform',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({schema:'og-aud1.preview.request.v0',character_id:'og-aud1-ci'}),
});
const pair=await response.json();
assert.equal(response.status,200,JSON.stringify(pair));
assert.equal(pair.status,'PREVIEW_UNADOPTED');
assert.equal(pair.source_sha256,SOURCE_SHA);
assert.equal(pair.core_commit,CORE_SHA);
assert.equal(pair.records.length,2);
assert.notEqual(pair.records[0].graph_snapshot.preparation_digest,
                pair.records[1].graph_snapshot.preparation_digest);
assert.deepEqual(pair.records.map(x=>x.c_area_m2),[.00015,.0006]);
assert.ok(pair.relative_raw_pressure_rms_difference>.7);
const manifest=JSON.parse((await bytes(pair.manifest_ref)).toString('utf8'));
assert.equal(manifest.source_sha256,pair.source_sha256);
for(const record of pair.records){
  for(const kind of ['source_ref','raw_pressure_ref','all_ports_ref','audio_ref'])
    await bytes(record[kind]);
  const wav=await bytes(record.audio_ref);
  assert.equal(wav.length,96044);
  await writeFile('og-aud1-'+record.body+'.wav',wav);
}
const bad=await fetch(url+'/og-aud1/perform',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({schema:'og-aud1.preview.request.v0',character_id:'bad',body:'forged'}),
});
assert.equal(bad.status,400);
const takes=await get('/og-aud1/takes');
assert.ok(takes.some(x=>x.pair_id===pair.pair_id));
await writeFile('og-aud1-ci-summary.json',JSON.stringify({pair,manifest,status:'INTEGRATION_PREVIEW_PASS'},null,2));
console.log('OG-AUD1 local Core fresh physical pair, independent JS audit, SHA-addressed WAV, refusal and immutable replay PASS');
