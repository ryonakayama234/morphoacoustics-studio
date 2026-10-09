import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const core = process.env.MORPHO_CORE_DIR;
assert.ok(core, 'MORPHO_CORE_DIR is required');
const injected = path.join(core, 'src', 'morphoacoustics', '__untracked_probe__.py');
const request = JSON.parse(readFileSync(new URL('../vendor/performance-contract/v0/examples/request.json', import.meta.url), 'utf8'));
request.request_id = 'x2a_dirty_checkout_negative_smoke';
request.seed = 0;
request.script.segments = [{ segment_id: 's1', speaker_character_id: request.character.character_id, text: 'あい' }];
request.direction = { schema_version: 'performance-contract/v0', direction_id: 'd1', revision: 1, controls: {}, segment_overrides: [] };
request.requested_capabilities = ['audio', 'timeline', 'diagnostics'];

// Simulate an added importable Python module AFTER the live server starts.
writeFileSync(injected, 'INJECTED = True\n', { flag: 'wx' });
try {
  const response = await fetch('http://127.0.0.1:8765/live/perform', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.job_status, 'FAILED', JSON.stringify(result));
  assert.deepEqual(result.artifacts, []);
  assert.match(JSON.stringify(result.diagnostics), /modified or untracked/);
  console.log('Dirty checkout live HTTP regression passed: no falsely successful Take.');
} finally {
  unlinkSync(injected);
}
