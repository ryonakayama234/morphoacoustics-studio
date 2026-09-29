import type { PerformanceRequestV0 } from '../contract/types';

type AnyRecord = Record<string, unknown>;

export type EmotionControl = Readonly<{
  label: string;
  intensity: number;
}>;

export type CreatorControls = Readonly<{
  energy?: number;
  pace?: number;
  emotion?: EmotionControl;
}>;

function record(value: unknown): AnyRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as AnyRecord
    : undefined;
}

function controls(value: unknown): CreatorControls {
  const source = record(value);
  if (!source) return {};
  const emotionSource = record(source.emotion);
  const emotion = emotionSource
    && typeof emotionSource.label === 'string'
    && typeof emotionSource.intensity === 'number'
    ? { label: emotionSource.label, intensity: emotionSource.intensity }
    : undefined;

  return {
    ...(typeof source.energy === 'number' ? { energy: source.energy } : {}),
    ...(typeof source.pace === 'number' ? { pace: source.pace } : {}),
    ...(emotion ? { emotion } : {}),
  };
}

export function requestSegments(request: PerformanceRequestV0): ReadonlyArray<AnyRecord> {
  const script = record(request.script);
  return Array.isArray(script?.segments)
    ? script.segments.map((segment) => record(segment)).filter((segment): segment is AnyRecord => Boolean(segment))
    : [];
}

export function resolveEffectiveControls(
  request: PerformanceRequestV0,
  segmentId: string,
): CreatorControls {
  const character = record(request.character);
  const direction = record(request.direction);
  const overrides = Array.isArray(direction?.segment_overrides) ? direction.segment_overrides : [];
  const matchingOverride = overrides
    .map(record)
    .find((override) => override?.segment_id === segmentId);

  return {
    ...controls(character?.default_controls),
    ...controls(direction?.controls),
    ...controls(matchingOverride?.controls),
  };
}
