import { spawnSync } from 'node:child_process';

/**
 * Fail closed when the running solver differs from the exact reviewed Git tree.
 * Git's porcelain status checks tracked edits/deletions and *all* untracked,
 * non-ignored files, including newly importable Python modules.
 * Build outputs, virtualenvs and Python caches follow Core's .gitignore.
 */
export function verifyCoreRevision(coreDir, expectedCommit) {
  if (!/^[a-f0-9]{40}$/.test(expectedCommit)) {
    throw new Error('Invalid audited Core commit identifier.');
  }
  function git(args) {
    const result = spawnSync('git', args, {
      cwd: coreDir,
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      throw new Error('Cannot verify Core Git checkout: ' +
        (result.error?.message || result.stderr || `exit ${result.status}`).trim().slice(0, 250));
    }
    return result.stdout;
  }

  const head = git(['rev-parse', '--verify', 'HEAD']).trim();
  if (head !== expectedCommit) {
    throw new Error(`Core revision mismatch: requires ${expectedCommit}, found ${head}.`);
  }
  // --untracked-files=all catches untracked src/**/*.py; ignored venv/pycache are allowed.
  const changes = git(['status', '--porcelain=v1', '--untracked-files=all', '--']).trim();
  if (changes) {
    throw new Error('Audited Core checkout has modified or untracked files; ' +
      'refusing physical execution. First changes: ' + changes.split('\n').slice(0, 4).join('; ').slice(0, 350));
  }
  return head;
}
