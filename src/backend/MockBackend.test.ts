import { describe, expect, it } from 'vitest';
import requestFixture from '../../vendor/performance-contract/v0/examples/request.json';
import type { PerformanceBackend } from './PerformanceBackend';
import { MockBackend } from './MockBackend';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';
import {
  BackendExecutionError,
  ContractValidationError,
  TakeStore,
} from '../performance/TakeStore';

function cloneRequest(): Record<string, unknown> {
  return structuredClone(requestFixture) as Record<string, unknown>;
}

function withoutAudioCapability(): PerformanceRequestV0 {
  const request = cloneRequest();
  request.requested_capabilities = ['timeline', 'diagnostics'];
  return request as PerformanceRequestV0;
}

function fixtureResult(
  request: PerformanceRequestV0,
  overrides: Partial<PerformanceResultV0> = {},
): PerformanceResultV0 {
  return {
    schema_version: 'performance-contract/v0',
    performance_id: 'performance_fixture',
    request_id: request.request_id,
    take_id: 'take_fixture',
    job_status: 'SUCCEEDED',
    realization_outcome: 'FEASIBLE',
    artifacts: [],
    timeline: [],
    diagnostics: [],
    provenance: {
      backend: 'fixture',
      backend_version: 'fixture-v1',
      contract_version: 'performance-contract/v0',
      seed: request.seed,
      input_digest: 'sha256:fixture',
      input_digest_algorithm: 'fixture',
    },
    ...overrides,
  } as PerformanceResultV0;
}

describe('MockBackend', () => {
  it('is deterministic for an identical request and backend version', async () => {
    const backend = new MockBackend();
    const request = withoutAudioCapability();

    const first = await backend.perform(request);
    const second = await backend.perform(structuredClone(request));

    expect(second).toEqual(first);
    expect(first.realization_outcome).toBe('FEASIBLE');
    expect((first.provenance as Record<string, unknown>).input_digest_algorithm)
      .toBe('sha256-over-recursively-sorted-json-v1');
  });

  it('does not silently claim requested audio capability', async () => {
    const result = await new MockBackend().perform(cloneRequest() as PerformanceRequestV0);

    expect(result.realization_outcome).toBe('UNSUPPORTED');
    expect(result.artifacts).toEqual([]);
    expect(JSON.stringify(result.diagnostics)).toContain('MOCK_UNSUPPORTED_CAPABILITY');
  });

  it('applies segment override pace after global and character defaults', async () => {
    const request = cloneRequest();
    request.requested_capabilities = ['timeline'];
    const direction = request.direction as Record<string, unknown>;
    const overrides = direction.segment_overrides as Array<Record<string, unknown>>;
    overrides[0].controls = { pace: 2.0 };

    const result = await new MockBackend().perform(request as PerformanceRequestV0);
    const timeline = result.timeline as Array<Record<string, number | string>>;
    const firstDuration = Number(timeline[0].end_seconds) - Number(timeline[0].start_seconds);
    const secondDuration = Number(timeline[1].end_seconds) - Number(timeline[1].start_seconds);

    expect(secondDuration).toBeLessThan(firstDuration);
  });
});

describe('TakeStore', () => {
  it('snapshots and deeply freezes accepted requests and results', async () => {
    const draft = withoutAudioCapability() as unknown as Record<string, unknown>;
    const store = new TakeStore();
    const take = await store.perform(new MockBackend(), draft);

    const character = draft.character as Record<string, unknown>;
    character.name = '変更後';

    expect(((take.request.character as Record<string, unknown>).name)).toBe('ミオ');
    expect(Object.isFrozen(take)).toBe(true);
    expect(Object.isFrozen(take.request.character as object)).toBe(true);
    expect(store.takes).toHaveLength(1);
  });

  it('accepts SUCCEEDED + INFEASIBLE as a domain result', async () => {
    const request = withoutAudioCapability();
    const backend: PerformanceBackend = {
      perform: async (input) => fixtureResult(input, { realization_outcome: 'INFEASIBLE' }),
    };
    const store = new TakeStore();

    const take = await store.perform(backend, request);

    expect(take.result.job_status).toBe('SUCCEEDED');
    expect(take.result.realization_outcome).toBe('INFEASIBLE');
  });

  it('rejects FAILED carrying a realization outcome and leaves prior takes untouched', async () => {
    const request = withoutAudioCapability();
    const store = new TakeStore();
    await store.perform(new MockBackend(), request);
    const invalidBackend: PerformanceBackend = {
      perform: async (input) => fixtureResult(input, {
        job_status: 'FAILED',
        realization_outcome: 'INFEASIBLE',
      }),
    };

    await expect(store.perform(invalidBackend, request)).rejects.toBeInstanceOf(ContractValidationError);
    expect(store.takes).toHaveLength(1);
  });

  it('rejects result/request identity mismatch and leaves prior takes untouched', async () => {
    const request = withoutAudioCapability();
    const store = new TakeStore();
    await store.perform(new MockBackend(), request);
    const mismatchedBackend: PerformanceBackend = {
      perform: async (input) => fixtureResult(input, { request_id: 'different_request' }),
    };

    await expect(store.perform(mismatchedBackend, request)).rejects.toBeInstanceOf(ContractValidationError);
    expect(store.takes).toHaveLength(1);
  });

  it('contains backend exceptions without corrupting prior takes', async () => {
    const request = withoutAudioCapability();
    const store = new TakeStore();
    await store.perform(new MockBackend(), request);
    const throwingBackend: PerformanceBackend = {
      perform: async () => { throw new Error('fixture failure'); },
    };

    await expect(store.perform(throwingBackend, request)).rejects.toBeInstanceOf(BackendExecutionError);
    expect(store.takes).toHaveLength(1);
  });
});
