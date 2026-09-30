import type { PerformanceBackend } from './PerformanceBackend';
import { FIXED_AUDIO_REFS } from './fixedAudioAssets';
import type { PerformanceRequestV0, PerformanceResultV0 } from '../contract/types';
import { deterministicSha256, INPUT_DIGEST_ALGORITHM } from '../contract/canonicalJson';

const CONTRACT_VERSION = 'performance-contract/v0' as const;
const BACKEND_NAME = 'morphoacoustics-fixed-v0';
const BACKEND_VERSION = '0.1.0+exp009.40de0d10';
const MODEL_COMMIT = '40de0d10cdfc751864f86814ef77a6bbea5ba781';
const CI_ARTIFACT_DIGEST = 'sha256:5a16f1bffded9a28c66f454c3e0f4b3d80bc7088141ee47cf88d56a401a86651';
const SUPPORTED_CAPABILITIES = new Set(['audio', 'timeline', 'diagnostics']);
const SUPPORTED_UTTERANCES = new Set(['あ', 'あー']);
const DURATION_SECONDS = 0.5;

type UnknownRecord = Record<string, unknown>;
export type FixedBodyFixture = 'uniform' | 'constricted';

type Fixture = Readonly<{
  id: FixedBodyFixture;
  audioRef: string;
  bodyBindingRef: string;
  label: string;
}>;

const FIXTURES: Record<FixedBodyFixture, Fixture> = {
  uniform: {
    id: 'uniform',
    audioRef: FIXED_AUDIO_REFS.uniform,
    bodyBindingRef: `body-binding://experiment-009/uniform@${MODEL_COMMIT}`,
    label: 'Experiment 009 uniform fixed tract',
  },
  constricted: {
    id: 'constricted',
    audioRef: FIXED_AUDIO_REFS.constricted,
    bodyBindingRef: `body-binding://experiment-009/constricted@${MODEL_COMMIT}`,
    label: 'Experiment 009 fixed constriction tract',
  },
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function arrayOfRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function digestSuffix(digest: string, offset: number): string {
  return digest.replace(/^sha256:/, '').slice(offset, offset + 16);
}

export class FixedMorphoacousticsBackend implements PerformanceBackend {
  readonly fixture: Fixture;

  constructor(body: FixedBodyFixture) {
    this.fixture = FIXTURES[body];
  }

  async perform(request: PerformanceRequestV0): Promise<PerformanceResultV0> {
    const inputDigest = await deterministicSha256(request);
    const adapterDigest = await deterministicSha256({
      input_digest: inputDigest,
      backend: BACKEND_NAME,
      backend_version: BACKEND_VERSION,
      fixture: this.fixture.id,
    });

    const script = asRecord(request.script);
    const segments = arrayOfRecords(script.segments);
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

    const supportedScript = Boolean(segmentId) && SUPPORTED_UTTERANCES.has(utterance);
    const supported = supportedScript && unsupportedCapabilities.length === 0;

    const diagnostics: Array<Record<string, unknown>> = [
      {
        code: 'FIXED_MORPHOACOUSTICS_FIXTURE',
        severity: 'info',
        message: `${this.fixture.label}; source morphoacoustics commit ${MODEL_COMMIT}; CI artifact ${CI_ARTIFACT_DIGEST}.`,
      },
      {
        code: 'FIXED_DIRECTION_NOT_APPLIED',
        severity: 'warning',
        message: 'X1a fixed-vocalization audio does not map creator Direction controls into physics yet. Direction is preserved in the immutable request but does not modify this audio fixture.',
      },
    ];

    if (!supportedScript) {
      diagnostics.push({
        code: 'FIXED_SCRIPT_UNSUPPORTED',
        severity: 'warning',
        message: 'This X1a adapter supports exactly one segment whose text is 「あ」 or 「あー」. It does not approximate other text.',
      });
    }
    if (unsupportedCapabilities.length > 0) {
      diagnostics.push({
        code: 'FIXED_CAPABILITY_UNSUPPORTED',
        severity: 'warning',
        message: `This X1a adapter does not provide: ${unsupportedCapabilities.join(', ')}.`,
      });
    }

    const artifacts: Array<Record<string, unknown>> = supported && segmentId
      ? [
          {
            kind: 'audio',
            ref: this.fixture.audioRef,
            media_type: 'audio/wav',
            segment_id: segmentId,
          },
          {
            kind: 'body-binding',
            ref: this.fixture.bodyBindingRef,
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
        backend: `${BACKEND_NAME}:${this.fixture.id}`,
        backend_version: BACKEND_VERSION,
        contract_version: CONTRACT_VERSION,
        seed: request.seed,
        input_digest: inputDigest,
        input_digest_algorithm: INPUT_DIGEST_ALGORITHM,
      },
    } as PerformanceResultV0;
  }
}
