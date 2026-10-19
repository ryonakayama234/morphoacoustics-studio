/** CC-A2 candidate: separate limited local v1 bridge; does not modify adopted X2a. */
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { verifyCoreRevision } from './core-revision.mjs';
import { quantizedRawPressureSha256, X2A_RAW_PRESSURE_SHA256 } from './raw-pressure-oracle.mjs';

// Full reviewed tree must be explicitly repinned after any Core PR HEAD change.
// This is a candidate SHA, NOT an accepted main release.
export const CORE_SHA = 'b569f044bfda309dff1a00cccf8365754e6b1355';
export const CORE_BACKEND_VERSION = 'cc-a2-axial-live/1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = path.resolve(process.env.MORPHO_CORE_DIR || path.join(ROOT, '..', 'morphoacoustics'));
const DATA = path.resolve(process.env.MORPHO_CC_A2_DATA_DIR || path.join(ROOT, '.morpho-cc-a2-data'));
const PYTHON = process.env.MORPHO_PYTHON || 'python';
const PORT = Number(process.env.MORPHO_CC_A2_PORT || 8766);
const FILES = Object.freeze({
  audio: ['audio.wav', '.wav', 'audio/wav'],
  'raw-pressure': ['raw_pressure_pa.npy', '.npy', 'application/x-npy'],
  'dynamic-trace': ['physical_trace.csv', '.csv', 'text/csv'],
  'physical-receipt': ['physical_receipt.json', '.json', 'application/json'],
});
const BODY_LENGTH = Object.freeze({ 'v3b-axial-M0': 0.160, 'v3b-axial-M1': 0.176 });

function sha(data) { return createHash('sha256').update(data).digest('hex'); }
function reject(code, message) { return { code, message }; }

async function makeValidator(type) {
  // Read ONLY the exact pinned upstream Core v0+v1 contract. No Studio-forked
  // schema or cross-language recreation of the Python input digest algorithm.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, strictRequired: false });
  for (const [version, names] of [
    ['v0', ['common', 'character', 'script', 'direction', 'performance-request', 'performance-result']],
    ['v1', ['common', 'performance-request', 'performance-result']],
  ]) {
    for (const name of names) {
      const p = path.join(CORE, 'contracts', 'performance', version, name + '.schema.json');
      ajv.addSchema(JSON.parse(await fs.readFile(p, 'utf8')));
    }
  }
  return ajv.getSchema('https://morphoacoustics.local/contracts/performance/v1/performance-' + type + '.schema.json');
}

export function assertCausalResult(request, result, receipt, rawBytes) {
  if (result?.schema_version !== 'performance-contract/v1'
    || result?.request_id !== request.request_id || result?.provenance?.seed !== request.seed
    || result?.provenance?.backend_version !== CORE_BACKEND_VERSION
    || result?.provenance?.input_digest_algorithm !== 'sha256-canonical-json-v1'
    || !/^sha256:[a-f0-9]{64}$/.test(result?.provenance?.input_digest || '')) {
    throw new Error('Core v1 identity/provenance verification failed.');
  }
  const body = request.embodiment;
  if (result.embodiment?.status !== 'BOUND') {
    if (result.realization_outcome === 'FEASIBLE' || result.artifacts?.length) {
      throw new Error('Unbound body cannot produce a physical Take.');
    }
    return;
  }
  if (result.embodiment.preset_id !== body.preset_id
    || result.embodiment.preset_revision !== body.preset_revision
    || !/^sha256:[a-f0-9]{64}$/.test(result.embodiment.preparation_digest)) {
    throw new Error('Selected body was substituted.');
  }
  if (result.realization_outcome !== 'FEASIBLE') {
    if (result.artifacts?.length) throw new Error('Non-feasible result has artifacts.');
    return;
  }
  if (!Object.hasOwn(BODY_LENGTH, body.preset_id) || body.preset_revision !== 1
    || !receipt || receipt.body.preset_id !== body.preset_id || receipt.body.revision !== 1
    || receipt.body.preparation_digest !== result.embodiment.preparation_digest
    || Math.abs(receipt.body.length_m - BODY_LENGTH[body.preset_id]) > 1e-12
    || receipt.source.id !== 'lf_fixed' || receipt.source.f0_hz !== 100
    || receipt.acoustic_calls !== 102 || receipt.raw_pressure.samples !== 24000
    || receipt.raw_pressure.sample_rate_hz !== 48000 || receipt.numpy_version !== '2.4.6'
    || receipt.raw_pressure.quantization_pa !== 1e-9
    || !Array.isArray(receipt.endpoint_peak_hz) || receipt.endpoint_peak_hz.length !== 2) {
    throw new Error('Core body physical receipt does not match frozen capability.');
  }
  const expected = body.preset_id === 'v3b-axial-M0' ? [275, 2101.75] : [249.75, 1910.75];
  for (let i = 0; i < 2; i++) {
    if (Math.abs(receipt.endpoint_peak_hz[i] - expected[i]) > 0.25) {
      throw new Error('Core endpoint resonance differs from frozen Experiment028 oracle.');
    }
  }
  // Independently reconstruct actual numerical output from saved NPY bytes.
  const quantumSha = quantizedRawPressureSha256(rawBytes);
  if (quantumSha !== receipt.raw_pressure.quantized_sha256
    || (body.preset_id === 'v3b-axial-M0' && quantumSha !== X2A_RAW_PRESSURE_SHA256)) {
    throw new Error('Actual NPY raw pressure does not match the frozen/claimed numeric evidence.');
  }
}

async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new Error('Expected JSON');
  let n = 0; const parts = [];
  for await (const part of req) {
    n += part.length;
    if (n > 65536) throw new Error('Request exceeds 64KiB');
    parts.push(part);
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)));
}

async function executeCore(request, runDir) {
  const input = path.join(runDir, 'request.json');
  const output = path.join(runDir, 'output');
  await fs.writeFile(input, JSON.stringify(request), { flag: 'wx' });
  verifyCoreRevision(CORE, CORE_SHA);
  return await new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [path.join(CORE, 'tools', 'cc_a2_live.py'),
      '--request', input, '--output-dir', output], {
      cwd: CORE, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: path.join(CORE, 'src'),
        PYTHONPYCACHEPREFIX: path.join(runDir, 'pycache') },
    });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
    child.stdout.on('data', (part) => {
      stdout += part;
      if (stdout.length > 500000) child.kill('SIGKILL');
    });
    child.stderr.on('data', (part) => {
      stderr += part;
      if (stderr.length > 100000) child.kill('SIGKILL');
    });
    const done = (error, result) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve({ result, output });
    };
    child.on('error', (e) => done(e));
    child.on('close', (code) => {
      try {
        if (code !== 0) throw new Error('Core execution failed: ' + stderr.slice(0, 900) + ' ' + stdout.slice(0, 700));
        const result = JSON.parse(stdout);
        if (result.job_status !== 'SUCCEEDED') throw new Error('Core job was not successful.');
        verifyCoreRevision(CORE, CORE_SHA);
        done(null, result);
      } catch (e) { done(e); }
    });
  });
}

async function checkedFile(output, name) {
  const p = path.join(output, name);
  const st = await fs.lstat(p);
  if (!st.isFile() || st.isSymbolicLink() || st.size <= 0 || st.size > 2_000_000) {
    throw new Error('Invalid output artifact file/size: ' + name);
  }
  return fs.readFile(p);
}

async function storeArtifact(bytes, ext) {
  const hex = sha(bytes);
  const name = hex + ext;
  const dest = path.join(DATA, 'artifacts', name);
  try { await fs.writeFile(dest, bytes, { flag: 'wx' }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const existing = await fs.readFile(dest);
    if (sha(existing) !== hex) throw new Error('Content-addressed artifact corrupted.');
  }
  return '/cc-a2/artifacts/' + name;
}

export async function performCC(request, validateResult) {
  const runId = randomUUID();
  const runDir = path.join(DATA, 'runs', runId);
  await fs.mkdir(runDir);
  const { result, output } = await executeCore(request, runDir);
  if (!validateResult(result)) throw new Error('Core v1 result schema invalid: ' + JSON.stringify(validateResult.errors));
  const feasible = result.realization_outcome === 'FEASIBLE';
  const expected = Object.keys(FILES);
  if (feasible) {
    if (!Array.isArray(result.artifacts) || result.artifacts.length !== expected.length ||
      new Set(result.artifacts.map((x) => x.kind)).size !== expected.length) {
      throw new Error('Not exactly four allowlisted physical artifacts.');
    }
    const disk = JSON.parse((await checkedFile(output, 'result.json')).toString('utf8'));
    if (!isDeepStrictEqual(result, disk)) throw new Error('Core completion marker mismatch.');
  } else if (result.artifacts?.length) {
    throw new Error('Non-feasible Core result carries artifacts.');
  }
  const data = {};
  if (feasible) {
    for (const item of result.artifacts) {
      const def = FILES[item.kind];
      if (!def || item.ref !== def[0] || item.media_type !== def[2]
        || item.segment_id !== request.script.segments[0].segment_id) {
        throw new Error('Unexpected physical artifact or path substitution.');
      }
      data[item.kind] = await checkedFile(output, def[0]);
    }
    if (data.audio.length !== 48044 || data.audio.toString('ascii', 0, 4) !== 'RIFF'
      || data.audio.toString('ascii', 8, 12) !== 'WAVE'
      || data.audio.readUInt32LE(24) !== 48000 || data.audio.readUInt16LE(34) !== 16) {
      throw new Error('Invalid bounded 0.5s PCM16 audio.');
    }
    const receipt = JSON.parse(data['physical-receipt'].toString('utf8'));
    assertCausalResult(request, result, receipt, data['raw-pressure']);
  } else {
    assertCausalResult(request, result, null, null);
  }
  const saved = structuredClone(result);
  if (feasible) {
    for (const artifact of saved.artifacts) {
      artifact.ref = await storeArtifact(data[artifact.kind], FILES[artifact.kind][1]);
    }
  }
  if (!validateResult(saved)) throw new Error('Stored v1 result violates schema.');
  const record = { request, result: saved, frozen_core_result: result,
    core_commit: CORE_SHA, created_at: new Date().toISOString() };
  await fs.writeFile(path.join(DATA, 'takes', runId + '.json'),
    JSON.stringify(record, null, 2), { flag: 'wx' });
  return record;
}

async function listTakes() {
  const names = (await fs.readdir(path.join(DATA, 'takes')))
    .filter((n) => /^[0-9a-f-]{36}\.json$/.test(n)).sort();
  const items = [];
  for (const filename of names.slice(-100)) {
    const raw = await fs.readFile(path.join(DATA, 'takes', filename), 'utf8');
    const item = JSON.parse(raw);
    if (item.core_commit !== CORE_SHA) continue;
    items.push({ request: item.request, result: item.result, created_at: item.created_at });
  }
  return items;
}

function response(res, status, data) {
  const bytes = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' });
  res.end(bytes);
}

export async function startServer() {
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) throw new Error('Invalid CC-A2 port');
  verifyCoreRevision(CORE, CORE_SHA);
  for (const folder of ['runs', 'takes', 'artifacts']) {
    await fs.mkdir(path.join(DATA, folder), { recursive: true });
  }
  const validateRequest = await makeValidator('request');
  const validateResult = await makeValidator('result');
  let occupied = false;
  const server = createServer(async (req, res) => {
    try {
      if (req.headers.origin && !['http://127.0.0.1:5173', 'http://localhost:5173'].includes(req.headers.origin)) {
        return response(res, 403, reject('ORIGIN', 'Untrusted origin'));
      }
      if (req.method === 'GET' && req.url === '/cc-a2/health') {
        return response(res, 200, { status: 'ready', core_commit: CORE_SHA });
      }
      if (req.method === 'GET' && req.url === '/cc-a2/takes') return response(res, 200, await listTakes());
      if (req.method === 'GET' && /^\/cc-a2\/artifacts\/[a-f0-9]{64}\.(wav|npy|csv|json)$/.test(req.url || '')) {
        const name = req.url.slice('/cc-a2/artifacts/'.length);
        const data = await fs.readFile(path.join(DATA, 'artifacts', name));
        if (sha(data) !== name.slice(0, 64)) return response(res, 500, reject('CORRUPT', 'Artifact digest mismatch'));
        const mime = { wav: 'audio/wav', npy: 'application/octet-stream',
          csv: 'text/csv; charset=utf-8', json: 'application/json' }[name.split('.').pop()];
        res.writeHead(200, { 'Content-Type': mime, 'Content-Length': data.length,
          'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
        return res.end(data);
      }
      if (req.method !== 'POST' || req.url !== '/cc-a2/perform') return response(res, 404, reject('NOT_FOUND', 'Not found'));
      if (occupied) return response(res, 429, reject('BUSY', 'Physical solver already running'));
      occupied = true; // before await/read body
      try {
        const request = await readJson(req);
        if (!validateRequest(request)) return response(res, 400,
          reject('INVALID', JSON.stringify(validateRequest.errors)));
        const record = await performCC(request, validateResult);
        return response(res, 200, record);
      } finally { occupied = false; }
    } catch (e) {
      return response(res, 400, reject('CC_A2_FAILED', e instanceof Error ? e.message : String(e)));
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(PORT, '127.0.0.1', () => console.log('CC-A2 bounded bridge on 127.0.0.1:' + PORT));
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((e) => { console.error(e); process.exitCode = 1; });
}
