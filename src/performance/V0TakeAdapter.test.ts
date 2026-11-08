import { describe, expect, it } from 'vitest';
import { adaptV0Take, compareV0Takes, type V0TakeRead } from './V0TakeAdapter';

const audio = '/cc-a2/artifacts/' + 'a'.repeat(64) + '.wav';
function makeRead(): V0TakeRead {
  return {
    envelope: {
      record_schema: 'studio-v0-take-envelope/v0', take_id: 'take_studio_v0_example',
      physical_take_id: 'take_studio_v0_example',
      character_id: 'c', character_revision: 1, character_snapshot_sha256: 'sha256:example',
      character_snapshot: { character_id: 'c', revision: 1 } as V0TakeRead['envelope']['character_snapshot'],
      request_snapshot: {
        schema_version: 'performance-contract/v1', request_id: 'r', seed: 0,
        character: { character_id: 'c', revision: 1 },
        embodiment: { preset_id: 'v3b-axial-M0', preset_revision: 1 },
        script: { segments: [{ text: 'あい' }] },
      },
      performance_result_v1: { schema_version: 'performance-contract/v1',
        take_id: 'take_studio_v0_example', job_status: 'SUCCEEDED',
        realization_outcome: 'FEASIBLE',
        artifacts: [{ kind: 'audio', ref: audio }] },
      exact_body_ref: {} as V0TakeRead['envelope']['exact_body_ref'],
      motion_ref: { id: 'three-task', task_plan_sha256: null, evidence: 'CORE_PHYSICAL_RECEIPT' },
      source_profile_ref: { id: 'lf_fixed', f0_hz: 100, read_only: true, core_commit: 'pin' },
      source_samples_sha256: 'sha256:' + 'b'.repeat(64),
      source_samples_evidence: 'RECOMPUTED', actual_run_source_samples_sha256: null,
      full_verified_source_state: 'UNKNOWN', provenance_state: 'INCOMPLETE_PROVENANCE',
      claim_limit: 'fixed task only',
    },
    integrity_state: 'INCOMPLETE_PROVENANCE',
    source_verification_state: 'UNKNOWN', read_only: true,
  };
}
describe('v0 Take adapter never casts legacy/v1 contract and never upgrades provenance', () => {
  it('exposes bounded verified artifact playback while source remains UNKNOWN', () => {
    const result = adaptV0Take(makeRead());
    expect(result.kind).toBe('STUDIO_V0_TAKE');
    expect(result.sourceProvenance).toBe('UNKNOWN');
    expect(result.sourceEvidence).toBe('RECOMPUTED');
    expect(result.audioRef).toBe(audio);
    expect(result.canCompare).toBe(true);
  });
  it('refusal and corrupt artifact never provide a WAV', () => {
    const refusal = makeRead();
    refusal.envelope.performance_result_v1.realization_outcome = 'UNSUPPORTED';
    refusal.envelope.performance_result_v1.artifacts = [];
    expect(adaptV0Take(refusal).audioRef).toBeNull();
    const corrupt = makeRead();
    corrupt.integrity_state = 'CORRUPT_ARTIFACT';
    expect(adaptV0Take(corrupt).audioRef).toBeNull();
  });
  it('refuses a false full verified source claim, unbounded script, and duplicate A/B', () => {
    const bad = makeRead();
    bad.envelope.full_verified_source_state = 'VERIFIED' as 'UNKNOWN';
    expect(() => adaptV0Take(bad)).toThrow();
    const script = makeRead();
    script.envelope.request_snapshot.script.segments[0].text = 'unknown';
    expect(() => adaptV0Take(script)).toThrow();
    const v = adaptV0Take(makeRead());
    expect(compareV0Takes(v, v).allowed).toBe(false);
    expect(compareV0Takes(v, v).bothSourcesUnverified).toBe(true);
  });
});
