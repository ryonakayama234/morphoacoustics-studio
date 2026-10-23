/** Personal-use CC-B1 adapter: bounded Core physics, never browser-synthesized audio.
 * Research-only: loopback, pinned clean Core; not a public/multi-user service.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCoreRevision } from './core-revision.mjs';
import { assertNoIgnoredToolExecutables, assertAuditedWavBytes } from './cc-a2-server.mjs';

export const CORE_SHA = 'ef23738e1e6e3c631de5e36912bf5b601c7a17b3';
export const PHYSICAL_VERSION = 'cc-b1-core-limited-performer/v1';
export const REGISTRY_VERSION = 'cc-b1-body-revision-registry/v0';
export const ALLOWED_RATIOS = Object.freeze(['0.90', '1.10']);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.resolve(process.env.MORPHO_CC_B1_CORE_DIR || path.join(ROOT, '..', 'morphoacoustics-cc-b1'));
const DATA = path.resolve(process.env.MORPHO_CC_B1_DATA_DIR || path.join(ROOT, '.morpho-cc-b1-data'));
const PYTHON = process.env.MORPHO_CC_B1_PYTHON || 'python';
const PORT = Number(process.env.MORPHO_CC_B1_PORT || '8767');
const ID = /^[a-f0-9]{8}-[a-f0-9-]{27}$/;
const ROLES = Object.freeze({ baseline: 'baseline.wav', edited: 'edited.wav' });
let activeChild = null;

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function json(res, status, data) {
  const blob = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': blob.length, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' });
  res.end(blob);
}

export function checkSelection(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object'
    || Object.keys(value).length !== 1
    || !Object.hasOwn(value, 'rest_area_ratio')
    || !ALLOWED_RATIOS.includes(value.rest_area_ratio)) {
    throw new Error('INVALID_BODY_EDIT: only section 8 ratios 0.90 and 1.10 are supported');
  }
  return value.rest_area_ratio;
}

export function assertPair(manifest, inspection, ratio) {
  if (manifest?.schema_version !== PHYSICAL_VERSION || manifest.status !== 'SUCCEEDED'
    || manifest.edit_intent?.rest_area_ratio !== ratio
    || manifest.edit_intent?.section_index !== 8
    || manifest.edit_intent?.cavity_id !== inspection.editable.cavity_id
    || JSON.stringify(manifest.parent) !== JSON.stringify(inspection.parent)
    || !/^cc-b1-[a-f0-9]{64}$/.test(manifest.body_revision?.revision_id ?? '')
    || manifest.body_revision?.parent?.preparation_digest !== inspection.parent.preparation_digest
    || manifest.body_revision?.edit?.section_index !== 8
    || manifest.acoustic_calls_per_body !== 102
    || manifest.sample_rate_hz !== 48000 || manifest.sample_count !== 24000
    || typeof manifest.relative_raw_pa_l2 !== 'number'
    || !Number.isFinite(manifest.relative_raw_pa_l2)
    || manifest.relative_raw_pa_l2 <= 1e-8
    || !Number.isFinite(manifest.shared_playback_gain)
    || manifest.shared_playback_gain <= 0) {
    throw new Error('CORE_CAUSAL_RECEIPT_MISMATCH');
  }
  const roles = ['baseline_pa.npy', 'edited_pa.npy', 'baseline.wav', 'edited.wav',
    'baseline_trace.csv', 'edited_trace.csv'];
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== roles.length
    || roles.some(name => manifest.artifacts.filter(x =>
      x?.path === name && /^[a-f0-9]{64}$/.test(x.sha256)
      && Number.isSafeInteger(x.size_bytes) && x.size_bytes > 0).length !== 1)) {
    throw new Error('CORE_ARTIFACT_SET_MISMATCH');
  }
  return manifest;
}

async function readBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('JSON_REQUIRED');
  let n = 0; const parts = [];
  for await (const part of req) {
    n += part.length;
    if (n > 4096) throw new Error('REQUEST_TOO_LARGE');
    parts.push(part);
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
}

function checkCore() {
  verifyCoreRevision(CORE, CORE_SHA);
  assertNoIgnoredToolExecutables(CORE);
}
async function core(args, runDir) {
  checkCore();
  const command = args[0] === 'registry' ? 'cc_b1_revision_registry.py' : 'cc_b1_candidate_cli.py';
  const argv = command.startsWith('cc_b1_revision') ? args.slice(1) : args;
  const executable = path.join(CORE, 'tools', command);
  const body = await new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [executable, ...argv], {
      cwd: CORE, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.join(CORE, 'src'),
        PYTHONPYCACHEPREFIX: path.join(runDir, 'pycache') },
    });
    activeChild = child;
    let output = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    const done = (err, text) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (activeChild === child) activeChild = null;
      if (err) reject(err); else resolve(text);
    };
    child.stdout.on('data', b => {
      output += b.toString();
      if (output.length > 65536) child.kill('SIGKILL');
    });
    child.stderr.on('data', b => {
      stderr += b.toString();
      if (stderr.length > 65536) child.kill('SIGKILL');
    });
    child.on('error', done);
    child.on('close', status => {
      if (status !== 0) done(new Error('CORE_REFUSED: ' + stderr.slice(0,180) + ' ' + output.slice(0,400)));
      else done(null, output);
    });
  });
  checkCore();
  const parsed = JSON.parse(body);
  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_CORE_JSON');
  if (['INVALID', 'UNSUPPORTED', 'FAILED', 'REFUSED'].includes(parsed.status))
    throw new Error('CORE_REFUSED: ' + (parsed.error?.code || 'no status'));
  return parsed;
}

async function inspection(runDir) {
  const result = await core(['--protocol-version', PHYSICAL_VERSION, '--inspect'], runDir);
  if (result.schema_version !== PHYSICAL_VERSION || result.parent?.preset_id !== 'v3b-axial-M0'
    || result.parent?.revision !== 1 || result.editable?.section_index !== 8
    || result.editable?.cavity_id !== 'oral-vowel-a-16x10mm'
    || !ALLOWED_RATIOS.every(r => result.editable.allowed_ratios?.includes(r))) {
    throw new Error('UNEXPECTED_CORE_CAPABILITY');
  }
  return result;
}

async function verifyPhysical(runDir, ratio, expected) {
  const dir = path.join(runDir, 'physical');
  const verified = await core(['--protocol-version', PHYSICAL_VERSION, '--verify',
    '--archive-dir', dir], runDir);
  return assertPair(verified, expected, ratio);
}
async function resolveRegistry(revisionId, runDir) {
  const value = await core(['registry', '--resolve', '--registry-dir',
    path.join(DATA, 'registry'), '--revision-id', revisionId], runDir);
  if (value.schema_version !== REGISTRY_VERSION || value.status !== 'RESOLVED'
    || value.revision_id !== revisionId) throw new Error('REGISTRY_IDENTITY_MISMATCH');
  return value;
}
function sameCanonical(a, b) {
  // The Core CLI has already authenticated the receipts; object comparison
  // here checks values only, not Core's canonical hashing convention.
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function createPair(ratio) {
  const runId = randomUUID();
  const runDir = path.join(DATA, 'runs', runId);
  await fs.mkdir(runDir, { mode: 0o700 });
  const inspect = await inspection(runDir);
  const request = {
    schema_version: PHYSICAL_VERSION, parent: inspect.parent,
    edit: { cavity_id: inspect.editable.cavity_id,
      section_index: 8, rest_area_ratio: ratio },
  };
  const requestPath = path.join(runDir, 'request.json');
  await fs.writeFile(requestPath, JSON.stringify(request), { flag: 'wx', mode: 0o600 });
  const physicalDir = path.join(runDir, 'physical');
  const performed = await core(['--protocol-version', PHYSICAL_VERSION, '--perform',
    '--request', requestPath, '--output-dir', physicalDir], runDir);
  assertPair(performed, inspect, ratio);
  const checked = await verifyPhysical(runDir, ratio, inspect);
  if (!sameCanonical(performed, checked)) throw new Error('CORE_PERFORM_VERIFY_MISMATCH');
  const registered = await core(['registry', '--register', '--registry-dir',
    path.join(DATA, 'registry'), '--archive-dir', physicalDir], runDir);
  if (registered.schema_version !== REGISTRY_VERSION ||
    !['REGISTERED', 'ALREADY_REGISTERED'].includes(registered.status)
    || registered.revision_id !== checked.body_revision.revision_id) {
    throw new Error('REGISTRY_REGISTER_MISMATCH');
  }
  const restored = await resolveRegistry(registered.revision_id, runDir);
  if (!sameCanonical(restored.body_revision, checked.body_revision)
    || restored.body_revision_sha256 !== registered.body_revision_sha256) {
    throw new Error('REGISTRY_RESTORE_MISMATCH');
  }
  const saved = { schema_version: 'cc-b1-studio-local-pair/v0',
    run_id: runId, ratio, core_commit: CORE_SHA,
    body_revision_id: checked.body_revision.revision_id,
    body_revision_sha256: registered.body_revision_sha256,
    physical: checked, created_at: new Date().toISOString() };
  // Completion-marker-last: incomplete physical/registry runs are not Takes.
  await fs.writeFile(path.join(runDir, 'studio-pair.json'),
    JSON.stringify(saved, null, 2), { flag: 'wx', mode: 0o600 });
  return present(saved);
}

function present(record) {
  return {
    schema_version: record.schema_version, id: record.run_id, ratio: record.ratio,
    created_at: record.created_at, core_commit: record.core_commit,
    body_revision_id: record.body_revision_id,
    body_revision_sha256: record.body_revision_sha256,
    parent: record.physical.parent,
    body_revision: record.physical.body_revision,
    source: record.physical.source,
    task_plan_sha256: record.physical.task_plan_sha256,
    relative_raw_pa_l2: record.physical.relative_raw_pa_l2,
    sample_rate_hz: record.physical.sample_rate_hz,
    acoustic_calls_per_body: record.physical.acoustic_calls_per_body,
    audio: {
      baseline: '/cc-b1/audio/' + record.run_id + '/baseline',
      edited: '/cc-b1/audio/' + record.run_id + '/edited',
    },
  };
}
async function loadPair(id) {
  if (!ID.test(id)) throw new Error('INVALID_TAKE_ID');
  const runDir = path.join(DATA, 'runs', id);
  const raw = await fs.readFile(path.join(runDir, 'studio-pair.json'), 'utf8');
  const record = JSON.parse(raw);
  if (record?.schema_version !== 'cc-b1-studio-local-pair/v0'
    || record.run_id !== id || record.core_commit !== CORE_SHA
    || !ALLOWED_RATIOS.includes(record.ratio)) throw new Error('INVALID_SAVED_TAKE');
  const inspect = await inspection(runDir);
  const verified = await verifyPhysical(runDir, record.ratio, inspect);
  if (!sameCanonical(verified, record.physical)
    || record.body_revision_id !== verified.body_revision.revision_id) {
    throw new Error('TAMPERED_PHYSICAL_TAKE');
  }
  const restored = await resolveRegistry(record.body_revision_id, runDir);
  if (!sameCanonical(restored.body_revision, verified.body_revision)
    || restored.body_revision_sha256 !== record.body_revision_sha256) {
    throw new Error('TAMPERED_REVISION_REGISTRY');
  }
  return record;
}

async function takeList() {
  const ids = (await fs.readdir(path.join(DATA, 'runs')))
    .filter(x => ID.test(x)).sort();
  const good = [];
  for (const id of ids) {
    try { good.push(present(await loadPair(id))); }
    catch (err) {
      // An in-progress run has no completion marker. A corrupt completed
      // record must never be returned as valid history.
      if (await fs.stat(path.join(DATA, 'runs', id, 'studio-pair.json'))
        .then(() => true, () => false)) throw err;
    }
  }
  return good.sort((a,b) => a.created_at.localeCompare(b.created_at)).slice(-100);
}

async function audio(res, id, side) {
  const record = await loadPair(id);
  const name = ROLES[side];
  if (!name) throw new Error('UNKNOWN_AUDIO_ROLE');
  const bytes = await fs.readFile(path.join(DATA, 'runs', id, 'physical', name));
  const artifact = record.physical.artifacts.find(x => x.path === name);
  if (!artifact || bytes.length !== artifact.size_bytes || hash(bytes) !== artifact.sha256) {
    throw new Error('WAV_BYTES_TAMPERED');
  }
  assertAuditedWavBytes(bytes);
  res.writeHead(200, { 'Content-Type': 'audio/wav',
    'Content-Length': bytes.length, 'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(bytes);
}

export async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('INVALID_PORT');
  checkCore();
  for (const dir of ['runs', 'registry']) {
    await fs.mkdir(path.join(DATA, dir), { recursive: true, mode: 0o700 });
  }
  // Require private owner-only storage for the inherited Python registry.
  const registry = await fs.stat(path.join(DATA, 'registry'));
  if ((registry.mode & 0o077) !== 0) throw new Error('REGISTRY_DIRECTORY_NOT_PRIVATE');
  const temp = await fs.mkdtemp(path.join(DATA, 'inspect-'));
  try { await inspection(temp); } finally { await fs.rm(temp, { recursive: true, force: true }); }
  let occupied = false;
  const server = createServer(async (req, res) => {
    try {
      if (!['127.0.0.1:' + PORT, 'localhost:' + PORT].includes(req.headers.host)) {
        return json(res, 403, { code: 'HOST_REJECTED' });
      }
      if (req.headers.origin && !['http://localhost:5173', 'http://127.0.0.1:5173'].includes(req.headers.origin)) {
        return json(res, 403, { code: 'ORIGIN_REJECTED' });
      }
      if (req.method === 'GET' && req.url === '/cc-b1/health')
        return json(res, 200, { status: 'ready', core_commit: CORE_SHA,
          supported_ratios: ALLOWED_RATIOS });
      if (req.method === 'GET' && req.url === '/cc-b1/takes')
        return json(res, 200, await takeList());
      const match = /^\/cc-b1\/audio\/([0-9a-f-]{36})\/(baseline|edited)$/.exec(req.url || '');
      if (req.method === 'GET' && match) return await audio(res, match[1], match[2]);
      if (req.method !== 'POST' || req.url !== '/cc-b1/perform')
        return json(res, 404, { code: 'NOT_FOUND' });
      if (occupied) return json(res, 429, { code: 'BUSY' });
      occupied = true;
      try {
        const ratio = checkSelection(await readBody(req));
        return json(res, 200, await createPair(ratio));
      } finally { occupied = false; }
    } catch (e) {
      json(res, 400, { code: 'CORE_PHYSICAL_REFUSAL',
        message: (e instanceof Error ? e.message : String(e)).slice(0, 500) });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  async function shutdown() {
    server.close();
    if (activeChild && activeChild.exitCode === null) activeChild.kill('SIGTERM');
  }
  server.once('SIGINT', shutdown);
  server.once('SIGTERM', shutdown);
  server.listen(PORT, '127.0.0.1', () =>
    console.log('CC-B1 private Body Atelier on 127.0.0.1:' + PORT));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(e => { console.error(e); process.exitCode = 1; });
}
