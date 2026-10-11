/** Chromium end-to-end check of the actual X2a creator experience.
 * Linux CI evidence only; not a substitute for manual Windows/WSL2 smoke.
 * Installs Playwright only in the ephemeral CI job (no production dependency).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.resolve(process.env.MORPHO_LIVE_DATA_DIR || path.join(studio, '.morpho-browser-data'));
const core = process.env.MORPHO_CORE_DIR;
assert.ok(core, 'MORPHO_CORE_DIR must refer to audited Core checkout');
const processes = [];
const logs = {};

function launch(name, relativeScript, extraEnv = {}) {
  const child = spawn(process.execPath, [relativeScript], {
    cwd: studio, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...extraEnv },
  });
  logs[name] = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (bytes) => {
      logs[name] += bytes.toString();
      if (logs[name].length > 128000) logs[name] = logs[name].slice(-128000);
    });
  }
  processes.push(child);
  return child;
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null || child.killed) return;
  await new Promise((resolve) => {
    child.once('close', resolve);
    child.kill('SIGTERM');
    setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 3000).unref();
  });
}

async function ready(url, child) {
  for (let i = 0; i < 100; ++i) {
    if (child.exitCode !== null) throw new Error('Local process exited: ' + child.exitCode);
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Service did not become ready at ' + url);
}

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
async function verifyWav(uri) {
  assert.match(uri, /^\/live\/artifacts\/[0-9a-f]{64}\.wav$/);
  const response = await fetch('http://127.0.0.1:8765' + uri);
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(hash(bytes), path.basename(uri).slice(0, 64));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.readUInt32LE(24), 48000);
  assert.equal(bytes.length, 44 + 24000 * 2);
  return hash(bytes);
}

await fs.mkdir(data, { recursive: true });
let browser;
let server;
try {
  server = launch('live-bridge', 'server/live-server.mjs', {
    MORPHO_CORE_DIR: core, MORPHO_LIVE_PORT: '8765', MORPHO_LIVE_DATA_DIR: data,
  });
  await ready('http://127.0.0.1:8765/live/health', server);
  const vite = launch('vite', 'node_modules/vite/bin/vite.js', {});
  await ready('http://127.0.0.1:5173/', vite);
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.getByLabel('Backend / integration fixture').selectOption('live-x2a');
  await page.getByRole('button', { name: /X2a対応.*seed=0/ }).click();
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.locator('.take-card').waitFor({ state: 'visible', timeout: 200000 });
  assert.equal(await page.locator('.take-card').count(), 1);
  const audio = page.locator('.take-card audio').first();
  await audio.waitFor({ state: 'attached' });
  const uri = await audio.getAttribute('src');
  assert.ok(uri);
  const expectedHash = await verifyWav(uri);
  // Test actual Chromium decoding and progression, not speaker/headphone audibility.
  const playback = await audio.evaluate(async (element) => {
    if (element.readyState < 1) await new Promise((resolve, reject) => {
      element.addEventListener('loadedmetadata', resolve, { once: true });
      element.addEventListener('error', reject, { once: true });
      element.load();
    });
    await element.play();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { duration: element.duration, currentTime: element.currentTime };
  });
  assert.ok(playback.duration >= 0.49 && playback.duration <= 0.51, JSON.stringify(playback));
  assert.ok(playback.currentTime > 0, 'Chromium did not progress past time zero');
  await page.waitForFunction(() => {
    try {
      const workspace = JSON.parse(window.localStorage.getItem('morphoacoustics-studio:s2-workspace:v1') || '{}');
      return workspace.takes?.length === 1;
    } catch { return false; }
  });
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.take-card').count(), 1);
  assert.equal(await page.locator('.take-card audio').first().getAttribute('src'), uri);
  assert.equal(await verifyWav(uri), expectedHash);
  const csv = page.locator('.comparison-panel a[href$=".csv"]').first();
  await csv.waitFor({ state: 'attached' });
  const csvUri = await csv.getAttribute('href');
  assert.match(csvUri, /^\/live\/artifacts\/[0-9a-f]{64}\.csv$/);
  assert.equal((await fetch('http://127.0.0.1:8765' + csvUri)).status, 200);

  // Simulate exactly the localhost service restart while keeping Chromium's browser index.
  await stop(server);
  server = launch('live-bridge-restarted', 'server/live-server.mjs', {
    MORPHO_CORE_DIR: core, MORPHO_LIVE_PORT: '8765', MORPHO_LIVE_DATA_DIR: data,
  });
  await ready('http://127.0.0.1:8765/live/health', server);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('.take-card').count(), 1);
  assert.equal(await page.locator('.take-card audio').first().getAttribute('src'), uri);
  assert.equal(await verifyWav(uri), expectedHash);

  // A new unsupported Script must not manufacture a plausible WAV or erase the prior one.
  await page.getByLabel('台詞').fill('ありがとう');
  await page.getByRole('button', { name: 'Perform', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.take-card').length === 2);
  assert.equal(await page.locator('.take-card').first().locator('audio').count(), 0);
  assert.equal(await page.locator('.take-card').last().locator('audio').count(), 1);
  assert.equal(await verifyWav(uri), expectedHash);
  assert.deepEqual(consoleErrors, []);
  await page.screenshot({ path: path.join(data, 'browser-smoke.png'), fullPage: true });
  const saved = (await fs.readdir(path.join(data, 'takes'))).filter((name) => name.endsWith('.json'));
  assert.equal(saved.length, 1, 'Only the successful physical run is stored server-side');
  console.log('PASS: Chromium Perform→decoded WAV→reload→trace→localhost restart→same SHA; unsupported script no fallback');
} finally {
  await browser?.close().catch(() => {});
  for (const child of [...processes].reverse()) await stop(child);
  for (const [name, output] of Object.entries(logs)) {
    await fs.writeFile(path.join(data, name + '.log'), output);
  }
}
