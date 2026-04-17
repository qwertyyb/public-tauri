/**
 * 冒烟：连接本机 `tauri-plugin-webdriver`（W3C，默认 http://127.0.0.1:4445）。
 * 运行：`pnpm test:webdriver`（需已启动 `pnpm tauri:dev`，含 webdriver）。
 * 覆盖 `TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL` 可改端点与页面（`TAURI_DEV_URL` 应对齐 `build.devUrl`）。
 */
import { Builder, By, Browser, until } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
/** Must match `build.devUrl` in src-tauri/tauri.conf.json during `tauri dev` */
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

/** 轮询 `/status`：HTTP 成功且 JSON 中 `value.ready` 不为 `false` 即视为就绪。 */
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

async function main(): Promise<void> {
  console.log(`Waiting for WebDriver at ${WD_URL} …`);
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  const driver = await new Builder().usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    // Dev server URL (Vite); `tauri://localhost` is for bundled assets, not `tauri dev`
    await driver.get(APP_URL);
    await driver.sleep(800);
    await driver.wait(until.elementLocated(By.css('body')), 30_000);
    const title = await driver.getTitle();
    console.log('Page title:', title);

    const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
    await input.clear();
    await input.sendKeys('好好学习，天天向上');
    console.log('Typed into #main-input');

    const url = await driver.getCurrentUrl();
    console.log('Current URL:', url);
    console.log('WebDriver smoke test OK');
  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
