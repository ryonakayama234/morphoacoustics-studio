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
  await page.goto('http://127.0.0.1:5173/');
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
} finally {
  await browser?.close().catch(() => {});
  for (const p of [...processes].reverse()) await stop(p);
  for (const [n, data] of Object.entries(logs)) {
    await fs.writeFile(path.join(work, n + '.log'), data);
  }
}
