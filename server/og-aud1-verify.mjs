/** Independent (JS) admission audit for the fixed OG-AUD1 research-preview SI pair.
 * Untrusted manifest alone is NEVER a proof of source, pressure or PCM provenance.
 */
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

export const CORE_SHA = 'f689d5c61bfb05728b326f3e811deab4eba37750';
export const SOURCE_SHA = 'sha256:52bbebf4fec46861b252d0abf81a239f1396e5ec499527bd5168a299f9eafddd';
export const EXPECTED_BODIES = Object.freeze({ small_C: .00015, large_C: .0006 });
const FPS=48000, N=48000, RHO=1.2, C=343, S=.0003, LA=.08, LB=.09, LC=.06;
const TONES=[233,733,997,1801,2801], W=[.35,.30,.25,.18,.10], PH=[0,.17,.41,.29,.63];
const Z0=RHO*C/S, TAU=2*LA/C;

export function sha(data) {
  return 'sha256:'+createHash('sha256').update(data).digest('hex');
}
export function parseNpy(bytes,shape) {
  assert.ok(Buffer.isBuffer(bytes),'not bytes');
  assert.equal(bytes.subarray(0,6).toString('latin1'),'\x93NUMPY');
  assert.equal(bytes[6],1,'Only NumPy v1 admitted');
  assert.equal(bytes[7],0);
  const size=bytes.readUInt16LE(8),head=bytes.subarray(10,10+size).toString('latin1');
  assert.match(head,/'descr': '<f8'/);
  assert.match(head,/'fortran_order': False/);
  const shapeText=head.match(/'shape': \(([^)]*)\)/)?.[1];
  assert.ok(shapeText,'NPY shape unavailable');
  const actual=shapeText.split(',').map(x=>x.trim()).filter(Boolean).map(Number);
  assert.deepEqual(actual,shape,'unexpected SI NPY shape');
  const length=shape.reduce((a,b)=>a*b,1),start=10+size;
  assert.equal(bytes.length,start+length*8,'unexpected raw bytes');
  return {bytes,start,length,at(i) { assert.ok(Number.isInteger(i)&&i>=0&&i<length); return bytes.readDoubleLE(start+i*8); }};
}
export function source(t) {
  if(t < .1 || t >= .4) return 0;
  const dt=t-.1,env=Math.sin(Math.PI*dt/.3)**6;
  let sum=0;
  for(let i=0;i<TONES.length;i++)sum+=W[i]*Math.sin(2*Math.PI*TONES[i]*dt+PH[i]);
  return 1e-6*env*sum;
}
function forward(t,r) {
  let value=0,step=1;
  for(let k=0;k<=48;k++) {
    value+=step*source(t-k*TAU);
    step*=r;
  }
  return Z0*value;
}
function assertApprox(actual,expected,scale,label) {
  assert.ok(Number.isFinite(actual),'Non-finite '+label);
  assert.ok(Math.abs(actual-expected) <= 1e-8+1e-8*scale,
    label+' discrepancy: '+actual+' vs '+expected);
}
function banker(value) {
  const flo=Math.floor(value),fraction=value-flo;
  return fraction<.5 ? flo : fraction>.5 ? flo+1 : flo%2===0 ? flo : flo+1;
}
export function assertWav(bytes,pressure,gain) {
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(bytes.length,44+N*2);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.readUInt32LE(4),bytes.length-8);
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.equal(bytes.toString('ascii',12,16),'fmt ');
  assert.equal(bytes.readUInt32LE(16),16);
  assert.equal(bytes.readUInt16LE(20),1);
  assert.equal(bytes.readUInt16LE(22),1);
  assert.equal(bytes.readUInt32LE(24),FPS);
  assert.equal(bytes.readUInt32LE(28),FPS*2);
  assert.equal(bytes.readUInt16LE(32),2);
  assert.equal(bytes.readUInt16LE(34),16);
  assert.equal(bytes.toString('ascii',36,40),'data');
  assert.equal(bytes.readUInt32LE(40),N*2);
  for(let i=0;i<N;i++) {
    const desired=banker(pressure.at(i)*gain*32767);
    assert.ok(Number.isFinite(desired)&&Math.abs(desired)<=32767,'PCM would clip');
    assert.equal(bytes.readInt16LE(44+i*2),desired,'PCM not derived from raw Pa');
  }
}
function verifyGraph(g,area) {
  assert.equal(g?.schema,'og4.branch3.prepared.snapshot.v1');
  assert.equal(g.backend_id,'og4.fixed.passive.branch3.pu.v1');
  assert.match(g.blueprint_digest,/^sha256:[a-f0-9]{64}$/);
  assert.match(g.preparation_digest,/^sha256:[a-f0-9]{64}$/);
  assert.equal(g.blueprint.schema,'og4.passive.branch3.v1');
  assert.deepEqual(g.blueprint.junctions,[{id:'J',law:'ideal.branch3.p_u',ports:['A.out','B.in','C.in']}]);
  assert.equal(g.blueprint.source.port,'A.in');
  assert.equal(g.blueprint.source.kind,'prescribed_volume_flow');
  assert.deepEqual(g.blueprint.loads,[{port:'B.out',kind:'matched'},{port:'C.out',kind:'matched'}]);
  assert.equal(g.blueprint.organs.length,3);
  for(const [i,n] of ['A','B','C'].entries()){
    const o=g.blueprint.organs[i];
    assert.equal(o.id,n);
    assert.equal(o.revision,'v1');
    assert.equal(o.area_m2,i===2?area:S);
    assert.equal(o.length_m,[LA,LB,LC][i]);
    assert.equal(o.sound_speed_m_s,C);
    assert.equal(o.air_density_kg_m3,RHO);
    for(const [p,dir] of [['inlet','in'],['outlet','out']]) {
      assert.deepEqual(o[p],{id:n+'.'+dir,kind:'acoustic.p_u',direction:p});
    }
  }
}
export function verifyPair(manifest, files, expectedCore=CORE_SHA) {
  assert.equal(manifest?.schema,'og-aud1.pinned-preview.pair.v0');
  assert.equal(manifest.status,'PREVIEW_UNADOPTED');
  assert.equal(manifest.core_commit,expectedCore);
  assert.equal(manifest.source_program,'exp045.analytic_fixed_U_m3s.v1');
  assert.equal(manifest.source_reference_plane,'A.in');
  assert.equal(manifest.og4_phasor_source_policy,
    'blueprint_phasor_source_is_validation_only; time_source_override_is_separate_exact_program');
  assert.equal(manifest.sample_rate_hz,FPS);
  assert.equal(manifest.frames,N);
  assert.equal(manifest.source_unit,'m3/s');
  assert.equal(manifest.pressure_unit,'Pa');
  assert.equal(manifest.physical_claim,'CAUSAL_SOURCE_PORT_PRESSURE_NON_RADIATED');
  assert.equal(manifest.source_sha256,SOURCE_SHA);
  assert.equal(manifest.source_path,'raw_U_m3_s.npy');
  assert.deepEqual(manifest.port_order,['A.in','A.out','B.in','B.out','C.in','C.out']);
  assert.deepEqual(manifest.port_state_order,['pressure_Pa','signed_volume_flow_m3s']);
  assert.ok(Number.isFinite(manifest.shared_playback_gain_inverse_pa)&&manifest.shared_playback_gain_inverse_pa>0);
  assert.ok(Number.isFinite(manifest.relative_raw_pressure_rms_difference)
    && manifest.relative_raw_pressure_rms_difference>.7);
  assert.ok(Array.isArray(manifest.records)&&manifest.records.length===2);
  const expected=['raw_U_m3_s.npy'];
  for (const body of Object.keys(EXPECTED_BODIES)) expected.push(
    body+'/raw_p_Ain_Pa.npy',body+'/monitor_48k_pcm16.wav',
    body+'/all_six_port_p_Pa_u_m3s.npy');
  assert.deepEqual(Object.keys(files).sort(),expected.sort(),'file allowlist');
  assert.deepEqual(Object.keys(manifest.artifact_sha256).sort(),expected.sort(),'hash allowlist');
  for (const name of expected) assert.equal(sha(files[name]),manifest.artifact_sha256[name]);
  const u=parseNpy(files['raw_U_m3_s.npy'],[N]);
  for(let i=0;i<N;i+=97) assertApprox(u.at(i),source(i/FPS),1e-6,'source program');
  const prepared=[];
  for (let n=0;n<2;n++) {
    const body=Object.keys(EXPECTED_BODIES)[n],area=EXPECTED_BODIES[body];
    const r=manifest.records[n];
    assert.equal(r.body,body);
    assert.equal(r.c_area_m2,area);
    verifyGraph(r.graph,area);
    prepared.push(r.graph.preparation_digest);
    const ppath=body+'/raw_p_Ain_Pa.npy',wpath=body+'/monitor_48k_pcm16.wav',
      xpath=body+'/all_six_port_p_Pa_u_m3s.npy';
    assert.deepEqual([r.raw_pressure_path,r.wave_path,r.six_port_path],[ppath,wpath,xpath]);
    const p=parseNpy(files[ppath],[N]),all=parseNpy(files[xpath],[6,2,N]);
    const val=(port,quantity,i)=>all.at(((port*2+quantity)*N)+i);
    const zc=RHO*C/area,zj=1/(1/Z0+1/zc),reflection=(zj-Z0)/(zj+Z0);
    assertApprox(r.diagnostic.reflection,reflection,1,'reflection');
    assert.equal(r.diagnostic.echo_order,48);
    assert.ok(r.diagnostic.omitted_echo_pressure_upper_bound_pa < 1e-10);
    assert.ok(r.diagnostic.relative_energy_imbalance < 1e-8);
    assertWav(files[wpath],p,manifest.shared_playback_gain_inverse_pa);
    let inlet=0,outlet=0;
    for(let i=0;i<N;i++) {
      const pa=p.at(i),pa0=val(0,0,i),ua=val(0,1,i),pb=val(1,0,i),
      pc=val(2,0,i),pd=val(4,0,i),uj=val(1,1,i)-val(2,1,i)-val(4,1,i);
      assert.ok(Number.isFinite(pa)&&Number.isFinite(ua));
      assert.equal(pa,pa0,'raw p not tied to all port');
      assert.equal(ua,u.at(i),'U_A.in altered');
      assert.ok(Math.abs(pb-pc)<1e-10&&Math.abs(pb-pd)<1e-10,'junction p');
      assert.ok(Math.abs(uj)<1e-14,'junction U');
      inlet+=pa*ua/FPS;
      outlet+=(val(3,0,i)*val(3,1,i)+val(5,0,i)*val(5,1,i))/FPS;
      if(i%151===0) {
        const t=i/FPS,fs=forward(t,reflection),pj=(1+reflection)*forward(t-LA/C,reflection);
        assertApprox(pa,2*fs-Z0*source(t),Math.max(1,Math.abs(pa)),'physical source pressure');
        assertApprox(pb,pj,Math.max(1,Math.abs(pj)),'junction propagation');
        assertApprox(val(3,0,i),(1+reflection)*forward(t-LA/C-LB/C,reflection),
          Math.max(1,Math.abs(pj)),'B outlet propagation');
        assertApprox(val(5,0,i),(1+reflection)*forward(t-LA/C-LC/C,reflection),
          Math.max(1,Math.abs(pj)),'C outlet propagation');
      }
    }
    assert.ok(inlet>0&&outlet>0&&Math.abs(inlet-outlet)/inlet<1e-8,'passivity/energy');
  }
  assert.notEqual(prepared[0],prepared[1],'body digest collision');
  return true;
}
