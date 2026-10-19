/** Execute actual Core via localhost v1 bridge; reject mock/stored-WAV substitutions. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { CORE_SHA } from './cc-a2-server.mjs';
import { quantizedRawPressureSha256, X2A_RAW_PRESSURE_SHA256 } from './raw-pressure-oracle.mjs';

const url = 'http://127.0.0.1:' + (process.env.MORPHO_CC_A2_PORT || '8766');
const base = JSON.parse(await readFile('vendor/performance-contract/v0/examples/request.json', 'utf8'));
function request(id, body) {
  return {
    ...base, schema_version: 'performance-contract/v1', request_id: id, seed: 0,
    script: { ...base.script, segments: [{
      segment_id: 's1', speaker_character_id: base.character.character_id, text: 'あい',
    }] },
    direction: { schema_version: 'performance-contract/v0',
      direction_id: base.direction.direction_id, revision: base.direction.revision,
      controls: {}, segment_overrides: [] },
    requested_capabilities: ['audio', 'timeline', 'diagnostics', 'physical_trace'],
    embodiment: { preset_id: body, preset_revision: 1 },
  };
}
async function post(req) {
  const response = await fetch(url + '/cc-a2/perform', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
async function bytes(ref) {
  const r = await fetch(url + ref);
  assert.equal(r.status, 200, ref);
  return Buffer.from(await r.arrayBuffer());
}
const health = await (await fetch(url + '/cc-a2/health')).json();
assert.equal(health.core_commit, CORE_SHA);
const first = await post(request('cc_a2_integration_A', 'v3b-axial-M0'));
const second = await post(request('cc_a2_integration_B', 'v3b-axial-M1'));
for(const x of [first, second]) {
  assert.equal(x.result.job_status, 'SUCCEEDED');
  assert.equal(x.result.realization_outcome, 'FEASIBLE');
  const audio = x.result.artifacts.find((a) => a.kind === 'audio');
  assert.ok(audio && /^\/cc-a2\/artifacts\/[a-f0-9]{64}\.wav$/.test(audio.ref));
  const wav = await bytes(audio.ref);
  assert.equal(wav.length, 48044);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  const npy = await bytes(x.result.artifacts.find((a) => a.kind === 'raw-pressure').ref);
  const receipt = JSON.parse((await bytes(
    x.result.artifacts.find((a) => a.kind === 'physical-receipt').ref)).toString('utf8'));
  assert.equal(quantizedRawPressureSha256(npy), receipt.raw_pressure.quantized_sha256);
}
// Preserve easy-to-audition, separately named fresh WAV evidence in CI.
for (const [label, take] of [['A', first], ['B', second]]) {
  const uri = take.result.artifacts.find((artifact) => artifact.kind === 'audio').ref;
  await writeFile('cc-a2-body-' + label + '.wav', await bytes(uri));
}
assert.notEqual(first.result.embodiment.preparation_digest, second.result.embodiment.preparation_digest);
assert.notEqual(first.result.provenance.input_digest, second.result.provenance.input_digest);
assert.equal(first.result.embodiment.preset_id, 'v3b-axial-M0');
assert.equal(second.result.embodiment.preset_id, 'v3b-axial-M1');
const rawA = await bytes(first.result.artifacts.find((a) => a.kind === 'raw-pressure').ref);
assert.equal(quantizedRawPressureSha256(rawA), X2A_RAW_PRESSURE_SHA256);
const wrong = request('cc_a2_integration_wrong', 'missing_body');
const refused = await post(wrong);
assert.equal(refused.result.realization_outcome, 'UNSUPPORTED');
assert.equal(refused.result.embodiment.status, 'MISSING_PRESET');
assert.equal(refused.result.artifacts.length, 0);
const history = await (await fetch(url + '/cc-a2/takes')).json();
assert.ok(history.some((x) => x.result.take_id === first.result.take_id));
assert.ok(history.some((x) => x.result.take_id === second.result.take_id));
await writeFile(process.env.CC_A2_SMOKE_RECEIPT || 'cc-a2-smoke-summary.json',
  JSON.stringify({ core_sha: CORE_SHA, a: first.result, b: second.result,
    refusal: refused.result, history_length: history.length }, null, 2));
console.log('CC-A2: two fresh real Core runs, v1 binding, NPY/WAV, artifact reload, refusal PASS');
