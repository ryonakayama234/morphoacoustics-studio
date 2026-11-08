/** CHR-1 S1: creative Character snapshots; never a physical Take or Core BodyRevision store. */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHARACTER_SCHEMA = 'studio-character-store/v0';
const CORE_COMMIT = 'b569f044bfda309dff1a00cccf8365754e6b1355';
const PRODUCER = 'ryonakayama234/morphoacoustics';
const BACKEND = 'cc-a2-axial-live/1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^sha256:[a-f0-9]{64}$/;
const REVISION = /^[0-9]{6}\.json$/;
const MAX_REVISION = 999999;
const MAX_BYTES = 65536;
const DEFAULT_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.morpho-cc-a2-data');
const gates = new Map();

export class CharacterStoreError extends Error {
  constructor(code, message, status = 400) {
    super(message); this.name = 'CharacterStoreError'; this.code = code; this.status = status;
  }
}
const invalid = (message) => new CharacterStoreError('INVALID', message);
const corrupt = (message) => new CharacterStoreError('CORRUPT', message, 500);
const conflict = (message) => new CharacterStoreError('CONFLICT', message, 409);
const notFound = () => new CharacterStoreError('NOT_FOUND', 'Character not found', 404);
const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const serial = (n) => String(n).padStart(6, '0') + '.json';
const plain = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
const exact = (value, keys, required = []) => {
  if (!plain(value)) throw invalid('Expected an object');
  for (const k of Object.keys(value)) if (!keys.includes(k)) throw invalid('Unsupported field: ' + k);
  for (const k of required) if (!Object.hasOwn(value, k)) throw invalid('Missing field: ' + k);
};
const shortString = (v, max, field, allowEmpty = false) => {
  if (typeof v !== 'string' || v.length > max || (!allowEmpty && !v.trim()) || v.includes('\0'))
    throw invalid('Invalid ' + field);
  return v;
};
const revisionNumber = (v) => Number.isSafeInteger(v) && v >= 1 && v <= MAX_REVISION;
const idCheck = (id) => { if (typeof id !== 'string' || !UUID.test(id)) throw invalid('Invalid character_id'); return id.toLowerCase(); };
const requireDigest = (x) => { if (typeof x !== 'string' || !HEX.test(x)) throw invalid('Invalid digest'); };
function bodyRef(ref, allowVerified = false) {
  if (ref === null) return null;
  const fields = ['kind', 'preset_id', 'preset_revision', 'producer_repo', 'core_commit', 'backend_id', 'binding_state'];
  const bound = ['preparation_digest', 'body_receipt_ref'];
  exact(ref, allowVerified ? [...fields, ...bound] : fields, fields);
  if (ref.kind !== 'core_body_preset' || !['v3b-axial-M0', 'v3b-axial-M1'].includes(ref.preset_id)
      || ref.preset_revision !== 1 || ref.producer_repo !== PRODUCER
      || ref.core_commit !== CORE_COMMIT || ref.backend_id !== BACKEND) throw invalid('Unrecognized Core BodyPreset identity');
  if (ref.binding_state === 'SELECTED_UNRESOLVED') {
    if (bound.some((k) => Object.hasOwn(ref, k))) throw invalid('Unresolved ref cannot carry binding evidence');
  } else if (ref.binding_state === 'VERIFIED_BOUND' && allowVerified) {
    for (const k of bound) if (!Object.hasOwn(ref, k)) throw invalid('Missing bound evidence');
    requireDigest(ref.preparation_digest);
    shortString(ref.body_receipt_ref, 512, 'body_receipt_ref');
  } else throw invalid('Unverified body binding claim');
  return structuredClone(ref);
}
function controls(value) {
  exact(value, ['energy', 'pace'], ['energy', 'pace']);
  if (typeof value.energy !== 'number' || !Number.isFinite(value.energy) || value.energy < 0 || value.energy > 1
      || typeof value.pace !== 'number' || !Number.isFinite(value.pace) || value.pace <= 0 || value.pace > 4)
    throw invalid('Invalid creative default controls');
  return structuredClone(value);
}
function optionalRef(value, label) {
  if (value === null) return null;
  exact(value, ['id', 'revision', 'digest'], ['id', 'revision']);
  shortString(value.id, 160, label);
  if (value.id.includes('..') || /[\\/]/.test(value.id)) throw invalid('Unsafe ref identifier');
  if (!revisionNumber(value.revision)) throw invalid('Invalid ' + label + ' revision');
  if (value.digest !== undefined) requireDigest(value.digest);
  return structuredClone(value);
}
function metadata(value) {
  exact(value, ['notes', 'tags']);
  if (value.notes !== undefined) shortString(value.notes, 4000, 'notes', true);
  if (value.tags !== undefined && (!Array.isArray(value.tags) || value.tags.length > 32
      || value.tags.some((tag) => typeof tag !== 'string' || !tag || tag.length > 60))) throw invalid('Invalid tags');
  return structuredClone(value);
}
const PATCH_FIELDS = ['name', 'description', 'default_controls', 'active_body_ref',
  'active_motion_ref', 'source_profile_ref', 'capability_scope', 'metadata'];
function changes(raw, allowVerified = false) {
  exact(raw, PATCH_FIELDS);
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'name') out.name = shortString(value, 200, 'name');
    else if (key === 'description') out.description = shortString(value, 4000, 'description', true);
    else if (key === 'default_controls') out.default_controls = controls(value);
    else if (key === 'active_body_ref') out.active_body_ref = bodyRef(value, allowVerified);
    else if (key === 'active_motion_ref' || key === 'source_profile_ref') out[key] = optionalRef(value, key);
    else if (key === 'capability_scope') {
      if (value !== 'CC_A2_M0_M1_FIXED_ONLY') throw invalid('Unsupported capability scope');
      out[key] = value;
    } else if (key === 'metadata') out.metadata = metadata(value);
  }
  if (Buffer.byteLength(JSON.stringify(out), 'utf8') > MAX_BYTES) throw invalid('Character exceeds 64KiB');
  return out;
}
function assertSnapshot(s, id, n, previousSha) {
  exact(s, ['record_schema', 'character_id', 'revision', 'previous_snapshot_sha256', 'created_at', 'updated_at', ...PATCH_FIELDS],
    ['record_schema', 'character_id', 'revision', 'previous_snapshot_sha256', 'created_at', 'updated_at', ...PATCH_FIELDS]);
  if (s.record_schema !== CHARACTER_SCHEMA || s.character_id !== id || s.revision !== n
      || s.previous_snapshot_sha256 !== previousSha || !validDate(s.created_at) || !validDate(s.updated_at))
    throw corrupt('Snapshot identity/chain invalid: ' + id + ':' + n);
  try { changes(Object.fromEntries(PATCH_FIELDS.map((k) => [k, s[k]])), true); }
  catch (e) { throw corrupt('Invalid snapshot schema: ' + e.message); }
}
const validDate = (s) => typeof s === 'string' && /^\d{4}-\d\d-\d\dT/.test(s) && !Number.isNaN(Date.parse(s));
async function regular(p) {
  let stat;
  try { stat = await fs.lstat(p); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES || stat.size === 0)
    throw corrupt('Unsafe or oversized store file: ' + p);
  return stat;
}
async function directory(p) {
  const stat = await fs.lstat(p);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw corrupt('Unsafe store directory: ' + p);
}
async function readRecord(p) {
  if (!(await regular(p))) return null;
  let bytes, value;
  try { bytes = await fs.readFile(p); value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw corrupt('Cannot decode store file: ' + p); }
  return { bytes, value, sha: digest(bytes) };
}
async function syncDir(dir) {
  // Directory fsync is supported on POSIX (CI and primary local Linux environment).
  // Some Windows filesystems do not allow opening directories; rename still remains atomic there.
  let fd;
  try { fd = await fs.open(dir, 'r'); await fd.sync(); }
  catch (e) { if (process.platform !== 'win32') throw e; }
  finally { await fd?.close(); }
}
async function durableTemp(dir, bytes) {
  const p = path.join(dir, '.tmp-' + randomUUID());
  const fd = await fs.open(p, 'wx', 0o600);
  try { await fd.writeFile(bytes); await fd.sync(); }
  catch (e) { await fd.close(); await fs.rm(p, { force: true }); throw e; }
  await fd.close();
  return p;
}
async function atomicReplace(p, bytes) {
  const dir = path.dirname(p); const tmp = await durableTemp(dir, bytes);
  try { await fs.rename(tmp, p); await syncDir(dir); }
  finally { await fs.rm(tmp, { force: true }); }
}
async function immutableWrite(p, bytes) {
  const dir = path.dirname(p); const tmp = await durableTemp(dir, bytes);
  try { await fs.link(tmp, p); await syncDir(dir); }
  finally { await fs.rm(tmp, { force: true }); }
}
const jsonBytes = (x) => Buffer.from(JSON.stringify(x, null, 2) + '\n', 'utf8');
function headFor(s, sha) {
  return { record_schema: CHARACTER_SCHEMA, character_id: s.character_id,
    current_revision: s.revision, snapshot_sha256: sha, updated_at: s.updated_at };
}
function headValid(h, id) {
  try {
    exact(h, ['record_schema', 'character_id', 'current_revision', 'snapshot_sha256', 'updated_at'],
      ['record_schema', 'character_id', 'current_revision', 'snapshot_sha256', 'updated_at']);
    if (h.record_schema !== CHARACTER_SCHEMA || h.character_id !== id || !revisionNumber(h.current_revision)
        || !HEX.test(h.snapshot_sha256) || !validDate(h.updated_at)) throw Error();
  } catch { throw corrupt('Invalid head: ' + id); }
}
function pendingValid(p, id) {
  try {
    exact(p, ['record_schema', 'character_id', 'expected_revision', 'new_revision', 'snapshot_sha256'],
      ['record_schema', 'character_id', 'expected_revision', 'new_revision', 'snapshot_sha256']);
    if (p.record_schema !== CHARACTER_SCHEMA || p.character_id !== id
      || !Number.isSafeInteger(p.expected_revision) || p.expected_revision < 0
      || p.new_revision !== p.expected_revision + 1 || !revisionNumber(p.new_revision)
      || !HEX.test(p.snapshot_sha256)) throw Error();
  } catch { throw corrupt('Invalid pending write: ' + id); }
}
async function scanCharacter(root, id, recover) {
  const dir = path.join(root, id), revDir = path.join(dir, 'revisions');
  await directory(dir);
  const names = await fs.readdir(dir);
  if (!names.includes('revisions') && recover && names.every((n) => /^\.tmp-[0-9a-f-]{36}$/.test(n))) {
    for (const name of names) {
      if (!(await regular(path.join(dir, name)))) throw corrupt('Invalid abandoned temporary file');
      await fs.rm(path.join(dir, name));
    }
    await fs.rmdir(dir); await syncDir(root); return null;
  }
  await directory(revDir);
  if (names.some((n) => !['head.json', 'pending.json', 'revisions'].includes(n) && !/^\.tmp-[0-9a-f-]{36}$/.test(n)))
    throw corrupt('Unexpected Character file: ' + id);
  const revisionNames = (await fs.readdir(revDir)).sort();
  if (revisionNames.some((n) => !REVISION.test(n))) throw corrupt('Unexpected revision filename: ' + id);
  let prev = null, last = null;
  for (const [i, name] of revisionNames.entries()) {
    if (name !== serial(i + 1)) throw corrupt('Missing or nonsequential revision: ' + id);
    const rec = await readRecord(path.join(revDir, name));
    if (!rec) throw corrupt('Missing snapshot: ' + id);
    assertSnapshot(rec.value, id, i + 1, prev);
    prev = rec.sha; last = rec;
  }
  let h = (await readRecord(path.join(dir, 'head.json')))?.value ?? null;
  if (h) headValid(h, id);
  const pending = (await readRecord(path.join(dir, 'pending.json')))?.value ?? null;
  if (pending) pendingValid(pending, id);
  if (recover && pending) {
    const target = revisionNames.length === pending.new_revision ? last : null;
    if (h && h.current_revision === pending.new_revision) {
      if (!target || target.sha !== pending.snapshot_sha256 || h.snapshot_sha256 !== target.sha)
        throw corrupt('Completed transaction digest mismatch: ' + id);
    } else if ((!h && pending.expected_revision === 0)
        || (h && h.current_revision === pending.expected_revision)) {
      if (target && target.sha === pending.snapshot_sha256) {
        await atomicReplace(path.join(dir, 'head.json'), jsonBytes(headFor(target.value, target.sha)));
        h = headFor(target.value, target.sha);
      } else if (revisionNames.length !== pending.expected_revision)
        throw corrupt('Incomplete transaction snapshot mismatch: ' + id);
    } else throw corrupt('Pending transaction/head mismatch: ' + id);
    await fs.rm(path.join(dir, 'pending.json'));
    await syncDir(dir);
  }
  if (!h && revisionNames.length === 0 && recover) {
    // Pre-snapshot interrupted create is not a committed Character.
    for (const name of names.filter((n) => n.startsWith('.tmp-'))) await fs.rm(path.join(dir, name));
    await fs.rmdir(revDir); await fs.rmdir(dir); await syncDir(root);
    return null;
  }
  if (!h || revisionNames.length !== h.current_revision || last?.sha !== h.snapshot_sha256
      || last.value.updated_at !== h.updated_at || pending && !recover)
    throw corrupt('Missing/head mismatch or orphan revision: ' + id);
  if (recover) for (const name of names.filter((n) => n.startsWith('.tmp-'))) {
    if (!(await regular(path.join(dir, name)))) throw corrupt('Unexpected temporary file type');
    await fs.rm(path.join(dir, name));
  }
  return { head: h, snapshot: last.value };
}

export function createCharacterStore({ dataDir = process.env.MORPHO_CC_A2_DATA_DIR || DEFAULT_DATA_DIR,
  verifyBoundEvidence } = {}) {
  const root = path.resolve(dataDir, 'characters');
  let initialized = false;
  async function initialize() {
    if (initialized) return;
    await fs.mkdir(root, { recursive: true }); await directory(root);
    const lockPath = path.join(root, '.writer.lock');
    const lock = await readRecord(lockPath);
    if (lock) {
      const pid = lock.value?.pid;
      if (!Number.isSafeInteger(pid) || pid < 1) throw corrupt('Malformed writer lock');
      try { process.kill(pid, 0); throw conflict('Character writer active'); }
      catch (e) { if (e instanceof CharacterStoreError) throw e; if (e.code !== 'ESRCH') throw conflict('Writer lock cannot be cleared safely'); }
      await fs.rm(lockPath); await syncDir(root);
    }
    for (const name of await fs.readdir(root)) {
      if (!UUID.test(name)) throw corrupt('Unexpected characters namespace entry: ' + name);
      await scanCharacter(root, name, true);
    }
    initialized = true;
  }
  async function exclusive(fn) {
    const previous = gates.get(root) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    gates.set(root, current);
    await previous;
    let lock;
    const lockPath = path.join(root, '.writer.lock');
    try {
      await initialize();
      // A cross-process gate, deliberately fail-closed instead of stealing an
      // ambiguous lock. A dead writer's lock is inspected during startup.
      try { lock = await fs.open(lockPath, 'wx', 0o600); }
      catch (e) { if (e.code === 'EEXIST') throw conflict('Character writer active'); throw e; }
      await lock.writeFile(JSON.stringify({ pid: process.pid }) + '\n'); await lock.sync();
      return await fn();
    } finally {
      if (lock) { await lock.close(); await fs.rm(lockPath, { force: true }); }
      release(); if (gates.get(root) === current) gates.delete(root);
    }
  }
  async function commit(id, expected, next) {
    const dir = path.join(root, id), revDir = path.join(dir, 'revisions');
    const bytes = jsonBytes(next), sha = digest(bytes);
    if (bytes.length > MAX_BYTES) throw invalid('Snapshot exceeds 64KiB');
    const p = { record_schema: CHARACTER_SCHEMA, character_id: id,
      expected_revision: expected, new_revision: next.revision, snapshot_sha256: sha };
    await immutableWrite(path.join(dir, 'pending.json'), jsonBytes(p));
    await immutableWrite(path.join(revDir, serial(next.revision)), bytes);
    await atomicReplace(path.join(dir, 'head.json'), jsonBytes(headFor(next, sha)));
    await fs.rm(path.join(dir, 'pending.json')); await syncDir(dir);
    return { head: headFor(next, sha), snapshot: next };
  }
  async function create(input) {
    return exclusive(async () => {
      exact(input, PATCH_FIELDS, ['name']);
      const fields = changes(input);
      const id = randomUUID(); const dir = path.join(root, id);
      await fs.mkdir(dir); await fs.mkdir(path.join(dir, 'revisions'));
      await syncDir(root);
      const now = new Date().toISOString();
      const next = { record_schema: CHARACTER_SCHEMA, character_id: id, revision: 1,
        previous_snapshot_sha256: null, created_at: now, updated_at: now,
        name: '', description: '', default_controls: { energy: 0.35, pace: 0.9 },
        active_body_ref: null, active_motion_ref: null, source_profile_ref: null,
        capability_scope: 'CC_A2_M0_M1_FIXED_ONLY', metadata: {}, ...fields };
      return commit(id, 0, next);
    });
  }
  async function get(id, revision) {
    await initialize(); id = idCheck(id);
    const current = await scanCharacter(root, id, false).catch((e) => { if (e.code === 'ENOENT') throw notFound(); throw e; });
    if (revision === undefined) return current;
    if (!revisionNumber(revision) || revision > current.head.current_revision) throw notFound();
    const rec = await readRecord(path.join(root, id, 'revisions', serial(revision)));
    if (!rec) throw corrupt('Missing requested revision');
    return { head: current.head, snapshot: rec.value, snapshot_sha256: rec.sha };
  }
  async function list() {
    await initialize(); const records = [];
    for (const name of await fs.readdir(root)) {
      if (name === '.writer.lock') continue;
      if (!UUID.test(name)) throw corrupt('Unexpected store entry');
      records.push(await scanCharacter(root, name, false));
    }
    return records.sort((a, b) => a.snapshot.character_id.localeCompare(b.snapshot.character_id));
  }
  async function update(id, expected_revision, rawChanges) {
    return exclusive(async () => {
      id = idCheck(id);
      if (!revisionNumber(expected_revision)) throw invalid('Expected positive revision required');
      const fields = changes(rawChanges);
      if (!Object.keys(fields).length) throw invalid('Empty revision change');
      const current = await get(id);
      if (current.head.current_revision !== expected_revision) throw conflict('Stale Character revision');
      if (expected_revision >= MAX_REVISION) throw conflict('Revision limit');
      const now = new Date().toISOString();
      const next = { ...current.snapshot, ...fields, revision: expected_revision + 1,
        previous_snapshot_sha256: current.head.snapshot_sha256, updated_at: now };
      return commit(id, expected_revision, next);
    });
  }
  async function bindVerified(id, expectedRevision, { request, result, receipt, rawBytes, bodyReceiptRef }) {
    // No untrusted HTTP route calls this: only future already-validated S3/S2
    // code may supply the exact Core result and audited physical bytes.
    if (typeof verifyBoundEvidence !== 'function') throw invalid('No Core verifier configured');
    verifyBoundEvidence(request, result, receipt, rawBytes);
    if (result?.embodiment?.status !== 'BOUND' || result?.realization_outcome !== 'FEASIBLE')
      throw invalid('Verified binding requires feasible Core result');
    shortString(bodyReceiptRef, 512, 'bodyReceiptRef');
    const ref = { kind: 'core_body_preset', preset_id: result.embodiment.preset_id,
      preset_revision: result.embodiment.preset_revision, producer_repo: PRODUCER,
      core_commit: CORE_COMMIT, backend_id: BACKEND, binding_state: 'VERIFIED_BOUND',
      preparation_digest: result.embodiment.preparation_digest, body_receipt_ref: bodyReceiptRef };
    bodyRef(ref, true);
    // update intentionally cannot receive VERIFIED_BOUND from public callers;
    // this internal operation performs CAS under the same gate.
    return exclusive(async () => {
      const current = await get(id);
      const selected = current.snapshot.active_body_ref;
      if (!selected || selected.preset_id !== ref.preset_id
        || selected.preset_revision !== ref.preset_revision
        || selected.binding_state !== 'SELECTED_UNRESOLVED') throw conflict('Selected body does not match verified Core result');
      if (current.head.current_revision !== expectedRevision) throw conflict('Stale Character revision');
      if (expectedRevision >= MAX_REVISION) throw conflict('Revision limit');
      const now = new Date().toISOString();
      return commit(idCheck(id), expectedRevision, { ...current.snapshot,
        active_body_ref: ref, revision: expectedRevision + 1,
        previous_snapshot_sha256: current.head.snapshot_sha256, updated_at: now });
    });
  }
  return { initialize, create, get, list, update, bindVerified, dataRoot: root };
}
