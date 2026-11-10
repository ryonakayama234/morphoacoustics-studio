/** Chromium creator journey: change body, fresh Perform, decode/play, compare, reload. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const core = process.env.MORPHO_CORE_DIR;
assert.ok(core);
const work = path.resolve(process.env.CC_A2_BROWSER_DATA_DIR || '.morpho-cc-a2-browser-smoke');
await fs.mkdir(work, { recursive: true });
const processes = [];
const logs = {};
function launch(name, file, env = {}, args = []) {
  const p = spawn(process.execPath, [file, ...args], {
    cwd: root, shell: false, stdio: ['ignore','pipe','pipe'],
    env: { ...process.env, ...env },
  });
  logs[name] = '';
  for (const stream of [p.stdout, p.stderr]) {
    stream.on('data', (d) => { logs[name] += d.toString(); });
  }
  processes.push(p);
  return p;
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function ready(uri, p) {
  for (let i = 0; i < 100; i++) {
    if (p.exitCode !== null) throw new Error('Service exited: '+uri+'\n'+logs[Object.keys(logs).at(-1)]);
    try { if ((await fetch(uri)).ok) return; } catch {}
    await sleep(250);
  }
  throw new Error('Timed out: ' + uri);
}
async function stop(p) {
  if (!p || p.exitCode !== null || p.signalCode !== null) return;
  p.kill('SIGTERM');
  await new Promise((resolve) => {
    p.once('close', resolve);
    setTimeout(() => { if (p.exitCode === null) p.kill('SIGKILL'); }, 3000).unref();
  });
}
let browser, bridge;
try {
  bridge = launch('bridge', 'server/cc-a2-server.mjs', {
    MORPHO_CC_A2_DATA_DIR: work,
    MORPHO_CORE_DIR: core,
  });
  await ready('http://127.0.0.1:8766/cc-a2/health', bridge);
  const vite = launch('vite', 'node_modules/vite/bin/vite.js', {}, ['--host','127.0.0.1','--port','5173','--strictPort']);
  await ready('http://127.0.0.1:5173/', vite);
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?view=legacy');
  await page.getByRole('button', { name: 'CC-A2 · 2身体の比較実験を開く／閉じる' }).click();
  const section = page.locator('section[aria-labelledby="cc-a2-heading"]');
  await section.waitFor();
  const buttons = section.getByRole('button', { name: 'この身体で新規Perform' });
  const selection = section.getByLabel('身体プリセット（厳密な版を固定）');
  await selection.selectOption('v3b-axial-M0');
  await buttons.click();
  await section.locator('.take-card').first().waitFor({timeout: 200000});
  assert.equal(await section.locator('.take-card').count(), 1);
  await selection.selectOption('v3b-axial-M1');
  await buttons.click();
  await section.locator('.take-card').nth(1).waitFor({timeout: 200000});
  assert.equal(await section.locator('.take-card').count(), 2);
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  const audio = section.locator('.compare-card audio').first();
  const uri = await audio.getAttribute('src');
  assert.match(uri || '', /^\/cc-a2\/artifacts\/[a-f0-9]{64}\.wav$/);
  const data = Buffer.from(await (await fetch('http://127.0.0.1:8766' + uri)).arrayBuffer());
  assert.equal(createHash('sha256').update(data).digest('hex'), path.basename(uri).slice(0, 64));
  const played = await audio.evaluate(async (element) => {
    if (element.readyState < 1) await new Promise((resolve, reject) => {
      element.addEventListener('loadedmetadata', resolve, { once: true });
      element.addEventListener('error', reject, { once: true });
      element.load();
    });
    await element.play();
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { duration: element.duration, time: element.currentTime };
  });
  assert.ok(played.duration >= 0.49 && played.duration <= 0.51);
  assert.ok(played.time > 0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'CC-A2 · 2身体の比較実験を開く／閉じる' }).click();
  await section.locator('.take-card').nth(1).waitFor({timeout:15000});
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  await stop(bridge);
  bridge = launch('restart', 'server/cc-a2-server.mjs', {
    MORPHO_CC_A2_DATA_DIR: work, MORPHO_CORE_DIR: core,
  });
  await ready('http://127.0.0.1:8766/cc-a2/health', bridge);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'CC-A2 · 2身体の比較実験を開く／閉じる' }).click();
  await section.locator('.take-card').nth(1).waitFor({timeout:15000});
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(work, 'cc-a2-browser.png'), fullPage: true });
  console.log('PASS: browser body select, 2 fresh physical runs, two playable WAVs, reload/restart, persistent A/B');

  // S4 creator path on the SAME physical CC-A2 service: server Character
  // -> exact saved revision -> S3 fixed Perform -> S2 playback/A/B/BagIt.
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('tab', { name: 'Character' }).waitFor();
  await page.getByLabel('名前').fill('S4 physical Character');
  await page.getByLabel('説明').fill('actual Core v0 two-body browser regression');
  await page.getByLabel('既存 Body preset 参照').selectOption('v3b-axial-M0');
  await page.getByRole('button', { name: 'Character を新規保存' }).click();
  await page.getByText('サーバに revision 1 を保存しました。').waitFor();
  await page.getByRole('button', { name: '固定演技へ進む' }).click();
  await page.getByRole('button', { name: '固定「あい」を Perform' }).click();
  await page.getByText('固定演技の immutable Take を取得しました。').waitFor({ timeout: 200000 });
  await page.getByRole('button', { name: 'A にセット' }).click();
  await page.getByRole('tab', { name: 'Character' }).click();
  await page.getByLabel('既存 Body preset 参照').selectOption('v3b-axial-M1');
  await page.getByRole('button', { name: 'revision を保存' }).click();
  await page.getByText('CAS 保存・revision readback 完了。').waitFor();
  await page.getByRole('button', { name: '固定演技へ進む' }).click();
  await page.getByRole('button', { name: '固定「あい」を Perform' }).click();
  await page.getByText('固定演技の immutable Take を取得しました。').waitFor({ timeout: 200000 });
  await page.getByRole('button', { name: 'B にセット' }).click();
  assert.equal(await page.locator('.chr-s4-ab-slot audio').count(), 2);
  const s4Audio = page.locator('.chr-s4-ab-slot audio').first();
  assert.match(await s4Audio.getAttribute('src'), /^\/cc-a2\/artifacts\/[a-f0-9]{64}\.wav$/);
  await s4Audio.evaluate(async el => {
    if (el.readyState < 1) await new Promise((resolve, reject) => {
      el.addEventListener('loadedmetadata', resolve, { once: true });
      el.addEventListener('error', reject, { once: true }); el.load();
    });
    await el.play();
    if (el.duration < 0.49 || el.duration > 0.51) throw new Error('S4 audio duration');
    el.pause();
  });
  assert.match(await page.locator('.chr-s4-dock').innerText(), /INCOMPLETE_PROVENANCE/);
  assert.match(await page.locator('.chr-s4-dock').innerText(), /UNKNOWN/);
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.getByRole('button', { name: 'BagIt ZIP 書出し' }).click();
  const zipDownload = await downloadPromise;
  const zipPath = path.join(work, 'chr1-s4-physical-export.bag.zip');
  await zipDownload.saveAs(zipPath);
  const zip = await fs.readFile(zipPath);
  assert.equal(zip.toString('hex',0,4),'504b0304');
  assert.ok(zip.includes(Buffer.from('BagIt-Version: 1.0')));
  assert.ok(zip.includes(Buffer.from('manifest-sha256.txt')));

  // Viewport evidence is from the actual Core-backed UI, not a static mock.
  for (const [label, width, height] of [
    ['desktop', 1440, 900], ['tablet', 768, 1024],
    ['mobile', 390, 844], ['mobile-320', 320, 720],
  ]) {
    await page.setViewportSize({ width, height });
    const dims = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    assert.ok(dims.scroll <= dims.viewport, 'S4 horizontal overflow ' + label + ' ' + JSON.stringify(dims));
    await page.screenshot({ path: path.join(work, 'chr1-s4-' + label + '.png'), fullPage: true });
  }
  await page.getByRole('tab', { name: 'Character' }).click();
  const legacyBefore = await page.evaluate(() =>
    localStorage.getItem('morphoacoustics-studio:s2-workspace:v1'));
  assert.ok(legacyBefore, 'old browser draft remains present');
  await page.getByText('ブラウザ下書きから明示的に取り込む').click();
  await page.getByRole('button', { name: '旧下書きを確認' }).click();
  page.once('dialog', d => { void d.accept(); });
  await page.getByRole('button', { name: '新規 Character として取り込む（統合しない）' }).click();
  await page.getByText('新規 revision 1 に対応表 anchor を保存・照合しました。').waitFor();
  assert.equal(await page.evaluate(() =>
    localStorage.getItem('morphoacoustics-studio:s2-workspace:v1')), legacyBefore);
  const allCharacters = await (await fetch('http://127.0.0.1:8766/characters')).json();
  const imported = allCharacters.filter(c => c.snapshot.metadata.notes?.startsWith('CHR1_S4_IMPORT_V1:'));
  assert.equal(imported.length, 1);
  assert.equal(imported[0].snapshot.revision, 1);
  assert.equal(imported[0].snapshot.active_body_ref, null);
  await page.goto('http://127.0.0.1:5173/?view=legacy');
  await page.getByRole('button', { name: 'CC-A2 · 2身体の比較実験を開く／閉じる' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: S4 actual CC-A2 v0 Character M0/M1, A/B, ZIP, responsive screenshots, import, legacy');

} finally {
  await browser?.close().catch(() => {});
  for (const p of [...processes].reverse()) await stop(p);
  for (const [n, data] of Object.entries(logs)) {
    await fs.writeFile(path.join(work, n + '.log'), data);
  }
}
