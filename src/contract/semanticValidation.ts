type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as AnyRecord
    : undefined;
}

function requestSegmentIds(input: unknown): Set<string> {
  const root = record(input);
  const script = record(root?.script);
  const segments = Array.isArray(script?.segments) ? script.segments : [];
  return new Set(
    segments
      .map(record)
      .map((segment) => segment?.segment_id)
      .filter((segmentId): segmentId is string => typeof segmentId === 'string'),
  );
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

export function semanticResultIssues(input: unknown, request?: unknown): string[] {
  const root = record(input);
  const timeline = Array.isArray(root?.timeline) ? root.timeline : [];
  const issues: string[] = [];

  if (request !== undefined) {
    const requestRoot = record(request);
    if (typeof requestRoot?.request_id === 'string' && root?.request_id !== requestRoot.request_id) {
      issues.push('result request_id does not match request snapshot');
    }
  }

  const segmentIds = request === undefined ? undefined : requestSegmentIds(request);
  for (const [index, rawInterval] of timeline.entries()) {
    const interval = record(rawInterval);
    const start = interval?.start_seconds;
    const end = interval?.end_seconds;
    const segmentId = interval?.segment_id;
    if (typeof start === 'number' && typeof end === 'number' && end < start) {
      issues.push(`timeline interval ${index} ends before it starts`);
    }
    if (segmentIds && typeof segmentId === 'string' && !segmentIds.has(segmentId)) {
      issues.push(`timeline targets missing segment_id: ${segmentId}`);
    }
  }

  if (root?.job_status === 'FAILED' && root.realization_outcome !== undefined) {
    issues.push('FAILED is an execution failure and must not carry realization_outcome');
  }

  return issues;
}
