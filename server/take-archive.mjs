/** CHR-1 S2. Read-only Take inventory and RFC 8493 BagIt 1.0 ZIP exporter.
 * No persisted Take, artifact or Core execution path is ever written here.
 * ZIP uses STORE entries; no third-party ZIP dependency or re-encoding.
 */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';

export const INTEGRITY = Object.freeze({
  AVAILABLE_VERIFIED: 'AVAILABLE_VERIFIED', MISSING_ARTIFACT: 'MISSING_ARTIFACT',
  CORRUPT_ARTIFACT: 'CORRUPT_ARTIFACT', UNVERIFIED_LEGACY: 'UNVERIFIED_LEGACY',
  INCOMPLETE_PROVENANCE: 'INCOMPLETE_PROVENANCE', REFUSAL_NO_AUDIO: 'REFUSAL_NO_AUDIO',
});
const TAKE_ID = /^take_[A-Za-z0-9][A-Za-z0-9_-]{0,159}$/;
const RUN_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
const HEX = /^[0-9a-f]{64}$/;
const MAX_RECORD = 1024 * 1024;
const MAX_ARTIFACT = 2_000_000;
const KINDS = Object.freeze({
  audio: { extension: 'wav', original: 'audio.wav', media: 'audio/wav' },
  'raw-pressure': { extension: 'npy', original: 'raw_pressure_pa.npy', media: 'application/x-npy' },
  'dynamic-trace': { extension: 'csv', original: 'physical_trace.csv', media: 'text/csv' },
  'physical-receipt': { extension: 'json', original: 'physical_receipt.json', media: 'application/json' },
});
const sha = b => createHash('sha256').update(b).digest('hex');
const isSameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cmp = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size
  && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;
const errCode = e => e?.code === 'ENOENT' ? 'MISSING' : 'UNREADABLE';
const jsonBuffer = value => Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');

export class TakeArchiveError extends Error {
  constructor(code, message, status = 409) { super(message); this.name = 'TakeArchiveError'; this.code = code; this.status = status; }
}
export function assertTakeId(id) {
  if (typeof id !== 'string' || !TAKE_ID.test(id) || id.includes('..'))
    throw new TakeArchiveError('INVALID_TAKE_ID', 'Unsafe TakeID', 400);
  return id;
}
async function safeDirectory(dir, optional = false) {
  let st;
  try { st = await fs.lstat(dir); }
  catch (e) { if (optional && e.code === 'ENOENT') return false; throw e; }
  if (!st.isDirectory() || st.isSymbolicLink())
    throw new TakeArchiveError('UNSAFE_PATH', 'Directory is not a plain directory');
  return true;
}
async function openRegular(filename, limit) {
  const before = await fs.lstat(filename);
  if (!before.isFile() || before.isSymbolicLink() || before.size <= 0 || before.size > limit)
    throw new TakeArchiveError('UNSAFE_FILE', 'Non-regular or oversized file');
  const handle = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!cmp(before, await handle.stat()) || !cmp(before, await fs.lstat(filename)))
      throw new TakeArchiveError('FILE_CHANGED', 'File changed while opening');
    return { handle, before, filename };
  } catch (e) { await handle.close(); throw e; }
}
async function scanOpened(opened, bufferOutput = false) {
  const { handle, before } = opened;
  const hash = createHash('sha256');
  let crc = 0xffffffff;
  const buffers = bufferOutput ? [] : null;
  const buf = Buffer.allocUnsafe(65536);
  let count = 0;
  while (count < before.size) {
    const { bytesRead } = await handle.read(buf, 0, Math.min(buf.length, before.size - count), count);
    if (!bytesRead) throw new TakeArchiveError('FILE_CHANGED', 'File shrank during verification');
    const piece = buf.subarray(0, bytesRead);
    hash.update(piece);
    crc = crc32Part(crc, piece);
    if (buffers) buffers.push(Buffer.from(piece));
    count += bytesRead;
  }
  if (count !== before.size || !cmp(before, await handle.stat()) ||
      !cmp(before, await fs.lstat(opened.filename)))
    throw new TakeArchiveError('FILE_CHANGED', 'File changed during verification');
  return { sha256: hash.digest('hex'), crc32: (crc ^ 0xffffffff) >>> 0,
    size: count, bytes: buffers ? Buffer.concat(buffers) : undefined };
}
async function readRecord(filename) {
  const opened = await openRegular(filename, MAX_RECORD);
  try { return await scanOpened(opened, true); }
  finally { await opened.handle.close(); }
}
function problemsFor(record, coreSha) {
  const result = record?.result;
  const diagnostics = [];
  if (!result || typeof result !== 'object' || !record.request || !record.frozen_core_result)
    diagnostics.push('MISSING_REQUEST_OR_CORE_SNAPSHOT');
  if (result?.take_id !== record?.frozen_core_result?.take_id ||
      result?.request_id !== record?.request?.request_id)
    diagnostics.push('INCONSISTENT_TAKE_IDENTITY');
  if (result?.schema_version !== 'performance-contract/v1' ||
      result?.job_status !== 'SUCCEEDED' || !record?.created_at ||
      !Number.isFinite(Date.parse(record.created_at))) diagnostics.push('INCOMPLETE_RECORD_FIELDS');
  if (record.core_commit === coreSha &&
      (result?.provenance?.backend_version !== 'cc-a2-axial-live/1' ||
       !/^sha256:[a-f0-9]{64}$/.test(result?.provenance?.input_digest || '') ||
       record?.frozen_core_result?.provenance?.input_digest !== result?.provenance?.input_digest))
    diagnostics.push('INCONSISTENT_CORE_PROVENANCE');
  return diagnostics;
}
/** Independent of newestPhysicalTakes: traverse every saved run JSON, not newest 100. */
export function createTakeArchive({ dataDir, coreSha }) {
  if (typeof dataDir !== 'string' || !path.isAbsolute(dataDir) ||
      !/^[a-f0-9]{40}$/.test(coreSha || '')) throw new TypeError('Absolute dataDir and exact Core SHA required');
  const root = path.resolve(dataDir);
  async function inventory(id) {
    assertTakeId(id);
    await safeDirectory(root);
    await safeDirectory(path.join(root, 'takes'));
    const folders = ['takes'];
    if (await safeDirectory(path.join(root, 'v0-takes'), true)) folders.push('v0-takes');
    const matches = [], unreadable = [], envelopes = [];
    for (const folder of folders) {
      const dir = path.join(root, folder);
      for (const name of (await fs.readdir(dir)).sort()) {
        if (folder === 'takes' ? !RUN_FILE.test(name) : !/^take_[A-Za-z0-9_-]+\.json$/.test(name)) {
          // Any symlink/unknown file in Takes must be visible, never followed.
          unreadable.push({ file: `${folder}/${name}`, reason: 'UNRECOGNIZED_ENTRY' });
          continue;
        }
        const rel = `${folder}/${name}`;
        try {
          const data = await readRecord(path.join(dir, name));
          const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data.bytes));
          const recordId = parsed?.result?.take_id ?? parsed?.take_id;
          if (folder === 'v0-takes') {
            // A v0 envelope supplements the v1 physical Take with the SAME ID.
            // It is never a second physical Take / duplicate logical result.
            if (recordId === id) envelopes.push({ record: parsed, evidence: data, rel });
            else if (!assertedIdOrFalse(recordId))
              unreadable.push({ file: rel, reason: 'UNKNOWN_TAKE_ID' });
          } else if (recordId === id) matches.push({ record: parsed, evidence: data, rel });
          else if (!assertedIdOrFalse(recordId)) unreadable.push({ file: rel, reason: 'UNKNOWN_TAKE_ID' });
        } catch (e) { unreadable.push({ file: rel, reason: e.code || 'BAD_RECORD' }); }
      }
    }
    if (!matches.length) throw new TakeArchiveError('TAKE_NOT_FOUND',
      'TakeID not present in full inventory (unreadable records are reported separately)', 404);
    if (matches.length !== 1) return { state: INTEGRITY.CORRUPT_ARTIFACT,
      take_id: id, read_only: true, can_export: false,
      issues: ['AMBIGUOUS_TAKE_ID'], matching_records: matches.map(m => m.rel), unreadable_records: unreadable };
    const { record, evidence, rel } = matches[0];
    const issues = problemsFor(record, coreSha);
    let v0 = null;
    if (envelopes.length > 1) issues.push('AMBIGUOUS_V0_ENVELOPE');
    if (envelopes.length === 1) {
      const item = envelopes[0], e = item.record;
      if (e?.record_schema !== 'studio-v0-take-envelope/v0' ||
          e.take_id !== id || e.physical_take_id !== id ||
          e.core_commit !== record.core_commit ||
          e.physical_take_record_sha256 !== 'sha256:' + evidence.sha256 ||
          e.character_id !== record.request?.character?.character_id ||
          e.character_revision !== record.request?.character?.revision ||
          e.full_verified_source_state !== 'UNKNOWN' ||
          e.provenance_state !== 'INCOMPLETE_PROVENANCE' ||
          !/^sha256:[a-f0-9]{64}$/.test(e.character_snapshot_sha256 || '') ||
          !/^sha256:[a-f0-9]{64}$/.test(e.request_snapshot_sha256 || '') ||
          !isSameJson(e.request_snapshot, record.request) ||
          !isSameJson(e.performance_result_v1, record.result) ||
          !isSameJson(e.frozen_core_result, record.frozen_core_result)) {
        issues.push('INCONSISTENT_V0_ENVELOPE');
      } else {
        v0 = { record_file: item.rel, record_sha256: item.evidence.sha256,
          source_samples_evidence: e.source_samples_evidence,
          source_samples_sha256: e.source_samples_sha256,
          full_verified_source_state: 'UNKNOWN' };
      }
    }
    const items = [], seen = new Set();
    const feasible = record.result?.realization_outcome === 'FEASIBLE';
    const refused = !feasible && record.result?.realization_outcome &&
      record.result?.realization_outcome !== 'FEASIBLE';
    const refs = record.result?.artifacts;
    if (!Array.isArray(refs)) issues.push('MISSING_ARTIFACT_LIST');
    if (feasible) {
      if (!Array.isArray(refs) || refs.length !== Object.keys(KINDS).length)
        issues.push('MISSING_REQUIRED_ARTIFACT_KIND');
      for (const [kind, spec] of Object.entries(KINDS)) {
        const candidates = Array.isArray(refs) ? refs.filter(x => x?.kind === kind) : [];
        const core = record.frozen_core_result?.artifacts?.find(x => x?.kind === kind);
        if (candidates.length !== 1) { issues.push(`MISSING_KIND:${kind}`); continue; }
        const item = candidates[0];
        const hit = /^\/cc-a2\/artifacts\/([0-9a-f]{64})\.(wav|npy|csv|json)$/.exec(item.ref || '');
        if (!hit || hit[2] !== spec.extension || item.media_type !== spec.media ||
            (core && (core.ref !== spec.original || core.media_type !== spec.media ||
              core.segment_id !== item.segment_id)) ||
            !core || seen.has(item.ref)) {
          issues.push(`UNSAFE_OR_INCONSISTENT_REF:${kind}`); continue;
        }
        seen.add(item.ref);
        items.push({ kind, ref: item.ref, sha256: hit[1],
          path: `artifacts/${hit[1]}.${spec.extension}`, zip_path: `data/artifacts/${hit[1]}.${spec.extension}`,
          status: 'PENDING' });
      }
    } else if (refused) {
      if (!Array.isArray(refs) || refs.length ||
          !Array.isArray(record.frozen_core_result?.artifacts) || record.frozen_core_result.artifacts.length)
        issues.push('REFUSAL_CARRIES_ARTIFACTS');
    } else issues.push('UNKNOWN_REALIZATION_OUTCOME');
    let missing = false, corrupt = false;
    if (items.length) {
      try { await safeDirectory(path.join(root, 'artifacts')); }
      catch { corrupt = true; issues.push('UNSAFE_ARTIFACT_DIRECTORY'); }
      if (!corrupt) for (const item of items) {
        try {
          const opened = await openRegular(path.join(root, item.path), MAX_ARTIFACT);
          try {
            const found = await scanOpened(opened);
            item.size_bytes = found.size; item.actual_sha256 = found.sha256;
            item.status = found.sha256 === item.sha256 ? 'VERIFIED' : 'CORRUPT';
            if (item.status === 'CORRUPT') { corrupt = true; issues.push(`SHA_MISMATCH:${item.kind}`); }
          } finally { await opened.handle.close(); }
        } catch (e) {
          item.status = e.code === 'ENOENT' ? 'MISSING' : 'CORRUPT';
          if (item.status === 'MISSING') missing = true; else corrupt = true;
          issues.push(`${item.status}:${item.kind}`);
        }
      }
    }
    if (issues.some(x => x.startsWith('MISSING_KIND:') || x === 'MISSING_REQUIRED_ARTIFACT_KIND')) missing = true;
    if (issues.some(x => x.startsWith('UNSAFE_') || x.startsWith('REFUSAL_CARRIES') ||
        x.startsWith('INCONSISTENT_') || x.startsWith('AMBIGUOUS_V0_') ||
        x === 'UNKNOWN_REALIZATION_OUTCOME')) corrupt = true;
    // An old pin is never upgraded in place; detailed anomalies remain visible.
    const legacy = record.core_commit !== coreSha;
    if (legacy) issues.push('OLD_CORE_PIN');
    const unknownSource = !/^sha256:[a-f0-9]{64}$/.test(record.source_samples_sha256 || '') ||
      record.source_samples_evidence !== 'CORE_EMITTED_ACTUAL_RUN';
    if (unknownSource && feasible) issues.push('UNVERIFIED_SOURCE_SAMPLES');
    if (record?.character_revision === undefined && feasible) issues.push('NO_IMMUTABLE_CHARACTER_REVISION');
    const provenanceIncomplete = unknownSource || issues.some(x => x === 'NO_IMMUTABLE_CHARACTER_REVISION' ||
      x === 'MISSING_REQUEST_OR_CORE_SNAPSHOT' || x === 'INCOMPLETE_RECORD_FIELDS' ||
      x === 'INCONSISTENT_CORE_PROVENANCE' || x === 'MISSING_ARTIFACT_LIST');
    const state = legacy ? INTEGRITY.UNVERIFIED_LEGACY
      : corrupt ? INTEGRITY.CORRUPT_ARTIFACT
      : missing ? INTEGRITY.MISSING_ARTIFACT
      : refused ? INTEGRITY.REFUSAL_NO_AUDIO
      : provenanceIncomplete ? INTEGRITY.INCOMPLETE_PROVENANCE : INTEGRITY.AVAILABLE_VERIFIED;
    const canExport = !legacy && !corrupt && !missing &&
      (refused || (feasible && items.length === Object.keys(KINDS).length)) &&
      !issues.some(x => x === 'MISSING_REQUEST_OR_CORE_SNAPSHOT' || x === 'INCOMPLETE_RECORD_FIELDS');
    return { take_id: id, state, can_export: canExport, read_only: true,
      refusal_only: !!refused, core_commit: record.core_commit || null,
      created_at: record.created_at || null, record_file: rel, record_sha256: evidence.sha256,
      artifacts: items, issues, unreadable_records: unreadable,
      v0_envelope: v0 };
  }
  async function lookup(id) { return inventory(id); }
  /** Streams a BagIt ZIP into a caller-owned writable (HTTP response or file).
   * On an error the caller MUST discard its incomplete output. */
  async function exportZip(id, writable) {
    const summary = await inventory(id);
    if (!summary.can_export) throw new TakeArchiveError('EXPORT_BLOCKED',
      `Take cannot be exported: ${summary.state}: ${summary.issues.join(', ')}`);
    const files = [];
    const held = [];
    let finished = false;
    let streamError = null;
    const onStreamError = e => { streamError = e; };
    writable.on('error', onStreamError);
    try {
      const recordPath = path.join(root, summary.record_file);
      const source = await openRegular(recordPath, MAX_RECORD);
      held.push(source);
      const doc = await scanOpened(source, true);
      if (doc.sha256 !== summary.record_sha256)
        throw new TakeArchiveError('FILE_CHANGED', 'Take record changed before export');
      const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(doc.bytes));
      const add = (name, bytes) => files.push({ name, bytes, size: bytes.length,
        sha256: sha(bytes), crc32: crc32(bytes) });
      add('data/take.json', doc.bytes); // exact preexisting Take record bytes
      add('data/performance-request.json', jsonBuffer(record.request));
      add('data/core-result.json', jsonBuffer(record.frozen_core_result));
      add('data/stored-result.json', jsonBuffer(record.result));
      const mapping = summary.artifacts.map(({ kind, ref, zip_path, sha256, size_bytes }) =>
        ({ kind, stored_ref: ref, zip_path, sha256, size_bytes }));
      add('data/portable-ref-map.json', jsonBuffer({ schema: 'chr1-s2-portable-map/v1',
        take_id: id, artifacts: mapping }));
      add('data/archive-evidence.json', jsonBuffer({ schema: 'chr1-s2-export-evidence/v1',
        take_id: id, state: summary.state, issues: summary.issues,
        refusal_only: summary.refusal_only,
        provenance_note: summary.v0_envelope
          ? 'S3 source sample SHA is RECOMPUTED only; actual-run VERIFIED SOURCE remains UNKNOWN.'
          : 'Legacy CC-A2 record: actual-run source samples SHA and immutable server Character revision are not asserted.',
        record_sha256: doc.sha256, core_commit: summary.core_commit }));
      if (summary.v0_envelope) {
        const v0read = await readRecord(path.join(root, summary.v0_envelope.record_file));
        if (v0read.sha256 !== summary.v0_envelope.record_sha256)
          throw new TakeArchiveError('FILE_CHANGED', 'v0 envelope changed before export');
        const v0 = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(v0read.bytes));
        if (v0.physical_take_record_sha256 !== 'sha256:' + doc.sha256 ||
            !isSameJson(v0.request_snapshot, record.request) ||
            !isSameJson(v0.performance_result_v1, record.result))
          throw new TakeArchiveError('FILE_CHANGED', 'v0 envelope no longer matches physical Take');
        add('data/v0-take.json', v0read.bytes);
        add('data/character-revision.json', jsonBuffer(v0.character_snapshot));
      } else if (record.character_snapshot && record.character_revision !== undefined) {
        add('data/character-revision.json', jsonBuffer(record.character_snapshot));
      }
      for (const art of summary.artifacts) {
        const opened = await openRegular(path.join(root, art.path), MAX_ARTIFACT);
        held.push(opened);
        const ev = await scanOpened(opened);
        if (ev.sha256 !== art.sha256 || ev.size !== art.size_bytes)
          throw new TakeArchiveError('FILE_CHANGED', `Artifact changed before export: ${art.kind}`);
        files.push({ name: art.zip_path, source: opened, size: ev.size,
          sha256: ev.sha256, crc32: ev.crc32 });
      }
      const manifest = Buffer.from(files.map(f => `${f.sha256}  ${f.name}\n`).join(''), 'utf8');
      const bagit = Buffer.from('BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n');
      const oxum = files.reduce((a, f) => a + f.size, 0);
      const bagInfo = Buffer.from(`Bagging-Date: ${new Date().toISOString().slice(0, 10)}\n` +
        `Bag-Software-Agent: Morphoacoustics Studio CHR-1 S2\n` +
        `External-Identifier: ${id}\nPayload-Oxum: ${oxum}.${files.length}\n`);
      const tags = [ { name: 'bagit.txt', bytes: bagit },
        { name: 'bag-info.txt', bytes: bagInfo }, { name: 'manifest-sha256.txt', bytes: manifest } ];
      const tagmanifest = Buffer.from(tags.map(x => `${sha(x.bytes)}  ${x.name}\n`).join(''));
      tags.push({ name: 'tagmanifest-sha256.txt', bytes: tagmanifest });
      const entries = [...tags.map(x => ({ ...x, size: x.bytes.length, crc32: crc32(x.bytes) })), ...files];
      if (entries.length > 128 || entries.some(x => x.size > MAX_ARTIFACT) ||
          entries.reduce((a, x) => a + x.size, 0) > 16 * 1024 * 1024)
        throw new TakeArchiveError('EXPORT_TOO_LARGE', 'Bag size limit exceeded');
      const zipHash = createHash('sha256');
      let offset = 0;
      const write = async bytes => {
        if (streamError) throw streamError;
        if (writable.destroyed || writable.writableEnded) throw new TakeArchiveError('CLIENT_CLOSED', 'Export stream closed');
        await new Promise((resolve, reject) => writable.write(bytes, error => error ? reject(error) : resolve()));
        zipHash.update(bytes); offset += bytes.length;
      };
      const centers = [];
      for (const entry of entries) {
        const name = Buffer.from(entry.name, 'utf8');
        const start = offset;
        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4);
        header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(0, 8); // UTF-8, STORE
        header.writeUInt32LE(entry.crc32, 14);
        header.writeUInt32LE(entry.size, 18); header.writeUInt32LE(entry.size, 22);
        header.writeUInt16LE(name.length, 26);
        await write(header); await write(name);
        if (entry.source) {
          const h = createHash('sha256'), buf = Buffer.allocUnsafe(65536);
          let written = 0, crc = 0xffffffff;
          while (written < entry.size) {
            const { bytesRead } = await entry.source.handle.read(buf, 0,
              Math.min(buf.length, entry.size - written), written);
            if (!bytesRead) throw new TakeArchiveError('FILE_CHANGED', 'Truncated artifact during export');
            const part = buf.subarray(0, bytesRead);
            h.update(part); crc = crc32Part(crc, part);
            await write(part); written += bytesRead;
          }
          if (h.digest('hex') !== entry.sha256 || ((crc ^ 0xffffffff) >>> 0) !== entry.crc32)
            throw new TakeArchiveError('FILE_CHANGED', 'Artifact hash changed during export');
        } else await write(entry.bytes);
        centers.push({ entry, name, start });
      }
      // Re-read each original FD after streaming, before emitting the ZIP central directory.
      for (const opened of held) {
        const check = await scanOpened(opened);
        const expected = opened === source ? doc.sha256 :
          files.find(x => x.source === opened)?.sha256;
        if (check.sha256 !== expected)
          throw new TakeArchiveError('FILE_CHANGED', 'Export pre/post SHA-256 mismatch');
      }
      const centralOffset = offset;
      for (const { entry, name, start } of centers) {
        const h = Buffer.alloc(46);
        h.writeUInt32LE(0x02014b50); h.writeUInt16LE(0x0314, 4);
        h.writeUInt16LE(20, 6); h.writeUInt16LE(0x0800, 8);
        h.writeUInt32LE(entry.crc32, 16);
        h.writeUInt32LE(entry.size, 20); h.writeUInt32LE(entry.size, 24);
        h.writeUInt16LE(name.length, 28); h.writeUInt32LE(0x81a40000, 38);
        h.writeUInt32LE(start, 42);
        await write(h); await write(name);
      }
      const centralSize = offset - centralOffset;
      const end = Buffer.alloc(22);
      end.writeUInt32LE(0x06054b50); end.writeUInt16LE(centers.length, 8);
      end.writeUInt16LE(centers.length, 10); end.writeUInt32LE(centralSize, 12);
      end.writeUInt32LE(centralOffset, 16);
      await write(end);
      finished = true;
      writable.end();
      await Promise.race([once(writable, 'finish'), once(writable, 'close').then(() => {
        if (!writable.writableFinished) throw new TakeArchiveError('CLIENT_CLOSED', 'Incomplete ZIP write');
      })]);
      return { take_id: id, state: summary.state, zip_sha256: zipHash.digest('hex'), size_bytes: offset };
    } catch (e) {
      if (!writable.destroyed) writable.destroy();
      throw e;
    } finally {
      for (const opened of held) await opened.handle.close();
      if (!finished && !writable.destroyed) writable.destroy();
      writable.off('error', onStreamError);
    }
  }
  return { lookup, exportZip };
}
function assertedIdOrFalse(value) { return typeof value === 'string' && TAKE_ID.test(value); }
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let x = n;
  for (let j = 0; j < 8; j++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1;
  return x >>> 0;
});
function crc32Part(crc, bytes) {
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return crc >>> 0;
}
function crc32(bytes) { return (crc32Part(0xffffffff, bytes) ^ 0xffffffff) >>> 0; }
