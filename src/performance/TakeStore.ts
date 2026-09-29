import type { PerformanceBackend } from '../backend/PerformanceBackend';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';
import { validatePerformanceRequest, validatePerformanceResult } from '../contract/validation';

export type TakeRecord = Readonly<{
  request: PerformanceRequestV0;
  result: PerformanceResultV0;
}>;

export class ContractValidationError extends Error {
  readonly issues: readonly string[];

  constructor(stage: 'request' | 'result', issues: readonly string[]) {
    super(`${stage} failed Performance Contract validation: ${issues.join('; ')}`);
    this.name = 'ContractValidationError';
    this.issues = [...issues];
  }
}

export class BackendExecutionError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('performance backend threw before returning a valid result');
    this.name = 'BackendExecutionError';
    this.cause = cause;
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  return value;
}

function immutableClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

export async function performTake(
  backend: PerformanceBackend,
  input: unknown,
): Promise<TakeRecord> {
  const requestValidation = validatePerformanceRequest(input);
  if (!requestValidation.ok) {
    throw new ContractValidationError('request', requestValidation.issues);
  }

  const request = immutableClone(input as PerformanceRequestV0);
  let rawResult: PerformanceResultV0;
  try {
    rawResult = await backend.perform(request);
  } catch (cause) {
    throw new BackendExecutionError(cause);
  }

  const resultValidation = validatePerformanceResult(rawResult, request);
  if (!resultValidation.ok) {
    throw new ContractValidationError('result', resultValidation.issues);
  }

  return deepFreeze({
    request,
    result: immutableClone(rawResult),
  });
}

export class TakeStore {
  #takes: readonly TakeRecord[] = Object.freeze([]);

  get takes(): readonly TakeRecord[] {
    return this.#takes;
  }

  async perform(backend: PerformanceBackend, input: unknown): Promise<TakeRecord> {
    const take = await performTake(backend, input);
    this.#takes = Object.freeze([...this.#takes, take]);
    return take;
  }
}
