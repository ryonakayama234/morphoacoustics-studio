import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';

/** Backend-neutral creative integration boundary. */
export interface PerformanceBackend {
  perform(request: PerformanceRequestV0): Promise<PerformanceResultV0>;
}
