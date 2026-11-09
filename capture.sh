#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR for screenshots outside the source tree}"
mkdir -p "$CAPTURE_DIR"

run_timed() {
  local label="$1"
  shift
  /usr/bin/time -f "[timing] ${label}: %e s" "$@"
}

run_timed 'browser capture' node --input-type=module - <<'NODE'
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright');
const require = createRequire(join(runtime, 'package.json'));
const { chromium } = require('playwright');
const config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'));
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim();
const url = process.env.CAPTURE_URL;
const output = process.env.CAPTURE_DIR;
mkdirSync(output, { recursive: true });
let browser;
let exitCode = 1;
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => { error.exitCode = 75; throw error; });
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(error => { error.exitCode = 75; throw error; });
    page.setDefaultTimeout(30000);
    const runtimeErrors = [];
    const failedRequests = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('requestfailed', request => {
      if (new URL(request.url()).origin === new URL(url).origin) failedRequests.push(request.url());
    });
    let response;
    try {
      response = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    } catch (error) {
      error.exitCode = 75;
      throw error;
    }
    if (!response?.ok()) {
      const error = new Error(`Navigation returned HTTP ${response?.status() ?? 'no response'}`);
      error.exitCode = !response || [408, 429, 500, 502, 503, 504].includes(response.status()) ? 75 : 1;
      throw error;
    }
    try {
      await page.locator(process.env.CAPTURE_READY_SELECTOR || '#menu').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 15000 });
    } catch (error) {
      error.exitCode = 1;
      throw error;
    }
    await page.waitForTimeout(1000);
    const rendered = await page.evaluate(() => {
      const menu = document.querySelector('#menu');
      const canvas = document.querySelector('canvas');
      const visible = element => !!element && getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0;
      return { title: document.title, menuVisible: visible(menu), canvasReady: !!canvas && canvas.width > 0 && canvas.height > 0 };
    });
    if (!rendered.menuVisible || !rendered.canvasReady || !rendered.title) {
      throw new Error(`Application did not render correctly: ${JSON.stringify(rendered)}`);
    }
    if (runtimeErrors.length) throw new Error(`Application runtime errors: ${runtimeErrors.join('; ')}`);
    if (failedRequests.length) {
      const error = new Error(`Application resources failed to load: ${failedRequests.join('; ')}`);
      error.exitCode = 75;
      throw error;
    }
    await page.screenshot({ path: join(output, `final-${name}.png`), fullPage: false, timeout: 30000 }).catch(error => {
      error.exitCode = browser?.isConnected() ? 1 : 75;
      throw error;
    });
    await page.close();
    console.log(`Captured ${name} (${width}x${height}) at ${url}`);
  }
  exitCode = 0;
} catch (error) {
  console.error(error);
  exitCode = error.exitCode || (error.name === 'TimeoutError' ? 75 : 1);
} finally {
  if (browser) {
    try { await browser.close(); }
    catch (error) { console.error(error); if (exitCode === 0) exitCode = 75; }
  }
}
process.exitCode = exitCode;
NODE
