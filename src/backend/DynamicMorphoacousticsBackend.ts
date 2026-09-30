import type { PerformanceBackend } from './PerformanceBackend';
import { DYNAMIC_ASSET_REFS } from './dynamicAssets';
import { requestSegments, resolveEffectiveControls } from './effectiveControls';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';
import { deterministicSha256, INPUT_DIGEST_ALGORITHM } from '../contract/canonicalJson';

const CONTRACT_VERSION = 'performance-contract/v0' as const;
const BACKEND_NAME = 'morphoacoustics-dynamic-x1b-v0';
const BACKEND_VERSION = '0.1.0+exp010.373ff710';
const MODEL_COMMIT = '373ff71026578fa5026ae9ed69f450f8c0ec569f';
const CI_ARTIFACT_DIGEST = 'sha256:de40063fdebe79ca8365b60f97c64675187dc802e3e50a6c0f73c68c1e4da4b5';
const MAPPING_POLICY = 'x1b-pace-two-point-v1';
const BODY_BINDING_REF = `body-binding://experiment-010/wide-body@${MODEL_COMMIT}`;
const DURATION_SECONDS = 0.5;
const SUPPORTED_UTTERANCES = new Set(['あ', 'あー']);
const SUPPORTED_CAPABILITIES = new Set([
  'audio',
  'timeline',
  'diagnostics',
  'gesture_trace',
  'physical_trace',
]);

type MotionCondition = Readonly<{
  name: 'slow' | 'fast';
  pace: number;
  rampSeconds: number;
  audioRef: string;
  traceRef: string;
}>;

const CONDITIONS: readonly MotionCondition[] = [
  {
    name: 'slow',
    pace: 0.75,
    rampSeconds: 0.09,
    audioRef: DYNAMIC_ASSET_REFS.slow.audio,
    traceRef: DYNAMIC_ASSET_REFS.slow.trace,
  },
  {
    name: 'fast',
    pace: 1.25,
    rampSeconds: 0.03,
    audioRef: DYNAMIC_ASSET_REFS.fast.audio,
    traceRef: DYNAMIC_ASSET_REFS.fast.trace,
  },
] as const;

function digestSuffix(digest: string, offset: number): string {
  return digest.replace(/^sha256:/, '').slice(offset, offset + 16);
}

function selectCondition(pace: number | undefined): MotionCondition | undefined {
  if (pace === undefined || !Number.isFinite(pace)) return undefined;
  return CONDITIONS.find((condition) => Math.abs(condition.pace - pace) < 1e-9);
}

export class DynamicMorphoacousticsBackend implements PerformanceBackend {
  async perform(request: PerformanceRequestV0): Promise<PerformanceResultV0> {
    const inputDigest = await deterministicSha256(request);
    const segments = requestSegments(request);
    const requested = Array.isArray(request.requested_capabilities)
      ? request.requested_capabilities.filter((value): value is string => typeof value === 'string')
      : [];
    const unsupportedCapabilities = requested.filter((value) => !SUPPORTED_CAPABILITIES.has(value));

    const onlySegment = segments.length === 1 ? segments[0] : undefined;
    const segmentId = onlySegment && typeof onlySegment.segment_id === 'string'
      ? onlySegment.segment_id
      : undefined;
    const utterance = onlySegment && typeof onlySegment.text === 'string'
      ? onlySegment.text.trim()
      : '';
    const controls = segmentId ? resolveEffectiveControls(request, segmentId) : {};
    const condition = selectCondition(controls.pace);

    const supportedScript = Boolean(segmentId) && SUPPORTED_UTTERANCES.has(utterance);
    const supported = supportedScript && Boolean(condition) && unsupportedCapabilities.length === 0;
    const adapterDigest = await deterministicSha256({
      input_digest: inputDigest,
      backend: BACKEND_NAME,
      backend_version: BACKEND_VERSION,
      mapping_policy: MAPPING_POLICY,
      body: 'wide-body',
      motion: condition?.name ?? 'unsupported',
    });

    const diagnostics: Array<Record<string, unknown>> = [
      {
        code: 'DYNAMIC_MORPHOACOUSTICS_FIXTURE',
        severity: 'info',
        message: `X1b uses morphoacoustics Experiment 010 wide-body output from commit ${MODEL_COMMIT}; CI artifact ${CI_ARTIFACT_DIGEST}.`,
      },
      {
        code: 'DYNAMIC_DIRECTION_SCOPE',
        severity: 'info',
        message: `Only creator-facing pace is mapped in ${MAPPING_POLICY}. Energy, emotion and free-form notes remain authorial input and do not modify physics in X1b.`,
      },
    ];

    if (!supportedScript) {
      diagnostics.push({
        code: 'DYNAMIC_SCRIPT_UNSUPPORTED',
        severity: 'warning',
        message: 'This X1b adapter supports exactly one segment whose text is 「あ」 or 「あー」. It does not approximate other text.',
      });
    }
    if (!condition) {
      diagnostics.push({
        code: 'DYNAMIC_PACE_UNSUPPORTED',
        severity: 'warning',
        message: 'X1b deliberately supports only the validated two-point mapping: pace=0.75 → slow/90 ms ramp, pace=1.25 → fast/30 ms ramp. Intermediate values are not interpolated.',
        ...(segmentId ? { segment_id: segmentId } : {}),
      });
    } else {
      diagnostics.push({
        code: 'DYNAMIC_PACE_MAPPING',
        severity: 'info',
        message: `pace=${condition.pace.toFixed(2)} selected Experiment 010 ${condition.name} motion with ${Math.round(condition.rampSeconds * 1000)} ms attack/release ramp; no continuous pace law is claimed.`,
        ...(segmentId ? { segment_id: segmentId } : {}),
      });
    }
    if (unsupportedCapabilities.length > 0) {
      diagnostics.push({
        code: 'DYNAMIC_CAPABILITY_UNSUPPORTED',
        severity: 'warning',
        message: `This X1b adapter does not provide: ${unsupportedCapabilities.join(', ')}.`,
      });
    }

    const artifacts: Array<Record<string, unknown>> = supported && segmentId && condition
      ? [
          {
            kind: 'audio',
            ref: condition.audioRef,
            media_type: 'audio/wav',
            segment_id: segmentId,
          },
          {
            kind: 'dynamic-trace',
            ref: condition.traceRef,
            media_type: 'text/csv',
            segment_id: segmentId,
          },
          {
            kind: 'body-binding',
            ref: BODY_BINDING_REF,
          },
          {
            kind: 'integration-policy',
            ref: `x1b-policy://${MAPPING_POLICY}/${condition.name}?pace=${condition.pace}&ramp_s=${condition.rampSeconds}`,
            segment_id: segmentId,
          },
        ]
      : [];

    const timeline = supported && segmentId
      ? [{ segment_id: segmentId, start_seconds: 0, end_seconds: DURATION_SECONDS }]
      : [];

    return {
      schema_version: CONTRACT_VERSION,
      performance_id: `performance_${digestSuffix(adapterDigest, 0)}`,
      request_id: request.request_id,
      take_id: `take_${digestSuffix(adapterDigest, 16)}`,
      job_status: 'SUCCEEDED',
      realization_outcome: supported ? 'FEASIBLE' : 'UNSUPPORTED',
      artifacts,
      timeline,
      diagnostics,
      provenance: {
        backend: `${BACKEND_NAME}:wide-body:${condition?.name ?? 'unsupported'}`,
        backend_version: BACKEND_VERSION,
        contract_version: CONTRACT_VERSION,
        seed: request.seed,
        input_digest: inputDigest,
        input_digest_algorithm: INPUT_DIGEST_ALGORITHM,
      },
    } as PerformanceResultV0;
  }
}
