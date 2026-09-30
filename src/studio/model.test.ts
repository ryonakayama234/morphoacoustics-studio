import { describe, expect, it } from 'vitest';
import mioRequest from '../../vendor/performance-contract/v0/examples/request.json';
import {
  buildPerformanceRequest,
  draftFromRequest,
  moveSegment,
  nextSegmentId,
} from './model';

describe('S2 creator draft model', () => {
  it('preserves stable segment IDs while reordering', () => {
    const draft = draftFromRequest(mioRequest);
    const moved = moveSegment(draft.segments, 1, -1);
    expect(moved.map((segment) => segment.segmentId)).toEqual(['s2', 's1']);
    expect(nextSegmentId(moved)).toBe('s3');
  });

  it('compiles creator edits into a contract request without solver state', () => {
    const draft = draftFromRequest(mioRequest);
    draft.characterName = 'ミオ改';
    draft.directionNote = '少しゆっくり。';
    draft.pace = 0.7;
    draft.segments[1].overrideNote = '語尾をやわらかく。';

    const request = buildPerformanceRequest(draft, 12) as Record<string, unknown>;
    const character = request.character as Record<string, unknown>;
    const direction = request.direction as Record<string, unknown>;
    const controls = direction.controls as Record<string, unknown>;
    const overrides = direction.segment_overrides as Array<Record<string, unknown>>;

    expect(request.request_id).toBe('request_studio_0012');
    expect(character.name).toBe('ミオ改');
    expect(controls.pace).toBe(0.7);
    expect(overrides).toEqual([
      { segment_id: 's2', note: '語尾をやわらかく。' },
    ]);
    expect(JSON.stringify(request)).not.toContain('solver');
    expect(request.requested_capabilities).toEqual(['timeline', 'diagnostics']);
  });
});
