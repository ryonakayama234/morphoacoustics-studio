export type ContractVersionV0 = 'performance-contract/v0';

/**
 * Intentionally shallow envelopes.
 * Runtime JSON Schemas in vendor/performance-contract/v0 are authoritative.
 * Do not duplicate the nested contract as hand-maintained TypeScript types.
 */
export type PerformanceRequestV0 = Readonly<Record<string, unknown>> & {
  readonly schema_version: ContractVersionV0;
  readonly request_id: string;
  readonly seed: number;
};

export type PerformanceResultV0 = Readonly<Record<string, unknown>> & {
  readonly schema_version: ContractVersionV0;
  readonly performance_id: string;
  readonly request_id: string;
  readonly take_id: string;
  readonly job_status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
};
