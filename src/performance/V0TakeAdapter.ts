/** S3 v0 Take is an immutable provenance envelope around a validated Core v1
 * result. It MUST NOT be cast to PerformanceResultV0 or legacy TakeStore.
 */
import type { StoredCharacter, SelectedBodyRef } from '../studio/characterApi';

type V1Artifact = Readonly<{ kind: string; ref: string; media_type?: string; segment_id?: string }>;
export type V0TakeEnvelope = Readonly<{
  record_schema: 'studio-v0-take-envelope/v0';
  take_id: string;
  physical_take_id: string;
  character_id: string;
  character_revision: number;
  character_snapshot_sha256: string;
  character_snapshot: StoredCharacter;
  request_snapshot: {
    schema_version: 'performance-contract/v1';
    request_id: string;
    seed: 0;
    embodiment: { preset_id: string; preset_revision: number };
    character: { character_id: string; revision: number };
    script: { segments: Array<{ text: string }> };
  };
  performance_result_v1: {
    schema_version: 'performance-contract/v1';
    take_id: string;
    job_status: string;
    realization_outcome: string;
    artifacts: V1Artifact[];
    embodiment?: { status: string; preset_id?: string; preparation_digest?: string };
    diagnostics?: Array<{ code: string; message: string }>;
  };
  exact_body_ref: SelectedBodyRef;
  motion_ref: { id: string; task_plan_sha256: string | null; evidence: string };
  source_profile_ref: { id: 'lf_fixed'; f0_hz: 100; read_only: true; core_commit: string };
  source_samples_sha256: string | null;
  source_samples_evidence: 'RECOMPUTED' | 'UNKNOWN';
  actual_run_source_samples_sha256: null;
  full_verified_source_state: 'UNKNOWN';
  provenance_state: 'INCOMPLETE_PROVENANCE';
  claim_limit: string;
}>;
export type V0TakeRead = Readonly<{
  envelope: V0TakeEnvelope;
  integrity_state: 'AVAILABLE_VERIFIED' | 'MISSING_ARTIFACT' | 'CORRUPT_ARTIFACT' |
    'UNVERIFIED_LEGACY' | 'INCOMPLETE_PROVENANCE' | 'REFUSAL_NO_AUDIO';
  issues?: string[];
  source_verification_state: 'UNKNOWN';
  can_export?: boolean;
  read_only: true;
}>;
export type V0TakeView = Readonly<{
  kind: 'STUDIO_V0_TAKE';
  takeId: string;
  characterId: string;
  characterRevision: number;
  body: string;
  outcome: string;
  integrity: V0TakeRead['integrity_state'];
  sourceProvenance: 'UNKNOWN';
  sourceEvidence: 'RECOMPUTED' | 'UNKNOWN';
  sourceRecomputedSha256: string | null;
  audioRef: string | null;
  canCompare: boolean;
  claimLimit: string;
}>;
export function adaptV0Take(read: V0TakeRead): V0TakeView {
  const e = read.envelope, result = e.performance_result_v1;
  if (e.record_schema !== 'studio-v0-take-envelope/v0' ||
      e.take_id !== result.take_id || e.character_id !== e.character_snapshot.character_id ||
      e.character_revision !== e.character_snapshot.revision ||
      e.request_snapshot.character.character_id !== e.character_id ||
      e.request_snapshot.character.revision !== e.character_revision ||
      e.request_snapshot.seed !== 0 ||
      e.request_snapshot.script.segments.length !== 1 ||
      e.request_snapshot.script.segments[0].text !== 'あい' ||
      e.source_profile_ref.id !== 'lf_fixed' || e.source_profile_ref.f0_hz !== 100 ||
      e.source_profile_ref.read_only !== true ||
      e.full_verified_source_state !== 'UNKNOWN' ||
      e.provenance_state !== 'INCOMPLETE_PROVENANCE')
    throw new Error('Invalid Studio v0 Take projection');
  const safe = !['CORRUPT_ARTIFACT', 'MISSING_ARTIFACT', 'UNVERIFIED_LEGACY'].includes(read.integrity_state);
  const audio = result.realization_outcome === 'FEASIBLE' && safe
    ? result.artifacts.find(a => a.kind === 'audio' &&
      /^\/cc-a2\/artifacts\/[a-f0-9]{64}\.wav$/.test(a.ref))?.ref ?? null
    : null;
  return Object.freeze({
    kind: 'STUDIO_V0_TAKE' as const, takeId: e.take_id,
    characterId: e.character_id, characterRevision: e.character_revision,
    body: e.request_snapshot.embodiment.preset_id,
    outcome: result.realization_outcome, integrity: read.integrity_state,
    sourceProvenance: 'UNKNOWN' as const,
    sourceEvidence: e.source_samples_evidence,
    sourceRecomputedSha256: e.source_samples_sha256,
    audioRef: audio, canCompare: audio !== null,
    claimLimit: e.claim_limit,
  });
}
/** Equal playback gain is NOT equal raw pressure; both WAVs are peak normalized. */
export function compareV0Takes(a: V0TakeView, b: V0TakeView) {
  return { allowed: a.canCompare && b.canCompare && a.takeId !== b.takeId,
    warning: 'WAVs are independently peak-normalized: A/B is timbre only, never SPL or physical loudness.',
    bothSourcesUnverified: a.sourceProvenance === 'UNKNOWN' && b.sourceProvenance === 'UNKNOWN',
  } as const;
}
