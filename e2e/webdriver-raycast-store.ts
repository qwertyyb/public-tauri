/**
 * E2E：Raycast 扩展商店列表页（独立路由 /plugin/store/raycast）。
 *
 * 前置：终端 A 已启动 `unset CARGO_TARGET_DIR && pnpm tauri:dev`（含 WebDriver）。
 *
 * 运行：`pnpm test:webdriver:raycast-store`
 */
import { Builder, Browser, By, Key, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

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
  throw new Error(`WebDriver at ${baseUrl} did not become ready within ${timeoutMs}ms. Last error: ${String(lastErr)}`);
}

async function waitForNodeHealth(timeoutMs: number): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch('http://127.0.0.1:2345/health');
      if (res.ok) return;
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Node 服务未就绪: ${String(lastErr)}`);
}

async function waitForPluginsReady(driver: WebDriver): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return window.__PUBLIC_APP_PLUGINS_READY__ === true;');
      if (ok) return;
    } catch {
      // ignore
    }
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_APP_PLUGINS_READY__');
}

async function setMainInput(driver: WebDriver, value: string): Promise<void> {
  await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  const json = JSON.stringify(value);
  await driver.executeScript(`
    const el = document.querySelector('#main-input');
    if (!el) throw new Error('no main-input');
    el.focus();
    el.value = ${json};
    el.dispatchEvent(new Event('input', { bubbles: true }));
  `);
}

async function main(): Promise<void> {
  console.log('[raycast-store] wd:', WD_URL);
  console.log('[raycast-store] app:', APP_URL);
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(2_000);
    await waitForNodeHealth(60_000);
    await waitForPluginsReady(driver);

    await setMainInput(driver, 'raycast store');
    await driver.sleep(2_500);

    const beforeEnter = String(await driver.executeScript('return document.body.innerText || "";'));
    if (!beforeEnter.includes('Raycast 扩展商店')) {
      throw new Error('首页未出现「Raycast 扩展商店」命令');
    }

    await driver
      .actions()
      .keyDown(Key.ENTER)
      .keyUp(Key.ENTER)
      .perform();
    await driver.sleep(3_000);

    await setMainInput(driver, '1-click-confetti');
    await driver.sleep(2_500);

    const body = String(await driver.executeScript('return document.body.innerText || "";'));
    if (!body.includes('1-Click Confetti')) {
      throw new Error('Raycast 列表中未找到「1-Click Confetti」');
    }

    console.log('[raycast-store] OK');
  } finally {
    await driver.quit();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
