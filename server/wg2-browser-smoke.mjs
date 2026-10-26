/** Real Chromium interaction: Character -> exact body -> fresh WG2 physical WAV -> A/B/reload. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const work = path.resolve(process.env.WG2_BROWSER_DATA_DIR || '.morpho-wg2-browser-data');
await fs.mkdir(work, { recursive: true, mode: 0o700 });
const children = [], logs = {};
function launch(name, file, args = []) {
  const child = spawn(process.execPath, [file, ...args], {
    cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MORPHO_WG2_DATA_DIR: work },
  });
  children.push(child);
  logs[name] = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', part => { logs[name] += String(part); });
  }
  return child;
}
async function health(uri, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Premature child exit: ' + uri);
    try { if ((await fetch(uri)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('No healthy service: ' + uri);
}
async function stop(p) {
  if (!p || p.exitCode !== null || p.signalCode !== null) return;
  p.kill('SIGTERM');
  await new Promise(resolve => {
    p.once('close', resolve);
    setTimeout(() => { if (p.exitCode === null) p.kill('SIGKILL'); }, 3500).unref();
  });
}

let browser, bridge;
try {
  bridge = launch('wg2-bridge', 'server/wg2-local.mjs');
  await health('http://127.0.0.1:8768/wg2/health', bridge);
  const vite = launch('vite', 'node_modules/vite/bin/vite.js',
    ['--host', '127.0.0.1', '--port', '5173', '--strictPort']);
  await health('http://127.0.0.1:5173/', vite);
  browser = await chromium.launch({ headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/');
  const toggle = page.getByRole('button', {
    name: 'WG2 · 身体固有の波動伝播から声を新規計算して聴く（ローカル実験）',
  });
  await toggle.click();
  const section = page.locator('section[aria-labelledby="wg2-heading"]');
  await section.waitFor();
  const selector = section.getByLabel('声道の身体と正確なrevision');
  await selector.selectOption('v3b-axial-M0');
  await section.getByRole('button', { name: 'この身体で新規物理Takeを生成' }).click();
  await section.locator('.take-card').first().waitFor({ timeout: 200000 });
  await selector.selectOption('v3b-axial-M1');
  await section.getByRole('button', { name: 'この身体で新規物理Takeを生成' }).click();
  await section.locator('.take-card').nth(1).waitFor({ timeout: 200000 });
  assert.equal(await section.locator('.take-card').count(), 2);
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  const audio = section.locator('.compare-card audio').first();
  const src = await audio.getAttribute('src');
  assert.match(src || '', /^\/wg2\/takes\/[0-9a-f-]{36}\/audio$/);
  const played = await audio.evaluate(async element => {
    if (element.readyState < 1) await new Promise((resolve, reject) => {
      element.addEventListener('loadedmetadata', resolve, { once: true });
      element.addEventListener('error', reject, { once: true });
      element.load();
    });
    await element.play();
    await new Promise(resolve => setTimeout(resolve, 130));
    return { duration: element.duration, position: element.currentTime };
  });
  assert.ok(played.duration >= 0.24 && played.duration <= 0.26, JSON.stringify(played));
  assert.ok(played.position > 0, JSON.stringify(played));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await toggle.click();
  await section.locator('.take-card').nth(1).waitFor({ timeout: 30000 });
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  await stop(bridge);
  bridge = launch('wg2-restarted', 'server/wg2-local.mjs');
  await health('http://127.0.0.1:8768/wg2/health', bridge);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await toggle.click();
  await section.locator('.take-card').nth(1).waitFor({ timeout: 30000 });
  assert.equal(await section.locator('.compare-card audio').count(), 2);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(work, 'wg2-browser.png'), fullPage: true });
  console.log('WG2 BROWSER PASS: true Core fresh M0/M1, audio decode, A/B, reload and restart');
} finally {
  await browser?.close().catch(() => {});
  for (const proc of [...children].reverse()) await stop(proc);
  for (const [name, value] of Object.entries(logs)) {
    await fs.writeFile(path.join(work, name + '.log'), value);
  }
}
