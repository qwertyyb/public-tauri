/**
 * E2E: @public-tauri-ext/search（Google / 必应 / 百度）
 *
 * 前置：`pnpm tauri:dev`（debug 构建默认启用 WebDriver）；DEV 下存在 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__`。
 * 环境变量：`TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL`、可选 `E2E_SEARCH_PLUGIN_PATH`（默认仓库内 `store/plugins/search`）。
 * 输入与按键说明见 docs-app/webdriver-e2e-input.md；报告写入 reports/search-plugin-e2e-report.md（每次运行覆盖）。
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, Browser, By, Key, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_SEARCH_PLUGIN_DIR = path.join(PROJECT_ROOT, 'store/plugins/search');
const REPORT_PATH = path.join(PROJECT_ROOT, 'reports/search-plugin-e2e-report.md');

interface SearchE2ECase {
  id: string;
  trigger: string;
  /** 结果列表行中应出现的文案片段 */
  resultLabel: string;
}

const SEARCH_CASES: SearchE2ECase[] = [
  { id: 'google', trigger: 'g', resultLabel: '谷歌搜索' },
  { id: 'bing', trigger: 'b', resultLabel: '必应搜索' },
  { id: 'baidu', trigger: 'bd', resultLabel: '百度搜索' },
];

interface CaseResult {
  caseId: string;
  trigger: string;
  query: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

/** 轮询 `/status` 直至 HTTP 成功（与 smoke 脚本不同，此处不解析 `value.ready`）。 */
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

function ensureSearchPluginBuilt(): void {
  console.log('[e2e] Building @public-tauri-ext/search…');
  execSync('pnpm --filter @public-tauri-ext/search run build', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}

/**
 * 使用 `clear` + `sendKeys` 写入 `#main-input`；调用方应用脚本读 DOM 校验 `input.value`。
 * 若遇 WebKit 下 `sendKeys` 末尾乱码，可改为页面内原生 `value` setter + `InputEvent`（见 docs-app/webdriver-e2e-input.md）。
 */
async function setMainInputValue(driver: WebDriver, text: string): Promise<void> {
  const input = await driver.wait(until.elementLocated(By.css('#main-input')), 60_000);
  await input.clear();
  await input.sendKeys(text);
}

/**
 * 对**元素** `sendKeys(Key.ENTER)` 会走 `sendKeysToElement`，在 WebKit 下容易在输入框末尾多出乱码。
 * 使用 W3C Actions（`performActions`）发送键盘事件，与真实按键路径一致且不经由该 API。
 */
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

async function registerSearchPluginViaDevHook(
  driver: WebDriver,
  pluginDir: string,
): Promise<void> {
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

function writeReportMarkdown(opts: {
  startedAt: string;
  finishedAt: string;
  appUrl: string;
  wdUrl: string;
  results: CaseResult[];
  setupError?: string;
}): void {
  const { startedAt, finishedAt, appUrl, wdUrl, results, setupError } = opts;
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const lines: string[] = [
    '# Search 插件 E2E 测试报告',
    '',
    `- **开始时间**: ${startedAt}`,
    `- **结束时间**: ${finishedAt}`,
    `- **应用 URL**: \`${appUrl}\``,
    `- **WebDriver**: \`${wdUrl}\``,
    `- **用例**: ${results.length} 条（通过 ${passed}，失败 ${failed}）`,
    '',
  ];
  if (setupError && results.length === 0) {
    lines.push('## 前置 / 全局失败', '', '```', setupError, '```', '');
  } else if (setupError) {
    lines.push('## 汇总错误', '', '```', setupError, '```', '');
  }
  lines.push('## 用例明细', '');
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    lines.push(`### ${icon} ${r.caseId}（触发词 \`${r.trigger}\`）`, '');
    lines.push(`- **状态**: ${r.passed ? '通过' : '失败'}`);
    lines.push(`- **耗时**: ${r.durationMs} ms`);
    lines.push(`- **查询串**: \`${r.trigger} ${r.query}\``);
    if (r.error) {
      lines.push(`- **错误**: ${r.error}`);
    }
    lines.push('');
  }
  lines.push('---', '', '*由 `e2e/webdriver-search-plugin.ts` 生成*', '');
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

function printConsoleSummary(results: CaseResult[], setupError?: string): void {
  console.log('');
  console.log('========== Search 插件 E2E 汇总 ==========');
  if (setupError) {
    console.log('[e2e] 前置失败:', setupError);
  }
  for (const r of results) {
    const tag = r.passed ? 'PASS' : 'FAIL';
    console.log(`[e2e] [${tag}] ${r.caseId} (${r.trigger}) ${r.durationMs}ms${r.error ? ` — ${r.error}` : ''}`);
  }
  const passed = results.filter(r => r.passed).length;
  console.log(`[e2e] 合计: ${passed}/${results.length} 通过`);
  console.log(`[e2e] 报告: ${REPORT_PATH}`);
  console.log('==========================================');
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const results: CaseResult[] = [];
  let setupError: string | undefined;
  let driver: WebDriver | null = null;

  ensureSearchPluginBuilt();

  const pluginDir = process.env.E2E_SEARCH_PLUGIN_PATH
    ? path.resolve(process.env.E2E_SEARCH_PLUGIN_PATH)
    : DEFAULT_SEARCH_PLUGIN_DIR;

  console.log('[e2e] Waiting for WebDriver…');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  try {
    driver = await new Builder()
      .usingServer(WD_URL)
      .forBrowser(Browser.CHROME)
      .build();
    await driver.get(APP_URL);
    await waitForPluginsReady(driver, 120_000);

    const hookDeadline = Date.now() + 60_000;
    while (Date.now() < hookDeadline) {
      const has = await driver.executeScript('return typeof window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ === "function";');
      if (has) break;
      await driver.sleep(200);
    }

    await registerSearchPluginViaDevHook(driver, pluginDir);
    await driver.sleep(600);

    const runId = Date.now();

    for (const c of SEARCH_CASES) {
      const t0 = Date.now();
      const q = `e2e-${runId}-${c.id}`;
      let caseResult: CaseResult = {
        caseId: c.id,
        trigger: c.trigger,
        query: q,
        passed: false,
        durationMs: 0,
      };

      try {
        const fullText = `${c.trigger} ${q}`;
        await setMainInputValue(driver, fullText);
        const echoed = await driver.executeScript<string>('return document.querySelector("#main-input")?.value || "";');
        if (echoed !== fullText) {
          throw new Error(`输入与 DOM 不一致: expected ${JSON.stringify(fullText)}, got ${JSON.stringify(echoed)}`);
        }
        await driver.sleep(800);

        const xpath = `//div[contains(@class,"result-item")][contains(.,"${c.resultLabel}")]`;
        const row = await driver.wait(until.elementLocated(By.xpath(xpath)), 30_000);
        const text = await driver.executeScript<string>(
          'return (arguments[0] && arguments[0].innerText) || \'\';',
          row,
        );
        if (!text.includes(c.resultLabel) || !text.includes(q)) {
          throw new Error(`行文案不符合预期: ${text.slice(0, 200)}`);
        }
        await pressEnterViaActions(driver);
        await driver.sleep(500);
        caseResult = { ...caseResult, passed: true, durationMs: Date.now() - t0 };
        console.log(`[e2e] OK ${c.id}: ${c.trigger} ${q}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        caseResult = {
          ...caseResult,
          passed: false,
          durationMs: Date.now() - t0,
          error: msg,
        };
        console.error(`[e2e] FAIL ${c.id}:`, msg);
      }
      results.push(caseResult);
    }

    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      throw new Error(`${failed.length} 个用例失败: ${failed.map(f => f.caseId).join(', ')}`);
    }
  } catch (e) {
    setupError = e instanceof Error ? (e.stack || e.message) : String(e);
    throw e;
  } finally {
    const finishedAt = new Date().toISOString();
    writeReportMarkdown({
      startedAt,
      finishedAt,
      appUrl: APP_URL,
      wdUrl: WD_URL,
      results,
      setupError,
    });
    printConsoleSummary(results, results.length === 0 ? setupError : undefined);
    if (driver) {
      await driver.quit();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
