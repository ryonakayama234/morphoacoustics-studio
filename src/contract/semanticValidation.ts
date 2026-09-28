type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as AnyRecord
    : undefined;
}

export function semanticRequestIssues(input: unknown): string[] {
  const root = record(input);
  const character = record(root?.character);
  const script = record(root?.script);
  const direction = record(root?.direction);
  const segments = Array.isArray(script?.segments) ? script.segments : [];
  const overrides = Array.isArray(direction?.segment_overrides) ? direction.segment_overrides : [];
  const issues: string[] = [];

  const characterId = character?.character_id;
  const segmentIds = new Set<string>();

  for (const [index, rawSegment] of segments.entries()) {
    const segment = record(rawSegment);
    const segmentId = segment?.segment_id;
    if (typeof segmentId === 'string') {
      if (segmentIds.has(segmentId)) issues.push(`duplicate script segment_id: ${segmentId}`);
      segmentIds.add(segmentId);
    }
    if (typeof characterId === 'string' && segment?.speaker_character_id !== characterId) {
      issues.push(`script segment ${index} speaker_character_id does not match character_id`);
    }
  }

  const overrideIds = new Set<string>();
  for (const rawOverride of overrides) {
    const override = record(rawOverride);
    const segmentId = override?.segment_id;
    if (typeof segmentId !== 'string') continue;
    if (overrideIds.has(segmentId)) issues.push(`duplicate direction override for segment_id: ${segmentId}`);
    overrideIds.add(segmentId);
    if (!segmentIds.has(segmentId)) issues.push(`direction override targets missing segment_id: ${segmentId}`);
  }

  return issues;
}
