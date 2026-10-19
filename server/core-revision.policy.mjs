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

test('rejects Git assume-unchanged hiding locally modified solver code', (t) => {
  const f = fixture(t);
  f.git('update-index', '--assume-unchanged', 'src/morphoacoustics/solver.py');
  appendFileSync(f.modulePath, 'A = 4\n');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '',
    'Git status must demonstrate the original false-clean failure mode');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /nonstandard Git index flags/);
});

test('rejects Git skip-worktree hiding locally modified solver code', (t) => {
  const f = fixture(t);
  f.git('update-index', '--skip-worktree', 'src/morphoacoustics/solver.py');
  appendFileSync(f.modulePath, 'A = 5\n');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '',
    'Git status must demonstrate the original false-clean failure mode');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /nonstandard Git index flags/);
});

test('rejects Python startup shim ignored by tracked .gitignore', (t) => {
  const f = fixture(t);
  appendFileSync(path.join(f.dir, '.gitignore'), 'src/sitecustomize.py\n');
  f.git('add', '.gitignore');
  f.git('commit', '-qm', 'ignore startup shim');
  writeFileSync(path.join(f.dir, 'src', 'sitecustomize.py'), 'raise RuntimeError("UNTRUSTED STARTUP")\n');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '',
    'Repro: git status considers the malicious importable file clean');
  const head = f.git('rev-parse', 'HEAD');
  assert.throws(() => verifyCoreRevision(f.dir, head), /ignored executable code.*src\/sitecustomize\.py/);
});

test('rejects importable source hidden through .git/info/exclude', (t) => {
  const f = fixture(t);
  appendFileSync(path.join(f.dir, '.git', 'info', 'exclude'), '\nsrc/hidden.py\n');
  writeFileSync(path.join(f.dir, 'src', 'hidden.py'), 'raise RuntimeError("EXCLUDE")\n');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /ignored executable code.*src\/hidden\.py/);
});

test('rejects executable code hidden through global git excludesFile', (t) => {
  const f = fixture(t);
  // Git index sees the untracked global-excludes.txt unless it is kept outside the fixture.
  const outside = mkdtempSync(path.join(os.tmpdir(), 'morpho-excludes-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const excludesFile = path.join(outside, 'rules');
  writeFileSync(excludesFile, 'src/global_hidden.py\n');
  f.git('config', 'core.excludesFile', excludesFile);
  writeFileSync(path.join(f.dir, 'src', 'global_hidden.py'), 'raise RuntimeError("GLOBAL")\n');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '');
  assert.throws(() => verifyCoreRevision(f.dir, f.head), /ignored executable code.*src\/global_hidden\.py/);
});

test('rejects top-level ignored Python startup module but allows ordinary cached bytecode', (t) => {
  const f = fixture(t);
  appendFileSync(path.join(f.dir, '.gitignore'), 'sitecustomize.py\n');
  f.git('add', '.gitignore');
  f.git('commit', '-qm', 'ignore root module');
  writeFileSync(path.join(f.dir, 'sitecustomize.py'), 'raise RuntimeError("ROOT")\n');
  const head = f.git('rev-parse', 'HEAD');
  assert.throws(() => verifyCoreRevision(f.dir, head), /ignored executable code.*sitecustomize\.py/);
  unlinkSync(path.join(f.dir, 'sitecustomize.py'));
  mkdirSync(path.join(f.dir, 'src', 'morphoacoustics', '__pycache__'));
  writeFileSync(path.join(f.dir, 'src', 'morphoacoustics', '__pycache__', 'solver.cpython-311.pyc'), 'cached bytes');
  assert.equal(verifyCoreRevision(f.dir, head), head,
    'Per-run PYTHONPYCACHEPREFIX prevents loading old ignored source caches');
});

test('rejects ignored sourceless top-level Python bytecode', (t) => {
  const f = fixture(t);
  appendFileSync(path.join(f.dir, '.gitignore'), 'sitecustomize.pyc\n');
  f.git('add', '.gitignore');
  f.git('commit', '-qm', 'ignore sourceless code');
  writeFileSync(path.join(f.dir, 'sitecustomize.pyc'), 'ignored executable bytecode');
  const head = f.git('rev-parse', 'HEAD');
  assert.equal(f.git('status', '--porcelain=v1', '--untracked-files=all'), '');
  assert.throws(() => verifyCoreRevision(f.dir, head),
    /ignored executable code.*sitecustomize\.pyc/);
});
