import { describe, expect, it } from 'vitest';
import mioRequest from '../../vendor/performance-contract/v0/examples/request.json';
import { FIXED_AUDIO_REFS } from './fixedAudioAssets';
import { FixedMorphoacousticsBackend } from './FixedMorphoacousticsBackend';
import type { PerformanceRequestV0 } from '../contract/types';
import { validatePerformanceResult } from '../contract/validation';

function fixedRequest(): PerformanceRequestV0 {
  const request = structuredClone(mioRequest) as Record<string, unknown>;
  const script = structuredClone(request.script) as Record<string, unknown>;
  script.segments = [
    {
      segment_id: 's1',
      speaker_character_id: 'char_mio',
      text: 'あー',
    },
  ];
  request.script = script;
  request.request_id = 'request_fixed_0001';
  request.requested_capabilities = ['audio', 'timeline', 'diagnostics'];
  return request as PerformanceRequestV0;
}

describe('FixedMorphoacousticsBackend', () => {
  it('returns a schema-valid persistent audio artifact for the supported fixed utterance', async () => {
    const request = fixedRequest();
    const result = await new FixedMorphoacousticsBackend('uniform').perform(request);

    expect(validatePerformanceResult(result, request)).toEqual({ ok: true, issues: [] });
    expect(result.realization_outcome).toBe('FEASIBLE');
    expect(result.artifacts).toEqual([
      {
        kind: 'audio',
        ref: FIXED_AUDIO_REFS.uniform,
        media_type: 'audio/wav',
        segment_id: 's1',
      },
      expect.objectContaining({
        kind: 'body-binding',
        ref: expect.stringContaining('body-binding://experiment-009/uniform@'),
      }),
    ]);
    expect(result.timeline).toEqual([{ segment_id: 's1', start_seconds: 0, end_seconds: 0.5 }]);
  });

  it('does not approximate unsupported text', async () => {
    const request = fixedRequest() as Record<string, unknown>;
    const script = structuredClone(request.script) as Record<string, unknown>;
    script.segments = [
      { segment_id: 's1', speaker_character_id: 'char_mio', text: 'おはよう。' },
    ];
    request.script = script;

    const result = await new FixedMorphoacousticsBackend('uniform').perform(request as PerformanceRequestV0);
    expect(result.realization_outcome).toBe('UNSUPPORTED');
    expect(result.artifacts).toEqual([]);
    expect(JSON.stringify(result.diagnostics)).toContain('FIXED_SCRIPT_UNSUPPORTED');
  });

  it('keeps body fixture choice out of the request while producing distinct immutable takes', async () => {
    const request = fixedRequest();
    const uniform = await new FixedMorphoacousticsBackend('uniform').perform(request);
    const constricted = await new FixedMorphoacousticsBackend('constricted').perform(request);

    expect(uniform.take_id).not.toBe(constricted.take_id);
    expect(uniform.artifacts[0]).toEqual(expect.objectContaining({ ref: FIXED_AUDIO_REFS.uniform }));
    expect(constricted.artifacts[0]).toEqual(expect.objectContaining({ ref: FIXED_AUDIO_REFS.constricted }));
    expect(uniform.provenance).not.toEqual(constricted.provenance);
  });

  it('is deterministic for the same request and fixed adapter fixture', async () => {
    const request = fixedRequest();
    const backend = new FixedMorphoacousticsBackend('constricted');
    expect(await backend.perform(request)).toEqual(await backend.perform(request));
  });
});
