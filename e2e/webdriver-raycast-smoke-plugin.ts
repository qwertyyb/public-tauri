/**
 * E2E: converted Raycast no-view smoke plugin.
 *
 * Prerequisites:
 * 1. `pnpm tauri:dev` is running with WebDriver enabled.
 * 2. The converted plugin exists at `RAYCAST_SMOKE_PLUGIN_PATH`
 *    (default: /tmp/public-tauri-raycast-no-view-smoke).
 *
 * Run:
 *   pnpm exec tsx e2e/webdriver-raycast-smoke-plugin.ts
 */
import { Builder, Browser, By, Key, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const PLUGIN_DIR = process.env.RAYCAST_SMOKE_PLUGIN_PATH ?? '/tmp/public-tauri-raycast-no-view-smoke';

const READY_TIMEOUT_MS = 120_000;
const POLL_MS = 1500;

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

async function registerPlugin(driver: WebDriver, pluginDir: string): Promise<void> {
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
      console.log('[raycast-smoke] Registered plugin from:', pluginDir);
      return;
    }
    if (result.includes('已加载') || result.includes('已注册')) {
      console.log('[raycast-smoke] Plugin already registered, continuing');
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
      await registerPlugin(driver, pluginDir);
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
  throw new Error(`注册 Raycast smoke 插件超时: ${String(lastErr)}`);
}

async function setMainInput(driver: WebDriver, value: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(value);
}

async function main(): Promise<void> {
  console.log('[raycast-smoke] wd:', WD_URL);
  console.log('[raycast-smoke] app:', APP_URL);
  console.log('[raycast-smoke] plugin:', PLUGIN_DIR);
  console.log('[raycast-smoke] waiting for WebDriver...');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    console.log('getting app url');
    await waitForPluginsReady(driver);
    console.log('[raycast-smoke] app plugins ready');

    await ensureHookAndRegisterPlugin(driver, PLUGIN_DIR, READY_TIMEOUT_MS);
    console.log('[raycast-smoke] registered');

    await driver.sleep(1_200);

    await setMainInput(driver, 'raycast');
    await driver.sleep(1_200);

    const searchText = String(await driver.executeScript('return document.body.innerText || "";'));
    console.log('[raycast-smoke] body after search:');
    console.log(searchText.slice(0, 800));

    if (!searchText.includes('Raycast Smoke')) {
      throw new Error('Raycast Smoke result not visible');
    }

    await driver
      .actions()
      .keyDown(Key.ENTER)
      .keyUp(Key.ENTER)
      .perform();
    await driver.sleep(5_000);

    const afterEnterText = String(await driver.executeScript('return document.body.innerText || "";'));
    console.log('[raycast-smoke] body after enter:');
    console.log(afterEnterText.slice(0, 800));
    console.log(
      '[raycast-smoke] success text visible:',
      afterEnterText.includes('Raycast smoke passed') || afterEnterText.includes('hello from raycast'),
    );
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
