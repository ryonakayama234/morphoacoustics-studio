import { describe, expect, it } from 'vitest';
import mioRequest from '../../vendor/performance-contract/v0/examples/request.json';
import { DynamicMorphoacousticsBackend } from './DynamicMorphoacousticsBackend';
import { DYNAMIC_ASSET_REFS } from './dynamicAssets';
import type { PerformanceRequestV0 } from '../contract/types';
import { validatePerformanceResult } from '../contract/validation';

function dynamicRequest(pace: number): PerformanceRequestV0 {
  const request = structuredClone(mioRequest) as Record<string, unknown>;
  const script = structuredClone(request.script) as Record<string, unknown>;
  script.segments = [
    {
      segment_id: 's1',
      speaker_character_id: 'char_mio',
      text: 'あー',
    },
  ];
  const direction = structuredClone(request.direction) as Record<string, unknown>;
  const controls = structuredClone(direction.controls) as Record<string, unknown>;
  controls.pace = pace;
  direction.controls = controls;
  request.script = script;
  request.direction = direction;
  request.request_id = `request_dynamic_${String(pace).replace('.', '_')}`;
  request.requested_capabilities = [
    'audio',
    'timeline',
    'diagnostics',
    'gesture_trace',
    'physical_trace',
  ];
  return request as PerformanceRequestV0;
}

function artifactRef(result: Awaited<ReturnType<DynamicMorphoacousticsBackend['perform']>>, kind: string): string | undefined {
  const artifact = result.artifacts.find((item) => item.kind === kind);
  return artifact?.ref;
}

describe('DynamicMorphoacousticsBackend', () => {
  it('maps only the validated slow pace to Experiment 010 slow audio and trace', async () => {
    const request = dynamicRequest(0.75);
    const result = await new DynamicMorphoacousticsBackend().perform(request);

    expect(validatePerformanceResult(result, request)).toEqual({ ok: true, issues: [] });
    expect(result.realization_outcome).toBe('FEASIBLE');
    expect(artifactRef(result, 'audio')).toBe(DYNAMIC_ASSET_REFS.slow.audio);
    expect(artifactRef(result, 'dynamic-trace')).toBe(DYNAMIC_ASSET_REFS.slow.trace);
    expect(artifactRef(result, 'body-binding')).toContain('body-binding://experiment-010/wide-body@');
    expect(artifactRef(result, 'integration-policy')).toContain('x1b-pace-two-point-v1/slow');
    expect(result.timeline).toEqual([{ segment_id: 's1', start_seconds: 0, end_seconds: 0.5 }]);
    expect(JSON.stringify(result.diagnostics)).toContain('90 ms');
  });

  it('maps only the validated fast pace to Experiment 010 fast audio and trace', async () => {
    const request = dynamicRequest(1.25);
    const result = await new DynamicMorphoacousticsBackend().perform(request);

    expect(validatePerformanceResult(result, request)).toEqual({ ok: true, issues: [] });
    expect(result.realization_outcome).toBe('FEASIBLE');
    expect(artifactRef(result, 'audio')).toBe(DYNAMIC_ASSET_REFS.fast.audio);
    expect(artifactRef(result, 'dynamic-trace')).toBe(DYNAMIC_ASSET_REFS.fast.trace);
    expect(artifactRef(result, 'integration-policy')).toContain('x1b-pace-two-point-v1/fast');
    expect(JSON.stringify(result.diagnostics)).toContain('30 ms');
  });

  it('does not invent an interpolation for unvalidated pace values', async () => {
    const request = dynamicRequest(1.0);
    const result = await new DynamicMorphoacousticsBackend().perform(request);

    expect(validatePerformanceResult(result, request)).toEqual({ ok: true, issues: [] });
    expect(result.realization_outcome).toBe('UNSUPPORTED');
    expect(result.artifacts).toEqual([]);
    expect(result.timeline).toEqual([]);
    expect(JSON.stringify(result.diagnostics)).toContain('DYNAMIC_PACE_UNSUPPORTED');
    expect(JSON.stringify(result.diagnostics)).toContain('not interpolated');
  });

  it('produces distinct reproducible Takes when only creator-facing pace changes', async () => {
    const backend = new DynamicMorphoacousticsBackend();
    const slowRequest = dynamicRequest(0.75);
    const fastRequest = dynamicRequest(1.25);

    const slow = await backend.perform(slowRequest);
    const slowAgain = await backend.perform(slowRequest);
    const fast = await backend.perform(fastRequest);

    expect(slow).toEqual(slowAgain);
    expect(slow.take_id).not.toBe(fast.take_id);
    expect(artifactRef(slow, 'audio')).not.toBe(artifactRef(fast, 'audio'));
    expect(artifactRef(slow, 'dynamic-trace')).not.toBe(artifactRef(fast, 'dynamic-trace'));
  });

  it('does not approximate unsupported text', async () => {
    const request = dynamicRequest(0.75) as Record<string, unknown>;
    const script = structuredClone(request.script) as Record<string, unknown>;
    script.segments = [
      { segment_id: 's1', speaker_character_id: 'char_mio', text: 'ありがとう' },
    ];
    request.script = script;

    const result = await new DynamicMorphoacousticsBackend().perform(request as PerformanceRequestV0);
    expect(result.realization_outcome).toBe('UNSUPPORTED');
    expect(result.artifacts).toEqual([]);
    expect(JSON.stringify(result.diagnostics)).toContain('DYNAMIC_SCRIPT_UNSUPPORTED');
  });
});
