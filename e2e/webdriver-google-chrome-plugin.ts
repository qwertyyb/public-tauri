/**
 * E2E: @public-tauri-ext/google-chrome（触发词 gc）
 *
 * 前置：`pnpm tauri:dev`（`--features webdriver`）；本机需安装 Google Chrome。
 * 环境变量：`TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL`、可选 `E2E_GOOGLE_CHROME_PLUGIN_PATH`（默认 `store/plugins/google-chrome`）。
 * 报告：`reports/google-chrome-plugin-e2e-report.md`
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Builder, Browser, By, Key, until, type WebDriver, type WebElement } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const DEFAULT_PLUGIN_DIR = path.join(PROJECT_ROOT, 'store/plugins/google-chrome');
const REPORT_PATH = path.join(PROJECT_ROOT, 'reports/google-chrome-plugin-e2e-report.md');

interface CaseResult {
  caseId: string;
  inputLine: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  chromeUrl?: string;
}

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

function ensurePluginBuilt(): void {
  console.log('[e2e] Building @public-tauri-ext/google-chrome...');
  execSync('pnpm --filter @public-tauri-ext/google-chrome run build', {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
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

async function registerPluginViaDevHook(driver: WebDriver, pluginDir: string): Promise<void> {
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
      console.log('[e2e] Plugin already registered — 若刚改过插件 dist，请重启 pnpm tauri:dev 后再跑 E2E');
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
  throw new Error(`注册 google-chrome 插件超时: ${String(lastErr)}`);
}

/**
 * 在所有窗口的标签页中查找 URL 包含片段的标签（避免「前台标签仍是用户其它网页」导致误判）。
 * 注意：勿在 `tell application "Google Chrome"` 内使用 `return u`，易触发 osascript 语法错误。
 */
function findChromeTabUrlContaining(substr: string): string | null {
  const needle = substr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `set needle to "${needle}"
set resultURL to ""
tell application "Google Chrome"
  try
    repeat with w in windows
      repeat with t in tabs of w
        set u to URL of t
        if u contains needle then set resultURL to u
      end repeat
    end repeat
  end try
end tell
return resultURL`;
  const r = spawnSync('osascript', ['-'], { input: script, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(r.stderr || String(r.error));
  }
  const out = (r.stdout || '').trim();
  return out.length > 0 ? out : null;
}

async function waitForChromeAnyTabUrlContains(substr: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastProbe = '';
  while (Date.now() < deadline) {
    try {
      const hit = findChromeTabUrlContaining(substr);
      if (hit) return hit;
      const probe = findChromeTabUrlContaining('google.com/search');
      if (probe) lastProbe = probe;
    } catch {
      // Chrome 未安装或未响应
    }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Chrome 所有标签中未找到 URL 包含: ${JSON.stringify(substr)}；曾探测到含 google.com/search 的 URL: ${JSON.stringify(lastProbe)}`);
}

function writeReportMarkdown(opts: {
  startedAt: string;
  finishedAt: string;
  appUrl: string;
  wdUrl: string;
  pluginDir: string;
  results: CaseResult[];
  setupError?: string;
}): void {
  const { startedAt, finishedAt, appUrl, wdUrl, pluginDir, results, setupError } = opts;
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const lines: string[] = [
    '# Google Chrome 插件 E2E 测试报告',
    '',
    `- **开始时间**: ${startedAt}`,
    `- **结束时间**: ${finishedAt}`,
    `- **应用 URL**: \`${appUrl}\``,
    `- **WebDriver**: \`${wdUrl}\``,
    `- **插件目录**: \`${pluginDir}\``,
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
    lines.push(`### ${icon} ${r.caseId}`, '');
    lines.push(`- **状态**: ${r.passed ? '通过' : '失败'}`);
    lines.push(`- **耗时**: ${r.durationMs} ms`);
    lines.push(`- **输入**: \`${r.inputLine}\``);
    if (r.chromeUrl) {
      lines.push(`- **Chrome URL**: \`${r.chromeUrl}\``);
    }
    if (r.error) {
      lines.push(`- **错误**: ${r.error}`);
    }
    lines.push('');
  }
  lines.push('---', '', '*由 `e2e/webdriver-google-chrome-plugin.ts` 生成*', '');
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

function printConsoleSummary(results: CaseResult[], setupError?: string): void {
  console.log('');
  console.log('========== Google Chrome 插件 E2E 汇总 ==========');
  if (setupError) {
    console.log('[e2e] 前置失败:', setupError);
  }
  for (const r of results) {
    const tag = r.passed ? 'PASS' : 'FAIL';
    console.log(`[e2e] [${tag}] ${r.caseId} ${r.durationMs}ms${r.error ? ` — ${r.error}` : ''}`);
  }
  const passed = results.filter(r => r.passed).length;
  console.log(`[e2e] 合计: ${passed}/${results.length} 通过`);
  console.log(`[e2e] 报告: ${REPORT_PATH}`);
  console.log('===============================================');
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const results: CaseResult[] = [];
  let setupError: string | undefined;
  let driver: WebDriver | null = null;

  if (process.env.E2E_SKIP_PLUGIN_BUILD !== '1') {
    ensurePluginBuilt();
  } else {
    console.log('[e2e] Skip plugin build (E2E_SKIP_PLUGIN_BUILD=1)');
  }

  const pluginDir = process.env.E2E_GOOGLE_CHROME_PLUGIN_PATH
    ? path.resolve(process.env.E2E_GOOGLE_CHROME_PLUGIN_PATH)
    : DEFAULT_PLUGIN_DIR;

  const runId = Date.now();
  const query = `e2e-gchrome-${runId}`;
  const fullText = `gc ${query}`;
  const expectInUrl = encodeURIComponent(query);

  console.log('[e2e] Waiting for WebDriver...');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  try {
    driver = await new Builder()
      .usingServer(WD_URL)
      .forBrowser(Browser.CHROME)
      .build();
    const appUrl = `${APP_URL.replace(/\/?$/, '/')}?e2e=${Date.now()}`;
    await driver.get(appUrl);
    await waitForPluginsReady(driver, 120_000);

    await ensureHookAndRegisterPlugin(driver, pluginDir, 90_000);
    await driver.sleep(600);

    const t0 = Date.now();
    let caseResult: CaseResult = {
      caseId: 'open-google-search-in-chrome',
      inputLine: fullText,
      passed: false,
      durationMs: 0,
    };

    try {
      await setMainInputValue(driver, fullText);
      const echoed = await driver.executeScript<string>('return document.querySelector("#main-input")?.value || "";');
      if (echoed !== fullText) {
        throw new Error(`输入与 DOM 不一致: expected ${JSON.stringify(fullText)}, got ${JSON.stringify(echoed)}`);
      }
      await driver.sleep(800);

      const xpath = '//div[contains(@class,"result-item")][contains(.,"在 Chrome")]';
      let row: WebElement;
      try {
        row = await driver.wait(until.elementLocated(By.xpath(xpath)), 30_000);
      } catch (waitErr) {
        const dump = await driver.executeScript<{ input: string; items: string[] }>(`
          return {
            input: document.querySelector('#main-input')?.value || '',
            items: Array.from(document.querySelectorAll('.result-item')).map((el) => (el.textContent || '').trim()),
          };
        `);
        throw new Error(`未命中 Chrome 结果行: ${JSON.stringify(dump)}; waitErr=${String(waitErr)}`);
      }

      // 必须选中该行再回车：默认 selectedIndex 为 0，第一条不一定是本插件
      await row.click();
      await driver.sleep(200);

      await pressEnterViaActions(driver);
      await driver.sleep(1500);
      const chromeUrl = await waitForChromeAnyTabUrlContains(expectInUrl, 25_000);
      caseResult = {
        ...caseResult,
        passed: true,
        durationMs: Date.now() - t0,
        chromeUrl,
      };
      console.log('[e2e] OK, Chrome URL contains query:', expectInUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      caseResult = {
        ...caseResult,
        passed: false,
        durationMs: Date.now() - t0,
        error: msg,
      };
      console.error('[e2e] FAIL:', msg);
    }

    results.push(caseResult);
    if (!caseResult.passed) {
      throw new Error(`Google Chrome 用例失败: ${caseResult.caseId}`);
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
      pluginDir,
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
