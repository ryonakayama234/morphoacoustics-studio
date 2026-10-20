/** Preview trust boundary unit tests; full real Core integration runs separately in CI. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sha, parseNpy, source, verifyPair, assertWav, CORE_SHA } from './og-aud1-verify.mjs';

function npyZeros(){
  const headerStart="{'descr': '<f8', 'fortran_order': False, 'shape': (48000,), }";
  const padded=headerStart+' '.repeat((16-((10+headerStart.length+1)%16))%16)+'\n';
  const b=Buffer.alloc(10+padded.length+48000*8);
  b.write('\x93NUMPY',0,'latin1');b[6]=1;b[7]=0;
  b.writeUInt16LE(padded.length,8);b.write(padded,10,'latin1');
  return b;
}
function validWav(){
  const b=Buffer.alloc(44+48000*2);
  b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);
  b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(48000,24);b.writeUInt32LE(96000,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write('data',36);b.writeUInt32LE(48000*2,40);
  return b;
}
test('Exact pinned 40 hex SHA and fixed analytical source are explicit',()=>{
  assert.match(CORE_SHA,/^[a-f0-9]{40}$/);
  assert.equal(source(.04),0);
  assert.equal(source(.55),0);
  assert.equal(source(.1),0);
  assert.ok(Math.abs(source(.22))>0);
});
test('NPY refuses wrong dtype, wrong shape, truncated payload, malicious header',()=>{
  const b=npyZeros();
  assert.equal(parseNpy(b,[48000]).at(1234),0);
  const corrupt=Buffer.from(b);
  corrupt.write('>f8',corrupt.indexOf('<f8'));
  assert.throws(()=>parseNpy(corrupt,[48000]));
  assert.throws(()=>parseNpy(b,[1000]));
  assert.throws(()=>parseNpy(b.subarray(0,b.length-8),[48000]));
});
test('PCM decoding independently rejects RIFF corruption or mismatched pressure',()=>{
  const b=validWav(),p=parseNpy(npyZeros(),[48000]);
  assert.doesNotThrow(()=>assertWav(b,p,1));
  const modified=Buffer.from(b);
  modified.writeInt16LE(1,44+1200*2);
  assert.throws(()=>assertWav(modified,p,1),/PCM not derived/);
  const stereo=Buffer.from(b);
  stereo.writeUInt16LE(2,22);
  assert.throws(()=>assertWav(stereo,p,1));
});
test('Research manifest cannot self-certify a physical Take',()=>{
  assert.throws(()=>verifyPair({},{}));
  assert.equal(sha(Buffer.from('abc')),'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
