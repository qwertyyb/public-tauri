/**
 * E2E: 内置 snippets 插件 — create snippet（主操作「创建」）、search snippets（主操作「粘贴」及更多操作）
 *
 * 前置：`pnpm tauri:dev`（`--features webdriver`）。环境：`TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL`。
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

async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(text);
}

async function pressEnterViaActions(driver: WebDriver): Promise<void> {
  await driver
    .actions()
    .keyDown(Key.ENTER)
    .keyUp(Key.ENTER)
    .perform();
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

async function fillSnippetCreateForm(driver: WebDriver, title: string, bodyText: string): Promise<void> {
  await driver.switchTo().defaultContent();
  // wujie 子应用 iframe 在 startApp 后异步插入，需等待
  const wujieApp = await driver.wait(
    until.elementLocated(By.css('.plugin-view .wujie-container wujie-app')),
    60_000,
  );

  const shadowRoot = await wujieApp.getShadowRoot();
  const fields = await shadowRoot.findElements(By.css('input, textarea'));
  if (fields.length < 2) {
    await driver.switchTo().defaultContent();
    throw new Error(`Expected at least 2 input/textarea in wujie frame, got ${fields.length}`);
  }
  await fields[0]!.clear();
  await fields[0]!.sendKeys(title);
  await fields[1]!.clear();
  await fields[1]!.sendKeys(bodyText);
}

/** 首页选中 view 模式命令后，主操作会先显示「Open Command」；点击主操作条进入插件并等待 `.plugin-view` 挂载。 */
async function enterPluginViewFromHome(driver: WebDriver): Promise<void> {
  await driver.wait(until.elementLocated(By.css('.main-action .main-action-label')), 45_000);
  const label = await driver.findElement(By.css('.main-action .main-action-label')).getText();
  if (!label.includes('Open Command')) {
    return;
  }
  await driver.findElement(By.css('.main-action')).click();
  await driver.wait(until.elementLocated(By.css('.plugin-view')), 25_000);
  await driver.sleep(400);
}

async function main(): Promise<void> {
  console.log(`Waiting for WebDriver at ${WD_URL} …`);
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder().usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(800);
    await waitForPluginsReady(driver, 120_000);

    const tag = `wd-${Date.now()}`;
    const title = `t-${tag}`;
    const body = `c-${tag}`;

    // —— create snippet: 主操作应为「创建」（先等搜索结果与 Open Command，再进插件）
    await setMainInputValue(driver, 'create snippet');
    await driver.sleep(1200);
    await driver.wait(
      until.elementLocated(By.css('.main-action .main-action-label')),
      30_000,
    );
    await enterPluginViewFromHome(driver);

    // 子应用异步挂载：先等 wujie iframe，再等 CreateSnippetView onMounted → setActions（主操作「创建」）
    await driver.wait(
      until.elementLocated(By.css('.plugin-view .wujie-container wujie-app')),
      60_000,
    );
    const createLabel = await driver.wait(
      until.elementLocated(By.css('.plugin-view .main-action .main-action-label')),
      60_000,
    ).then(el => el.getText());
    if (!createLabel.includes('创建')) {
      throw new Error(`Expected main action label to include 创建, got: ${createLabel}`);
    }

    await fillSnippetCreateForm(driver, title, body);
    await driver.switchTo().defaultContent();
    await driver.findElement(By.css('.plugin-view .main-action')).click();
    await driver.sleep(1500);

    // —— search snippets: 选中条目后主操作「粘贴」
    await setMainInputValue(driver, 'search snippets');
    await driver.sleep(1200);
    await enterPluginViewFromHome(driver);

    const pluginInput = await driver.wait(
      until.elementLocated(By.css('.plugin-view #main-input')),
      45_000,
    );
    await pluginInput.clear();
    await pluginInput.sendKeys(title);
    await driver.sleep(700);

    const wujieApp = await driver.wait(
      until.elementLocated(By.css('.plugin-view .wujie-container wujie-app')),
      60_000,
    );

    const shadowRoot = await wujieApp.getShadowRoot();

    await driver.wait(
      () => shadowRoot.findElements(By.css('.plugin-view .public-list-item')),
      30_000,
    );
    (await shadowRoot.findElement(By.css('.public-list-item'))).click();
    await driver.sleep(400);

    const pasteLabel = await driver.wait(
      until.elementLocated(By.css('.plugin-view .main-action .main-action-label')),
      60_000,
    ).then(el => el.getText());
    if (!pasteLabel.includes('粘贴')) {
      throw new Error(`Expected main action 粘贴, got: ${pasteLabel}`);
    }

    const moreTriggers = await driver.findElements(By.css('.plugin-view .action-bar-action'));
    if (moreTriggers.length < 1) {
      console.warn('Expected action-bar trigger for secondary actions (修改/删除)');
    }

    console.log('WebDriver snippets plugin E2E OK');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
