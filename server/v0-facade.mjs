/** CHR-1 S3: bounded Character -> CC-A2 v1 -> immutable v0 Take façade.
 * No v0/v1 Take cast, source controls, legacy migration or new physics backend.
 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';

export const V0_SCHEMA = 'studio-v0-take-envelope/v0';
const CORE_SHA = 'b569f044bfda309dff1a00cccf8365754e6b1355';
const BACKEND = 'cc-a2-axial-live/1';
const PRODUCER = 'ryonakayama234/morphoacoustics';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const TAKE = /^take_studio_v0_[0-9a-f]{32}$/;
const FIXED_CAPABILITIES = Object.freeze(['audio', 'timeline', 'diagnostics', 'physical_trace']);
const FIXED_BODIES = Object.freeze(['v3b-axial-M0', 'v3b-axial-M1']);
const HASH = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const json = x => Buffer.from(JSON.stringify(x, null, 2) + '\n', 'utf8');
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

export class V0FacadeError extends Error {
  constructor(code, message, status = 400) {
    super(message); this.name = 'V0FacadeError'; this.code = code; this.status = status;
  }
}
const invalid = (message, code = 'INVALID', status = 400) => new V0FacadeError(code, message, status);
function exact(value, names, required) {
  if (!plain(value) || Object.keys(value).some(k => !names.includes(k)) ||
      required.some(k => !Object.hasOwn(value, k)))
    throw invalid('Invalid or unsupported v0 input fields');
}
function selectedBody(body) {
  return plain(body) && body.kind === 'core_body_preset' &&
    FIXED_BODIES.includes(body.preset_id) && body.preset_revision === 1 &&
    body.producer_repo === PRODUCER && body.core_commit === CORE_SHA &&
    body.backend_id === BACKEND &&
    ['SELECTED_UNRESOLVED', 'VERIFIED_BOUND'].includes(body.binding_state);
}
export function assertV0Submission(input) {
  exact(input, ['submission_id', 'character_id', 'character_revision',
    'character_snapshot_sha256', 'body_preset_id', 'text', 'direction', 'seed'],
    ['submission_id', 'character_id', 'character_revision', 'character_snapshot_sha256']);
  if (!UUID.test(input.submission_id) || !UUID.test(input.character_id) ||
      !Number.isSafeInteger(input.character_revision) || input.character_revision < 1 ||
      !DIGEST.test(input.character_snapshot_sha256))
    throw invalid('Invalid submission, Character ID, revision or snapshot digest');
  if (Object.hasOwn(input, 'text') && input.text !== 'あい')
    throw invalid('Only the frozen あい task is supported', 'UNSUPPORTED_FIXTURE', 422);
  if (Object.hasOwn(input, 'direction') && (!plain(input.direction) ||
      Object.keys(input.direction).length))
    throw invalid('Direction is frozen and empty', 'UNSUPPORTED_DIRECTION', 422);
  if (Object.hasOwn(input, 'seed') && input.seed !== 0)
    throw invalid('Seed is frozen at zero', 'UNSUPPORTED_FIXTURE', 422);
  if (Object.hasOwn(input, 'body_preset_id') && !FIXED_BODIES.includes(input.body_preset_id))
    throw invalid('Unsupported body', 'BODY_MISMATCH', 409);
  return input;
}

/** This is built exclusively from a S1 store-validated, CURRENT immutable revision.
 * The caller-supplied body is a consistency assertion, never an authority.
 */
export function buildV0CoreRequest(input, stored) {
  assertV0Submission(input);
  if (!stored?.head || !stored?.snapshot ||
      stored.head.character_id !== input.character_id ||
      stored.snapshot.character_id !== input.character_id ||
      stored.head.current_revision !== input.character_revision ||
      stored.snapshot.revision !== input.character_revision ||
      stored.head.snapshot_sha256 !== input.character_snapshot_sha256 ||
      stored.snapshot_sha256 !== input.character_snapshot_sha256)
    throw invalid('Character snapshot identity/revision/digest mismatch',
      'SNAPSHOT_MISMATCH', 409);
  const s = stored.snapshot;
  if (!selectedBody(s.active_body_ref) ||
      (input.body_preset_id && input.body_preset_id !== s.active_body_ref.preset_id))
    throw invalid('Body must equal the saved, pinned M0/M1 selection', 'BODY_MISMATCH', 409);
  // No unverified arbitrary motion or source preset is allowed into the physical path.
  if (s.capability_scope !== 'CC_A2_M0_M1_FIXED_ONLY' ||
      s.active_motion_ref !== null || s.source_profile_ref !== null)
    throw invalid('Unsupported Character motion/source selection',
      'UNSUPPORTED_FIXTURE', 422);
  return {
    schema_version: 'performance-contract/v1',
    request_id: 'studio_v0_' + input.submission_id.toLowerCase().replaceAll('-', ''),
    character: {
      schema_version: 'performance-contract/v0',
      character_id: s.character_id, revision: s.revision, name: s.name,
      description: s.description, default_controls: structuredClone(s.default_controls),
    },
    script: { schema_version: 'performance-contract/v0',
      script_id: 'studio_v0_frozen_ai', revision: 1,
      segments: [{ segment_id: 's1', speaker_character_id: s.character_id, text: 'あい' }] },
    direction: { schema_version: 'performance-contract/v0',
      direction_id: 'studio_v0_neutral', revision: 1,
      controls: {}, segment_overrides: [] },
    seed: 0, requested_capabilities: [...FIXED_CAPABILITIES],
    embodiment: { preset_id: s.active_body_ref.preset_id,
      preset_revision: s.active_body_ref.preset_revision },
  };
}

/** Independent READ-ONLY recomputation of the pinned LF generator. This is NOT the
 * samples consumed by the physical Core run; SIMD/NumPy-dependent raw hashes
 * must never be promoted to full VERIFIED SOURCE.
 */
export function recomputeFixedSource({ coreDir, python = 'python', verifyPin }) {
  verifyPin();
  const script = [
    'import hashlib,json,numpy as np',
    'from morphoacoustics.integration import limited_live as f',
    'exp=f._load_audited_experiment()',
    'assert np.__version__ == "2.4.6"',
    'sources,_=exp.EXP26.EXP13.build_sources()',
    'x=np.asarray(sources[f.SOURCE_ID].source,dtype=np.float64)',
    'assert f.SOURCE_ID == "lf_fixed" and x.ndim == 1 and np.isfinite(x).all()',
    'print(json.dumps({"id":f.SOURCE_ID,"sha256":"sha256:"+hashlib.sha256(x.tobytes(order="C")).hexdigest(),"dtype":x.dtype.str,"samples":int(x.size),"numpy_version":np.__version__}))',
  ].join('\n');
  const proc = spawnSync(python, ['-c', script], {
    cwd: coreDir, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024,
    env: { ...process.env, PYTHONPATH: path.join(coreDir, 'src') },
  });
  verifyPin();
  if (proc.error || proc.status !== 0)
    throw new Error('Pinned source recomputation failed: ' +
      (proc.error?.message || proc.stderr || 'Python exited').slice(0, 200));
  const found = JSON.parse(proc.stdout);
  if (found.id !== 'lf_fixed' || !DIGEST.test(found.sha256) ||
      found.numpy_version !== '2.4.6' || found.samples < 1 ||
      typeof found.dtype !== 'string')
    throw new Error('Pinned source recomputation metadata invalid');
  return found;
}
async function syncDir(dir) {
  const fd = await fs.open(dir, 'r');
  try { await fd.sync(); }
  catch (e) { if (process.platform !== 'win32') throw e; }
  finally { await fd.close(); }
}
async function immutableWrite(filename, bytes) {
  const fd = await fs.open(filename, 'wx', 0o600);
  try { await fd.writeFile(bytes); await fd.sync(); }
  finally { await fd.close(); }
  await syncDir(path.dirname(filename));
}
function bodyTakeRef(s, result) {
  // A BOUND/FEASIBLE Core result was checked by performCC, including receipt,
  // raw pressure and frozen Experiment028 oracles, before it was returned.
  const verified = result.realization_outcome === 'FEASIBLE' &&
    result.embodiment?.status === 'BOUND' &&
    result.embodiment.preset_id === s.active_body_ref.preset_id &&
    result.embodiment.preset_revision === s.active_body_ref.preset_revision &&
    DIGEST.test(result.embodiment.preparation_digest);
  return verified ? {
    ...s.active_body_ref, binding_state: 'VERIFIED_BOUND',
    preparation_digest: result.embodiment.preparation_digest,
    body_receipt_ref: result.artifacts.find(a => a.kind === 'physical-receipt')?.ref,
  } : { ...s.active_body_ref, binding_state: 'SELECTED_UNRESOLVED',
    preparation_digest: undefined, body_receipt_ref: undefined };
}
export function makeV0Envelope({ stored, request, physical, source, receipt = null }) {
  const s = stored.snapshot, result = physical.result;
  const outcome = result?.realization_outcome;
  if (!result || result.request_id !== request.request_id ||
      !isDeepStrictEqual(physical.request, request) ||
      physical.core_commit !== CORE_SHA || !TAKE.test(result.take_id) ||
      result.job_status !== 'SUCCEEDED' ||
      (outcome === 'FEASIBLE' && (!Array.isArray(result.artifacts) ||
       result.artifacts.length !== 4)) ||
      (outcome !== 'FEASIBLE' && result.artifacts?.length !== 0))
    throw invalid('Invalid validated Core outcome for v0 envelope', 'CORE_RESULT_MISMATCH', 502);
  const ref = bodyTakeRef(s, result);
  if (outcome === 'FEASIBLE' && (!ref.body_receipt_ref ||
      ref.binding_state !== 'VERIFIED_BOUND' ||
      receipt?.source?.id !== 'lf_fixed' || receipt?.source?.f0_hz !== 100 ||
      !/^[a-f0-9]{64}$/.test(receipt?.task_plan_sha256 || '')))
    throw invalid('Missing verified physical body/task/source receipt', 'CORE_RESULT_MISMATCH', 502);
  const recomputed = source && DIGEST.test(source.sha256) ? source : null;
  return {
    record_schema: V0_SCHEMA, take_id: result.take_id, physical_take_id: result.take_id,
    created_at: physical.created_at,
    character_id: s.character_id, character_revision: s.revision,
    character_snapshot_sha256: stored.snapshot_sha256, character_snapshot: structuredClone(s),
    request_snapshot: structuredClone(request),
    request_snapshot_sha256: HASH(json(request)),
    request_snapshot_digest_algorithm: 'sha256-utf8-indented-json-v1',
    frozen_core_result: structuredClone(physical.frozen_core_result),
    performance_result_v1: structuredClone(result),
    physical_take_record_sha256: HASH(Buffer.from(JSON.stringify(physical, null, 2), 'utf8')),
    exact_body_ref: ref,
    motion_ref: { id: 'cc-a2-fixed-three-task',
      task_plan_sha256: receipt?.task_plan_sha256 ?? null,
      evidence: outcome === 'FEASIBLE' ? 'CORE_PHYSICAL_RECEIPT' : 'UNAVAILABLE_REFUSAL' },
    source_profile_ref: {
      id: 'lf_fixed', f0_hz: 100, read_only: true,
      producer_repo: PRODUCER, core_commit: CORE_SHA,
      generator: 'EXP26.EXP13.build_sources', backend_id: BACKEND,
    },
    source_samples_sha256: recomputed?.sha256 ?? null,
    source_samples_evidence: recomputed ? 'RECOMPUTED' : 'UNKNOWN',
    source_samples_metadata: recomputed ? { dtype: recomputed.dtype,
      count: recomputed.samples, numpy_version: recomputed.numpy_version,
      scope: 'same-environment independent recomputation, not actual-run bytes' } : null,
    actual_run_source_samples_sha256: null,
    full_verified_source_state: 'UNKNOWN',
    provenance_state: 'INCOMPLETE_PROVENANCE',
    core_commit: CORE_SHA, backend_id: BACKEND, adapter_version: 'chr1-s3-v0-facade/1',
    seed: 0, sample_rate_hz: 48000, duration_seconds: 0.5,
    job_status: result.job_status, realization_outcome: outcome,
    diagnostics: structuredClone(result.diagnostics ?? []),
    artifact_refs: structuredClone(result.artifacts),
    playback_gain_policy: 'Core per-Take peak normalization; not SPL-comparable',
    claim_limit: 'M0/M1 fixed three-task /a/-to-/i/-like, LF100; human phonetic/source authenticity not verified',
  };
}
async function safeReadEnvelope(filename) {
  const st = await fs.lstat(filename);
  if (!st.isFile() || st.isSymbolicLink() || st.size <= 0 || st.size > 1024 * 1024)
    throw invalid('Unsafe v0 Take file', 'CORRUPT', 500);
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (after.dev !== st.dev || after.ino !== st.ino || after.size !== st.size)
      throw invalid('v0 Take file changed', 'CORRUPT', 500);
    const bytes = await handle.readFile();
    return { record: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      sha256: HASH(bytes) };
  } finally { await handle.close(); }
}
export function createV0Facade({ dataDir, characterStore, performCore, verifyPin,
  recomputeSource, archive }) {
  const root = path.resolve(dataDir);
  const takeDir = path.join(root, 'v0-takes');
  const replayDir = path.join(root, 'v0-replays');
  async function initialize() {
    await fs.mkdir(takeDir, { recursive: true });
    await fs.mkdir(replayDir, { recursive: true });
  }
  async function submit(raw) {
    const input = assertV0Submission(raw);
    const id = input.character_id.toLowerCase();
    // The caller's mutable draft is never authoritative. Read and verify the
    // exact immutable snapshot again at the moment the Core request is built.
    const stored = await characterStore.get(id, input.character_revision);
    verifyPin();
    const request = buildV0CoreRequest({ ...input, character_id: id,
      character_snapshot_sha256: input.character_snapshot_sha256 }, stored);
    // Durable replay claim precedes execution. Even a crash/refusal cannot
    // silently render the same submission twice; explicit new ID is required.
    const replay = path.join(replayDir,
      createHash('sha256').update(input.submission_id.toLowerCase()).digest('hex') + '.json');
    try { await immutableWrite(replay, json({ record_schema: 'studio-v0-replay/v0',
      submission_id: input.submission_id.toLowerCase(), character_id: id,
      character_revision: input.character_revision,
      character_snapshot_sha256: input.character_snapshot_sha256,
      request_id: request.request_id, claimed_at: new Date().toISOString() })); }
    catch (e) {
      if (e.code === 'EEXIST') throw invalid('Submission already claimed', 'REPLAY', 409);
      throw e;
    }
    const physical = await performCore(request); // real CC-A2 v1 path, no mock fallback
    verifyPin();
    let source = null;
    if (physical.result?.realization_outcome === 'FEASIBLE' && recomputeSource) {
      try { source = await recomputeSource(); }
      catch { source = null; } // never convert missing evidence into VERIFIED SOURCE
      verifyPin();
    }
    let receipt = null;
    if (physical.result?.realization_outcome === 'FEASIBLE') {
      const art = physical.result.artifacts.find(a => a.kind === 'physical-receipt');
      const match = /^\\/cc-a2\\/artifacts\\/([a-f0-9]{64})\\.json$/.exec(art?.ref || '');
      if (!match) throw invalid('Physical receipt reference missing', 'CORE_RESULT_MISMATCH', 502);
      const filename = path.join(root, 'artifacts', match[1] + '.json');
      const st = await fs.lstat(filename);
      if (!st.isFile() || st.isSymbolicLink() || st.size > 2_000_000)
        throw invalid('Unsafe physical receipt', 'CORE_RESULT_MISMATCH', 502);
      const rawReceipt = await fs.readFile(filename);
      if (HASH(rawReceipt) !== 'sha256:' + match[1])
        throw invalid('Physical receipt SHA mismatch', 'CORE_RESULT_MISMATCH', 502);
      receipt = JSON.parse(rawReceipt.toString('utf8'));
      if (receipt.body?.preset_id !== request.embodiment.preset_id ||
          receipt.body?.preparation_digest !== physical.result.embodiment.preparation_digest)
        throw invalid('Physical receipt body mismatch', 'CORE_RESULT_MISMATCH', 502);
    }
    const envelope = makeV0Envelope({ stored, request, physical, source, receipt });
    await immutableWrite(path.join(takeDir, resultFilename(envelope.take_id)), json(envelope));
    return { envelope, integrity_state: 'INCOMPLETE_PROVENANCE',
      source_verification_state: 'UNKNOWN', read_only: true };
  }
  function resultFilename(takeId) {
    if (typeof takeId !== 'string' || !TAKE.test(takeId))
      throw invalid('Unsafe or non-v0 TakeID', 'INVALID_TAKE_ID');
    return takeId + '.json';
  }
  async function lookup(takeId) {
    const { record, sha256 } = await safeReadEnvelope(path.join(takeDir, resultFilename(takeId)));
    if (record.record_schema !== V0_SCHEMA || record.take_id !== takeId ||
        record.request_snapshot_sha256 !== HASH(json(record.request_snapshot)) ||
        record.physical_take_id !== takeId || record.core_commit !== CORE_SHA ||
        record.full_verified_source_state !== 'UNKNOWN' ||
        record.provenance_state !== 'INCOMPLETE_PROVENANCE' ||
        !DIGEST.test(record.character_snapshot_sha256))
      throw invalid('v0 Take envelope failed integrity check', 'CORRUPT', 500);
    const stored = await characterStore.get(record.character_id, record.character_revision);
    if (stored.snapshot_sha256 !== record.character_snapshot_sha256 ||
        !isDeepStrictEqual(stored.snapshot, record.character_snapshot))
      throw invalid('v0 Take Character snapshot no longer matches', 'CORRUPT', 500);
    const integrity = await archive.lookup(takeId);
    return { envelope: record, envelope_sha256: sha256,
      integrity_state: integrity.state, issues: integrity.issues,
      source_verification_state: 'UNKNOWN', can_export: integrity.can_export,
      read_only: true };
  }
  return { initialize, submit, lookup,
    capabilities: () => ({ fixed_text: 'あい', fixed_seed: 0,
      fixed_tasks: 3, bodies: [...FIXED_BODIES],
      source: { id: 'lf_fixed', f0_hz: 100, read_only: true },
      full_verified_source_state: 'UNKNOWN' }) };
}
