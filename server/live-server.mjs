import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const STUDIO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CORE_SHA = 'a75418770ed28cbd301d554171a6b60ee5a05ee9';
export const BACKEND = 'morphoacoustics-live-x2a-v0';
export const VERSION = 'x2a-bridge-v1+' + CORE_SHA.slice(0, 12);
const FILENAMES = Object.freeze({
  audio: ['audio.wav', '.wav', 'audio/wav'],
  raw_pressure: ['raw_pressure_pa.npy', '.npy', 'application/x-npy'],
  physical_trace: ['physical_trace.csv', '.csv', 'text/csv'],
});
const ALLOWED_CAPABILITIES = new Set(['audio', 'timeline', 'diagnostics', 'gesture_trace', 'physical_trace']);
const PORT = Number(process.env.MORPHO_LIVE_PORT || 8765);
const DATA = path.resolve(process.env.MORPHO_LIVE_DATA_DIR || path.join(STUDIO_ROOT, '.morpho-live-data'));
const CORE = path.resolve(process.env.MORPHO_CORE_DIR || path.join(STUDIO_ROOT, '..', 'morphoacoustics'));
const PYTHON = process.env.MORPHO_PYTHON || 'python';

/** One local physical worker; claim must happen before any asynchronous body read. */
export function makeSingleFlightGate() {
  let occupied = false;
  return {
    claim() {
      if (occupied) return false;
      occupied = true;
      return true;
    },
    release() { occupied = false; },
  };
}

function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonical(value[key]);
    return out;
  }
  return value;
}
function digest(value) { return 'sha256:' + sha(JSON.stringify(canonical(value))); }
function record(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

async function schemas() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  const root = path.join(STUDIO_ROOT, 'vendor/performance-contract/v0');
  const names = ['common', 'character', 'script', 'direction', 'performance-request'];
  let last;
  for (const name of names) {
    const schema = JSON.parse(await fs.readFile(path.join(root, name + '.schema.json'), 'utf8'));
    ajv.addSchema(schema); last = schema;
  }
  return ajv.getSchema(last.$id);
}

function diagnostic(code, message, severity = 'warning') { return { code, message, severity }; }
function rejected(request, outcome, code, message) {
  return {
    schema_version: 'performance-contract/v0',
    performance_id: 'performance_live_' + randomUUID(),
    request_id: request.request_id,
    take_id: 'take_live_' + randomUUID(),
    job_status: 'SUCCEEDED',
    realization_outcome: outcome,
    artifacts: [], timeline: [],
    diagnostics: [diagnostic(code, message)],
    provenance: {
      backend: BACKEND, backend_version: VERSION, contract_version: 'performance-contract/v0',
      seed: request.seed, input_digest: digest(request),
      input_digest_algorithm: 'sha256-over-recursively-sorted-json-v1',
    },
  };
}

/** No inferred text-to-phoneme, direction mapping, or implicit body selection. */
export function mapCreativeRequest(request) {
  const character = record(request.character);
  const script = record(request.script);
  const direction = record(request.direction);
  const segments = Array.isArray(script.segments) ? script.segments : [];
  if (segments.length !== 1) return { reason: 'Exactly one Script segment is supported.' };
  const segment = record(segments[0]);
  if (segment.speaker_character_id !== character.character_id) return { reason: 'Script speaker does not match Character.' };
  if (segment.text !== 'あい') return { reason: 'Only 「あい」 as experimental /a/→/i/-like is supported.' };
  const controls = record(direction.controls);
  const overrides = direction.segment_overrides;
  if (Object.keys(controls).length || (typeof direction.note === 'string' && direction.note.trim())
    || (Array.isArray(overrides) && overrides.length)) {
    return { reason: 'No creator Direction (energy, pace, emotion, notes or overrides) has a validated live mapping.' };
  }
  if (request.seed !== 0) return { reason: 'This frozen physical execution accepts seed=0 only.' };
  const capabilities = Array.isArray(request.requested_capabilities) ? request.requested_capabilities : [];
  if (capabilities.some((cap) => !ALLOWED_CAPABILITIES.has(cap))) return { reason: 'Unimplemented capability requested.' };
  if (typeof segment.segment_id !== 'string' || !segment.segment_id) return { reason: 'Missing segment identifier.' };
  return {
    mapped: {
      schema_version: 'morpho-live/v1', pronunciation_id: 'v3a-a-to-i-like/v1',
      body_id: 'v3c-M_plus/v1', segment_id: segment.segment_id,
      text: 'あい', seed: 0,
    },
  };
}

function failure(request, cause) {
  return {
    schema_version: 'performance-contract/v0', performance_id: 'performance_live_' + randomUUID(),
    request_id: request.request_id, take_id: 'take_live_' + randomUUID(),
    job_status: 'FAILED', artifacts: [], diagnostics: [diagnostic('LIVE_EXECUTION_FAILED', String(cause), 'error')],
    provenance: {
      backend: BACKEND, backend_version: VERSION, contract_version: 'performance-contract/v0',
      seed: request.seed, input_digest: digest(request),
      input_digest_algorithm: 'sha256-over-recursively-sorted-json-v1',
    },
  };
}

async function runCore(mapped, runDir) {
  const requestFile = path.join(runDir, 'request.json');
  const outputDir = path.join(runDir, 'output');
  await fs.writeFile(requestFile, JSON.stringify(mapped), { flag: 'wx' });
  return await new Promise((resolve, reject) => {
    const child = spawn(PYTHON, ['-m', 'morphoacoustics.integration.limited_live',
      '--request', requestFile, '--output-dir', outputDir], {
      cwd: CORE, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.join(CORE, 'src') },
    });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    child.stdout.on('data', (part) => { stdout += part; if (stdout.length > 500000) child.kill('SIGKILL'); });
    child.stderr.on('data', (part) => { stderr += part; if (stderr.length > 100000) child.kill('SIGKILL'); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(stdout);
        if (code !== 0 || result.job_status === 'FAILED') throw new Error('Core failed: ' + (stderr || JSON.stringify(result.diagnostics)).slice(0, 1200));
        resolve({ result, outputDir });
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function saveArtifact(outputDir, metadata) {
  const definition = FILENAMES[metadata.kind];
  if (!definition || metadata.path !== definition[0] || metadata.media_type !== definition[2]
    || !/^[0-9a-f]{64}$/.test(metadata.sha256)
    || !Number.isSafeInteger(metadata.size_bytes) || metadata.size_bytes <= 0) {
    throw new Error('Core artifact metadata is not an allowlisted file.');
  }
  const source = path.join(outputDir, definition[0]);
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== metadata.size_bytes) throw new Error('Artifact path/size mismatch.');
  const contents = await fs.readFile(source);
  if (sha(contents) !== metadata.sha256) throw new Error('Artifact SHA-256 mismatch.');
  const filename = metadata.sha256 + definition[1];
  const destination = path.join(DATA, 'artifacts', filename);
  try {
    await fs.writeFile(destination, contents, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (sha(await fs.readFile(destination)) !== metadata.sha256) throw new Error('Content-addressed store corruption.');
  }
  return {
    kind: metadata.kind === 'physical_trace' ? 'dynamic-trace' : metadata.kind === 'raw_pressure' ? 'raw-pressure' : metadata.kind,
    ref: '/live/artifacts/' + filename, media_type: definition[2],
  };
}

async function saveManifest(coreResult, runId) {
  const body = JSON.stringify({ core_commit: CORE_SHA, core_result: coreResult }, null, 2);
  const hex = sha(body);
  const dest = path.join(DATA, 'artifacts', hex + '.json');
  try { await fs.writeFile(dest, body, { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (sha(await fs.readFile(dest)) !== hex) throw new Error('Stored manifest corrupted.');
  }
  return { kind: 'live-manifest', ref: '/live/artifacts/' + hex + '.json', media_type: 'application/json' };
}

export async function performCoreBridge(request) {
  const map = mapCreativeRequest(request);
  if (!map.mapped) return rejected(request, 'UNSUPPORTED', 'LIVE_INPUT_UNSUPPORTED', map.reason);
  const runId = randomUUID();
  const runDir = path.join(DATA, 'runs', runId);
  await fs.mkdir(runDir, { recursive: false });
  const { result: core, outputDir } = await runCore(map.mapped, runDir);
  const outcome = core.realization_outcome;
  if (!['FEASIBLE', 'INFEASIBLE', 'UNSUPPORTED', 'INVALID'].includes(outcome)) {
    throw new Error('Unknown Core realization outcome.');
  }
  if (outcome === 'FEASIBLE') {
    const diskManifest = JSON.parse(await fs.readFile(path.join(outputDir, 'result.json'), 'utf8'));
    if (digest(diskManifest) !== digest(core)) throw new Error('Core result differs from completion manifest.');
    if (core.schema_version !== 'morpho-live/v1' || core.segment_id !== map.mapped.segment_id
      || core.execution?.acoustic_transfer_calls !== 102 || core.execution?.waveform_samples !== 24000
      || core.execution?.sample_rate_hz !== 48000 || !Array.isArray(core.artifacts)
      || core.artifacts.length !== 3 || new Set(core.artifacts.map((a) => a.kind)).size !== 3
      || core.provenance?.body_id !== map.mapped.body_id || core.provenance?.seed !== 0
      || core.provenance?.numpy_version !== '2.4.6') throw new Error('Core audited live manifest contract violated.');
  } else if (Array.isArray(core.artifacts) && core.artifacts.length) {
    throw new Error('Core returned audio for a non-feasible outcome.');
  }
  const files = outcome === 'FEASIBLE'
    ? await Promise.all(core.artifacts.map((a) => saveArtifact(outputDir, a))) : [];
  const manifestArtifact = await saveManifest(core, runId);
  const diag = Array.isArray(core.diagnostics) ? core.diagnostics.map((item) =>
    diagnostic(String(item.code || 'CORE_DIAGNOSTIC'), String(item.message || 'Unknown diagnostic'),
      outcome === 'FEASIBLE' ? 'info' : 'warning')) : [];
  diag.unshift(diagnostic('X2A_EXPERIMENTAL', 'Experimental /a/→/i/-like physical result; human phonetic identity is unverified.', 'info'));
  const result = {
    schema_version: 'performance-contract/v0', performance_id: 'performance_live_' + runId.replace(/-/g, ''),
    request_id: request.request_id, take_id: 'take_live_' + runId.replace(/-/g, ''),
    job_status: 'SUCCEEDED', realization_outcome: outcome,
    artifacts: [
      ...files.map((a) => a.kind === 'audio' || a.kind === 'dynamic-trace' ? { ...a, segment_id: map.mapped.segment_id } : a),
      manifestArtifact,
      ...(outcome === 'FEASIBLE' ? [{ kind: 'body-binding', ref: 'body-binding://v3c-M_plus/v1?core=' + CORE_SHA }] : []),
    ],
    timeline: outcome === 'FEASIBLE' ? core.timeline : [],
    diagnostics: diag,
    provenance: {
      backend: BACKEND, backend_version: VERSION, contract_version: 'performance-contract/v0',
      seed: request.seed, input_digest: digest(request),
      input_digest_algorithm: 'sha256-over-recursively-sorted-json-v1',
    },
  };
  await fs.writeFile(path.join(DATA, 'takes', result.take_id + '.json'),
    JSON.stringify({ request, result }, null, 2), { flag: 'wx' });
  return result;
}

function respond(res, status, value) {
  const json = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
  });
  res.end(json);
}

async function getBody(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('Expected application/json.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new Error('JSON body exceeds 64 KiB limit.');
    chunks.push(chunk);
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
}

function assertCore() {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: CORE, encoding: 'utf8', timeout: 10000 });
  if (res.status !== 0 || res.stdout.trim() !== CORE_SHA) {
    throw new Error('Core must be full checkout at audited commit ' + CORE_SHA + '; found ' + res.stdout.trim());
  }
}

export async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('Invalid MORPHO_LIVE_PORT.');
  assertCore();
  for (const folder of ['artifacts', 'runs', 'takes']) {
    await fs.mkdir(path.join(DATA, folder), { recursive: true });
  }
  const validate = await schemas();
  const solverGate = makeSingleFlightGate();
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.origin && !['http://127.0.0.1:5173', 'http://localhost:5173'].includes(req.headers.origin)) {
        return respond(res, 403, { error: 'Untrusted Origin' });
      }
      if (req.method === 'GET' && req.url === '/live/health') {
        return respond(res, 200, { status: 'ready', core_commit: CORE_SHA, backend_version: VERSION });
      }
      if (req.method === 'GET' && /^\/live\/artifacts\/[a-f0-9]{64}\.(wav|csv|npy|json)$/.test(req.url || '')) {
        const name = req.url.slice('/live/artifacts/'.length);
        const data = await fs.readFile(path.join(DATA, 'artifacts', name));
        if (sha(data) !== name.slice(0, 64)) return respond(res, 500, { error: 'Artifact hash mismatch' });
        const mime = { wav: 'audio/wav', csv: 'text/csv; charset=utf-8', npy: 'application/octet-stream', json: 'application/json' }[name.split('.').pop()];
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
        return res.end(data);
      }
      if (req.method !== 'POST' || req.url !== '/live/perform') return respond(res, 404, { error: 'Not found' });
      if (!solverGate.claim()) return respond(res, 429, { error: 'Physical solver busy. Try again.' });
      // Claim the sole worker synchronously, BEFORE awaiting the request body.
      // Otherwise two simultaneous body streams can both pass the busy check.
      try {
        const input = await getBody(req);
        if (!validate(input)) return respond(res, 400, { outcome: 'INVALID', issues: validate.errors });
        const request = input;
        const result = await performCoreBridge(request).catch((error) => failure(request, error instanceof Error ? error.message : String(error)));
        return respond(res, 200, result);
      } finally { solverGate.release(); }
    } catch (error) {
      return respond(res, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  // An incomplete JSON upload must not monopolize the single solver indefinitely.
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(PORT, '127.0.0.1', () => {
    console.log('Morphoacoustics X2a listening on http://127.0.0.1:' + PORT);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => { console.error(error); process.exitCode = 1; });
}
