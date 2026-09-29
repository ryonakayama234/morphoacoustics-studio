import { describe, expect, it } from 'vitest';
import { buildPerformanceRequest, createDemoDraft, moveSegment, removeSegment } from './model';
import { validatePerformanceRequest } from '../contract/validation';

describe('Studio draft model', () => {
  it('builds a contract-valid request without requesting fake audio', () => {
    const request = buildPerformanceRequest(createDemoDraft(), 'request_test');
    const validation = validatePerformanceRequest(request);

    expect(validation.ok).toBe(true);
    expect(request.requested_capabilities).toEqual(['timeline', 'diagnostics']);
  });

  it('preserves stable segment ids across reordering', () => {
    const draft = createDemoDraft();
    const moved = moveSegment(draft, 's2', -1);

    expect(moved.script.segments.map((segment) => segment.segmentId)).toEqual(['s2', 's1']);
  });

  it('removes a deleted segment override with the segment', () => {
    const draft = createDemoDraft();
    const removed = removeSegment(draft, 's2');
    const request = buildPerformanceRequest(removed, 'request_after_delete');

    expect(removed.script.segments.map((segment) => segment.segmentId)).toEqual(['s1']);
    expect(JSON.stringify(request.direction)).not.toContain('s2');
    expect(validatePerformanceRequest(request).ok).toBe(true);
  });

  it('will not delete the final remaining script segment', () => {
    const one = removeSegment(createDemoDraft(), 's2');
    const unchanged = removeSegment(one, 's1');

    expect(unchanged.script.segments).toHaveLength(1);
    expect(unchanged.script.segments[0].segmentId).toBe('s1');
  });
});
