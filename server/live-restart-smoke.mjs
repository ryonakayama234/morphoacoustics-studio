import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.env.MORPHO_LIVE_DATA_DIR;
assert.ok(root, 'Set MORPHO_LIVE_DATA_DIR');
const filenames = (await fs.readdir(path.join(root, 'takes'))).filter((x) => x.endsWith('.json'));
assert.equal(filenames.length, 2, 'Only the two successful Core runs should persist as Takes');
for (const name of filenames) {
  const take = JSON.parse(await fs.readFile(path.join(root, 'takes', name), 'utf8'));
  assert.equal(take.result.job_status, 'SUCCEEDED');
  assert.equal(take.result.realization_outcome, 'FEASIBLE');
  for (const kind of ['audio', 'dynamic-trace', 'raw-pressure', 'live-manifest']) {
    const artifact = take.result.artifacts.find((a) => a.kind === kind);
    assert.ok(artifact, 'Expected persisted ' + kind);
    const response = await fetch('http://127.0.0.1:8765' + artifact.ref);
    assert.equal(response.status, 200, 'Cannot restore artifact ' + kind);
    const bytes = Buffer.from(await response.arrayBuffer());
    const hex = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hex, path.basename(artifact.ref).slice(0, 64), 'Reloaded file hash mismatch');
  }
}
console.log('Server restart gate passed: two immutable Takes reload their same WAV, trace, raw-pressure and manifest bytes.');
