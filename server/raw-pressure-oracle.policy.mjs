import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertAuditedRawPressureBytes, quantizedRawPressureSha256,
  X2A_RAW_PRESSURE_SHA256 } from './raw-pressure-oracle.mjs';

function float64Npy(values, { shape = values.length, descr = '<f8', fortran = false } = {}) {
  const payload = "{'descr': '" + descr + "', 'fortran_order': " +
    (fortran ? 'True' : 'False') + ", 'shape': (" + shape + ",), }";
  const pad = (16 - ((10 + Buffer.byteLength(payload) + 1) % 16)) % 16;
  const header = Buffer.from(payload + ' '.repeat(pad) + '\n', 'latin1');
  const preamble = Buffer.from([0x93, 78, 85, 77, 80, 89, 1, 0, header.length & 255, header.length >> 8]);
  const data = Buffer.alloc(values.length * 8);
  values.forEach((v, i) => data.writeDoubleLE(v, 8 * i));
  return Buffer.concat([preamble, header, data]);
}

test('cross-language numerical oracle reproduces NumPy rint ties-to-even / little-endian int64', () => {
  const pa = 1e-9;
  const samples = [0, .5, 1.5, -.5, -1.5, 2.5, -2.5].map((n) => n * pa);
  const expectedInts = [0n, 0n, 2n, 0n, -2n, 2n, -2n];
  const expected = Buffer.alloc(expectedInts.length * 8);
  expectedInts.forEach((n, i) => expected.writeBigInt64LE(n, i * 8));
  const expectedHash = createHash('sha256').update(expected).digest('hex');
  assert.equal(quantizedRawPressureSha256(float64Npy(samples), samples.length), expectedHash);
});

test('rejects invalid NPY dtype, fortran layout, vector shape, length and nonfinite pressure', () => {
  for (const bytes of [
    Buffer.from('not an npy file'),
    float64Npy([0, 0], { descr: '>f8' }),
    float64Npy([0, 0], { fortran: true }),
    float64Npy([0, 0], { shape: 99 }),
    float64Npy([0, 0]).subarray(0, -1),
    float64Npy([0, NaN]),
    float64Npy([0, Infinity]),
  ]) {
    assert.throws(() => quantizedRawPressureSha256(bytes, 2));
  }
});

test('a structurally valid but tampered raw-pressure array is never accepted as frozen audio', () => {
  const bytes = float64Npy(Array(24000).fill(0));
  assert.notEqual(quantizedRawPressureSha256(bytes), X2A_RAW_PRESSURE_SHA256);
  assert.throws(() => assertAuditedRawPressureBytes(bytes), /diverges from frozen/);
  bytes.writeDoubleLE(1e-7, bytes.length - 8);
  assert.notEqual(quantizedRawPressureSha256(bytes), X2A_RAW_PRESSURE_SHA256);
  assert.throws(() => assertAuditedRawPressureBytes(bytes), /diverges from frozen/);
});
