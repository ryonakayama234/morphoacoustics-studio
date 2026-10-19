import { createHash } from 'node:crypto';

// Independent JavaScript reproduction of frozen Experiment 029's
// np.rint(pressure / 1e-9).astype('<i8').tobytes() SHA-256 receipt.
// Not a new physics gate, phonetic evaluator, or quantitative SPL metric.
export const X2A_PRESSURE_QUANTUM_PA = 1e-9;
export const X2A_PRESSURE_SAMPLES = 24000;
export const X2A_RAW_PRESSURE_SHA256 =
  'dc14c78bcc6d4a19c11fe2a01ba84b1394802b66626f4dfa27cc582c741e714e';

function roundTiesToEven(value) {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new Error('Raw pressure quantization is nonfinite or outside exact integer range.');
  }
  const whole = Math.trunc(value);
  const fractional = Math.abs(value - whole);
  return whole + ((fractional > 0.5
    || (fractional === 0.5 && Math.abs(whole % 2) === 1))
    ? Math.sign(value) : 0);
}

function npyFloat64Offset(bytes, sampleCount) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 14
    || !bytes.subarray(0, 6).equals(Buffer.from([0x93, 78, 85, 77, 80, 89]))) {
    throw new Error('Raw pressure is not a valid NumPy .npy file.');
  }
  const major = bytes[6]; const minor = bytes[7];
  if (!((major === 1 || major === 2) && minor === 0)) {
    throw new Error('Unsupported raw-pressure NPY format version.');
  }
  const start = major === 1 ? 10 : 12;
  const headerLength = major === 1 ? bytes.readUInt16LE(8) : bytes.readUInt32LE(8);
  if (headerLength < 32 || headerLength > 4096 || start + headerLength > bytes.length) {
    throw new Error('Raw-pressure NPY header length invalid.');
  }
  const header = bytes.toString('latin1', start, start + headerLength);
  if (!/['"]descr['"]\s*:\s*['"]<f8['"]/.test(header)
    || !/['"]fortran_order['"]\s*:\s*False/.test(header)
    || !new RegExp("['\\\"]shape['\\\"]\\s*:\\s*\\(\\s*" + sampleCount + "\\s*,\\s*\\)").test(header)) {
    throw new Error('Raw-pressure NPY dtype, ordering, or shape violates the frozen fixture.');
  }
  const offset = start + headerLength;
  if (bytes.length !== offset + sampleCount * 8) {
    throw new Error('Raw-pressure NPY sample length does not match the audited fixture.');
  }
  return offset;
}

export function quantizedRawPressureSha256(npyBytes, sampleCount = X2A_PRESSURE_SAMPLES) {
  const start = npyFloat64Offset(npyBytes, sampleCount);
  const digest = createHash('sha256');
  const encoded = Buffer.allocUnsafe(8);
  for (let i = 0; i < sampleCount; i++) {
    const pressure = npyBytes.readDoubleLE(start + i * 8);
    const integer = roundTiesToEven(pressure / X2A_PRESSURE_QUANTUM_PA);
    encoded.writeBigInt64LE(BigInt(integer), 0);
    digest.update(encoded);
  }
  return digest.digest('hex');
}

export function assertAuditedRawPressureBytes(bytes) {
  const observed = quantizedRawPressureSha256(bytes);
  if (observed !== X2A_RAW_PRESSURE_SHA256) {
    throw new Error('Core raw-pressure NPY waveform diverges from frozen Experiment 029 oracle.');
  }
  return observed;
}
