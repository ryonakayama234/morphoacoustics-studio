import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createCharacterStore, CharacterStoreError } from './character-store.mjs';

const BODY = (preset_id = 'v3b-axial-M0') => ({
  kind: 'core_body_preset', preset_id, preset_revision: 1,
  producer_repo: 'ryonakayama234/morphoacoustics',
  core_commit: 'b569f044bfda309dff1a00cccf8365754e6b1355',
  backend_id: 'cc-a2-axial-live/1', binding_state: 'SELECTED_UNRESOLVED',
});
const hash = (x) => 'sha256:' + createHash('sha256').update(x).digest('hex');
async function fixture(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'studio-character-policy-'));
  try { return await fn(createCharacterStore({ dataDir: dir }), dir); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
}
const isCode = (code, status) => (e) => e instanceof CharacterStoreError && e.code === code && e.status === status;
const charInput = () => ({ name: 'ミオ', description: 'draft', default_controls: { energy: 0.35, pace: 0.9 },
  active_body_ref: BODY(), metadata: { tags: ['draft'] } });

test('UUID identity remains stable across rename and body switch; immutable sequential full snapshots', async () => fixture(async (store, dir) => {
  await store.initialize();
  const first = await store.create(charInput());
  const id = first.snapshot.character_id;
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(first.head.current_revision, 1);
  assert.equal(first.head.record_schema, 'studio-character-store/v0');
  const second = await store.update(id, 1, { name: 'Mio' });
  const third = await store.update(id, 2, { active_body_ref: BODY('v3b-axial-M1') });
  assert.equal(second.snapshot.character_id, id);
  assert.equal(third.snapshot.character_id, id);
  assert.equal(third.snapshot.revision, 3);
  assert.equal(third.snapshot.active_body_ref.binding_state, 'SELECTED_UNRESOLVED');
  assert.equal(third.snapshot.active_body_ref.preset_id, 'v3b-axial-M1');
  assert.equal((await store.get(id, 1)).snapshot.name, 'ミオ');
  assert.equal((await store.get(id, 2)).snapshot.name, 'Mio');
  assert.equal((await store.get(id, 2)).snapshot.active_body_ref.preset_id, 'v3b-axial-M0');
  assert.equal((await store.list()).length, 1);
  const revisionDir = path.join(dir, 'characters', id, 'revisions');
  assert.deepEqual(await fs.readdir(revisionDir), ['000001.json','000002.json','000003.json']);
  assert.equal(first.head.snapshot_sha256, hash(await fs.readFile(path.join(revisionDir, '000001.json'))));
  await assert.rejects(fs.link(path.join(revisionDir, '000001.json'), path.join(revisionDir, '000003.json')), { code: 'EEXIST' });
}));

test('expected revision CAS returns 409 and simultaneous writers never lose a revision', async () => fixture(async (store) => {
  const { snapshot } = await store.create(charInput());
  const id = snapshot.character_id;
  const results = await Promise.allSettled([
    store.update(id, 1, { name: 'A' }),
    store.update(id, 1, { name: 'B' }),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected' && isCode('CONFLICT', 409)(r.reason)).length, 1);
  assert.equal((await store.get(id)).head.current_revision, 2);
  await assert.rejects(store.update(id, 1, { name: 'stale' }), isCode('CONFLICT', 409));
}));

test('process restart validates persisted digests and allows further CAS', async () => fixture(async (store, dir) => {
  const before = await store.create(charInput());
  const afterRestart = createCharacterStore({ dataDir: dir });
  await afterRestart.initialize();
  assert.deepEqual(await afterRestart.get(before.snapshot.character_id), before);
  assert.equal((await afterRestart.update(before.snapshot.character_id, 1, { name: 'restart' })).head.current_revision, 2);
}));

test('corrupt revision, missing snapshot, missing head and head mismatch fail closed', async () => {
  for (const damage of ['corrupt', 'missing-revision', 'missing-head', 'head-mismatch', 'orphan']) {
    await fixture(async (store, dir) => {
      const first = await store.create(charInput());
      const id = first.snapshot.character_id;
      const characterDir = path.join(dir, 'characters', id);
      const snapshotPath = path.join(characterDir, 'revisions', '000001.json');
      if (damage === 'corrupt') await fs.writeFile(snapshotPath, '{bad');
      if (damage === 'missing-revision') await fs.rm(snapshotPath);
      if (damage === 'missing-head') await fs.rm(path.join(characterDir, 'head.json'));
      if (damage === 'head-mismatch') {
        const head = { ...first.head, snapshot_sha256: 'sha256:' + 'f'.repeat(64) };
        await fs.writeFile(path.join(characterDir, 'head.json'), JSON.stringify(head));
      }
      if (damage === 'orphan') await fs.copyFile(snapshotPath, path.join(characterDir, 'revisions', '000002.json'));
      const restarted = createCharacterStore({ dataDir: dir });
      await assert.rejects(restarted.initialize(), isCode('CORRUPT', 500), damage);
    });
  }
});

test('interrupted post-snapshot transaction rolls head forward only with matching pending digest', async () => fixture(async (store, dir) => {
  const first = await store.create(charInput());
  const id = first.snapshot.character_id;
  const folder = path.join(dir, 'characters', id);
  const next = { ...first.snapshot, revision: 2, name: 'Recovered',
    previous_snapshot_sha256: first.head.snapshot_sha256, updated_at: new Date().toISOString() };
  const bytes = Buffer.from(JSON.stringify(next, null, 2) + '\n');
  await fs.writeFile(path.join(folder, 'pending.json'), JSON.stringify({ record_schema: 'studio-character-store/v0',
    character_id: id, expected_revision: 1, new_revision: 2, snapshot_sha256: hash(bytes) }));
  await fs.writeFile(path.join(folder, 'revisions', '000002.json'), bytes, { flag: 'wx' });
  const recovered = createCharacterStore({ dataDir: dir });
  await recovered.initialize();
  assert.equal((await recovered.get(id)).head.current_revision, 2);
  assert.equal((await recovered.get(id)).snapshot.name, 'Recovered');
  await assert.rejects(fs.access(path.join(folder, 'pending.json')), { code: 'ENOENT' });
}));

test('interrupted pre-snapshot update rolls back pending, without changing committed head', async () => fixture(async (store, dir) => {
  const first = await store.create(charInput());
  const id = first.snapshot.character_id;
  const folder = path.join(dir, 'characters', id);
  await fs.writeFile(path.join(folder, 'pending.json'), JSON.stringify({ record_schema: 'studio-character-store/v0',
    character_id: id, expected_revision: 1, new_revision: 2, snapshot_sha256: 'sha256:' + 'e'.repeat(64) }));
  const recovered = createCharacterStore({ dataDir: dir });
  await recovered.initialize();
  assert.equal((await recovered.get(id)).head.current_revision, 1);
  assert.equal((await recovered.update(id, 1, { name: 'repaired' })).snapshot.revision, 2);
}));

test('reject duplicate/identity injection and legacy char_mio auto-migration', async () => fixture(async (store) => {
  const first = await store.create(charInput());
  await assert.rejects(store.create({ ...charInput(), character_id: first.snapshot.character_id }), isCode('INVALID', 400));
  await assert.rejects(store.create({ ...charInput(), character_id: 'char_mio' }), isCode('INVALID', 400));
  await assert.rejects(store.create({ ...charInput(), name: '../' , defaults: {} }), isCode('INVALID', 400));
  assert.equal((await store.list()).length, 1);
}));

test('reject spoofed verified bind, wrong Core ref, unsafe paths and oversized fields', async () => fixture(async (store) => {
  const first = await store.create(charInput());
  const id = first.snapshot.character_id;
  await assert.rejects(store.update(id, 1, { active_body_ref: { ...BODY(), binding_state: 'VERIFIED_BOUND',
    preparation_digest: 'sha256:' + 'a'.repeat(64), body_receipt_ref: '/cc-a2/artifacts/fake.json' } }), isCode('INVALID', 400));
  await assert.rejects(store.update(id, 1, { active_body_ref: { ...BODY(), preset_id: 'unreviewed' } }), isCode('INVALID', 400));
  await assert.rejects(store.update(id, 1, { active_motion_ref: { id: '../escape', revision: 1 } }), isCode('INVALID', 400));
  await assert.rejects(store.update(id, 1, { description: 'x'.repeat(65537) }), isCode('INVALID', 400));
  await assert.rejects(store.get('../etc/passwd'), isCode('INVALID', 400));
  await assert.rejects(store.bindVerified(id, 1, { request: {}, result: {}, receipt: {}, rawBytes: null, bodyReceiptRef: 'a' }), isCode('INVALID', 400));
  assert.equal((await store.get(id)).snapshot.revision, 1);
}));

test('symlinked snapshots and unrecognized character directory entries fail closed', async () => fixture(async (store, dir) => {
  const first = await store.create(charInput());
  const revPath = path.join(dir, 'characters', first.snapshot.character_id, 'revisions', '000001.json');
  await fs.rename(revPath, revPath + '.bak');
  await fs.symlink(revPath + '.bak', revPath);
  await assert.rejects(createCharacterStore({ dataDir: dir }).initialize(), isCode('CORRUPT', 500));
}));


test('independent Node process reloads and CAS-updates the same character', async () => fixture(async (store, dir) => {
  const { snapshot } = await store.create(charInput());
  const { execFileSync } = await import('node:child_process');
  const code = `import { createCharacterStore } from ${JSON.stringify(new URL('./character-store.mjs', import.meta.url).href)};
    const s=createCharacterStore({dataDir:process.argv[1]});
    const before=await s.get(process.argv[2]);
    if(before.head.current_revision!==1)throw Error('missing persisted head');
    const after=await s.update(process.argv[2],1,{name:'child-process'});
    console.log(after.head.current_revision);`.replace('DYNAMIC_IMPORT', JSON.stringify(new URL('./character-store.mjs', import.meta.url).href));
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', code, dir, snapshot.character_id], { encoding: 'utf8' });
  assert.equal(stdout.trim(), '2');
  assert.equal((await store.get(snapshot.character_id)).snapshot.name, 'child-process');
}));

test('abandoned pre-directory and pre-head creates recover only noncommitted work', async () => fixture(async (store, dir) => {
  await store.initialize();
  const { randomUUID } = await import('node:crypto');
  const orphanId = randomUUID();
  const orphanPath = path.join(dir, 'characters', orphanId);
  await fs.mkdir(orphanPath);
  const committed = await store.create(charInput());
  const id = committed.snapshot.character_id;
  const folder = path.join(dir, 'characters', id);
  await fs.rm(path.join(folder, 'head.json'));
  await fs.writeFile(path.join(folder, 'pending.json'), JSON.stringify({ record_schema: 'studio-character-store/v0',
    character_id: id, expected_revision: 0, new_revision: 1,
    snapshot_sha256: committed.head.snapshot_sha256 }));
  const restarted = createCharacterStore({ dataDir: dir });
  await restarted.initialize();
  await assert.rejects(fs.access(orphanPath), { code: 'ENOENT' });
  assert.equal((await restarted.get(id)).head.current_revision, 1);
  assert.equal((await restarted.list()).length, 1);
}));
