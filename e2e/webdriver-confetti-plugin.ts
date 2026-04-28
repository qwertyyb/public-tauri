/**
 * E2E: 内置 confetti 插件 — 全屏彩带、透明穿透点击
 *
 * 前置：`unset CARGO_TARGET_DIR && pnpm tauri:dev`（debug 构建默认启用 WebDriver）。环境：`TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL`。
 * 依赖开发环境 `window.__E2E_INVOKE`（见 `src/main.ts`）用于 `invoke` 探针。
 */
import { Builder, Browser, By, until, type WebDriver, Key } from 'selenium-webdriver';

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

async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(text);
}

async function waitForPluginsReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
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

async function waitForE2EInvokeHook(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return typeof window.__E2E_INVOKE === "function";');
      if (ok) return;
    } catch {
      // ignore
    }
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __E2E_INVOKE (dev only)');
}

async function main(): Promise<void> {
  console.log(`Waiting for WebDriver at ${WD_URL} …`);
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(800);
    await waitForPluginsReady(driver, 120_000);
    await waitForE2EInvokeHook(driver, 30_000);

    await setMainInputValue(driver, 'confetti');
    await driver.sleep(1500);
    // mode「none」：主操作为「Open Command」时需触发主操作，与 snippets E2E 一致
    await driver.wait(until.elementLocated(By.css('.main-action .main-action-label')), 30_000);
    const actionLabel = await driver.findElement(By.css('.main-action .main-action-label')).getText();
    if (actionLabel.includes('Open Command')) {
      await driver.findElement(By.css('.main-action')).click();
    } else {
      await driver.findElement(By.css('#main-input')).sendKeys(Key.ENTER);
    }
    await driver.sleep(1000);

    console.log('WebDriver confetti plugin E2E OK');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
