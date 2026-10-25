/** WG2 opt-in local creator Take service. Separate from frozen X2a / CC-A2 / CC-B1.
 * An actual pinned Core source checkout performs the physics, never this Node server.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { promises as fs, constants as fileFlags } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCoreRevision } from './core-revision.mjs';
import { assertNoIgnoredToolExecutables } from './cc-a2-server.mjs';

export const CORE_SHA = 'd47acca22fee0bea3f88be60c9d4cbc99c3fd514'; // candidate; repin after verified Core merge
export const SCHEMA = 'wg2-studio-static-creator-take/v0';
export const PHYSICS_VERSION = 'wg2-creator-static-a-sustain/v0';
export const BODY = Object.freeze({
  'v3b-axial-M0': { length_m: 0.16, clock_hz: 68600 },
  'v3b-axial-M1': { length_m: 0.176, clock_hz: 343 * 2 / 0.011 },
});
export const REQUIRED_ARTIFACTS = Object.freeze([
  'source_flow_48k.npy', 'mouth_pressure_native_pa.npy',
  'mouth_flow_native_m3_s.npy', 'mouth_pressure_monitor_48k_pa.npy', 'audio.wav',
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.resolve(process.env.MORPHO_WG2_CORE_DIR || path.join(ROOT, '..', 'morphoacoustics-wg2'));
const DATA = path.resolve(process.env.MORPHO_WG2_DATA_DIR || path.join(ROOT, '.morpho-wg2-data'));
const PYTHON = process.env.MORPHO_WG2_PYTHON || 'python';
const PORT = Number(process.env.MORPHO_WG2_PORT || 8768);
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CHAR = /^[A-Za-z0-9_-]{1,64}$/;
let activeChild = null;

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const closeEnough = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-9;

export function checkRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)
      || Object.keys(request).sort().join(',') !== 'character_id,duration_s,preset_id,revision'
      || typeof request.character_id !== 'string' || !CHAR.test(request.character_id)
      || !Object.hasOwn(BODY, request.preset_id)
      || request.revision !== 1 || (request.duration_s !== 0.25 && request.duration_s !== 0.50)) {
    throw new Error('UNSUPPORTED_WG2_REQUEST: only M0/M1 rev1, 0.25/0.50s prescribed static /a/');
  }
  return request;
}

export function checkWav(bytes, frames) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== 44 + frames * 2
    || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.readUInt32LE(4) !== bytes.length - 8
    || bytes.toString('ascii', 8, 12) !== 'WAVE'
    || bytes.toString('ascii', 12, 16) !== 'fmt '
    || bytes.readUInt32LE(16) !== 16
    || bytes.readUInt16LE(20) !== 1
    || bytes.readUInt16LE(22) !== 1
    || bytes.readUInt32LE(24) !== 48000
    || bytes.readUInt32LE(28) !== 96000
    || bytes.readUInt16LE(32) !== 2
    || bytes.readUInt16LE(34) !== 16
    || bytes.toString('ascii', 36, 40) !== 'data'
    || bytes.readUInt32LE(40) !== frames * 2) {
    throw new Error('FORGED_WG2_PCM16_WAV');
  }
}

export function checkNpyF64(bytes, expectedCount) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24
      || !bytes.subarray(0, 6).equals(Buffer.from([0x93,78,85,77,80,89]))
      || bytes[6] !== 1 || bytes[7] !== 0) throw new Error('FORGED_WG2_NPY_HEADER');
  const hlen = bytes.readUInt16LE(8);
  const hstop = 10 + hlen;
  if (hlen < 30 || hstop > bytes.length) throw new Error('FORGED_WG2_NPY_LENGTH');
  const header = bytes.toString('ascii', 10, hstop);
  const shape = new RegExp("['\"]shape['\"]:\\s*\\((\\d+),\\)");
  const match = shape.exec(header);
  if (!/['"]descr['"]:\s*['"]<f8['"]/.test(header)
      || !/['"]fortran_order['"]:\s*False/.test(header)
      || !match || Number(match[1]) !== expectedCount
      || hstop + expectedCount * 8 !== bytes.length) {
    throw new Error('FORGED_WG2_NPY_SHAPE_OR_TYPE');
  }
  for (let i = hstop; i < bytes.length; i += 8) {
    if (!Number.isFinite(bytes.readDoubleLE(i))) throw new Error('NONFINITE_WG2_PHYSICAL_ARRAY');
  }
  return digest(bytes.subarray(hstop));
}

export function checkManifest(manifest, request, buffers, pinned = CORE_SHA) {
  const b = BODY[request.preset_id];
  const frames = Math.round(request.duration_s * 48000);
  if (!b || manifest?.schema_version !== PHYSICS_VERSION
      || manifest.status !== 'SUCCEEDED' || manifest.core_commit !== pinned
      || manifest.task !== 'static-/a/-like-sustained-vowel'
      || manifest.is_calibrated_microphone !== false
      || manifest.physical_walls !== 'fixed'
      || manifest.body?.character_id !== request.character_id
      || manifest.body?.preset_id !== request.preset_id
      || manifest.body?.revision !== request.revision
      || !closeEnough(manifest.body?.length_m, b.length_m)
      || !/^sha256:[a-f0-9]{64}$/.test(manifest.body?.preparation_digest ?? '')
      || manifest.source?.id !== 'sv1-prescribed-100hz-lf-rd1'
      || manifest.source?.role !== 'externally-prescribed-volume-flow'
      || manifest.source?.duration_s !== request.duration_s
      || manifest.observer?.output_samples !== frames
      || !closeEnough(manifest.observer?.physics_clock_hz, b.clock_hz)
      || manifest.observer?.observation_point !== 'mouth-port-pressure-not-external-microphone'
      || manifest.observer?.sample_rate_hz !== 48000
      || manifest.observer?.playback_full_scale_pa !== 8
      || manifest.observer?.termination !== 'b0'
      || !Number.isInteger(manifest.observer?.physics_ticks)
      || manifest.observer.physics_ticks !== Math.ceil(frames * b.clock_hz / 48000)
      || !Number.isFinite(manifest.observer?.max_abs_energy_residual_j)
      || manifest.observer.max_abs_energy_residual_j > 1e-10
      || Object.keys(manifest.artifacts || {}).sort().join(',') !==
           [...REQUIRED_ARTIFACTS].sort().join(',')) {
    throw new Error('INCONSISTENT_WG2_PHYSICAL_MANIFEST');
  }
  for (const name of REQUIRED_ARTIFACTS) {
    const bytes = buffers[name];
    const entry = manifest.artifacts[name];
    if (!Buffer.isBuffer(bytes) || !entry
      || entry.sha256 !== digest(bytes) || entry.bytes !== bytes.length) {
      throw new Error('TAMPERED_WG2_ARTIFACT_BYTES: ' + name);
    }
  }
  checkWav(buffers['audio.wav'], frames);
  const source = checkNpyF64(buffers['source_flow_48k.npy'], frames);
  const pressure = checkNpyF64(buffers['mouth_pressure_native_pa.npy'], manifest.observer.physics_ticks);
  checkNpyF64(buffers['mouth_flow_native_m3_s.npy'], manifest.observer.physics_ticks);
  const monitor = checkNpyF64(buffers['mouth_pressure_monitor_48k_pa.npy'], frames);
  if (source !== manifest.source.sha256_f64
    || source !== manifest.observer.source_flow_sha256
    || pressure !== manifest.observer.physical_pressure_sha256
    || monitor !== manifest.observer.monitor_pressure_sha256
    || digest(buffers['audio.wav']) !== manifest.observer.wav_sha256) {
    throw new Error('FORGED_WG2_RAW_PROVENANCE');
  }
  return manifest;
}

function checkedCore() {
  verifyCoreRevision(CORE, CORE_SHA);
  assertNoIgnoredToolExecutables(CORE);
}

async function safeFile(dir, name) {
  const stat = await fs.lstat(path.join(dir, name));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 40 || stat.size > 3_000_000) {
    throw new Error('WG2_INVALID_FILE_OR_SYMLINK: ' + name);
  }
  const handle = await fs.open(path.join(dir, name), fileFlags.O_RDONLY | fileFlags.O_NOFOLLOW);
  try {
    const actual = await handle.stat();
    if (!actual.isFile() || actual.ino !== stat.ino || actual.dev !== stat.dev) {
      throw new Error('WG2_FILE_SWAPPED');
    }
    return await handle.readFile();
  } finally { await handle.close(); }
}

async function physicalFiles(dir) {
  const payloads = {};
  for (const name of REQUIRED_ARTIFACTS) payloads[name] = await safeFile(dir, name);
  return payloads;
}

async function spawnCore(args, runDir) {
  checkedCore();
  const program = path.join(CORE, 'tools', 'wg2_creator_take.py');
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [program, ...args], {
      cwd: CORE, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.join(CORE, 'src'),
        PYTHONPYCACHEPREFIX: path.join(runDir, 'pycache') },
    });
    activeChild = child;
    let output = '', stderr = '', settled = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (activeChild === child) activeChild = null;
      if (error) reject(error); else resolve(value);
    }
    child.stdout.on('data', part => {
      output += part;
      if (output.length > 150000) child.kill('SIGKILL');
    });
    child.stderr.on('data', part => {
      stderr += part;
      if (stderr.length > 150000) child.kill('SIGKILL');
    });
    child.on('error', err => finish(err));
    child.on('close', code => {
      try {
        if (code !== 0) throw new Error('WG2_CORE_FAILED: ' + stderr.slice(0, 700));
        const result = JSON.parse(output);
        checkedCore();
        finish(null, result);
      } catch (err) { finish(err); }
    });
  });
}

function present(record) {
  return {
    id: record.id, created_at: record.created_at, request: record.request,
    body: record.manifest.body, source: record.manifest.source,
    observer: record.manifest.observer, core_commit: record.manifest.core_commit,
    artifacts: record.manifest.artifacts,
    audio_ref: '/wg2/takes/' + record.id + '/audio',
  };
}

async function validatedPhysical(dir, request, runDir) {
  checkedCore();
  const manifest = JSON.parse((await safeFile(dir, 'manifest.json')).toString('utf8'));
  const files = await physicalFiles(dir);
  checkManifest(manifest, request, files);
  // Independent executable recomputation of digest checks from Core, no synthesis.
  const verified = await spawnCore(['--verify', '--output-dir', dir], runDir);
  if (!isDeepStrictEqual(manifest, verified)) throw new Error('WG2_CORE_VERIFY_DISAGREEMENT');
  return { manifest, files };
}

async function createTake(request) {
  checkRequest(request);
  const id = randomUUID();
  const runDir = path.join(DATA, 'runs', id);
  await fs.mkdir(runDir, { mode: 0o700 });
  const out = path.join(runDir, 'physical');
  const proposed = await spawnCore([
    '--body', request.preset_id, '--revision', String(request.revision),
    '--character-id', request.character_id,
    '--duration', String(request.duration_s), '--output-dir', out,
  ], runDir);
  const { manifest } = await validatedPhysical(out, request, runDir);
  if (!isDeepStrictEqual(proposed, manifest)) throw new Error('WG2_CORE_STDOUT_DISAGREEMENT');
  const record = {
    id, schema_version: SCHEMA, created_at: new Date().toISOString(),
    request, manifest,
  };
  const staging = path.join(runDir, 'take.pending');
  const handle = await fs.open(staging, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(staging, path.join(runDir, 'take.json'));
  const dirFd = await fs.open(runDir, fileFlags.O_RDONLY | fileFlags.O_DIRECTORY);
  try { await dirFd.sync(); } finally { await dirFd.close(); }
  return present(record);
}

async function loadRecord(id) {
  if (!ID.test(id)) throw new Error('INVALID_WG2_TAKE_ID');
  const runDir = path.join(DATA, 'runs', id);
  const record = JSON.parse((await safeFile(runDir, 'take.json')).toString('utf8'));
  if (record.schema_version !== SCHEMA || record.id !== id
    || record.manifest.core_commit !== CORE_SHA) throw new Error('FORGED_WG2_TAKE');
  checkRequest(record.request);
  const checked = await validatedPhysical(path.join(runDir, 'physical'), record.request, runDir);
  if (!isDeepStrictEqual(checked.manifest, record.manifest)) {
    throw new Error('TAMPERED_WG2_COMPLETED_TAKE');
  }
  return { record, audio: checked.files['audio.wav'] };
}

async function listTakes() {
  const dirs = await fs.readdir(path.join(DATA, 'runs'));
  const saved = [];
  for (const id of dirs.filter(item => ID.test(item)).sort()) {
    const exists = await fs.access(path.join(DATA, 'runs', id, 'take.json')).then(() => true, () => false);
    if (exists) {
      const { record } = await loadRecord(id); // corruption of complete Take aborts listing
      saved.push(present(record));
    }
  }
  return saved.sort((a,b) => a.created_at.localeCompare(b.created_at)).slice(-100);
}

async function readRequest(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    throw new Error('JSON_ONLY');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error('WG2_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  return checkRequest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))));
}

function json(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store' });
  res.end(bytes);
}

export async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
    throw new Error('WG2_INVALID_PORT');
  }
  checkedCore();
  await fs.mkdir(path.join(DATA, 'runs'), { recursive: true, mode: 0o700 });
  const dataStat = await fs.stat(DATA);
  if ((dataStat.mode & 0o077) !== 0) throw new Error('WG2_LOCAL_DATA_NOT_PRIVATE');
  let occupied = false;
  const server = createServer(async (req, res) => {
    try {
      if (!['127.0.0.1:' + PORT, 'localhost:' + PORT].includes(req.headers.host)) {
        return json(res, 403, { code: 'HOST_REJECTED' });
      }
      if (req.headers.origin && ![
        'http://localhost:5173', 'http://127.0.0.1:5173',
      ].includes(req.headers.origin)) {
        return json(res, 403, { code: 'ORIGIN_REJECTED' });
      }
      if (req.method === 'GET' && req.url === '/wg2/health') {
        checkedCore();
        return json(res, 200, { status: 'ready', core_commit: CORE_SHA,
          supported_bodies: Object.keys(BODY), role: 'mouth-port-pressure-preview' });
      }
      if (req.method === 'GET' && req.url === '/wg2/takes') {
        return json(res, 200, await listTakes());
      }
      const audio = /^\/wg2\/takes\/([0-9a-f-]{36})\/audio$/.exec(req.url || '');
      if (req.method === 'GET' && audio) {
        const entry = await loadRecord(audio[1]);
        res.writeHead(200, { 'Content-Type': 'audio/wav',
          'Content-Length': entry.audio.length, 'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store' });
        return res.end(entry.audio);
      }
      if (req.method !== 'POST' || req.url !== '/wg2/perform') {
        return json(res, 404, { code: 'NOT_FOUND' });
      }
      if (occupied) return json(res, 429, { code: 'PHYSICS_BUSY' });
      occupied = true;
      try {
        const request = await readRequest(req);
        return json(res, 200, await createTake(request));
      } finally { occupied = false; }
    } catch (error) {
      json(res, 400, { code: 'WG2_REFUSED',
        message: (error instanceof Error ? error.message : String(error)).slice(0, 500) });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  const stop = () => {
    server.close();
    if (activeChild && activeChild.exitCode === null) activeChild.kill('SIGTERM');
  };
  server.once('SIGINT', stop);
  server.once('SIGTERM', stop);
  server.listen(PORT, '127.0.0.1', () =>
    console.log('WG2 creator physical preview on 127.0.0.1:' + PORT));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(error => { console.error(error); process.exitCode = 1; });
}
