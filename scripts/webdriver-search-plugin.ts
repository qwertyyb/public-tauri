/**
 * E2E: @public-tauri-ext/search（触发词 g / google / gg）
 * 前置：pnpm tauri:dev（含 webdriver）；在 DEV 下由 main.ts 注入 __PUBLIC_DEV_REGISTER_PLUGIN_PATH__
 *
 * 输入经验见 docs/webdriver-e2e-input.md
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, By, Browser, Key, until } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_SEARCH_PLUGIN_DIR = path.join(PROJECT_ROOT, 'store/plugins/search');

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
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`WebDriver not ready: ${String(lastErr)}`);
}

function ensureSearchPluginBuilt(): void {
  console.log('[e2e] Building @public-tauri-ext/search…');
  execSync('pnpm --filter @public-tauri-ext/search run build', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}

async function waitForPluginsReady(driver: import('selenium-webdriver').WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return window.__PUBLIC_APP_PLUGINS_READY__ === true;');
      if (ok) return;
    } catch {
      // 个别阶段 executeScript 不可用，稍后重试
    }
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_APP_PLUGINS_READY__');
}

async function registerSearchPluginViaDevHook(
  driver: import('selenium-webdriver').WebDriver,
  pluginDir: string,
): Promise<void> {
  // WebKit WebDriver 对 executeAsyncScript 的 callback 支持不稳定；改为 executeScript 写回 window 并轮询
  const pathJson = JSON.stringify(pluginDir);
  await driver.executeScript(
    `
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
    `,
  );
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const result = await driver.executeScript<string | null>('return window.__e2eRegisterPluginResult;');
    if (result == null || result === '__E2E_PENDING__') {
      await driver.sleep(100);
      continue;
    }
    if (result === 'OK') {
      console.log('[e2e] Registered plugin from:', pluginDir);
      return;
    }
    if (result.includes('已加载') || result.includes('已注册')) {
      console.log('[e2e] Plugin already registered, continuing');
      return;
    }
    throw new Error(result);
  }
  throw new Error('Timeout waiting for registerPluginFromLocalPath');
}

async function main(): Promise<void> {
  ensureSearchPluginBuilt();

  const pluginDir = process.env.E2E_SEARCH_PLUGIN_PATH
    ? path.resolve(process.env.E2E_SEARCH_PLUGIN_PATH)
    : DEFAULT_SEARCH_PLUGIN_DIR;

  console.log('[e2e] Waiting for WebDriver…');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
    await waitForPluginsReady(driver, 120_000);

    const hookDeadline = Date.now() + 60_000;
    while (Date.now() < hookDeadline) {
      const has = await driver.executeScript('return typeof window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ === "function";');
      if (has) break;
      await driver.sleep(200);
    }

    await registerSearchPluginViaDevHook(driver, pluginDir);
    await driver.sleep(600);

    const input = await driver.findElement(By.css('#main-input'));
    await input.click();
    await driver.sleep(300);
    const q = `webdriver-e2e-${Date.now()}`;
    const fullQuery = `g ${q}`;
    await input.sendKeys(fullQuery);
    const echoed = await driver.executeScript<string>('return document.querySelector(\'#main-input\')?.value || \'\';');
    console.log('[e2e] Input value after sendKeys:', echoed.slice(0, 120));
    await driver.sleep(800);

    const bodySnippet = await driver.executeScript<string>('return document.body?.innerText?.slice(0, 2500) || \'\';');
    console.log('[e2e] body text snippet:', bodySnippet.slice(0, 800));

    let row;
    try {
      row = await driver.wait(
        until.elementLocated(By.xpath('//div[contains(@class,"result-item")][contains(.,"谷歌搜索")]')),
        30_000,
      );
    } catch (e) {
      console.error(
        '[e2e] 未出现「谷歌搜索」结果。确认：1) pnpm tauri:dev 2) 本脚本已用 DEV 钩子注册 store/plugins/search 3) 见上方日志',
      );
      throw e;
    }
    const text = await driver.executeScript<string>(
      'return (arguments[0] && arguments[0].innerText) || \'\';',
      row,
    );
    console.log('[e2e] Matched row:', text.slice(0, 160));
    if (!text.includes('谷歌搜索') || !text.includes(q)) {
      throw new Error(`Unexpected result text: ${text}`);
    }

    await input.sendKeys(Key.ENTER);
    console.log('[e2e] Enter on main input — default browser should open search');
    await driver.sleep(800);
    console.log('[e2e] OK');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
