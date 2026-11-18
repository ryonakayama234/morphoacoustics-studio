import { describe, expect, it } from 'vitest';
import { beginAudition, finishAudition, freezePhysicalTake, type AuditionTake } from './audition';

function physicalTake(body: 'M0' | 'M1', id: string): AuditionTake {
  const preset = 'v3b-axial-' + body;
  return {
    request: { embodiment: { preset_id: preset, preset_revision: 1 } },
    result: {
      take_id: id, realization_outcome: 'FEASIBLE',
      embodiment: {
        status: 'BOUND', preset_id: preset, preset_revision: 1,
        preparation_digest: 'sha256:' + body,
      },
      provenance: {
        backend: 'morphoacoustics', backend_version: 'cc-a2-axial-live/1',
        input_digest: 'sha256:' + id,
      },
      artifacts: [{ kind: 'audio', ref: '/cc-a2/artifacts/' + id + '.wav' }],
    },
  };
}

describe('VA-L0 masked creator listening, strictly post-physical observation', () => {
  const a = freezePhysicalTake(physicalTake('M0', 'a'));
  const b = freezePhysicalTake(physicalTake('M1', 'b'));

  it('freezes provenance and untouched WAV references, not a new sound or parameter', () => {
    expect(a.preset_id).toBe('v3b-axial-M0');
    expect(a.preparation_digest).toBe('sha256:M0');
    expect(a.audio_ref).toBe('/cc-a2/artifacts/a.wav');
    expect('gain' in a).toBe(false);
    expect('waveform' in a).toBe(false);
  });

  it('randomly masks order, retaining exact physical Take IDs', () => {
    const ab = beginAudition(a, b, 'body-contrast', 0, 'trial0', 't0');
    const ba = beginAudition(a, b, 'body-contrast', 1, 'trial1', 't1');
    expect([ab.first.take_id, ab.second.take_id]).toEqual(['a', 'b']);
    expect([ba.first.take_id, ba.second.take_id]).toEqual(['b', 'a']);
    expect(() => beginAudition(a, a, 'body-contrast', 0, 'no', 't')).toThrow();
    expect(() => beginAudition(a, b, 'body-contrast', -1, 'bad', 't')).toThrow();
  });

  it('same-audio control reproduces the exact same WAV on both sides', () => {
    const aa = beginAudition(a, b, 'same-audio-control', 0, 'aa', 't');
    const bb = beginAudition(a, b, 'same-audio-control', 2, 'bb', 't');
    expect(aa.first).toEqual(aa.second);
    expect(bb.first).toEqual(bb.second);
    expect(aa.first.take_id).toBe('a');
    expect(bb.first.take_id).toBe('b');
  });

  it('stores separated difference/voice-likeness/artifact judgments with provenance', () => {
    const trial = beginAudition(a, b, 'body-contrast', 1, 'id', 'start');
    const record = finishAudition(trial, 'subtle', 2, 1, 'buzzy', 'metallic', 'Not natural', 'end');
    expect(record.schema_version).toBe('voice-audition-record/v0');
    expect(record.assessment.difference).toBe('subtle');
    expect(record.assessment.first_voice_likeness).toBe(2);
    expect(record.assessment.first_artifact).toBe('buzzy');
    expect(record.first.input_digest).toBe(b.input_digest);
    expect(record.second.preparation_digest).toBe(a.preparation_digest);
    expect(() => finishAudition(trial, 'clear', 0, 6, 'none', 'none', '', 'end')).toThrow();
  });

  it('refuses absent physical results, swapped revisions, and missing real audio', () => {
    const failed = physicalTake('M0', 'bad');
    failed.result.realization_outcome = 'UNSUPPORTED';
    expect(() => freezePhysicalTake(failed)).toThrow();
    const swapped = physicalTake('M0', 'swapped');
    if (swapped.result.embodiment) swapped.result.embodiment.preset_id = 'v3b-axial-M1';
    expect(() => freezePhysicalTake(swapped)).toThrow();
    const missing = physicalTake('M1', 'missing');
    missing.result.artifacts = [];
    expect(() => freezePhysicalTake(missing)).toThrow();
  });
});
