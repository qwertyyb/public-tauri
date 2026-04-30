/**
 * E2E: converted Raycast flush-dns plugin.
 *
 * Prerequisites:
 * 1. `pnpm tauri:dev` is running with WebDriver enabled.
 * 2. The Raycast flush-dns source exists at `RAYCAST_FLUSH_DNS_SOURCE_PATH`
 *    (default: ~/Downloads/flush-dns).
 *
 * Run:
 *   pnpm test:webdriver:raycast-flush-dns
 *
 * The command itself requests administrator privileges on macOS. By default this
 * script only verifies conversion, registration, search visibility, and icon
 * rendering. Set E2E_FLUSH_DNS_RUN_COMMAND=1 to trigger the command manually.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, Browser, By, Key, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_SOURCE_DIR = path.join(process.env.HOME || '', 'Downloads/flush-dns');
const SOURCE_DIR = process.env.RAYCAST_FLUSH_DNS_SOURCE_PATH
  ? path.resolve(process.env.RAYCAST_FLUSH_DNS_SOURCE_PATH)
  : DEFAULT_SOURCE_DIR;
const PLUGIN_DIR = process.env.RAYCAST_FLUSH_DNS_PLUGIN_PATH ?? '/tmp/public-tauri-raycast-flush-dns';

async function waitForWebDriverReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/status`);
      if (res.ok) return;
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  throw new Error(`WebDriver not ready: ${String(lastErr)}`);
}

async function waitForPluginsReady(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return window.__PUBLIC_APP_PLUGINS_READY__ === true;');
      if (ok) return;
    } catch {
      // ignore transient reloads
    }
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_APP_PLUGINS_READY__');
}

function ensureFlushDnsPluginConverted(): void {
  if (process.env.E2E_SKIP_PLUGIN_BUILD === '1') {
    console.log('[flush-dns-e2e] Skip Raycast flush-dns conversion (E2E_SKIP_PLUGIN_BUILD=1)');
    return;
  }

  console.log('[flush-dns-e2e] Converting Raycast flush-dns plugin...');
  execSync(`pnpm raycast:convert ${JSON.stringify(SOURCE_DIR)} --out ${JSON.stringify(PLUGIN_DIR)} --build`, {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}

async function registerPluginViaDevHook(driver: WebDriver, pluginDir: string): Promise<void> {
  const pathJson = JSON.stringify(pluginDir);
  await driver.executeScript(`
    var p = ${pathJson};
    window.__e2eRegisterPluginResult = '__E2E_PENDING__';
    var fn = window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__;
    if (typeof fn !== 'function') {
      window.__e2eRegisterPluginResult = '__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ not a function — use pnpm tauri:dev (DEV)';
      return;
    }
    fn(p).then(function() { window.__e2eRegisterPluginResult = 'OK'; }).catch(function(e) {
      var msg = (e && e.message) ? e.message : String(e);
      if (e && e.stack) { msg = msg + ' | ' + e.stack; }
      window.__e2eRegisterPluginResult = msg;
    });
  `);

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const result = await driver.executeScript<string | null>('return window.__e2eRegisterPluginResult;');
    if (result === null || result === undefined || result === '__E2E_PENDING__') {
      await driver.sleep(100);
      continue;
    }
    if (result === 'OK') {
      console.log('[flush-dns-e2e] Registered plugin from:', pluginDir);
      return;
    }
    if (result.includes('已加载') || result.includes('已注册')) {
      console.log('[flush-dns-e2e] Plugin already registered, continuing');
      return;
    }
    throw new Error(result);
  }
  throw new Error('Timeout waiting for registerPluginFromLocalPath');
}

async function ensureHookAndRegisterPlugin(driver: WebDriver, pluginDir: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    const hasHook = await driver.executeScript<boolean>('return typeof window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ === "function";');
    if (!hasHook) {
      await driver.sleep(200);
      continue;
    }
    try {
      await registerPluginViaDevHook(driver, pluginDir);
      return;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not a function') || msg.includes('Load failed')) {
        await driver.sleep(500);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`注册 flush-dns 插件超时: ${String(lastErr)}`);
}

async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(text);
}

async function waitForVisibleResultIcon(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const hasIcon = await driver.executeScript<boolean>(`
      return Array.from(document.querySelectorAll('.resultItem .app-icon img, .resultItem .app-icon-builtin')).some(function(el) {
        if (el instanceof HTMLImageElement) {
          return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
        }
        return Boolean(el.textContent && el.textContent.trim());
      });
    `);
    if (hasIcon) return;
    await driver.sleep(200);
  }
  throw new Error('Flush DNS result icon not visible');
}

async function pressEnterViaActions(driver: WebDriver): Promise<void> {
  await driver
    .actions()
    .keyDown(Key.ENTER)
    .keyUp(Key.ENTER)
    .perform();
}

async function main(): Promise<void> {
  ensureFlushDnsPluginConverted();

  console.log('[flush-dns-e2e] Waiting for WebDriver...');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await waitForPluginsReady(driver);
    await ensureHookAndRegisterPlugin(driver, PLUGIN_DIR, READY_TIMEOUT_MS);

    await driver.sleep(1_200);

    await setMainInputValue(driver, 'Flush DNS');
    await driver.sleep(1_200);

    const searchText = String(await driver.executeScript('return document.body.innerText || "";'));
    console.log('[flush-dns-e2e] body after search:');
    console.log(searchText.slice(0, 800));
    if (!searchText.includes('Flush DNS')) {
      throw new Error('Flush DNS result not visible');
    }
    await waitForVisibleResultIcon(driver);

    if (process.env.E2E_FLUSH_DNS_RUN_COMMAND === '1') {
      await pressEnterViaActions(driver);
      await driver.sleep(2_000);
      console.log('[flush-dns-e2e] Flush DNS command triggered');
    } else {
      console.log('[flush-dns-e2e] Command trigger skipped; set E2E_FLUSH_DNS_RUN_COMMAND=1 to run it.');
    }
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
