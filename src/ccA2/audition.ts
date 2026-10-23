/**
 * VA-L0: label-masked listening of already verified CC-A2 physical Takes.
 * No synthesis, gain adjustment, equalization, or physics inference occurs here.
 */
export type AuditionTake = {
  request: { embodiment: { preset_id: string; preset_revision: number } };
  result: {
    take_id: string; realization_outcome?: string;
    embodiment?: { status: string; preset_id?: string; preset_revision?: number; preparation_digest?: string };
    provenance?: { backend: string; backend_version: string; input_digest: string };
    artifacts: { kind: string; ref: string }[];
  };
};

export type FrozenTake = {
  take_id: string;
  preset_id: string;
  preset_revision: number;
  preparation_digest: string;
  backend: string;
  backend_version: string;
  input_digest: string;
  audio_ref: string;
};

export type AuditionKind = 'body-contrast' | 'same-audio-control';
export type DifferenceJudgment = 'clear' | 'subtle' | 'none' | 'uncertain';
export type ArtifactJudgment = 'none' | 'buzzy' | 'metallic' | 'breathy' | 'clicks' | 'other';

export type AuditionTrial = {
  schema_version: 'voice-audition-trial/v0';
  trial_id: string;
  started_at: string;
  kind: AuditionKind;
  first: FrozenTake;
  second: FrozenTake;
};

export type AuditionRecord = AuditionTrial & {
  schema_version: 'voice-audition-record/v0';
  completed_at: string;
  assessment: {
    difference: DifferenceJudgment;
    first_voice_likeness: number;
    second_voice_likeness: number;
    first_artifact: ArtifactJudgment;
    second_artifact: ArtifactJudgment;
    notes: string;
  };
};

const isPreset = (id: string, rev: number) =>
  (id === 'v3b-axial-M0' || id === 'v3b-axial-M1') && rev === 1;

export function freezePhysicalTake(take: AuditionTake): FrozenTake {
  const selected = take.request.embodiment;
  const body = take.result.embodiment;
  const p = take.result.provenance;
  const audio = take.result.artifacts.find(a => a.kind === 'audio');
  if (!isPreset(selected.preset_id, selected.preset_revision)
    || take.result.realization_outcome !== 'FEASIBLE'
    || body?.status !== 'BOUND'
    || body.preset_id !== selected.preset_id
    || body.preset_revision !== selected.preset_revision
    || !body.preparation_digest || !p?.backend_version || !p.input_digest
    || !p.backend || !audio?.ref || !take.result.take_id) {
    throw new Error('検証済みのCC-A2物理Takeと身体・音声の対応が必要です');
  }
  return {
    take_id: take.result.take_id,
    preset_id: selected.preset_id,
    preset_revision: selected.preset_revision,
    preparation_digest: body.preparation_digest,
    backend: p.backend, backend_version: p.backend_version,
    input_digest: p.input_digest, audio_ref: audio.ref,
  };
}

/** Random bits come from crypto.getRandomValues in the UI, not Math.random. */
export function beginAudition(
  a: FrozenTake, b: FrozenTake, kind: AuditionKind,
  randomBits: number, trialId: string, startedAt: string,
): AuditionTrial {
  if (!trialId || !Number.isInteger(randomBits) || randomBits < 0 || randomBits > 0xffffffff) {
    throw new Error('試聴試行IDまたは乱数が不正です');
  }
  if (kind === 'body-contrast' && (a.take_id === b.take_id || a.preset_id === b.preset_id)) {
    throw new Error('身体差の試聴には異なる身体の独立した2 Takeが必要です');
  }
  const control = (randomBits & 2) === 0 ? a : b;
  const first = kind === 'same-audio-control' ? control : (randomBits & 1) === 0 ? a : b;
  const second = kind === 'same-audio-control' ? control : (randomBits & 1) === 0 ? b : a;
  return {
    schema_version: 'voice-audition-trial/v0',
    trial_id: trialId, started_at: startedAt, kind, first, second,
  };
}

export function finishAudition(
  trial: AuditionTrial,
  difference: DifferenceJudgment,
  firstVoiceLikeness: number, secondVoiceLikeness: number,
  firstArtifact: ArtifactJudgment, secondArtifact: ArtifactJudgment,
  notes: string, completedAt: string,
): AuditionRecord {
  const validDifferences: DifferenceJudgment[] = ['clear', 'subtle', 'none', 'uncertain'];
  const validArtifacts: ArtifactJudgment[] = ['none', 'buzzy', 'metallic', 'breathy', 'clicks', 'other'];
  if (!validDifferences.includes(difference)
    || !validArtifacts.includes(firstArtifact) || !validArtifacts.includes(secondArtifact)
    || ![firstVoiceLikeness, secondVoiceLikeness].every(n => Number.isInteger(n) && n >= 1 && n <= 5)
    || notes.length > 2000 || !completedAt) {
    throw new Error('試聴評価の入力が不正です');
  }
  return {
    ...trial, schema_version: 'voice-audition-record/v0',
    completed_at: completedAt,
    assessment: {
      difference, first_voice_likeness: firstVoiceLikeness,
      second_voice_likeness: secondVoiceLikeness,
      first_artifact: firstArtifact, second_artifact: secondArtifact, notes,
    },
  };
}
