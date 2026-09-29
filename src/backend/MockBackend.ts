import type { PerformanceBackend } from './PerformanceBackend';
import { requestSegments, resolveEffectiveControls } from './effectiveControls';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';
import { deterministicSha256, INPUT_DIGEST_ALGORITHM } from '../contract/canonicalJson';

const CONTRACT_VERSION = 'performance-contract/v0' as const;
const BACKEND_NAME = 'mock-v0';
const BACKEND_VERSION = '0.1.0';
const SUPPORTED_CAPABILITIES = new Set(['timeline', 'diagnostics']);

function roundSeconds(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function textLength(value: unknown): number {
  return typeof value === 'string' ? Array.from(value).length : 0;
}

function digestSuffix(digest: string, offset: number): string {
  return digest.replace(/^sha256:/, '').slice(offset, offset + 16);
}

export class MockBackend implements PerformanceBackend {
  async perform(request: PerformanceRequestV0): Promise<PerformanceResultV0> {
    const inputDigest = await deterministicSha256(request);
    const segments = requestSegments(request);
    const requestedCapabilities = Array.isArray(request.requested_capabilities)
      ? request.requested_capabilities.filter((value): value is string => typeof value === 'string')
      : [];
    const unsupportedCapabilities = requestedCapabilities.filter(
      (capability) => !SUPPORTED_CAPABILITIES.has(capability),
    );

    let cursor = 0;
    const timeline = segments.map((segment, index) => {
      const segmentId = String(segment.segment_id);
      const effective = resolveEffectiveControls(request, segmentId);
      const pace = effective.pace ?? 1;
      const baseDuration = Math.max(0.24, textLength(segment.text) * 0.11);
      const duration = baseDuration / pace;
      const startSeconds = roundSeconds(cursor);
      const endSeconds = roundSeconds(startSeconds + duration);
      cursor = endSeconds + (index === segments.length - 1 ? 0 : 0.1);
      return {
        segment_id: segmentId,
        start_seconds: startSeconds,
        end_seconds: endSeconds,
      };
    });

    const diagnostics: Array<Record<string, unknown>> = [
      {
        code: 'MOCK_BACKEND',
        severity: 'info',
        message: 'This result was produced by the deterministic mock backend and contains no synthesized voice audio.',
      },
    ];

    if (unsupportedCapabilities.length > 0) {
      diagnostics.push({
        code: 'MOCK_UNSUPPORTED_CAPABILITY',
        severity: 'warning',
        message: `MockBackend does not provide: ${unsupportedCapabilities.join(', ')}.`,
      });
    }

    return {
      schema_version: CONTRACT_VERSION,
      performance_id: `performance_${digestSuffix(inputDigest, 0)}`,
      request_id: request.request_id,
      take_id: `take_${digestSuffix(inputDigest, 16)}`,
      job_status: 'SUCCEEDED',
      realization_outcome: unsupportedCapabilities.length > 0 ? 'UNSUPPORTED' : 'FEASIBLE',
      artifacts: [],
      timeline,
      diagnostics,
      provenance: {
        backend: BACKEND_NAME,
        backend_version: BACKEND_VERSION,
        contract_version: CONTRACT_VERSION,
        seed: request.seed,
        input_digest: inputDigest,
        input_digest_algorithm: INPUT_DIGEST_ALGORITHM,
      },
    } as PerformanceResultV0;
  }
}
