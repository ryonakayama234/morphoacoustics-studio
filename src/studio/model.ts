import type { PerformanceRequestV0 } from '../contract/types';

export type SegmentDraft = {
  segmentId: string;
  text: string;
  overrideNote: string;
};

export type StudioDraft = {
  characterId: string;
  characterRevision: number;
  characterName: string;
  characterDescription: string;
  defaultEnergy: number;
  defaultPace: number;
  scriptId: string;
  scriptRevision: number;
  segments: SegmentDraft[];
  directionId: string;
  directionRevision: number;
  directionNote: string;
  energy: number;
  pace: number;
  seed: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function draftFromRequest(input: unknown): StudioDraft {
  const request = asRecord(input);
  const character = asRecord(request.character);
  const defaults = asRecord(character.default_controls);
  const script = asRecord(request.script);
  const direction = asRecord(request.direction);
  const controls = asRecord(direction.controls);
  const rawSegments = Array.isArray(script.segments) ? script.segments : [];
  const rawOverrides = Array.isArray(direction.segment_overrides)
    ? direction.segment_overrides
    : [];
  const overrideNotes = new Map<string, string>();
  for (const rawOverride of rawOverrides) {
    const override = asRecord(rawOverride);
    const segmentId = stringOr(override.segment_id, '');
    if (segmentId) overrideNotes.set(segmentId, stringOr(override.note, ''));
  }

  return {
    characterId: stringOr(character.character_id, 'char_mio'),
    characterRevision: numberOr(character.revision, 1),
    characterName: stringOr(character.name, 'ミオ'),
    characterDescription: stringOr(character.description, ''),
    defaultEnergy: numberOr(defaults.energy, 0.35),
    defaultPace: numberOr(defaults.pace, 0.9),
    scriptId: stringOr(script.script_id, 'script_001'),
    scriptRevision: numberOr(script.revision, 1),
    segments: rawSegments.map((rawSegment, index) => {
      const segment = asRecord(rawSegment);
      const segmentId = stringOr(segment.segment_id, `s${index + 1}`);
      return {
        segmentId,
        text: stringOr(segment.text, ''),
        overrideNote: overrideNotes.get(segmentId) ?? '',
      };
    }),
    directionId: stringOr(direction.direction_id, 'direction_001'),
    directionRevision: numberOr(direction.revision, 1),
    directionNote: stringOr(direction.note, ''),
    energy: numberOr(controls.energy, 0.25),
    pace: numberOr(controls.pace, 0.82),
    seed: numberOr(request.seed, 42),
  };
}

export function nextSegmentId(segments: readonly SegmentDraft[]): string {
  const used = new Set(segments.map((segment) => segment.segmentId));
  let serial = 1;
  while (used.has(`s${serial}`)) serial += 1;
  return `s${serial}`;
}

export function moveSegment(
  segments: readonly SegmentDraft[],
  index: number,
  delta: -1 | 1,
): SegmentDraft[] {
  const target = index + delta;
  if (index < 0 || index >= segments.length || target < 0 || target >= segments.length) {
    return [...segments];
  }
  const copy = [...segments];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function buildPerformanceRequest(
  draft: StudioDraft,
  serial: number,
  requestedCapabilities: readonly string[] = ['timeline', 'diagnostics'],
): PerformanceRequestV0 {
  const segmentOverrides = draft.segments
    .filter((segment) => segment.overrideNote.trim().length > 0)
    .map((segment) => ({
      segment_id: segment.segmentId,
      note: segment.overrideNote,
    }));

  return {
    schema_version: 'performance-contract/v0',
    request_id: `request_studio_${String(serial).padStart(4, '0')}`,
    character: {
      schema_version: 'performance-contract/v0',
      character_id: draft.characterId,
      revision: draft.characterRevision,
      name: draft.characterName,
      description: draft.characterDescription,
      default_controls: {
        energy: draft.defaultEnergy,
        pace: draft.defaultPace,
      },
    },
    script: {
      schema_version: 'performance-contract/v0',
      script_id: draft.scriptId,
      revision: draft.scriptRevision,
      segments: draft.segments.map((segment) => ({
        segment_id: segment.segmentId,
        speaker_character_id: draft.characterId,
        text: segment.text,
      })),
    },
    direction: {
      schema_version: 'performance-contract/v0',
      direction_id: draft.directionId,
      revision: draft.directionRevision,
      note: draft.directionNote,
      controls: {
        energy: draft.energy,
        pace: draft.pace,
      },
      segment_overrides: segmentOverrides,
    },
    seed: draft.seed,
    requested_capabilities: [...requestedCapabilities],
  } as PerformanceRequestV0;
}

export function directionSummary(request: PerformanceRequestV0): string {
  const direction = asRecord(request.direction);
  const controls = asRecord(direction.controls);
  return [
    stringOr(direction.note, ''),
    `energy=${numberOr(controls.energy, 0).toFixed(2)}`,
    `pace=${numberOr(controls.pace, 0).toFixed(2)}`,
  ].filter(Boolean).join(' · ');
}
