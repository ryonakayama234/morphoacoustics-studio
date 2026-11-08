/** CHR-1 S3: actual pinned Core M0/M1 physical smoke through Studio v0.
 * Unlike policy fixtures, every FEASIBLE WAV here is freshly computed.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { CORE_SHA } from './cc-a2-server.mjs';
import { quantizedRawPressureSha256, X2A_RAW_PRESSURE_SHA256 } from './raw-pressure-oracle.mjs';

const root = 'http://127.0.0.1:' + (process.env.MORPHO_CC_A2_PORT || '8766');
const pinned = body => ({
  kind: 'core_body_preset', preset_id: body, preset_revision: 1,
  producer_repo: 'ryonakayama234/morphoacoustics', core_commit: CORE_SHA,
  backend_id: 'cc-a2-axial-live/1', binding_state: 'SELECTED_UNRESOLVED',
});
async function post(uri, body) {
  const response = await fetch(root + uri, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
async function bytes(ref) {
  const r = await fetch(root + ref);
  assert.equal(r.status, 200, ref);
  return Buffer.from(await r.arrayBuffer());
}
const output = [];
for (const body of ['v3b-axial-M0', 'v3b-axial-M1']) {
  const created = await post('/characters', { name: 'S3 ' + body, active_body_ref: pinned(body) });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const { snapshot } = created.data;
  const versionResponse = await fetch(root + '/characters/' +
    snapshot.character_id + '/revisions/1');
  assert.equal(versionResponse.status, 200);
  const version = await versionResponse.json();
  const submission = {
    submission_id: randomUUID(), character_id: snapshot.character_id,
    character_revision: 1, character_snapshot_sha256: version.snapshot_sha256,
    body_preset_id: body, text: 'あい', seed: 0,
  };
  const mismatched = await post('/studio/v0/perform',
    { ...submission, submission_id: randomUUID(), body_preset_id:
      body === 'v3b-axial-M0' ? 'v3b-axial-M1' : 'v3b-axial-M0' });
  assert.equal(mismatched.status, 409);
  assert.equal(mismatched.data.code, 'BODY_MISMATCH');
  const unsupported = await post('/studio/v0/perform',
    { ...submission, submission_id: randomUUID(), text: 'ありがとう' });
  assert.equal(unsupported.status, 422);
  assert.equal(unsupported.data.code, 'UNSUPPORTED_FIXTURE');
  const direction = await post('/studio/v0/perform',
    { ...submission, submission_id: randomUUID(), direction: { note: 'shout' } });
  assert.equal(direction.status, 422);
  assert.equal(direction.data.code, 'UNSUPPORTED_DIRECTION');
  const performed = await post('/studio/v0/perform', submission);
  assert.equal(performed.status, 201, JSON.stringify(performed.data));
  const envelope = performed.data.envelope;
  assert.equal(envelope.record_schema, 'studio-v0-take-envelope/v0');
  assert.equal(envelope.character_id, snapshot.character_id);
  assert.equal(envelope.character_revision, 1);
  assert.equal(envelope.character_snapshot_sha256, version.snapshot_sha256);
  assert.equal(envelope.request_snapshot.embodiment.preset_id, body);
  assert.equal(envelope.request_snapshot.script.segments[0].text, 'あい');
  assert.equal(envelope.request_snapshot.seed, 0);
  assert.equal(envelope.performance_result_v1.realization_outcome, 'FEASIBLE');
  assert.equal(envelope.exact_body_ref.binding_state, 'VERIFIED_BOUND');
  assert.match(envelope.motion_ref.task_plan_sha256, /^[a-f0-9]{64}$/);
  assert.equal(envelope.source_profile_ref.id, 'lf_fixed');
  assert.equal(envelope.source_profile_ref.f0_hz, 100);
  assert.equal(envelope.source_profile_ref.read_only, true);
  assert.equal(envelope.source_samples_evidence, 'RECOMPUTED');
  assert.match(envelope.source_samples_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(envelope.source_samples_metadata.numpy_version, '2.4.6');
  assert.equal(envelope.actual_run_source_samples_sha256, null);
  assert.equal(envelope.full_verified_source_state, 'UNKNOWN');
  assert.equal(envelope.provenance_state, 'INCOMPLETE_PROVENANCE');
  const saved = await (await fetch(root + '/studio/v0/takes/' + envelope.take_id)).json();
  assert.equal(saved.envelope.take_id, envelope.take_id);
  assert.equal(saved.integrity_state, 'INCOMPLETE_PROVENANCE');
  assert.equal(saved.source_verification_state, 'UNKNOWN');
  assert.equal(saved.can_export, true);
  const archiveResponse = await fetch(root + '/cc-a2/takes/' + envelope.take_id);
  assert.equal(archiveResponse.status, 200);
  const archive = await archiveResponse.json();
  assert.equal(archive.state, 'INCOMPLETE_PROVENANCE');
  assert.equal(archive.issues.includes('AMBIGUOUS_TAKE_ID'), false);
  assert.equal(archive.v0_envelope.source_samples_evidence, 'RECOMPUTED');
  const zipResponse = await fetch(root + '/cc-a2/takes/' + envelope.take_id + '/archive');
  assert.equal(zipResponse.status, 200);
  const zip = Buffer.from(await zipResponse.arrayBuffer());
  assert.ok(zip.includes(Buffer.from('data/v0-take.json')));
  assert.ok(zip.includes(Buffer.from('data/character-revision.json')));
  assert.equal(zip.toString('hex', zip.length - 22, zip.length - 18), '504b0506');
  const artifacts = envelope.performance_result_v1.artifacts;
  assert.equal(artifacts.length, 4);
  const wav = await bytes(artifacts.find(a => a.kind === 'audio').ref);
  assert.equal(wav.length, 48044);
  const npy = await bytes(artifacts.find(a => a.kind === 'raw-pressure').ref);
  const receipt = JSON.parse((await bytes(artifacts.find(a =>
    a.kind === 'physical-receipt').ref)).toString('utf8'));
  assert.equal(quantizedRawPressureSha256(npy), receipt.raw_pressure.quantized_sha256);
  if (body === 'v3b-axial-M0')
    assert.equal(quantizedRawPressureSha256(npy), X2A_RAW_PRESSURE_SHA256);
  const replay = await post('/studio/v0/perform', submission);
  assert.equal(replay.status, 409);
  assert.equal(replay.data.code, 'REPLAY');
  output.push({ body, take_id: envelope.take_id, source_sha: envelope.source_samples_sha256,
    raw_pressure_sha: receipt.raw_pressure.quantized_sha256,
    task_plan_sha256: receipt.task_plan_sha256 });
}
assert.notEqual(output[0].raw_pressure_sha, output[1].raw_pressure_sha);
assert.equal(output[0].source_sha, output[1].source_sha);
await writeFile('v0-s3-smoke-summary.json', JSON.stringify({ core_commit: CORE_SHA, output }, null, 2));
console.log('CHR-1 S3 actual Core M0/M1, immutable snapshots, RQ1=B, replay and BagIt PASS');
