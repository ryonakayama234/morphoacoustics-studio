import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  checkRequest, checkManifest, checkWav, checkNpyF64, BODY, CORE_SHA, PHYSICS_VERSION,
  REQUIRED_ARTIFACTS, PREPARED_DIGESTS, safeFile,
} from './wg2-local.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
function npy(count, amplitude = 0) {
  const header = "{'descr': '<f8', 'fortran_order': False, 'shape': (" + count + ",), }";
  const pad = (16 - ((10 + header.length + 1) % 16)) % 16;
  const text = header + ' '.repeat(pad) + '\n';
  const buffer = Buffer.alloc(10 + text.length + 8 * count);
  Buffer.from([0x93,78,85,77,80,89,1,0]).copy(buffer);
  buffer.writeUInt16LE(text.length, 8);
  buffer.write(text, 10, 'ascii');
  if (amplitude !== 0) buffer.writeDoubleLE(amplitude, 10 + text.length);
  return { buffer, f64sha: hash(buffer.subarray(10 + text.length)) };
}
function wav(frames) {
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1,20); buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(48000,24); buffer.writeUInt32LE(96000,28);
  buffer.writeUInt16LE(2,32); buffer.writeUInt16LE(16,34);
  buffer.write('data',36); buffer.writeUInt32LE(frames * 2,40);
  return buffer;
}
function fixture(preset_id = 'v3b-axial-M0') {
  const request = { preset_id, revision: 1, character_id: 'char_mio', duration_s: 0.25 };
  const body = BODY[preset_id], frames = 12000;
  const ticks = Math.ceil(frames * body.clock_hz / 48000);
  const arrays = {
    'source_flow_48k.npy': npy(frames, 1e-7),
    'mouth_pressure_native_pa.npy': npy(ticks, 0.1),
    'mouth_flow_native_m3_s.npy': npy(ticks, 1e-8),
    'mouth_pressure_monitor_48k_pa.npy': npy(frames, 0.02),
  };
  const files = {};
  for (const [name, data] of Object.entries(arrays)) files[name] = data.buffer;
  files['audio.wav'] = wav(frames);
  const manifest = {
    schema_version: PHYSICS_VERSION, status:'SUCCEEDED', core_commit:CORE_SHA,
    task:'static-/a/-like-sustained-vowel', is_calibrated_microphone:false,
    physical_walls:'fixed',
    body:{ character_id: request.character_id, preset_id, revision:1,
      length_m:body.length_m, preparation_digest:PREPARED_DIGESTS[preset_id] },
    source:{ id:'sv1-prescribed-100hz-lf-rd1', role:'externally-prescribed-volume-flow',
      duration_s:0.25, sha256_f64:arrays['source_flow_48k.npy'].f64sha },
    observer: {
      output_samples:frames, physics_clock_hz:body.clock_hz,
      observation_point:'mouth-port-pressure-not-external-microphone',
      sample_rate_hz:48000, playback_full_scale_pa:8, termination:'b0',
      physics_ticks:ticks, max_abs_energy_residual_j:1e-18,
      source_flow_sha256:arrays['source_flow_48k.npy'].f64sha,
      physical_pressure_sha256:arrays['mouth_pressure_native_pa.npy'].f64sha,
      monitor_pressure_sha256:arrays['mouth_pressure_monitor_48k_pa.npy'].f64sha,
      wav_sha256:hash(files['audio.wav']),
    },
    artifacts:Object.fromEntries(REQUIRED_ARTIFACTS.map(name =>
      [name,{ sha256:hash(files[name]), bytes:files[name].length }])),
  };
  return { request, files, manifest };
}
test('strict body/char/revision/duration request, no text or arbitrary physics slider', () => {
  const {request} = fixture();
  assert.deepEqual(checkRequest(request), request);
  for (const invalid of [
    {...request, preset_id:'missing'}, {...request, revision:2},
    {...request, revision:true}, {...request, character_id:'../outside'},
    {...request, duration_s:0.33}, {...request, script:'こんにちは'},
    {...request, duration_s:'0.25'}, null, [],
  ]) assert.throws(() => checkRequest(invalid), /UNSUPPORTED/);
});
test('independent Node receipt accepts exactly supported M0/M1 and raw WAV/NPY shapes', () => {
  for (const body of Object.keys(BODY)) {
    const {request,files,manifest}=fixture(body);
    assert.equal(checkManifest(manifest,request,files),manifest);
    checkWav(files['audio.wav'],12000);
    assert.match(checkNpyF64(files['source_flow_48k.npy'],12000),/^[a-f0-9]{64}$/);
  }
});
test('forged physical identity or acoustic evidence always refused', () => {
  const {request,files,manifest}=fixture();
  const invalid = [
    {...manifest, core_commit:'0'.repeat(40)},
    {...manifest, source:{...manifest.source,id:'fake'}},
    {...manifest, body:{...manifest.body, preset_id:'v3b-axial-M1'}},
    {...manifest, body:{...manifest.body, revision:2}},
    {...manifest, body:{...manifest.body, preparation_digest:'sha256:' + 'f'.repeat(64)}},
    {...manifest, observer:{...manifest.observer, physics_clock_hz:1000}},
    {...manifest, observer:{...manifest.observer, physical_pressure_sha256:'0'.repeat(64)}},
    {...manifest, is_calibrated_microphone:true},
    {...manifest, artifacts:{...manifest.artifacts, ['audio.wav']:{sha256:'0'.repeat(64),bytes:files['audio.wav'].length}}},
  ];
  for(const forged of invalid) assert.throws(()=>checkManifest(forged,request,files));
  const changed = {...files, ['audio.wav']:Buffer.from(files['audio.wav'])};
  changed['audio.wav'][44]=1;
  assert.throws(()=>checkManifest(manifest,request,changed), /TAMPERED/);
  const brokenNpy = Buffer.from(files['source_flow_48k.npy']);
  brokenNpy.writeDoubleLE(Number.NaN,brokenNpy.length - 8);
  assert.throws(()=>checkNpyF64(brokenNpy,12000), /NONFINITE/);
  const brokenWav = Buffer.from(files['audio.wav']);
  brokenWav.writeUInt32LE(44100,24);
  assert.throws(()=>checkWav(brokenWav,12000),/FORGED/);
});


test('directory ancestor swap to symlink cannot redirect completed Take reads', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wg2-no-follow-'));
  const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), 'wg2-target-'));
  try {
    const id = 'ab2d3f41-aaaa-4bbb-9ccc-1234567890ab';
    const run = path.join(root, 'runs', id);
    await fs.mkdir(run, { recursive:true });
    await fs.mkdir(path.join(run, 'physical'));
    await fs.writeFile(path.join(run, 'physical', 'manifest.json'),
      Buffer.from('sufficient body of an otherwise legitimate physical manifest'));
    assert.ok((await safeFile(path.join(run,'physical'),'manifest.json',root)).length > 40);
    await fs.rename(path.join(run,'physical'),path.join(run,'physical-moved'));
    await fs.symlink(elsewhere,path.join(run,'physical'),'dir');
    await fs.writeFile(path.join(elsewhere,'manifest.json'),Buffer.from('evil replacement content with enough bytes to pass size'));
    await assert.rejects(
      () => safeFile(path.join(run,'physical'),'manifest.json',root),
      /ELOOP|ENOTDIR|WG2_INVALID/
    );
    await fs.rename(run,path.join(root,'original-run'));
    await fs.symlink(path.join(root,'original-run'),run,'dir');
    await assert.rejects(
      () => safeFile(path.join(run,'physical-moved'),'manifest.json',root),
      /ELOOP|ENOTDIR|WG2_INVALID/
    );
  } finally {
    await fs.rm(root,{recursive:true,force:true});
    await fs.rm(elsewhere,{recursive:true,force:true});
  }
});
