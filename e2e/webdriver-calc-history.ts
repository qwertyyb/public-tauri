/**
 * E2E: 计算器插件历史功能测试
 * 
 * 前置：`pnpm tauri:dev`（debug 构建默认启用 WebDriver）
 * 运行：`npx tsx e2e/webdriver-calc-history.ts`
 */
import { Builder, Browser, until, type WebDriver, By, Key } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';

async function waitForPluginsReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript('return window.__PUBLIC_APP_PLUGINS_READY__ === true;');
      if (ok) return;
    } catch {}
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_APP_PLUGINS_READY__');
}

async function takeScreenshot(driver: WebDriver, name: string): Promise<string> {
  const base64 = await driver.takeScreenshot();
  const filename = `/tmp/${name}.png`;
  const fs = await import('fs');
  fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
  console.log(`Screenshot saved: ${filename}`);
  return filename;
}

async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(text);
}

async function main(): Promise<void> {
  console.log(`Waiting for WebDriver at ${WD_URL} …`);
  
  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(800);
    await waitForPluginsReady(driver, 120_000);

    console.log('Step 1: Showing main window...');
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.show();
      window.__PUBLIC_CORE__.mainWindow.center();
    `);
    await driver.sleep(500);
    await takeScreenshot(driver, 'calc_step1_main');

    console.log('Step 2: Type calculation "100+200"...');
    await setMainInputValue(driver, '100+200');
    await driver.sleep(500);
    await takeScreenshot(driver, 'calc_step2_input');

    console.log('Step 3: Execute calculation...');
    await driver.actions().keyDown(Key.ENTER).keyUp(Key.ENTER).perform();
    await driver.sleep(1000);
    await takeScreenshot(driver, 'calc_step3_result');

    console.log('Step 4: Click to copy result...');
    // Click on the calculator result
    try {
      const resultItem = await driver.wait(
        until.elementLocated(By.xpath('//*[contains(text(), "= 300")]')),
        5000
      );
      await resultItem.click();
      await driver.sleep(800);
      await takeScreenshot(driver, 'calc_step4_copied');
    } catch {
      console.log('Step 4: Result not found, taking screenshot anyway');
      await takeScreenshot(driver, 'calc_step4_copied');
    }

    console.log('Step 5: Type "calc" to show history commands...');
    await setMainInputValue(driver, 'calc');
    await driver.sleep(800);
    await takeScreenshot(driver, 'calc_step5_history_commands');

    console.log('Step 6: Click on "计算历史" to enter history list...');
    // Click on "计算历史" list item
    try {
      const historyItem = await driver.wait(
        until.elementLocated(By.xpath('//*[contains(text(), "计算历史")]')),
        5000
      );
      await historyItem.click();
      await driver.sleep(1000);
      await takeScreenshot(driver, 'calc_step6_history_list_page');
    } catch {
      console.log('Step 6: History item not found, trying enter key...');
      await driver.actions().keyDown(Key.ENTER).keyUp(Key.ENTER).perform();
      await driver.sleep(1000);
      await takeScreenshot(driver, 'calc_step6_history_list_page');
    }

    console.log('All screenshots captured successfully!');
    console.log('  - /tmp/calc_step1_main.png');
    console.log('  - /tmp/calc_step2_input.png');
    console.log('  - /tmp/calc_step3_result.png');
    console.log('  - /tmp/calc_step4_copied.png');
    console.log('  - /tmp/calc_step5_history_commands.png');
    console.log('  - /tmp/calc_step6_history_list_page.png');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
