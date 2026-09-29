import demoRequest from '../../vendor/performance-contract/v0/examples/request.json';
import type { PerformanceRequestV0 } from '../contract/types';

export type SegmentDraft = Readonly<{
  segmentId: string;
  text: string;
}>;

export type SegmentDirectionDraft = Readonly<{
  note: string;
  energy: number | null;
  pace: number | null;
}>;

export type StudioDraft = Readonly<{
  character: Readonly<{
    characterId: string;
    revision: number;
    name: string;
    description: string;
    defaultEnergy: number;
    defaultPace: number;
  }>;
  script: Readonly<{
    scriptId: string;
    revision: number;
    segments: readonly SegmentDraft[];
  }>;
  direction: Readonly<{
    directionId: string;
    revision: number;
    note: string;
    energy: number;
    pace: number;
    emotionLabel: string;
    emotionIntensity: number;
    overrides: Readonly<Record<string, SegmentDirectionDraft>>;
  }>;
  seed: number;
}>;

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value as AnyRecord;
}

export function createDemoDraft(): StudioDraft {
  const request = structuredClone(demoRequest) as unknown as AnyRecord;
  const character = asRecord(request.character);
  const script = asRecord(request.script);
  const direction = asRecord(request.direction);
  const defaults = asRecord(character.default_controls);
  const controls = asRecord(direction.controls);
  const emotion = asRecord(controls.emotion);
  const segments = script.segments as AnyRecord[];
  const overrides = (direction.segment_overrides ?? []) as AnyRecord[];

  return {
    character: {
      characterId: String(character.character_id),
      revision: Number(character.revision),
      name: String(character.name),
      description: String(character.description ?? ''),
      defaultEnergy: Number(defaults.energy ?? 0.5),
      defaultPace: Number(defaults.pace ?? 1),
    },
    script: {
      scriptId: String(script.script_id),
      revision: Number(script.revision),
      segments: segments.map((segment) => ({
        segmentId: String(segment.segment_id),
        text: String(segment.text ?? ''),
      })),
    },
    direction: {
      directionId: String(direction.direction_id),
      revision: Number(direction.revision),
      note: String(direction.note ?? ''),
      energy: Number(controls.energy ?? 0.5),
      pace: Number(controls.pace ?? 1),
      emotionLabel: String(emotion.label ?? ''),
      emotionIntensity: Number(emotion.intensity ?? 0),
      overrides: Object.fromEntries(
        overrides.map((override) => {
          const overrideControls = asRecord(override.controls ?? {});
          return [
            String(override.segment_id),
            {
              note: String(override.note ?? ''),
              energy: typeof overrideControls.energy === 'number' ? overrideControls.energy : null,
              pace: typeof overrideControls.pace === 'number' ? overrideControls.pace : null,
            },
          ];
        }),
      ),
    },
    seed: Number(request.seed),
  };
}

export function buildPerformanceRequest(
  draft: StudioDraft,
  requestId: string,
): PerformanceRequestV0 {
  const segmentOverrides = draft.script.segments.flatMap((segment) => {
    const override = draft.direction.overrides[segment.segmentId];
    if (!override) return [];
    const controls = {
      ...(override.energy !== null ? { energy: override.energy } : {}),
      ...(override.pace !== null ? { pace: override.pace } : {}),
    };
    if (!override.note.trim() && Object.keys(controls).length === 0) return [];
    return [{
      segment_id: segment.segmentId,
      ...(override.note.trim() ? { note: override.note } : {}),
      ...(Object.keys(controls).length > 0 ? { controls } : {}),
    }];
  });

  return {
    schema_version: 'performance-contract/v0',
    request_id: requestId,
    character: {
      schema_version: 'performance-contract/v0',
      character_id: draft.character.characterId,
      revision: draft.character.revision,
      name: draft.character.name,
      description: draft.character.description,
      default_controls: {
        energy: draft.character.defaultEnergy,
        pace: draft.character.defaultPace,
      },
    },
    script: {
      schema_version: 'performance-contract/v0',
      script_id: draft.script.scriptId,
      revision: draft.script.revision,
      segments: draft.script.segments.map((segment) => ({
        segment_id: segment.segmentId,
        speaker_character_id: draft.character.characterId,
        text: segment.text,
      })),
    },
    direction: {
      schema_version: 'performance-contract/v0',
      direction_id: draft.direction.directionId,
      revision: draft.direction.revision,
      note: draft.direction.note,
      controls: {
        energy: draft.direction.energy,
        pace: draft.direction.pace,
        ...(draft.direction.emotionLabel.trim()
          ? {
              emotion: {
                label: draft.direction.emotionLabel,
                intensity: draft.direction.emotionIntensity,
              },
            }
          : {}),
      },
      ...(segmentOverrides.length > 0 ? { segment_overrides: segmentOverrides } : {}),
    },
    seed: draft.seed,
    requested_capabilities: ['timeline', 'diagnostics'],
  } as PerformanceRequestV0;
}

export function moveSegment(
  draft: StudioDraft,
  segmentId: string,
  delta: -1 | 1,
): StudioDraft {
  const segments = [...draft.script.segments];
  const index = segments.findIndex((segment) => segment.segmentId === segmentId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= segments.length) return draft;
  [segments[index], segments[target]] = [segments[target], segments[index]];
  return {
    ...draft,
    script: { ...draft.script, segments },
  };
}

export function removeSegment(draft: StudioDraft, segmentId: string): StudioDraft {
  if (draft.script.segments.length <= 1) return draft;
  const { [segmentId]: _removed, ...overrides } = draft.direction.overrides;
  return {
    ...draft,
    script: {
      ...draft.script,
      segments: draft.script.segments.filter((segment) => segment.segmentId !== segmentId),
    },
    direction: { ...draft.direction, overrides },
  };
}
