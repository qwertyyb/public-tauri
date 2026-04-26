/**
 * E2E: 权限设置截图测试
 * 
 * 前置：`unset CARGO_TARGET_DIR && pnpm tauri:dev`（`--features webdriver`）
 * 运行：`npx tsx e2e/webdriver-screenshot.ts`
 */
import { Builder, Browser, By, until, type WebDriver, Key } from 'selenium-webdriver';
import * as fs from 'fs';
import * as path from 'path';

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

async function waitForCoreReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return typeof window.__PUBLIC_CORE__ === "object";');
      if (ok) return;
    } catch {
      // ignore
    }
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_CORE__');
}

async function takeScreenshot(driver: WebDriver, name: string): Promise<string> {
  const base64 = await driver.takeScreenshot();
  const filename = `/tmp/${name}.png`;
  fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
  console.log(`Screenshot saved: ${filename}`);
  return filename;
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
    await waitForCoreReady(driver, 30_000);

    console.log('Step 1: Showing main window...');
    // Use core API to show window
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.show();
      window.__PUBLIC_CORE__.mainWindow.center();
    `);
    await driver.sleep(500);

    // Take screenshot of main interface
    await takeScreenshot(driver, 'main_interface');
    console.log('Main interface screenshot captured');

    console.log('Step 2: Navigating to Settings...');
    // Push settings view using mainWindow API
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.pushView({ path: '/settings' });
    `);
    await driver.sleep(1000);

    // Take screenshot of settings (common tab)
    await takeScreenshot(driver, 'settings_common');
    console.log('Settings common tab screenshot captured');

    console.log('Step 3: Clicking on Permissions tab...');
    // Click on the permissions tab using webdriver - it's a <li> element
    const permissionsTab = await driver.wait(
      until.elementLocated(By.xpath('//li[contains(text(), "权限")]')),
      10000
    );
    await permissionsTab.click();
    await driver.sleep(500);

    // Take screenshot of permissions view
    await takeScreenshot(driver, 'settings_permissions');
    console.log('Settings permissions tab screenshot captured');

    console.log('All screenshots captured successfully!');
    console.log('  - /tmp/main_interface.png');
    console.log('  - /tmp/settings_common.png');
    console.log('  - /tmp/settings_permissions.png');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
