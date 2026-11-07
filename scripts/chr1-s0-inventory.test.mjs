import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, chmod, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory, humanSummary } from './chr1-s0-inventory.mjs';

const SCRIPT = fileURLToPath(new URL('./chr1-s0-inventory.mjs', import.meta.url));
const sha = data => createHash('sha256').update(data).digest('hex');

async function sandbox(run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'chr1-s0-'));
  try { await run(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
async function put(root, relative, content) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return file;
}
async function snapshot(root) {
  const result = [];
  async function scan(folder, prefix) {
    for (const name of (await readdir(folder)).sort()) {
      const relative = prefix ? prefix + '/' + name : name;
      const p = path.join(folder, name), s = await lstat(p);
      if (s.isDirectory()) {
        result.push([relative, 'directory', s.size, s.mtimeMs, s.ctimeMs]);
        await scan(p, relative);
      } else if (s.isSymbolicLink()) {
        result.push([relative, 'symlink', s.size, s.mtimeMs, s.ctimeMs]);
      } else {
        result.push([relative, sha(await readFile(p)), s.size, s.mtimeMs, s.ctimeMs]);
      }
    }
  }
  await scan(root, '');
  return result;
}

test('full scan >100 Takes; byte SHA, schema, Core pins, references, and permanent WG2 UNKNOWN', async () => {
  await sandbox(async studio => {
    const cc = path.join(studio, '.morpho-cc-a2-data');
    const b1 = path.join(studio, '.morpho-cc-b1-data');
    await mkdir(cc); await mkdir(b1);
    const audio = Buffer.from('exact physical test bytes'), digest = sha(audio);
    await put(cc, 'artifacts/' + digest + '.wav', audio);
    await put(cc, 'artifacts/' + 'f'.repeat(64) + '.csv', 'wrong digest');
    await put(cc, 'takes/broken.json', '{not-json');
    for (let i = 0; i < 105; i++) {
      await put(cc, 'takes/' + String(i).padStart(3, '0') + '.json', JSON.stringify({
        request: { request_id: 'r-' + i, schema_version: 'performance-contract/v1' },
        result: { take_id: 'take-' + i, schema_version: 'performance-contract/v1',
          artifacts: [{ kind: 'audio', ref: '/cc-a2/artifacts/' + digest + '.wav' }] },
        core_commit: 'b'.repeat(40),
      }));
    }
    await put(cc, 'takes/missing.json', JSON.stringify({
      result: { take_id: 'missing', artifacts: [
        { ref: '/cc-a2/artifacts/' + 'a'.repeat(64) + '.npy' }] },
    }));
    await put(b1, 'runs/run-1/physical/baseline.wav', audio);
    await put(b1, 'runs/run-1/studio-pair.json', JSON.stringify({
      schema_version: 'cc-b1-studio-local-pair/v0', run_id: 'run-1',
      core_commit: 'c'.repeat(40),
      physical: { artifacts: [{ path: 'baseline.wav', sha256: digest, size_bytes: audio.length }] },
    }));
    await put(studio, 'server/cc-a2-server.mjs',
      "export const CORE_SHA = '" + 'b'.repeat(40) + "';\n");
    const result = await inventory({ studio });
    const root = result.roots.find(x => x.id === 'cc-a2');
    assert.equal(root.status, 'PARTIAL');
    assert.equal(root.totals.take_records, 107);
    assert.equal(root.totals.artifact_files, 2);
    assert.equal(root.server_pin.core_commit, 'b'.repeat(40));
    const artifact = root.files.find(f => f.path === 'artifacts/' + digest + '.wav');
    assert.equal(artifact.sha256, sha(audio)); // independent hash oracle
    assert.equal(artifact.size_bytes, audio.length);
    assert.equal(artifact.content_address, 'MATCH');
    assert.equal(root.files.find(x => x.path.endsWith('.csv')).content_address, 'MISMATCH');
    const take = root.files.find(x => x.path === 'takes/000.json');
    assert.equal(take.identity.source, 'RECORD_FIELD');
    assert.equal(take.metadata.ids.take_id, 'take-0');
    assert.ok(root.schema_inventory.some(x => x.value === 'performance-contract/v1'));
    assert.ok(root.pin_inventory.some(x => x.value === 'b'.repeat(40)));
    assert.equal(root.references.filter(x => x.status === 'MATCH').length, 105);
    assert.ok(root.references.some(x => x.reason === 'MISSING_OR_UNREADABLE_ARTIFACT'));
    assert.equal(root.files.find(x => x.path === 'takes/broken.json').metadata.reason, 'INVALID_JSON');
    assert.ok(root.totals.mismatches > 0);
    assert.equal(result.roots.find(x => x.id === 'cc-b1').references[0].status, 'MATCH');
    assert.equal(result.roots.find(x => x.id === 'browser').status, 'UNKNOWN');
    assert.equal(result.roots.find(x => x.id === 'live-x2a').status, 'UNKNOWN');
    assert.equal(result.wg2_historical_unknown.length, 2);
    assert.ok(result.wg2_historical_unknown.every(x => x.evidence_status === 'UNKNOWN'));
    assert.match(humanSummary(result), /WG2.*UNKNOWN/);
  });
});

test('environment overrides, missing paths, and root symlinks are not silently accepted', async () => {
  await sandbox(async studio => {
    const custom = path.join(studio, 'custom');
    await put(custom, 'takes/old.json', '{}');
    await symlink(custom, path.join(studio, '.morpho-browser-data'), 'dir');
    const result = await inventory({ studio, env: { MORPHO_CC_A2_DATA_DIR: custom },
      overrides: { 'cc-b1': path.parse(studio).root } });
    assert.equal(result.roots.find(x => x.id === 'cc-a2').totals.files_ok, 1);
    assert.equal(result.roots.find(x => x.id === 'browser').reason, 'ROOT_SYMLINK_NOT_FOLLOWED');
    assert.equal(result.roots.find(x => x.id === 'cc-b1').reason, 'UNSAFE_ROOT_SELECTION');
  });
});

test('read-only Node permission policy + pre/post snapshot proves no input writes', async () => {
  await sandbox(async studio => {
    const cc = path.join(studio, '.morpho-cc-a2-data');
    const b1 = path.join(studio, '.morpho-cc-b1-data');
    await put(cc, 'takes/id.json', JSON.stringify({ result: { take_id: 'id' } }));
    await put(cc, 'artifacts/s.bin', Buffer.from([0, 1, 2, 3]));
    await put(b1, 'runs/r/studio-pair.json', '{}');
    const external = await put(studio, 'external.txt', 'private');
    await symlink(external, path.join(cc, 'takes/link.json'));
    for (const p of [cc, path.join(cc, 'takes'), path.join(cc, 'artifacts'),
      b1, path.join(b1, 'runs'), path.join(b1, 'runs/r')]) await chmod(p, 0o555);
    for (const p of [path.join(cc, 'takes/id.json'), path.join(cc, 'artifacts/s.bin'),
      path.join(b1, 'runs/r/studio-pair.json')]) await chmod(p, 0o444);
    const before = await snapshot(studio);
    const proc = spawnSync(process.execPath, [
      '--experimental-permission', '--allow-fs-read=*', SCRIPT,
      '--cc-a2-data', cc, '--browser-data', path.join(studio, 'missing-browser'),
      '--cc-b1-data', b1, '--live-data', path.join(studio, 'missing-live'),
    ], { encoding: 'utf8', cwd: studio });
    assert.equal(proc.status, 0, proc.stderr);
    const result = JSON.parse(proc.stdout);
    assert.equal(result.roots.find(x => x.id === 'cc-a2').status, 'PARTIAL');
    assert.ok(result.roots.find(x => x.id === 'cc-a2').unknown_entries.some(
      x => x.reason === 'SYMLINK_NOT_FOLLOWED'));
    assert.match(proc.stderr, /READ ONLY/);
    assert.deepEqual(await snapshot(studio), before);
    assert.equal(await readFile(external, 'utf8'), 'private');
  });
});

test('malformed CLI inputs are rejected without scanning; --help is safe', () => {
  const error = spawnSync(process.execPath, [SCRIPT, '--cc-a2-data'], { encoding: 'utf8' });
  assert.equal(error.status, 2);
  assert.match(error.stderr, /Expected --name PATH pairs/);
  const help = execFileSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.match(help, /JSON stdout/);
});
