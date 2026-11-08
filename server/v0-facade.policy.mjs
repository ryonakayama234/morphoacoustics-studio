/** S3 isolation tests. Fake performCore is ONLY an injected policy fixture;
 * actual Core M0/M1 execution is separately checked by v0-smoke.mjs in Actions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createCharacterStore } from './character-store.mjs';
import { createTakeArchive } from './take-archive.mjs';
import { createV0Facade, buildV0CoreRequest, makeV0Envelope,
  assertV0Submission } from './v0-facade.mjs';

const CORE = 'b569f044bfda309dff1a00cccf8365754e6b1355';
const SHA = b => createHash('sha256').update(b).digest('hex');
const selected = body => ({ kind: 'core_body_preset', preset_id: body,
  preset_revision: 1, producer_repo: 'ryonakayama234/morphoacoustics',
  core_commit: CORE, backend_id: 'cc-a2-axial-live/1',
  binding_state: 'SELECTED_UNRESOLVED' });
const hashes = { source: 'sha256:' + 'a'.repeat(64), task: 'b'.repeat(64) };

async function setup(t, body = 'v3b-axial-M0', opts = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'chr-s3-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await mkdir(path.join(dataDir, 'takes'));
  await mkdir(path.join(dataDir, 'artifacts'));
  const characterStore = createCharacterStore({ dataDir });
  await characterStore.initialize();
  const created = await characterStore.create({ name: 'v0 Test', active_body_ref: selected(body) });
  const id = created.snapshot.character_id;
  const version = await characterStore.get(id, 1);
  let calls = 0, pinOk = true;
  async function fakeRun(request) {
    calls++;
    const feasible = !opts.refusal;
    const original = [], stored = [];
    const names = { audio: ['audio.wav', 'wav', 'audio/wav'],
      'raw-pressure': ['raw_pressure_pa.npy', 'npy', 'application/x-npy'],
      'dynamic-trace': ['physical_trace.csv', 'csv', 'text/csv'],
      'physical-receipt': ['physical_receipt.json', 'json', 'application/json'] };
    if (feasible) for (const [kind, [sourceName, ext, media]] of Object.entries(names)) {
      const receipt = { body: { preset_id: request.embodiment.preset_id,
        preparation_digest: 'sha256:' + 'c'.repeat(64) },
        source: { id: 'lf_fixed', f0_hz: 100 }, task_plan_sha256: hashes.task };
      const bytes = kind === 'physical-receipt'
        ? Buffer.from(JSON.stringify(receipt)) : Buffer.from('fake policy artifact ' + kind);
      const name = SHA(bytes) + '.' + ext;
      await writeFile(path.join(dataDir, 'artifacts', name), bytes, { flag: 'wx' }).catch(e => {
        if (e.code !== 'EEXIST') throw e;
      });
      original.push({ kind, ref: sourceName, media_type: media, segment_id: 's1' });
      stored.push({ kind, ref: '/cc-a2/artifacts/' + name, media_type: media, segment_id: 's1' });
    }
    const common = { schema_version: 'performance-contract/v1',
      request_id: request.request_id, take_id: 'take_' + request.request_id,
      job_status: 'SUCCEEDED', realization_outcome: feasible ? 'FEASIBLE' : 'UNSUPPORTED',
      diagnostics: [], embodiment: feasible ? { status: 'BOUND',
        preset_id: request.embodiment.preset_id, preset_revision: 1,
        preparation_digest: 'sha256:' + 'c'.repeat(64) } : { status: 'MISSING_PRESET' },
      provenance: { backend_version: 'cc-a2-axial-live/1',
        input_digest: 'sha256:' + 'd'.repeat(64) } };
    const record = { request, result: { ...common, artifacts: stored },
      frozen_core_result: { ...common, artifacts: original }, core_commit: CORE,
      created_at: '2026-11-08T13:00:00.000Z' };
    await writeFile(path.join(dataDir, 'takes', randomUUID() + '.json'),
      JSON.stringify(record, null, 2));
    return record;
  }
  const archive = createTakeArchive({ dataDir, coreSha: CORE });
  const facade = createV0Facade({ dataDir, characterStore,
    verifyPin: () => { if (!pinOk) throw Error('Core pin drift'); },
    performCore: fakeRun,
    recomputeSource: async () => ({ id: 'lf_fixed', sha256: hashes.source,
      dtype: '<f8', samples: 24000, numpy_version: '2.4.6' }), archive });
  await facade.initialize();
  return { dataDir, facade, id, version, characterStore, archive,
    get calls() { return calls; }, drift: () => { pinOk = false; } };
}
function input(x, patch = {}) {
  return { submission_id: randomUUID(), character_id: x.id,
    character_revision: x.version.snapshot.revision,
    character_snapshot_sha256: x.version.snapshot_sha256, ...patch };
}

test('fixed M0/M1 immutable snapshot produces a v1 request with only 3-task fixture/seed', async t => {
  for (const body of ['v3b-axial-M0', 'v3b-axial-M1']) {
    await t.test(body, async t => {
      const s = await setup(t, body);
      const req = buildV0CoreRequest(input(s), s.version);
      assert.equal(req.embodiment.preset_id, body);
      assert.equal(req.script.segments[0].text, 'あい');
      assert.deepEqual(req.direction.controls, {});
      assert.deepEqual(req.direction.segment_overrides, []);
      assert.equal(req.seed, 0);
      assert.equal(req.character.character_id, s.id);
      const post = await s.facade.submit(input(s));
      const e = post.envelope;
      assert.equal(e.character_snapshot_sha256, s.version.snapshot_sha256);
      assert.equal(e.source_samples_evidence, 'RECOMPUTED');
      assert.equal(e.full_verified_source_state, 'UNKNOWN');
      assert.equal(e.provenance_state, 'INCOMPLETE_PROVENANCE');
      assert.equal(e.motion_ref.task_plan_sha256, hashes.task);
      assert.equal(e.exact_body_ref.binding_state, 'VERIFIED_BOUND');
      assert.equal(s.calls, 1);
      const looked = await s.facade.lookup(e.take_id);
      assert.equal(looked.integrity_state, 'INCOMPLETE_PROVENANCE');
      assert.equal(looked.source_verification_state, 'UNKNOWN');
      assert.equal(looked.envelope.character_revision, 1);
      const archive = await s.archive.lookup(e.take_id);
      assert.ok(archive.v0_envelope);
      assert.equal(archive.v0_envelope.source_samples_evidence, 'RECOMPUTED');
      assert.equal(archive.can_export, true);
    });
  }
});
test('body mismatch and corrupted Character revision/hash fail before Core/WAV', async t => {
  const s = await setup(t);
  await assert.rejects(s.facade.submit(input(s, { body_preset_id: 'v3b-axial-M1' })),
    e => e.code === 'BODY_MISMATCH');
  await assert.rejects(s.facade.submit(input(s, { character_snapshot_sha256: hashes.source })),
    e => e.code === 'SNAPSHOT_MISMATCH');
  await s.characterStore.update(s.id, 1, { name: 'Revision 2' });
  await assert.rejects(s.facade.submit(input(s)), e => e.code === 'SNAPSHOT_MISMATCH');
  assert.equal(s.calls, 0);
});
test('unsupported script/Direction/seed/source cannot become Core controls', async t => {
  const s = await setup(t);
  for (const patch of [{ text: 'こんにちは' }, { direction: { energy: 0.7 } },
    { seed: 1 }, { source: { id: 'attacker' } }, { body_preset_id: 'phantom' }]) {
    await assert.rejects(s.facade.submit(input(s, patch)));
  }
  assert.equal(s.calls, 0);
  assert.throws(() => assertV0Submission({ character_id: s.id }), /Invalid/);
});
test('durable replay claim refuses duplicate even after facade recreation', async t => {
  const s = await setup(t), submission = input(s);
  const first = await s.facade.submit(submission);
  await assert.rejects(s.facade.submit(submission), e => e.code === 'REPLAY');
  assert.equal(s.calls, 1);
  assert.equal((await s.facade.lookup(first.envelope.take_id)).envelope.take_id,
    first.envelope.take_id);
});
test('Core pin drift refuses before physical execution and never emits an audio Take', async t => {
  const s = await setup(t), candidate = input(s);
  s.drift();
  await assert.rejects(s.facade.submit(candidate), /Core pin drift/);
  assert.equal(s.calls, 0);
});
test('Core refusal stores an honest no-WAV envelope with UNKNOWN source', async t => {
  const s = await setup(t, 'v3b-axial-M0', { refusal: true });
  const x = await s.facade.submit(input(s));
  assert.equal(x.envelope.realization_outcome, 'UNSUPPORTED');
  assert.equal(x.envelope.performance_result_v1.artifacts.length, 0);
  assert.equal(x.envelope.exact_body_ref.binding_state, 'SELECTED_UNRESOLVED');
  assert.equal(x.envelope.source_samples_sha256, null);
  assert.equal(x.envelope.source_samples_evidence, 'UNKNOWN');
  const found = await s.facade.lookup(x.envelope.take_id);
  assert.equal(found.integrity_state, 'REFUSAL_NO_AUDIO');
  assert.equal(found.envelope.artifact_refs.length, 0);
});
