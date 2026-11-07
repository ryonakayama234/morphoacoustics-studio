/** CHR-1 S0: local, read-only byte inventory. Never creates or modifies data. */
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMIT = 8 * 1024 * 1024;
const ROOTS = [
  ['cc-a2', '.morpho-cc-a2-data', 'MORPHO_CC_A2_DATA_DIR', 'server/cc-a2-server.mjs'],
  ['browser', '.morpho-browser-data', 'MORPHO_BROWSER_DATA_DIR', null],
  ['cc-b1', '.morpho-cc-b1-data', 'MORPHO_CC_B1_DATA_DIR', 'server/cc-b1-local.mjs'],
  // X2a's actual root is separate from the browser root named in Issue #41.
  ['live-x2a', '.morpho-live-data', 'MORPHO_LIVE_DATA_DIR', 'server/live-server.mjs'],
];
const WG2_UNKNOWN = [
  '05e8d69a-5e9b-4d5f-bb7d-3961d9674022',
  '9801d385-9085-498f-87ff-9d2f3980b598',
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const code = e => typeof e?.code === 'string' ? e.code : 'IO_ERROR';
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const same = (a, b) => a.dev === b.dev && a.ino === b.ino &&
  a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

function kind(root, rel) {
  if (/(^|\/)schemas?\//.test(rel) || rel.endsWith('.schema.json')) return 'schema';
  if (/(^|\/)artifacts\//.test(rel) || (root === 'cc-b1' && /^runs\/[^/]+\/physical\//.test(rel))) return 'artifact';
  if (/^(v0-)?takes\/[^/]+\.json$/.test(rel) ||
    (root === 'cc-b1' && /^runs\/[^/]+\/studio-pair\.json$/.test(rel))) return 'take';
  if (/(^|\/)registry\//.test(rel)) return 'registry';
  if (/(^|\/)runs\//.test(rel)) return 'run';
  return 'other';
}

function metadata(doc) {
  const ids = {}, schemas = [], pins = [];
  for (const [key, sources] of Object.entries({
    take_id: [doc?.take_id, doc?.result?.take_id],
    run_id: [doc?.run_id],
    request_id: [doc?.request_id, doc?.request?.request_id, doc?.result?.request_id],
    body_revision_id: [doc?.body_revision_id, doc?.physical?.body_revision?.revision_id],
  })) {
    const value = sources.find(x => typeof x === 'string' && x.length <= 256);
    if (value !== undefined) ids[key] = value;
  }
  const walk = (node, prefix, depth) => {
    if (depth > 12 || schemas.length + pins.length > 150) return;
    if (Array.isArray(node)) {
      node.slice(0, 128).forEach((x, i) => walk(x, prefix + '[' + i + ']', depth + 1));
    } else if (object(node)) {
      for (const [key, value] of Object.entries(node)) {
        const field = prefix ? prefix + '.' + key : key;
        if (typeof value === 'string' && value.length <= 256) {
          if (['schema_version', 'record_schema', 'protocol_version'].includes(key)) schemas.push({ field, value });
          if (['core_commit', 'core_sha', 'backend_version'].includes(key)) pins.push({ field, value });
        }
        if (object(value) || Array.isArray(value)) walk(value, field, depth + 1);
      }
    }
  };
  walk(doc, '', 0);
  return { status: 'PARSED', ids, schemas, pins,
    schema_status: schemas.length ? 'OBSERVED' : 'UNKNOWN',
    pin_status: pins.length ? 'OBSERVED' : 'UNKNOWN' };
}

function declaredRefs(root, rel, doc) {
  const items = [...(Array.isArray(doc?.result?.artifacts) ? doc.result.artifacts : []),
    ...(Array.isArray(doc?.physical?.artifacts) ? doc.physical.artifacts : [])];
  return items.filter(object).map(item => {
    let target = null;
    let expected_sha256 = /^[a-f0-9]{64}$/.test(item.sha256 ?? '') ? item.sha256 : null;
    if (typeof item.ref === 'string') {
      const match = /^\/(?:cc-a2|live)\/artifacts\/([a-f0-9]{64}\.(?:wav|npy|csv|json))$/.exec(item.ref);
      if (match) {
        target = 'artifacts/' + match[1];
        expected_sha256 ??= match[1].slice(0, 64);
      }
    } else if (root === 'cc-b1' && /^runs\/[^/]+\/studio-pair\.json$/.test(rel) &&
        typeof item.path === 'string' && /^[a-zA-Z0-9_.-]+$/.test(item.path)) {
      target = path.posix.dirname(rel) + '/physical/' + item.path;
    }
    return { from: rel, kind: typeof item.kind === 'string' ? item.kind : 'UNKNOWN',
      declared: typeof item.ref === 'string' ? item.ref : item.path ?? 'UNKNOWN',
      target, expected_sha256,
      expected_size_bytes: Number.isSafeInteger(item.size_bytes) ? item.size_bytes : null,
      status: 'UNKNOWN', reason: target ? 'NOT_CHECKED' : 'UNRECOGNIZED_REFERENCE' };
  });
}

/** O_RDONLY only. Hash file bytes once; parse JSON from those same bytes. */
async function fileEvidence(filename, isJson) {
  let fd;
  try {
    const before = await fs.lstat(filename);
    if (!before.isFile() || before.isSymbolicLink()) return { status: 'UNKNOWN', reason: 'NOT_REGULAR_FILE' };
    fd = await fs.open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    if (!same(before, await fd.stat())) return { status: 'UNKNOWN', reason: 'CHANGED_DURING_SCAN' };
    const h = createHash('sha256'), buf = Buffer.allocUnsafe(1024 * 1024);
    const chunks = isJson && before.size <= LIMIT ? [] : null;
    let count = 0;
    for (;;) {
      const { bytesRead } = await fd.read(buf, 0, buf.length, null);
      if (!bytesRead) break;
      const part = buf.subarray(0, bytesRead);
      h.update(part);
      if (chunks) chunks.push(Buffer.from(part));
      count += bytesRead;
    }
    if (count !== before.size || !same(before, await fd.stat()) || !same(before, await fs.lstat(filename)))
      return { status: 'UNKNOWN', reason: 'CHANGED_DURING_SCAN' };
    const result = { status: 'OK', size_bytes: count, sha256: h.digest('hex') };
    if (isJson) {
      if (!chunks) result.metadata = { status: 'UNKNOWN', reason: 'JSON_EXCEEDS_8_MIB' };
      else {
        try {
          const doc = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          result.metadata = metadata(doc);
          result._document = doc;
        } catch {
          result.metadata = { status: 'UNKNOWN', reason: 'INVALID_JSON' };
        }
      }
    }
    return result;
  } catch (e) {
    return { status: 'UNKNOWN', reason: code(e) };
  } finally {
    if (fd) await fd.close();
  }
}

async function sourcePin(server, studio) {
  if (!server) return { status: 'NOT_APPLICABLE' };
  try {
    const bytes = await fs.readFile(path.join(studio, server));
    const match = /export const CORE_SHA\s*=\s*['"]([a-f0-9]{40})['"]/.exec(bytes.toString('utf8'));
    return match ? { status: 'OBSERVED_SOURCE', source: server,
      source_file_sha256: sha(bytes), core_commit: match[1] }
      : { status: 'UNKNOWN', source: server, reason: 'CORE_SHA_NOT_FOUND' };
  } catch (e) { return { status: 'UNKNOWN', source: server, reason: code(e) }; }
}

export async function auditRoot(spec, location, studio = STUDIO) {
  const [id, , environment, server] = spec;
  const root = { id, environment, path: path.resolve(location), status: 'UNKNOWN',
    files: [], references: [], unknown_entries: [], server_pin: await sourcePin(server, studio) };
  if (root.path === path.parse(root.path).root || root.path === studio) {
    root.reason = 'UNSAFE_ROOT_SELECTION';
    return root;
  }
  try {
    const stat = await fs.lstat(root.path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      root.reason = stat.isSymbolicLink() ? 'ROOT_SYMLINK_NOT_FOLLOWED' : 'ROOT_NOT_DIRECTORY';
      return root;
    }
  } catch (e) { root.reason = code(e); return root; }
  root.status = 'PRESENT';
  const visit = async relative => {
    let names;
    try { names = (await fs.readdir(path.join(root.path, relative))).sort(sort); }
    catch (e) {
      root.unknown_entries.push({ path: relative || '.', status: 'UNKNOWN', reason: code(e) });
      return;
    }
    for (const name of names) {
      const rel = relative ? relative + '/' + name : name, full = path.join(root.path, rel);
      let stat;
      try { stat = await fs.lstat(full); }
      catch (e) {
        root.unknown_entries.push({ path: rel, status: 'UNKNOWN', reason: code(e) });
        continue;
      }
      if (stat.isSymbolicLink()) {
        root.unknown_entries.push({ path: rel, status: 'UNKNOWN', reason: 'SYMLINK_NOT_FOLLOWED' });
      } else if (stat.isDirectory()) {
        await visit(rel);
      } else if (stat.isFile()) {
        const type = kind(id, rel), ev = await fileEvidence(full, rel.endsWith('.json'));
        const doc = ev._document;
        delete ev._document;
        const value = ev.metadata?.ids?.take_id ?? ev.metadata?.ids?.run_id ??
          (type === 'artifact' ? path.posix.basename(rel) : path.posix.basename(rel, '.json'));
        const entry = { path: rel, kind: type, identity: { value,
          source: ev.metadata?.ids?.take_id || ev.metadata?.ids?.run_id ? 'RECORD_FIELD' : 'PATH_ONLY' }, ...ev };
        if (entry.status === 'OK' && /^artifacts\/[a-f0-9]{64}\.[^/]+$/.test(rel))
          entry.content_address = entry.sha256 === path.posix.basename(rel).slice(0, 64) ? 'MATCH' : 'MISMATCH';
        root.files.push(entry);
        if (doc && type === 'take') root.references.push(...declaredRefs(id, rel, doc));
      } else {
        root.unknown_entries.push({ path: rel, status: 'UNKNOWN', reason: 'SPECIAL_FILE_NOT_READ' });
      }
    }
  };
  await visit('');
  const indexed = new Map(root.files.map(x => [x.path, x]));
  for (const ref of root.references) {
    if (!ref.target) continue;
    const file = indexed.get(ref.target);
    if (!file || file.status !== 'OK') ref.reason = 'MISSING_OR_UNREADABLE_ARTIFACT';
    else if (ref.expected_sha256 && ref.expected_sha256 !== file.sha256) {
      ref.status = 'MISMATCH'; ref.reason = 'SHA256_MISMATCH';
    } else if (ref.expected_size_bytes !== null && ref.expected_size_bytes !== file.size_bytes) {
      ref.status = 'MISMATCH'; ref.reason = 'SIZE_MISMATCH';
    } else if (!ref.expected_sha256) ref.reason = 'NO_DECLARED_SHA256';
    else { ref.status = 'MATCH'; ref.reason = null; }
    ref.observed_sha256 = file?.status === 'OK' ? file.sha256 : null;
  }
  root.schema_inventory = root.files.flatMap(f => (f.metadata?.schemas ?? []).map(x => ({ file: f.path, ...x })));
  root.pin_inventory = root.files.flatMap(f => (f.metadata?.pins ?? []).map(x => ({ file: f.path, ...x })));
  if (root.unknown_entries.length || root.files.some(f => f.status !== 'OK' ||
      f.metadata?.status === 'UNKNOWN' || f.content_address === 'MISMATCH') ||
      root.references.some(r => r.status !== 'MATCH')) root.status = 'PARTIAL';
  root.totals = {
    files_ok: root.files.filter(f => f.status === 'OK').length,
    take_records: root.files.filter(f => f.kind === 'take' && f.status === 'OK').length,
    artifact_files: root.files.filter(f => f.kind === 'artifact' && f.status === 'OK').length,
    bytes_hashed: root.files.filter(f => f.status === 'OK').reduce((s, f) => s + f.size_bytes, 0),
    unknown: root.unknown_entries.length + root.files.filter(f => f.status !== 'OK' ||
      f.metadata?.status === 'UNKNOWN').length + root.references.filter(r => r.status === 'UNKNOWN').length,
    mismatches: root.files.filter(f => f.content_address === 'MISMATCH').length +
      root.references.filter(r => r.status === 'MISMATCH').length,
  };
  return root;
}

export async function inventory({ env = process.env, overrides = {}, studio = STUDIO } = {}) {
  const roots = [];
  for (const spec of ROOTS) {
    const location = overrides[spec[0]] ?? env[spec[2]] ?? path.join(studio, spec[1]);
    roots.push(await auditRoot(spec, location, studio));
  }
  return {
    manifest_schema: 'chr1-s0-read-only-inventory/v1',
    generated_at_utc: new Date().toISOString(),
    scope: 'FULL_LOCAL_FILES_NO_TAKE_API_LIMIT',
    roots,
    wg2_historical_unknown: WG2_UNKNOWN.map(take_id => ({ take_id,
      evidence_status: 'UNKNOWN', reason: 'Issue #32: no independent physical receipt or body attribution' })),
    notes: ['No data was written or copied by this script.',
      'SHA-256 is byte evidence, not an acoustic-quality or source-sample provenance claim.',
      'Review absolute paths and IDs for privacy before publishing the manifest.'],
  };
}

export function humanSummary(result) {
  const lines = ['CHR-1 S0 ' + result.generated_at_utc + ' — READ ONLY; no backup performed'];
  for (const root of result.roots) {
    const t = root.totals;
    lines.push(root.id + ': ' + root.status + ' (' + root.path + '); ' +
      (t ? 'files=' + t.files_ok + ' takes=' + t.take_records + ' artifacts=' +
        t.artifact_files + ' bytes=' + t.bytes_hashed + ' unknown=' + t.unknown +
        ' mismatches=' + t.mismatches : 'reason=' + root.reason) +
      '; server pin=' + (root.server_pin.core_commit ?? root.server_pin.status));
  }
  lines.push('Issue #32 WG2: both historical Takes permanently UNKNOWN for body/provenance attribution.');
  lines.push('Muse must independently check actual file SHA-256 and bytes before acceptance.');
  return lines.join('\n') + '\n';
}

function parseArgs(args) {
  if (args.includes('--help')) return { help: true };
  const overrides = {}, flags = { '--cc-a2-data': 'cc-a2', '--browser-data': 'browser',
    '--cc-b1-data': 'cc-b1', '--live-data': 'live-x2a' };
  if (args.length % 2) throw new Error('Expected --name PATH pairs');
  for (let i = 0; i < args.length; i += 2) {
    const id = flags[args[i]];
    if (!id || !args[i + 1] || args[i + 1].startsWith('--') || overrides[id])
      throw new Error('Invalid arguments; use --help');
    overrides[id] = args[i + 1];
  }
  return { overrides };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) process.stdout.write(
      'Usage: node scripts/chr1-s0-inventory.mjs [--cc-a2-data PATH] [--browser-data PATH] [--cc-b1-data PATH] [--live-data PATH]\n' +
      'JSON stdout; human summary stderr. No file writes.\n');
    else {
      const result = await inventory(args);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.stderr.write(humanSummary(result));
    }
  } catch (e) {
    process.stderr.write('Inventory error: ' + (e?.message ?? String(e)) + '\n');
    process.exitCode = 2;
  }
}
