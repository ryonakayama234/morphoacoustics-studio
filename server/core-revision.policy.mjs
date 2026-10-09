import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { verifyCoreRevision } from './core-revision.mjs';

function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'morpho-core-revision-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'CI Test');
  mkdirSync(path.join(dir, 'src', 'morphoacoustics'), { recursive: true });
  writeFileSync(path.join(dir, '.gitignore'), '.venv/\n__pycache__/\n*.pyc\n');
  const modulePath = path.join(dir, 'src', 'morphoacoustics', 'solver.py');
  writeFileSync(modulePath, 'A = 1\n');
  git('add', '.');
  git('commit', '-qm', 'audited code');
  return { dir, git, head: git('rev-parse', 'HEAD'), modulePath };
}

test('accepts exact clean Core revision including ignored virtual environments', (t) => {
  const f = fixture(t);
  mkdirSync(path.join(f.dir, '.venv'));
  writeFileSync(path.join(f.dir, '.venv', 'example.py'), 'ignored = True\n');
  assert.equal(verifyCoreRevision(f.dir, f.head), f.head);
});

test('rejects modified and removed tracked solver files', (t) => {
  const f = fixture(t);
  appendFileSync(f.modulePath, 'A = 2\n');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /modified or untracked/);
  f.git('restore', '.');
  unlinkSync(f.modulePath);
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /modified or untracked/);
});

test('rejects untracked importable Python modules', (t) => {
  const f = fixture(t);
  writeFileSync(path.join(f.dir, 'src', 'morphoacoustics', 'new_module.py'), 'A = 3\n');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /new_module\.py/);
});

test('rejects incorrect pinned commit and invalid pin', (t) => {
  const f = fixture(t);
  assert.throws(() => verifyCoreRevision(f.dir, '0'.repeat(40)), /revision mismatch/);
  assert.throws(() => verifyCoreRevision(f.dir, 'not-a-SHA'), /Invalid audited/);
});

test('a change after startup is rejected by the subsequent pre-run check', (t) => {
  const f = fixture(t);
  verifyCoreRevision(f.dir, f.head); // simulates service startup
  appendFileSync(f.modulePath, '# post-start modification\n');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /modified or untracked/);
  f.git('restore', '.');
  assert.equal(verifyCoreRevision(f.dir, f.head), f.head);
});
