import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CORE_SHA, mapCreativeRequest, makeSingleFlightGate } from './live-server.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const example = JSON.parse(readFileSync(path.join(dir, '../vendor/performance-contract/v0/examples/request.json'), 'utf8'));

function request() {
  const value = structuredClone(example);
  value.script.segments = [{ segment_id: 's1', speaker_character_id: value.character.character_id, text: 'あい' }];
  value.direction = { schema_version: 'performance-contract/v0', direction_id: 'd1', revision: 1, controls: {}, segment_overrides: [] };
  value.requested_capabilities = ['audio', 'timeline', 'diagnostics', 'gesture_trace', 'physical_trace'];
  value.seed = 0;
  return value;
}

test('pinned Core revision is a full immutable git commit', () => {
  assert.match(CORE_SHA, /^[0-9a-f]{40}$/);
});

test('maps exactly one experimental /a/→/i/-like segment and no creative direction', () => {
  assert.deepEqual(mapCreativeRequest(request()), { mapped: {
    schema_version: 'morpho-live/v1', pronunciation_id: 'v3a-a-to-i-like/v1',
    body_id: 'v3c-M_plus/v1', segment_id: 's1', text: 'あい', seed: 0,
  } });
});

test('unsupported script, number of segments, speaker, seed, and creative controls never fall back', () => {
  const cases = [
    (v) => { v.script.segments[0].text = 'ありがとう'; },
    (v) => { v.script.segments.push({ ...v.script.segments[0], segment_id: 's2' }); },
    (v) => { v.script.segments[0].speaker_character_id = 'other'; },
    (v) => { v.seed = 7; },
    (v) => { v.direction.controls.energy = 0.1; },
    (v) => { v.direction.controls.pace = 1; },
    (v) => { v.direction.note = 'happy'; },
    (v) => { v.direction.segment_overrides = [{ segment_id: 's1', note: 'whisper' }]; },
  ];
  for (const modify of cases) {
    const v = request(); modify(v);
    const outcome = mapCreativeRequest(v);
    assert.equal(outcome.mapped, undefined, JSON.stringify(v));
    assert.equal(typeof outcome.reason, 'string');
  }
});

test('atomic single-flight gate rejects concurrent entrants while first body is still pending', async () => {
  const gate = makeSingleFlightGate();
  let admitted = 0;
  const attempts = Array.from({ length: 32 }, async () => {
    if (!gate.claim()) return false;
    admitted++;
    try { await Promise.resolve(); return true; }
    finally { gate.release(); }
  });
  const results = await Promise.all(attempts);
  assert.equal(admitted, 1);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(gate.claim(), true, 'worker must be released after completion');
  assert.equal(gate.claim(), false, 'second claim must not pass until release');
  gate.release();
  assert.equal(gate.claim(), true, 'worker can accept another request after release');
  gate.release();
});
