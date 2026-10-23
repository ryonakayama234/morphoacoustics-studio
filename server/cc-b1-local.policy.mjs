import test from 'node:test';
import assert from 'node:assert/strict';
import { CORE_SHA, PHYSICAL_VERSION, checkSelection, assertPair } from './cc-b1-local.mjs';

const inspection = Object.freeze({
  parent: { preset_id: 'v3b-axial-M0', revision: 1,
    preparation_digest: 'sha256:' + 'a'.repeat(64) },
  editable: { cavity_id: 'oral-vowel-a-16x10mm', section_index: 8,
    allowed_ratios: ['0.90', '1.10'] },
});
function report(ratio = '0.90') {
  return {
    schema_version: PHYSICAL_VERSION, status: 'SUCCEEDED',
    parent: structuredClone(inspection.parent),
    edit_intent: { rest_area_ratio: ratio, section_index: 8,
      cavity_id: 'oral-vowel-a-16x10mm' },
    body_revision: { revision_id: 'cc-b1-' + 'f'.repeat(64),
      parent: structuredClone(inspection.parent),
      edit: { section_index: 8 } },
    source: { id: 'lf_fixed', sha256_le_f64: 'a'.repeat(64) },
    acoustic_calls_per_body: 102, sample_rate_hz: 48000, sample_count: 24000,
    shared_playback_gain: 0.1, relative_raw_pa_l2: 0.03,
    artifacts: ['baseline_pa.npy','edited_pa.npy','baseline.wav','edited.wav',
      'baseline_trace.csv','edited_trace.csv'].map(name =>
        ({path:name,sha256:'f'.repeat(64),size_bytes:42})),
  };
}
test('private bounded adapter pins source SHA, no arbitrary 1D, motor or source controls', () => {
  assert.match(CORE_SHA, /^[a-f0-9]{40}$/);
  assert.equal(checkSelection({rest_area_ratio:'0.90'}),'0.90');
  assert.equal(checkSelection({rest_area_ratio:'1.10'}),'1.10');
  for (const value of [null, [], {}, {rest_area_ratio:0.9}, {rest_area_ratio:'1.00'},
    {rest_area_ratio:'0.91'}, {rest_area_ratio:'0.90',source:'fake'},
    {rest_area_ratio:'0.90',section_index:5}, {rest_area_ratio:true}]) {
    assert.throws(()=>checkSelection(value), /INVALID_BODY_EDIT/);
  }
});
test('Core receipt checks exact SI body, same source/schema fixed task and two pressure archives',()=>{
  assert.doesNotThrow(()=>assertPair(report(), inspection, '0.90'));
  const mutate = [
    x=>x.parent.revision=2,
    x=>x.edit_intent.section_index=7,
    x=>x.edit_intent.rest_area_ratio='1.10',
    x=>x.body_revision.revision_id='made-up',
    x=>x.body_revision.parent.preparation_digest='sha256:tampered',
    x=>x.sample_rate_hz=44100,
    x=>x.acoustic_calls_per_body=0,
    x=>x.sample_count=1,
    x=>x.relative_raw_pa_l2=0,
    x=>x.relative_raw_pa_l2=NaN,
    x=>x.shared_playback_gain=Infinity,
    x=>x.artifacts.pop(),
    x=>x.artifacts[0].path='fake.mp3',
    x=>x.artifacts[1].sha256='invalid',
  ];
  for(const change of mutate){
    const x=report(); change(x);
    assert.throws(()=>assertPair(x,inspection,'0.90'), /MISMATCH/);
  }
});
