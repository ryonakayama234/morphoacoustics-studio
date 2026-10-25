/** HTTP integration: real Core physical solver, two fresh bodies, history and tamper refusal. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CORE_SHA } from './wg2-local.mjs';

const url = 'http://127.0.0.1:' + (process.env.MORPHO_WG2_PORT || 8768);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function json(path, options) {
  const response = await fetch(url + path, options);
  const body = await response.json();
  return { status: response.status, body };
}
const health = await json('/wg2/health');
assert.equal(health.status,200);
assert.equal(health.body.core_commit,CORE_SHA);
const made = [];
for (const body of ['v3b-axial-M0','v3b-axial-M1']) {
  const request = { character_id:'char_mio', preset_id:body,
    revision:1, duration_s:0.25 };
  const reply = await json('/wg2/perform', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify(request),
  });
  assert.equal(reply.status,200,JSON.stringify(reply.body));
  const take = reply.body;
  assert.equal(take.body.preset_id,body);
  assert.equal(take.body.revision,1);
  assert.equal(take.request.character_id,request.character_id);
  assert.equal(take.observer.observation_point,'mouth-port-pressure-not-external-microphone');
  assert.equal(take.core_commit,CORE_SHA);
  assert.ok(take.body.preparation_digest.startsWith('sha256:'));
  assert.ok(take.observer.max_abs_energy_residual_j < 1e-10);
  assert.equal(take.source.id,'sv1-prescribed-100hz-lf-rd1');
  const wav = await fetch(url + take.audio_ref);
  assert.equal(wav.status,200);
  const bytes = Buffer.from(await wav.arrayBuffer());
  assert.equal(bytes.length,44 + 12_000 * 2);
  assert.equal(sha(bytes),take.artifacts['audio.wav'].sha256);
  await writeFile(body === 'v3b-axial-M0' ? 'wg2-M0.wav':'wg2-M1.wav',bytes);
  made.push(take);
}
assert.notEqual(made[0].id,made[1].id);
assert.notEqual(made[0].body.preparation_digest,made[1].body.preparation_digest);
assert.equal(made[0].source.sha256_f64,made[1].source.sha256_f64);
assert.notEqual(made[0].observer.physical_pressure_sha256,
                made[1].observer.physical_pressure_sha256);
const history = await json('/wg2/takes');
assert.equal(history.status,200);
for (const take of made) assert.ok(history.body.some(x => x.id === take.id));
for (const invalid of [
  { character_id:'char_mio', preset_id:'missing',revision:1,duration_s:0.25 },
  { character_id:'char_mio', preset_id:'v3b-axial-M0',revision:2,duration_s:0.25 },
  { character_id:'char_mio', preset_id:'v3b-axial-M0',revision:1,duration_s:0.75 },
]) {
  const r=await json('/wg2/perform', { method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(invalid) });
  assert.equal(r.status,400);
}
const after = await json('/wg2/takes');
assert.deepEqual(after.body.map(x=>x.id),history.body.map(x=>x.id));
await writeFile('wg2-http-smoke.json',JSON.stringify({core_sha:CORE_SHA, a:made[0],
  b:made[1],history_length:after.body.length},null,2));
console.log('WG2 real Core, exact body A/B, integrity, refusal and persisted Take HTTP PASS');
