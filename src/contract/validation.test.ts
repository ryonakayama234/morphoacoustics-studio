import { describe, expect, it } from 'vitest';
import mioRequest from '../../vendor/performance-contract/v0/examples/request.json';
import mockResult from '../../vendor/performance-contract/v0/examples/result.mock.json';
import { validatePerformanceRequest, validatePerformanceResult } from './validation';

describe('Performance Contract v0', () => {
  it('accepts the upstream Mio request fixture', () => {
    expect(validatePerformanceRequest(mioRequest)).toEqual({ ok: true, issues: [] });
  });

  it('accepts the upstream mock result fixture', () => {
    expect(validatePerformanceResult(mockResult)).toEqual({ ok: true, issues: [] });
  });

  it('rejects a structurally invalid request', () => {
    const invalid = structuredClone(mioRequest);
    invalid.seed = -1;
    expect(validatePerformanceRequest(invalid).ok).toBe(false);
  });

  it('rejects duplicate segment ids semantically', () => {
    const invalid = structuredClone(mioRequest);
    invalid.script.segments[1].segment_id = invalid.script.segments[0].segment_id;
    const result = validatePerformanceRequest(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((issue) => issue.includes('duplicate script segment_id'))).toBe(true);
  });
});
