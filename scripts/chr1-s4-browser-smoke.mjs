/** CHR-1 S4 isolated Chromium acceptance: real UI with mock S1/S2/S3 HTTP.
 * NOT a substitute for physical Core runs, external BagIt verification, or Muse review.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const out = path.resolve('artifacts/chr1-s4-ui');
await mkdir(out, { recursive: true });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
for (const stream of [vite.stdout, vite.stderr]) stream.on('data', data => { logs += data.toString(); });
const base = 'http://127.0.0.1:5173';
const sleep = t => new Promise(resolve => setTimeout(resolve, t));
async function ready() {
  for (let n = 0; n < 100; n++) {
    if (vite.exitCode !== null) throw new Error('Vite exited: ' + logs);
    try { if ((await fetch(base)).ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('Vite startup timeout: ' + logs);
}
const json = (route, status, data) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
const takeIds = ['take_studio_v0_' + '1'.repeat(32), 'take_studio_v0_' + '2'.repeat(32)];
const audioRef = '/cc-a2/artifacts/' + 'a'.repeat(64) + '.wav';
const shaft = 'sha256:' + 'b'.repeat(64);
const charName = 'S4 Browser Character';
const character = (id, input, revision = 1) => ({
  record_schema: 'studio-character-store/v0', character_id: id, revision,
  name: input.name ?? charName, description: input.description ?? '',
  default_controls: { energy: .35, pace: .9 },
  active_body_ref: input.active_body_ref ?? null, active_motion_ref: null,
  source_profile_ref: null, capability_scope: 'CC_A2_M0_M1_FIXED_ONLY',
  metadata: input.metadata ?? {}, created_at: '2026-11-10T00:00:00Z',
  updated_at: '2026-11-10T00:00:00Z',
});
const sha = revision => revision === 1 ? shaft : 'sha256:' + 'c'.repeat(64);
const wrap = snapshot => ({
  head: { character_id: snapshot.character_id, current_revision: snapshot.revision, snapshot_sha256: sha(snapshot.revision) },
  snapshot, snapshot_sha256: sha(snapshot.revision),
});
function takeRead(id, snap, integrity = 'INCOMPLETE_PROVENANCE') {
  const outcome = integrity === 'REFUSAL_NO_AUDIO' ? 'REFUSED' : 'FEASIBLE';
  return { read_only: true, can_export: !['MISSING_ARTIFACT','CORRUPT_ARTIFACT','UNVERIFIED_LEGACY'].includes(integrity),
    integrity_state: integrity, source_verification_state: 'UNKNOWN', issues: [],
    envelope: { record_schema: 'studio-v0-take-envelope/v0', take_id: id,
      physical_take_id: id, character_id: snap.character_id, character_revision: snap.revision,
      character_snapshot_sha256: sha(snap.revision), character_snapshot: snap,
      request_snapshot: { schema_version: 'performance-contract/v1', request_id: 's4-browser',
        seed: 0, embodiment: { preset_id: snap.active_body_ref?.preset_id ?? 'v3b-axial-M0', preset_revision: 1 },
        character: { character_id: snap.character_id, revision: snap.revision },
        script: { segments: [{ text: 'あい' }] } },
      performance_result_v1: { schema_version: 'performance-contract/v1', take_id: id,
        job_status: 'SUCCEEDED', realization_outcome: outcome,
        artifacts: outcome === 'FEASIBLE' ? [{ kind: 'audio', ref: audioRef }] : [] },
      exact_body_ref: snap.active_body_ref, motion_ref: { id: 'three-task', task_plan_sha256: null, evidence: 'CORE_PHYSICAL_RECEIPT' },
      source_profile_ref: { id: 'lf_fixed', f0_hz: 100, read_only: true, core_commit: 'pin' },
      source_samples_sha256: shaft, source_samples_evidence: 'RECOMPUTED',
      actual_run_source_samples_sha256: null, full_verified_source_state: 'UNKNOWN',
      provenance_state: 'INCOMPLETE_PROVENANCE', claim_limit: 'no physical/source authenticity claim' },
  };
}
function makeServer(page) {
  const store = new Map();
  const takes = new Map();
  let submissions = 0;
  let nextTake = 0;
  page.route('**/*', async route => {
    const request = route.request(), u = new URL(request.url());
    if (u.origin !== base) return route.continue();
    const pathname = u.pathname, method = request.method();
    if (pathname === '/characters') {
      if (method === 'GET') return json(route, 200, [...store.values()].map(wrap));
      if (method === 'POST') {
        const input = request.postDataJSON();
        const id = randomUUID();
        const s = character(id, input);
        store.set(id, s);
        return json(route, 201, wrap(s));
      }
    }
    const matchChar = pathname.match(/^\/characters\/([a-f0-9-]{36})(?:\/revisions\/([0-9]+))?$/);
    if (matchChar) {
      const id = matchChar[1], existing = store.get(id);
      if (!existing) return json(route, 404, { code: 'NOT_FOUND', message: 'Character not found' });
      if (method === 'GET') return json(route, 200, wrap(existing));
      if (method === 'PATCH') {
        const input = request.postDataJSON();
        if (input.expected_revision !== existing.revision)
          return json(route, 409, { code: 'CONFLICT', message: 'Stale Character revision' });
        const newSnap = { ...existing, ...input.changes, revision: existing.revision + 1 };
        store.set(id, newSnap);
        return json(route, 200, wrap(newSnap));
      }
    }
    if (pathname === '/studio/v0/perform' && method === 'POST') {
      submissions++;
      const data = request.postDataJSON(), snap = store.get(data.character_id);
      if (!snap || snap.revision !== data.character_revision || data.character_snapshot_sha256 !== sha(snap.revision) ||
          data.seed !== 0 || data.text !== 'あい' || Object.keys(data.direction ?? {}).length)
        return json(route, 409, { code: 'SNAPSHOT_MISMATCH', message: 'Mismatch' });
      const id = takeIds[nextTake++ % 2];
      const read = takeRead(id, snap);
      takes.set(id, read);
      return json(route, 201, read);
    }
    const matchTake = pathname.match(/^\/studio\/v0\/takes\/([^/]+)$/);
    if (matchTake) {
      const read = takes.get(matchTake[1]);
      return read ? json(route, 200, read) : json(route, 404, { code: 'NOT_FOUND', message: 'Not on this server' });
    }
    const archive = pathname.match(/^\/cc-a2\/takes\/([^/]+)(\/archive)?$/);
    if (archive) {
      const read = takes.get(archive[1]);
      if (!read) return json(route, 404, { code: 'NOT_FOUND', message: 'Missing' });
      if (!archive[2]) return json(route, 200, { state: read.integrity_state, can_export: read.can_export, issues: [] });
      // The fixture is only for UI boundary tests, not BagIt/ZIP validity.
      const bytes = Buffer.from([0x50,0x4b,0x03,0x04, ...new Array(18).fill(0),
        0x50,0x4b,0x05,0x06, ...new Array(18).fill(0)]);
      return route.fulfill({ status: 200, contentType: 'application/zip', body: bytes });
    }
    if (pathname === audioRef) {
      // An incomplete but harmless audio fixture: DOM control presence only.
      return route.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.alloc(44) });
    }
    return route.continue();
  });
  return { store, takes, submissions: () => submissions };
}
let browser;
try {
  await ready();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const server = makeServer(page);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Character' }).waitFor();
  assert.equal(await page.getByRole('tab').count(), 3);
  assert.equal(await page.locator('main[data-slot="character.canvas"]').count(), 1);
  await page.getByRole('tab', { name: 'Character' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Motion' }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab', { name: 'Scene' }).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('Home');
  assert.equal(await page.getByRole('tab', { name: 'Character' }).getAttribute('aria-selected'), 'true');

  await page.getByLabel('名前').fill(charName);
  await page.getByLabel('説明').fill('S4 screenshot / test');
  await page.getByLabel('既存 Body preset 参照').selectOption('v3b-axial-M0');
  await page.getByRole('button', { name: 'Character を新規保存' }).click();
  await page.getByText('サーバに revision 1 を保存しました。').waitFor();
  assert.equal(server.store.size, 1);
  const id = [...server.store.keys()][0];
  assert.equal(server.store.get(id).active_body_ref.binding_state, 'SELECTED_UNRESOLVED');

  await page.getByRole('button', { name: '固定演技へ進む' }).click();
  await page.getByRole('button', { name: '固定「あい」を Perform' }).click();
  await page.getByText('固定演技の immutable Take を取得しました。').waitFor();
  assert.equal(server.submissions(), 1);
  await page.getByRole('button', { name: 'A にセット' }).click();
  await page.getByRole('button', { name: '固定「あい」を Perform' }).click();
  await page.getByText('固定演技の immutable Take を取得しました。').waitFor();
  await page.getByRole('button', { name: 'B にセット' }).click();
  assert.equal(await page.locator('.chr-s4-ab-slot audio').count(), 2);
  assert.equal(server.submissions(), 2);
  assert.ok((await page.locator('.chr-s4-dock').innerText()).includes('peak-normalized'));
  assert.ok((await page.locator('.chr-s4-dock').innerText()).includes('UNKNOWN'));
  await page.getByRole('tab', { name: 'Character' }).click();

  // S1 stale CAS should show conflict instead of silently replacing the head.
  await page.getByLabel('名前').fill('Changed title');
  server.store.set(id, { ...server.store.get(id), revision: 2, name: 'Other tab' });
  await page.getByRole('button', { name: 'revision を保存' }).click();
  await page.getByRole('alert').getByText(/HTTP 409/).waitFor();
  assert.equal(server.store.get(id).name, 'Other tab');
  // Readback and restore before screenshots.
  await page.getByRole('button', { name: '再読込' }).click();
  await page.getByRole('button', { name: /Other tab/ }).click();
  assert.equal(await page.getByRole('alert').count(), 0);

  const widths = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-320', width: 320, height: 720 },
    { name: 'landscape-768', width: 768, height: 500 },
  ];
  for (const v of widths) {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.screenshot({ path: path.join(out, v.name + '.png'), fullPage: true });
    const measure = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      window: window.innerWidth,
    }));
    assert.ok(measure.scroll <= measure.window,
      'Horizontal overflow at ' + v.name + ': ' + JSON.stringify(measure));
    assert.equal(await page.locator('.chr-s4-dock').count(), 1);
  }

  // Drawer is keyboard-reachable and has a real legacy entry.
  await page.getByRole('button', { name: '研究・証拠' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const url = await dialog.getByRole('link', { name: /旧 Mock/ }).getAttribute('href');
  assert.equal(url, '/?view=legacy');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), '研究・証拠');
  await page.goto(base + '/?view=legacy');
  await page.getByRole('button', { name: 'CC-A2 · 2身体の比較実験を開く／閉じる' }).waitFor();
  await page.getByRole('button', { name: 'CC-B1 · 身体の断面積を変えて声を聴く（ローカル実験）' }).waitFor();
  assert.equal(await page.getByText('MockBackend', { exact: true }).count(), 1);

  // Explicit import is name/description-only and leaves the old storage key unchanged.
  await page.goto(base);
  const legacyRaw = JSON.stringify({ draft: { characterId: 'char_mio', characterName: '旧 ミオ',
    characterDescription: '取り込み確認', directionNote: 'not transferable' },
    takes: [{ take_id: 'do-not-import' }], serial: 1, backendMode: 'mock' });
  await page.evaluate(([key, raw]) => localStorage.setItem(key, raw),
    ['morphoacoustics-studio:s2-workspace:v1', legacyRaw]);
  await page.getByRole('tab', { name: 'Character' }).click();
  await page.getByText('ブラウザ下書きから明示的に取り込む').click();
  await page.getByRole('button', { name: '旧下書きを確認' }).click();
  await page.getByRole('button', { name: '新規 Character として取り込む（統合しない）' }).click();
  await page.getByText('新規 revision 1 に対応表 anchor を保存・照合しました。').waitFor();
  const imported = [...server.store.values()].find(s => s.name === '旧 ミオ');
  assert.ok(imported);
  assert.equal(imported.active_body_ref, null);
  assert.ok(imported.metadata.notes.includes('CHR1_S4_IMPORT_V1:'));
  assert.equal(await page.evaluate(key => localStorage.getItem(key),
    'morphoacoustics-studio:s2-workspace:v1'), legacyRaw);
  assert.equal(server.store.size, 2);
  await page.getByRole('button', { name: '新規 Character として取り込む（統合しない）' }).click();
  await page.getByRole('alert').getByText(/Import 停止/).waitFor();
  assert.equal(server.store.size, 2);

  assert.deepEqual(errors, []);
  await writeFile(path.join(out, 'result.json'), JSON.stringify({
    status: 'PASS', sizes: widths, screenshots: widths.map(x => x.name + '.png'),
    notes: 'Mocked S1/S2/S3 routes; UI and viewport evidence ONLY; no physical synthesis, no certified ZIP verification.',
    submissions: server.submissions(), characters: server.store.size,
  }, null, 2));
  console.log('PASS: S4 browser screenshots, 320px overflow, ARIA tabs, drawer/legacy, CAS, Take A/B, import fail-closed');
} finally {
  await browser?.close().catch(() => {});
  if (vite.exitCode === null) vite.kill('SIGTERM');
  await writeFile(path.join(out, 'vite.log'), logs);
}
