/** Independent CHR-1 S2 acceptance suite: no Core, no audio regeneration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { createTakeArchive, assertTakeId, INTEGRITY } from './take-archive.mjs';

const CORE = 'b569f044bfda309dff1a00cccf8365754e6b1355';
const hash = b => createHash('sha256').update(b).digest('hex');
const fixtures = Object.freeze({ audio: ['wav','audio.wav','audio/wav'],
  'raw-pressure': ['npy','raw_pressure_pa.npy','application/x-npy'],
  'dynamic-trace': ['csv','physical_trace.csv','text/csv'],
  'physical-receipt': ['json','physical_receipt.json','application/json'] });

async function sandbox(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'chr-s2-policy-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = path.join(dir, 'source');
  await mkdir(path.join(root, 'takes'), { recursive: true });
  await mkdir(path.join(root, 'artifacts'));
  return { dir, root, archive: createTakeArchive({ dataDir: root, coreSha: CORE }) };
}
async function putTake(root, suffix = randomUUID(), options = {}) {
  const id = options.id || `take_${suffix}`;
  const core = options.core || CORE;
  const outcome = options.refusal ? 'UNSUPPORTED' : 'FEASIBLE';
  const refs = [], original = [];
  if (!options.refusal) {
    for (const [kind, [ext, sourceName, media]] of Object.entries(fixtures)) {
      const bytes = Buffer.from(`chr1 ${kind}: ${suffix} verified original bytes\n`);
      const digest = hash(bytes);
      const filename = `${digest}.${ext}`;
      await writeFile(path.join(root, 'artifacts', filename), bytes, { flag: 'wx' }).catch(e => {
        if (e.code !== 'EEXIST') throw e;
      });
      refs.push({ kind, ref: '/cc-a2/artifacts/' + filename, media_type: media, segment_id: 's1' });
      original.push({ kind, ref: sourceName, media_type: media, segment_id: 's1' });
    }
  }
  const request = { request_id: suffix, seed: 0, embodiment: { preset_id: 'v3b-axial-M0', preset_revision: 1 } };
  const common = { schema_version: 'performance-contract/v1', take_id: id, request_id: suffix,
    job_status: 'SUCCEEDED', realization_outcome: outcome,
    provenance: { backend_version: 'cc-a2-axial-live/1', input_digest: 'sha256:' + 'a'.repeat(64) } };
  const record = { request, result: { ...common, artifacts: refs },
    frozen_core_result: { ...common, artifacts: original },
    core_commit: core, created_at: '2026-11-08T05:00:00.000Z' };
  const rel = path.join('takes', randomUUID() + '.json');
  await writeFile(path.join(root, rel), JSON.stringify(record, null, 2), { flag: 'wx' });
  return { id, record, refs, rel };
}
async function exportFile(archive, id, dest) {
  return archive.exportZip(id, createWriteStream(dest, { flags: 'wx' }));
}
function parseZip(bytes) {
  const eocd = bytes.lastIndexOf(Buffer.from('504b0506', 'hex'));
  assert.ok(eocd > 0 && eocd + 22 === bytes.length, 'ZIP must end with complete EOCD');
  const n = bytes.readUInt16LE(eocd + 10);
  const cdSize = bytes.readUInt32LE(eocd + 12), cdOffset = bytes.readUInt32LE(eocd + 16);
  assert.equal(cdOffset + cdSize, eocd, 'central directory fully delimited');
  const result = new Map(); let p = cdOffset;
  for (let i = 0; i < n; i++) {
    assert.equal(bytes.readUInt32LE(p), 0x02014b50);
    assert.equal(bytes.readUInt16LE(p+10), 0, 'must use STORE');
    const crc = bytes.readUInt32LE(p+16), length = bytes.readUInt32LE(p+24);
    const nameLen = bytes.readUInt16LE(p+28), extra = bytes.readUInt16LE(p+30);
    const comment = bytes.readUInt16LE(p+32), off = bytes.readUInt32LE(p+42);
    const name = bytes.toString('utf8', p+46, p+46+nameLen);
    assert.match(name, /^(?:data\/(?:artifacts\/)?[A-Za-z0-9_.-]+|(?:bagit|bag-info|manifest-sha256|tagmanifest-sha256)\.txt)$/);
    assert.ok(!name.includes('..') && !name.startsWith('/'));
    assert.ok((bytes.readUInt32LE(p+38) >>> 16 & 0xf000) !== 0xa000, 'no symlinks');
    assert.ok(!result.has(name), 'no duplicate ZIP names');
    assert.equal(bytes.readUInt32LE(off), 0x04034b50);
    assert.equal(bytes.readUInt16LE(off+8), 0);
    const localNameLen = bytes.readUInt16LE(off+26);
    assert.equal(bytes.toString('utf8', off+30, off+30+localNameLen), name);
    const data = bytes.subarray(off+30+localNameLen+bytes.readUInt16LE(off+28),
      off+30+localNameLen+bytes.readUInt16LE(off+28)+length);
    assert.equal(data.length, length);
    assert.equal(crc32Independent(data), crc, `ZIP CRC mismatch: ${name}`);
    result.set(name, data);
    p += 46+nameLen+extra+comment;
  }
  assert.equal(p, eocd);
  return result;
}
function crc32Independent(bytes) {
  let c = ~0;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (~c) >>> 0;
}
function validateBag(bytes, options = {}) {
  const zip = parseZip(bytes);
  assert.equal(zip.get('bagit.txt')?.toString('utf8'),
    'BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n');
  const lines = text => text.trim().split('\n').filter(Boolean).map(line => {
    const hit = /^([0-9a-f]{64})  ([A-Za-z0-9_./-]+)$/.exec(line);
    assert.ok(hit, `invalid manifest line ${line}`);
    return [hit[2], hit[1]];
  });
  const payload = new Map(lines(zip.get('manifest-sha256.txt').toString('utf8')));
  assert.deepEqual([...payload.keys()].sort(), [...zip.keys()].filter(k => k.startsWith('data/')).sort(),
    'BagIt 1.0 payload manifest must enumerate exactly all payload files');
  for (const [name, digest] of payload) assert.equal(hash(zip.get(name)), digest);
  const tag = new Map(lines(zip.get('tagmanifest-sha256.txt').toString('utf8')));
  assert.deepEqual([...tag.keys()].sort(), [...zip.keys()].filter(k => !k.startsWith('data/') &&
    k !== 'tagmanifest-sha256.txt').sort());
  for (const [name, digest] of tag) assert.equal(hash(zip.get(name)), digest);
  const sum = [...payload.keys()].reduce((a, k) => a + zip.get(k).length, 0);
  assert.ok(zip.get('bag-info.txt').toString('utf8').includes(`Payload-Oxum: ${sum}.${payload.size}\n`));
  const map = JSON.parse(zip.get('data/portable-ref-map.json').toString('utf8'));
  for (const entry of map.artifacts) {
    assert.equal(hash(zip.get(entry.zip_path)), entry.sha256);
    assert.equal(zip.get(entry.zip_path)?.length, entry.size_bytes);
  }
  assert.equal(map.artifacts.length, options.refusal ? 0 : 4);
  assert.equal(JSON.parse(zip.get('data/archive-evidence.json')).refusal_only, !!options.refusal);
  return zip;
}

test('Complete BagIt 1.0 ZIP → owner external copy → independent revalidation; originals unchanged', async t => {
  const { dir, root, archive } = await sandbox(t);
  const { id, refs, rel } = await putTake(root, 'happy');
  const before = await readFile(path.join(root, rel));
  const original = await Promise.all(refs.map(x => readFile(path.join(root, 'artifacts', x.ref.split('/').pop()))));
  const info = await archive.lookup(id);
  assert.equal(info.state, INTEGRITY.INCOMPLETE_PROVENANCE); // actual-run source SHA absent
  assert.deepEqual(info.issues.includes('UNVERIFIED_SOURCE_SAMPLES'), true);
  assert.equal(info.can_export, true);
  const zip = path.join(dir, `${id}.bag.zip`);
  const outcome = await exportFile(archive, id, zip);
  const bytes = await readFile(zip);
  assert.equal(outcome.zip_sha256, hash(bytes));
  const bag = validateBag(bytes);
  assert.deepEqual(bag.get('data/take.json'), before, 'original record bytes are preserved');
  const backupDir = path.join(dir, 'MorphoacousticsBackup');
  await mkdir(backupDir);
  const copy = path.join(backupDir, path.basename(zip));
  await copyFile(zip, copy, 1);
  assert.equal(hash(await readFile(copy)), outcome.zip_sha256);
  validateBag(await readFile(copy));
  assert.deepEqual(await readFile(path.join(root, rel)), before);
  for (let i = 0; i < refs.length; i++) assert.deepEqual(await readFile(
    path.join(root, 'artifacts', refs[i].ref.split('/').pop())), original[i]);
});

test('missing artifact is retained in lookup and blocked from export', async t => {
  const { root, archive } = await sandbox(t);
  const item = await putTake(root, 'missing');
  await rm(path.join(root, 'artifacts', item.refs[0].ref.split('/').pop()));
  const info = await archive.lookup(item.id);
  assert.equal(info.state, INTEGRITY.MISSING_ARTIFACT);
  assert.equal(info.artifacts.find(x => x.kind === 'audio').status, 'MISSING');
  await assert.rejects(() => exportFile(archive, item.id, path.join(root, 'not-created.zip')), /cannot be exported/);
});

test('tamper (including size-preserving) and symlink artifact are CORRUPT and refused', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'tamper');
  const filename = path.join(root, 'artifacts', a.refs[0].ref.split('/').pop());
  const prior = await readFile(filename);
  await writeFile(filename, Buffer.from(prior).fill(0x58, 4, 7));
  assert.equal((await archive.lookup(a.id)).state, INTEGRITY.CORRUPT_ARTIFACT);
  await rm(filename);
  await symlink(path.join(root, 'takes', a.rel.split('/').pop()), filename);
  assert.equal((await archive.lookup(a.id)).state, INTEGRITY.CORRUPT_ARTIFACT);
});

test('TakeID and stored reference traversal, percent encoding, path injection fail closed', async t => {
  const { root, archive } = await sandbox(t);
  for (const bad of ['../../etc/passwd', 'take_../x', 'take_%2e%2e', 'take_abc/def',
    'take_abc\\def', 'take_abc\n', 'TAKE_good']) assert.throws(() => assertTakeId(bad));
  const a = await putTake(root, 'escape');
  a.record.result.artifacts[0].ref = '/cc-a2/artifacts/../../outside.wav';
  await writeFile(path.join(root, a.rel), JSON.stringify(a.record));
  const got = await archive.lookup(a.id);
  assert.equal(got.state, INTEGRITY.CORRUPT_ARTIFACT);
  assert.equal(got.can_export, false);
});

test('duplicate logical TakeID/retry cannot silently select a newer replacement', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'repeat');
  await putTake(root, 'repeat', { id: a.id });
  const info = await archive.lookup(a.id);
  assert.equal(info.state, INTEGRITY.CORRUPT_ARTIFACT);
  assert.equal(info.can_export, false);
  assert.deepEqual(info.issues, ['AMBIGUOUS_TAKE_ID']);
});

test('restart sees identical Take and SHA; failed interrupted export is not a complete ZIP', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'restart');
  const before = await archive.lookup(a.id);
  const restarted = createTakeArchive({ dataDir: root, coreSha: CORE });
  const after = await restarted.lookup(a.id);
  assert.equal(after.record_sha256, before.record_sha256);
  let chunks = [], sent = 0;
  const aborting = new Writable({ write(chunk, enc, cb) {
    chunks.push(Buffer.from(chunk)); sent += chunk.length;
    if (sent > 250) cb(new Error('client disconnected')); else cb();
  } });
  await assert.rejects(restarted.exportZip(a.id, aborting), /client disconnected/);
  assert.throws(() => validateBag(Buffer.concat(chunks)), /complete EOCD/);
  const zip = path.join(path.dirname(root), 'restart.bag.zip');
  await exportFile(restarted, a.id, zip);
  validateBag(await readFile(zip));
});

test('export detects source mutation after validation; cannot end with a valid central directory', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'switch');
  const target = path.join(root, 'artifacts', a.refs[0].ref.split('/').pop());
  let changed = false, chunks = [];
  const stream = new Writable({ write(chunk, enc, cb) {
    chunks.push(Buffer.from(chunk));
    if (!changed && chunks.length > 12) {
      changed = true;
      writeFile(target, 'SWAPPED AFTER PREHASH').then(() => cb(), cb);
    } else cb();
  } });
  await assert.rejects(archive.exportZip(a.id, stream), /changed|mismatch|Truncated/i);
  assert.throws(() => parseZip(Buffer.concat(chunks)), /complete EOCD/);
});

test('all inventory (>100 records) is scanned, including earliest Take', async t => {
  const { root, archive } = await sandbox(t);
  const oldest = await putTake(root, 'oldest');
  for (let n = 0; n < 125; n++) await putTake(root, `new_${n}`);
  const info = await archive.lookup(oldest.id);
  assert.equal(info.take_id, oldest.id);
  assert.equal(info.can_export, true);
});

test('old Core pin stays UNVERIFIED_LEGACY and read-only; no relabel or regeneration', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'legacy', { core: 'e'.repeat(40) });
  const before = await readFile(path.join(root, a.rel));
  const info = await archive.lookup(a.id);
  assert.equal(info.state, INTEGRITY.UNVERIFIED_LEGACY);
  assert.equal(info.read_only, true);
  assert.equal(info.can_export, false);
  assert.equal(info.core_commit, 'e'.repeat(40));
  await assert.rejects(() => exportFile(archive, a.id, path.join(root, 'no.zip')), /cannot be exported/);
  assert.deepEqual(await readFile(path.join(root, a.rel)), before);
});

test('Core refusal is explicitly refusal-only; no synthesized audio', async t => {
  const { dir, root, archive } = await sandbox(t);
  const a = await putTake(root, 'refused', { refusal: true });
  const summary = await archive.lookup(a.id);
  assert.equal(summary.state, INTEGRITY.REFUSAL_NO_AUDIO);
  assert.equal(summary.refusal_only, true);
  const zip = path.join(dir, 'refusal.bag.zip');
  await exportFile(archive, a.id, zip);
  const files = validateBag(await readFile(zip), { refusal: true });
  assert.ok(![...files.keys()].some(name => name.startsWith('data/artifacts/')));
});


test('record symlinks and oversized artifacts are never read as valid source files', async t => {
  const { root, archive } = await sandbox(t);
  const a = await putTake(root, 'unsafe_record');
  const original = await readFile(path.join(root, a.rel));
  await rm(path.join(root, a.rel));
  await symlink(path.join(root, 'artifacts', a.refs[0].ref.split('/').pop()), path.join(root, a.rel));
  await assert.rejects(() => archive.lookup(a.id), e => e.code === 'TAKE_NOT_FOUND');
  await rm(path.join(root, a.rel));
  await writeFile(path.join(root, a.rel), original);
  const target = path.join(root, 'artifacts', a.refs[0].ref.split('/').pop());
  await writeFile(target, Buffer.alloc(2_000_001));
  const info = await archive.lookup(a.id);
  assert.equal(info.state, INTEGRITY.CORRUPT_ARTIFACT);
  assert.equal(info.can_export, false);
});

test('actual process SIGKILL leaves only an invalid partial ZIP; restart can retry', async t => {
  const { dir, root, archive } = await sandbox(t);
  const a = await putTake(root, 'crash');
  const part = path.join(dir, 'interrupted.part');
  const moduleUrl = new URL('./take-archive.mjs', import.meta.url).href;
  const code = `import { createTakeArchive } from ${JSON.stringify(moduleUrl)};
    import { openSync, writeSync } from 'node:fs';
    import { Writable } from 'node:stream';
    const fd = openSync(process.env.OUT, 'wx');
    const sink = new Writable({write(chunk, enc, cb) {
      writeSync(fd, chunk); process.kill(process.pid, 'SIGKILL'); cb();
    }});
    await createTakeArchive({dataDir: process.env.ROOT,coreSha:process.env.CORE})
      .exportZip(process.env.TAKE, sink);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code],
    { env: { ...process.env, OUT: part, ROOT: root, CORE, TAKE: a.id } });
  const [codeExit, signal] = await new Promise((resolve, reject) => {
    child.on('error', reject); child.on('exit', (code, sig) => resolve([code, sig]));
  });
  assert.equal(signal, 'SIGKILL');
  assert.equal(codeExit, null);
  assert.throws(() => parseZip(readFileSync(part)), /complete EOCD/);
  const fresh = path.join(dir, 'recovered.bag.zip');
  await exportFile(createTakeArchive({dataDir: root, coreSha: CORE}), a.id, fresh);
  validateBag(await readFile(fresh));
});
