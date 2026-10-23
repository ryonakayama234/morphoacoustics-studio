/** CI only: genuine Core 1D paired bodies, archive reload and refusal. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const root = process.env.CC_B1_SMOKE_URL || 'http://127.0.0.1:8767';
async function json(endpoint){const r=await fetch(root+endpoint);
  const body=await r.json(); assert.equal(r.status,200,JSON.stringify(body));return body;}
const ready=await json('/cc-b1/health');
assert.equal(ready.status,'ready');
const created=[];
for(const ratio of ['0.90','1.10']){
  const r=await fetch(root+'/cc-b1/perform',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rest_area_ratio:ratio}),
  });
  const body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));
  assert.equal(body.schema_version,'cc-b1-studio-local-pair/v0');
  assert.equal(body.ratio,ratio);
  assert.equal(body.body_revision.edit.section_index,8);
  assert.equal(body.acoustic_calls_per_body,102);
  assert.equal(body.sample_rate_hz,48000);
  assert.ok(body.relative_raw_pa_l2>1e-8);
  for(const side of ['baseline','edited']){
    const response=await fetch(root+body.audio[side]);
    assert.equal(response.status,200);
    const wav=Buffer.from(await response.arrayBuffer());
    assert.equal(wav.length,48044);
    assert.equal(wav.toString('ascii',0,4),'RIFF');
    await writeFile('cc-b1-'+ratio+'-'+side+'.wav',wav);
  }
  created.push(body);
}
assert.notEqual(created[0].body_revision_id,created[1].body_revision_id);
const current=await json('/cc-b1/takes');
assert.equal(current.length,2);
for(const item of created) {
  assert.ok(current.some(t=>t.id===item.id &&
    t.body_revision_id===item.body_revision_id &&
    t.body_revision_sha256===item.body_revision_sha256));
}
for(const payload of [
  {rest_area_ratio:'0.95'}, {rest_area_ratio:'0.90',source:'user-fake'},
  {rest_area_ratio:0.9},
]){
  const r=await fetch(root+'/cc-b1/perform',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  assert.notEqual(r.status,200);
  const e=await r.json(); assert.equal(e.code,'CORE_PHYSICAL_REFUSAL');
}
const final=await json('/cc-b1/takes');assert.equal(final.length,2);
await writeFile(process.env.CC_B1_SMOKE_SUMMARY||'cc-b1-smoke.json',
  JSON.stringify({core_sha:ready.core_commit,ratios:created.map(t=>t.ratio),
    IDs:created.map(t=>t.body_revision_id),takes:created,refusal:'PASS'},null,2));
console.log('CC-B1 two genuine paired physics archives, register/restart eligibility and refusals PASS');
