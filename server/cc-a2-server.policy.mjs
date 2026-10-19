import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCausalResult, CORE_SHA } from './cc-a2-server.mjs';

test('CC-A2 pins exact separate source and refuses swapped/missing body receipts', () => {
  assert.match(CORE_SHA, /^[a-f0-9]{40}$/);
  const request = {
    request_id: 'one', seed: 0,
    embodiment: { preset_id: 'v3b-axial-M0', preset_revision: 1 },
  };
  const result = {
    schema_version: 'performance-contract/v1', request_id: 'one',
    realization_outcome: 'FEASIBLE', artifacts: [{ kind: 'audio', ref: 'audio.wav' }],
    embodiment: { status: 'MISSING_PRESET' },
    provenance: { seed: 0, backend_version: 'cc-a2-axial-live/1',
      input_digest_algorithm: 'sha256-canonical-json-v1',
      input_digest: 'sha256:' + 'a'.repeat(64) },
  };
  assert.throws(() => assertCausalResult(request, result, null, null), /Unbound body/);
  const other = structuredClone(result);
  other.embodiment = { status: 'BOUND', preset_id: 'v3b-axial-M1', preset_revision: 1,
    preparation_digest: 'sha256:' + 'b'.repeat(64) };
  assert.throws(() => assertCausalResult(request, other, null, null), /Selected body/);
  const refused = structuredClone(result);
  refused.realization_outcome = 'UNSUPPORTED';
  refused.artifacts = [];
  assert.doesNotThrow(() => assertCausalResult(request, refused, null, null));
  refused.artifacts = [{ kind: 'audio', ref: 'wrong.wav' }];
  assert.throws(() => assertCausalResult(request, refused, null, null), /Unbound body/);
});
