import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCausalResult, assertAuditedWavBytes, assertNoIgnoredToolExecutables,
  CORE_SHA } from './cc-a2-server.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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


test('WAV acceptance requires exact PCM mono channel/header bytes, not just RIFF rate', () => {
  const b = Buffer.alloc(44 + 48000);
  b.write('RIFF', 0, 'ascii'); b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVE', 8, 'ascii'); b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(48000, 24);
  b.writeUInt32LE(96000, 28); b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34); b.write('data', 36, 'ascii');
  b.writeUInt32LE(48000, 40);
  assert.doesNotThrow(() => assertAuditedWavBytes(b));
  const flips = [
    (x) => x.writeUInt32LE(0, 4),  // RIFF size
    (x) => x.write('bad!', 12),    // fmt id
    (x) => x.writeUInt16LE(3, 20), // non-PCM
    (x) => x.writeUInt16LE(2, 22), // stereo
    (x) => x.writeUInt32LE(12000, 28), // byte rate
    (x) => x.writeUInt16LE(4, 32), // block align
    (x) => x.write('JUNK', 36),    // data id
    (x) => x.writeUInt32LE(40, 40),// data byte count
  ];
  for (const change of flips) {
    const corrupt = Buffer.from(b);
    change(corrupt);
    assert.throws(() => assertAuditedWavBytes(corrupt), /PCM16/);
  }
});

test('malformed body length and P1/P2 are never accepted through NaN tolerance', () => {
  const request = { request_id: 'q', seed: 0,
    embodiment: { preset_id: 'v3b-axial-M0', preset_revision: 1 } };
  const result = { schema_version: 'performance-contract/v1', request_id: 'q',
    realization_outcome: 'FEASIBLE',
    embodiment: { status: 'BOUND', preset_id: 'v3b-axial-M0', preset_revision: 1,
      preparation_digest: 'sha256:' + 'a'.repeat(64) },
    provenance: { seed: 0, backend_version: 'cc-a2-axial-live/1',
      input_digest_algorithm: 'sha256-canonical-json-v1',
      input_digest: 'sha256:' + 'b'.repeat(64) },
  };
  const receipt = {
    body: { preset_id: 'v3b-axial-M0', revision: 1, length_m: 0.16,
      preparation_digest: result.embodiment.preparation_digest },
    source: { id: 'lf_fixed', f0_hz: 100 }, acoustic_calls: 102,
    raw_pressure: { samples: 24000, sample_rate_hz: 48000, quantization_pa: 1e-9 },
    numpy_version: '2.4.6', endpoint_peak_hz: [275, 2101.75],
  };
  for(const bad of ['invalid', null, {}, '0.16']) {
    const altered = structuredClone(receipt);
    altered.body.length_m = bad;
    assert.throws(() => assertCausalResult(request, result, altered, null), /physical receipt/);
  }
  for(const bad of ['invalid', null, {}, '275']) {
    const altered = structuredClone(receipt);
    altered.endpoint_peak_hz[0] = bad;
    assert.throws(() => assertCausalResult(request, result, altered, null), /resonance/);
  }
});

test('Git-ignored executable tools modules are refused prior to Python launch', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cc-a2-ignored-tools-'));
  try {
    execFileSync('git', ['init', '-q', dir]);
    mkdirSync(path.join(dir, 'tools'));
    writeFileSync(path.join(dir, '.gitignore'), 'tools/ignored_import.py\n');
    writeFileSync(path.join(dir, 'tools', 'ignored_import.py'), 'raise SystemExit("unsafe")\n');
    assert.throws(() => assertNoIgnoredToolExecutables(dir), /Ignored executable/);
    rmSync(path.join(dir, 'tools', 'ignored_import.py'));
    assert.doesNotThrow(() => assertNoIgnoredToolExecutables(dir));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
