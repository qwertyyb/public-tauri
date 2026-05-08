/**
 * E2E: converted Raycast view-basic fixture — Worker snapshot List, Detail, ActionBar, React setState via action.
 *
 * Prerequisites:
 * 1. `pnpm tauri:dev` running with WebDriver enabled.
 *
 * Run:
 *   pnpm test:webdriver:raycast-view-basic
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, Browser, By, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIR = path.join(PROJECT_ROOT, 'fixtures/raycast/view-basic');
const PLUGIN_DIR = process.env.RAYCAST_VIEW_BASIC_PLUGIN_PATH ?? '/tmp/public-tauri-raycast-view-basic';

async function waitForWebDriverReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/status`);
      if (res.ok) {
        const j = (await res.json()) as { value?: { ready?: boolean } };
        if (j?.value?.ready !== false) return;
      }
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

/** 从宿主穿透 wujie shadow 读取 Detail 面板纯文本（markdown 渲染后的 `Count: n`）。 */
async function getRaycastDetailText(driver: WebDriver): Promise<string> {
  return driver.executeScript<string>(`
    var app = document.querySelector('.plugin-view .wujie-container wujie-app');
    if (!app || !app.shadowRoot) return '';
    var el = app.shadowRoot.querySelector('.raycast-detail');
    return el ? String(el.textContent || '').trim() : '';
  `);
}

async function getShadowTextBySelector(driver: WebDriver, selector: string): Promise<string> {
  return driver.executeScript<string>(`
    var app = document.querySelector('.plugin-view .wujie-container wujie-app');
    if (!app || !app.shadowRoot) return '';
    var el = app.shadowRoot.querySelector(arguments[0]);
    return el ? String(el.textContent || '').trim() : '';
  `, selector);
}

async function openCommandFromHome(driver: WebDriver, commandTitle: string): Promise<void> {
  await setMainInputValue(driver, commandTitle);
  await driver.sleep(1200);
  await driver.wait(until.elementLocated(By.css('.main-action .main-action-label')), 30_000);
  await driver.findElement(By.css('.main-action')).click();
  await driver.wait(until.elementLocated(By.css('.plugin-view')), 30_000);
}

/** 避免在插件详情页执行 unregister/reload 导致壳子与路由不一致、首页 `#main-input` 缺失 */
async function popToRoot(driver: WebDriver): Promise<void> {
  await driver.executeScript(`
    window.dispatchEvent(new CustomEvent('pop-to-root'));
  `);
  await driver.sleep(250);
}

function ensureViewBasicConverted(): void {
  if (process.env.E2E_SKIP_PLUGIN_BUILD === '1') {
    console.log('[e2e] Skip Raycast view-basic conversion (E2E_SKIP_PLUGIN_BUILD=1)');
    return;
  }

  console.log('[e2e] Converting Raycast view-basic fixture...');
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
    var registerFn = window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__;
    var reloadFn = window.__PUBLIC_DEV_RELOAD_PLUGIN_FROM_PATH__;
    function ok() { window.__e2eRegisterPluginResult = 'OK'; }
    function fail(e) {
      var msg = (e && e.message) ? e.message : String(e);
      if (e && e.stack) { msg = msg + ' | ' + e.stack; }
      window.__e2eRegisterPluginResult = msg;
    }
    if (typeof registerFn !== 'function') {
      window.__e2eRegisterPluginResult = 'DEV hooks missing — use pnpm tauri:dev (DEV)';
      return;
    }
    registerFn(p).then(ok).catch(function(e) {
      var msg = (e && e.message) ? e.message : String(e);
      var dup = msg.indexOf('已加载') >= 0 || msg.indexOf('已注册') >= 0 || msg.indexOf('已在开发插件列表') >= 0;
      if (dup && typeof reloadFn === 'function') {
        reloadFn(p).then(ok).catch(fail);
      } else {
        fail(e);
      }
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
      console.log('[e2e] Dev plugin registered or reloaded:', pluginDir);
      return;
    }
    throw new Error(result);
  }
  throw new Error('Timeout waiting for reload/register plugin from path');
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
  throw new Error(`Register view-basic plugin timeout: ${String(lastErr)}`);
}

/**
 * 写入首页 `#main-input`：不用 Selenium `elementLocated`，避免 WKWebView 下偶现「脚本可见 input，驱动找不到元素」导致长时间超时。
 * 不用 `clear()`（部分环境下会 JavascriptError）；用原型 setter + `input` 事件驱动 Vue v-model。
 */
async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const ok = await driver.executeScript<boolean>(`
      const el = document.querySelector('#main-input');
      if (!el || !(el instanceof HTMLInputElement)) return false;
      el.focus();
      const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      desc?.set?.call(el, arguments[0]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    `, text);
    if (ok) return;
    await driver.sleep(250);
  }
  throw new Error('Home #main-input not available within 60s (poll executeScript)');
}

async function main(): Promise<void> {
  ensureViewBasicConverted();

  console.log('[e2e] Waiting for WebDriver...');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(800);
    await waitForPluginsReady(driver);
    await popToRoot(driver);
    await ensureHookAndRegisterPlugin(driver, PLUGIN_DIR, READY_TIMEOUT_MS);
    await popToRoot(driver);
    await driver.get(APP_URL);
    await driver.sleep(800);
    await waitForPluginsReady(driver);
    await popToRoot(driver);
    await driver.sleep(900);

    await openCommandFromHome(driver, 'Raycast View Search');

    const wujieApp = await driver.wait(
      until.elementLocated(By.css('.plugin-view .wujie-container wujie-app')),
      90_000,
    );
    const shadowRoot = await wujieApp.getShadowRoot();
    await driver.sleep(1_500);
    await driver.wait(
      async () => (await shadowRoot.findElements(By.css('.raycast-list-item'))).length >= 2,
      90_000,
    );

    await driver.executeScript(`
      var app = document.querySelector('.plugin-view .wujie-container wujie-app');
      var btn = app && app.shadowRoot && app.shadowRoot.querySelector('.raycast-list-item');
      if (btn) btn.click();
    `);
    await driver.sleep(500);

    await driver.wait(async () => (await getRaycastDetailText(driver)).includes('Count: 0'), 60_000);

    const label = await driver.wait(
      until.elementLocated(By.css('.plugin-view .main-action .main-action-label')),
      60_000,
    ).then(el => el.getText());
    if (!label.includes('Increment Worker Count')) {
      throw new Error(`Expected Increment Worker Count action, got: ${label}`);
    }
    await driver.findElement(By.css('.plugin-view .main-action')).click();
    await driver.wait(async () => (await getRaycastDetailText(driver)).includes('Count: 1'), 60_000);

    await popToRoot(driver);
    await driver.sleep(800);
    await openCommandFromHome(driver, 'Raycast View With Arguments');
    const argsFormVisible = await driver.wait(async () => driver.executeScript<boolean>(`
      var app = document.querySelector('.plugin-view .wujie-container wujie-app');
      return Boolean(app && app.shadowRoot && app.shadowRoot.querySelector('.rv-args-form'));
    `), 60_000);
    if (!argsFormVisible) {
      throw new Error('Expected arguments form to be visible');
    }

    await driver.wait(
      until.elementLocated(By.css('.plugin-view .main-action .main-action-label')),
      60_000,
    );
    const runLabel = await driver.findElement(By.css('.plugin-view .main-action .main-action-label')).getText();
    if (!runLabel.includes('Run Command')) {
      throw new Error(`Expected Run Command action, got: ${runLabel}`);
    }
    await driver.findElement(By.css('.plugin-view .main-action')).click();
    await driver.wait(async () => {
      const errText = await getShadowTextBySelector(driver, '.rv-args-error[data-arg-error="title"]');
      return errText.includes('required');
    }, 20_000);

    await driver.executeScript(`
      var app = document.querySelector('.plugin-view .wujie-container wujie-app');
      if (!app || !app.shadowRoot) return;
      var titleInput = app.shadowRoot.querySelector('.rv-args-input[data-arg-name="title"]');
      if (titleInput) {
        titleInput.value = 'webdriver-title';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      var secretInput = app.shadowRoot.querySelector('.rv-args-input[data-arg-name="secret"]');
      if (secretInput) {
        secretInput.value = 'webdriver-secret';
        secretInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      var colorSelect = app.shadowRoot.querySelector('.rv-args-select[data-arg-name="favoriteColor"]');
      if (colorSelect) {
        colorSelect.value = 'green';
        colorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var hostBtn = document.querySelector('.plugin-view .main-action');
      if (hostBtn) hostBtn.click();
    `);

    await driver.wait(async () => {
      const text = await getRaycastDetailText(driver);
      return text.includes('Arguments command loaded')
        && text.includes('Title: webdriver-title')
        && text.includes('Favorite Color: green')
        && text.includes('Has Secret: yes');
    }, 60_000);

    console.log('WebDriver Raycast worker view basic E2E OK');
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
