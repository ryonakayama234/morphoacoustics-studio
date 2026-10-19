import type { PerformanceBackend } from './PerformanceBackend';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';

/** X2a executes fresh physics through a local-only audited Core adapter. */
export class LiveExperimentalBackend implements PerformanceBackend {
  async perform(request: PerformanceRequestV0): Promise<PerformanceResultV0> {
    const response = await fetch('/live/perform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      cache: 'no-store',
    });
    let result: unknown;
    try { result = await response.json(); }
    catch { throw new Error('Live X2a service is unavailable or returned invalid JSON. Start npm run live:server.'); }
    if (!response.ok) {
      throw new Error('Live X2a HTTP ' + response.status + ': ' + JSON.stringify(result).slice(0, 600));
    }
    return result as PerformanceResultV0;
  }
}
