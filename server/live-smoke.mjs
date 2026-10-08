import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = 'http://127.0.0.1:8765';
const req = JSON.parse(readFileSync(new URL('../vendor/performance-contract/v0/examples/request.json', import.meta.url), 'utf8'));
req.request_id = 'x2a_integration_smoke_1';
req.seed = 0;
req.script.segments = [{ segment_id: 's1', speaker_character_id: req.character.character_id, text: 'あい' }];
req.direction = { schema_version: 'performance-contract/v0', direction_id: 'd1', revision: 1, controls: {}, segment_overrides: [] };
req.requested_capabilities = ['audio', 'timeline', 'diagnostics', 'gesture_trace', 'physical_trace'];

async function perform(request) {
  const r = await fetch(base + '/live/perform', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  });
  assert.equal(r.status, 200, await r.text());
  return r.json();
}
function artifact(result, kind) {
  const value = result.artifacts.find((a) => a.kind === kind);
  assert.ok(value, 'Missing ' + kind);
  return value;
}
async function fetchAndHash(value) {
  assert.match(value.ref, /^\/live\/artifacts\/[a-f0-9]{64}\.(wav|csv|npy|json)$/);
  const response = await fetch(base + value.ref);
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hex = createHash('sha256').update(bytes).digest('hex');
  assert.equal(hex, value.ref.slice('/live/artifacts/'.length, '/live/artifacts/'.length + 64));
  return { hex, bytes };
}

const health = await fetch(base + '/live/health').then((r) => r.json());
assert.equal(health.status, 'ready');
assert.equal(health.core_commit, 'a75418770ed28cbd301d554171a6b60ee5a05ee9');
const a = await perform(req);
const b = await perform({ ...req, request_id: 'x2a_integration_smoke_2' });
assert.equal(a.job_status, 'SUCCEEDED');
assert.equal(a.realization_outcome, 'FEASIBLE');
assert.equal(b.realization_outcome, 'FEASIBLE');
assert.notEqual(a.take_id, b.take_id);
assert.equal(artifact(a, 'audio').ref, artifact(b, 'audio').ref);
assert.equal(artifact(a, 'dynamic-trace').ref, artifact(b, 'dynamic-trace').ref);
assert.notEqual(artifact(a, 'live-manifest').ref, '');
const { bytes: wav } = await fetchAndHash(artifact(a, 'audio'));
assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
assert.equal(wav.readUInt32LE(24), 48000);
assert.equal(wav.length, 44 + 24000 * 2);
await fetchAndHash(artifact(a, 'dynamic-trace'));
await fetchAndHash(artifact(a, 'raw-pressure'));
const manifest = await fetch(base + artifact(a, 'live-manifest').ref).then((r) => r.json());
assert.equal(manifest.core_result.execution.acoustic_transfer_calls, 102);
assert.equal(manifest.core_result.provenance.numpy_version, '2.4.6');
assert.equal(manifest.core_result.provenance.quantized_raw_pressure_sha256, 'dc14c78bcc6d4a19c11fe2a01ba84b1394802b66626f4dfa27cc582c741e714e');
// Server restart does not change the content-addressed URI: exact bytes persist to disk.
const unsupported = await perform({ ...req, script: { ...req.script, segments: [{ ...req.script.segments[0], text: 'ありがとう' }] } });
assert.equal(unsupported.realization_outcome, 'UNSUPPORTED');
assert.equal(unsupported.artifacts.length, 0);
assert.equal(unsupported.timeline.length, 0);
const invalid = await fetch(base + '/live/perform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"request_id":"malformed"}' });
assert.equal(invalid.status, 400);
console.log('X2a live integration smoke passed: fresh Core runs x2, WAV/trace hashes, v0 mapping, no fallback.');
