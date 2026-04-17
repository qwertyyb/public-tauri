/**
 * E2E: @public-tauri-ext/shell（trigger: >）
 *
 * 前置：`pnpm tauri:dev`（`--features webdriver`）；DEV 下存在 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__`。
 * 环境变量：`TAURI_WEBDRIVER_URL`、`TAURI_DEV_URL`、可选 `E2E_SHELL_PLUGIN_PATH`（默认仓库内 `store/plugins/shell`）。
 * 报告写入 reports/shell-plugin-e2e-report.md（每次运行覆盖）。
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
const DEFAULT_SHELL_PLUGIN_DIR = path.join(PROJECT_ROOT, 'store/plugins/shell');
const REPORT_PATH = path.join(PROJECT_ROOT, 'reports/shell-plugin-e2e-report.md');

interface CaseResult {
  caseId: string;
  command: string;
  passed: boolean;
  durationMs: number;
  error?: string;
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

function ensureShellPluginBuilt(): void {
  console.log('[e2e] Building @public-tauri-ext/shell...');
  execSync('pnpm --filter @public-tauri-ext/shell run build', {
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
      console.log('[e2e] Plugin already registered, continuing');
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
      // DEV 热重载窗口中，hook 可能短暂失效，或首次 import 失败；重试可恢复。
      if (msg.includes('not a function') || msg.includes('Load failed')) {
        await driver.sleep(500);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`注册 shell 插件超时: ${String(lastErr)}`);
}

async function waitForPathExists(targetPath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(targetPath)) return;
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`命令未生效，超时未找到文件: ${targetPath}`);
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
    '# Shell 插件 E2E 测试报告',
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
    lines.push(`- **命令**: \`${r.command}\``);
    if (r.error) {
      lines.push(`- **错误**: ${r.error}`);
    }
    lines.push('');
  }
  lines.push('---', '', '*由 `scripts/webdriver-shell-plugin.ts` 生成*', '');
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
}

function printConsoleSummary(results: CaseResult[], setupError?: string): void {
  console.log('');
  console.log('========== Shell 插件 E2E 汇总 ==========');
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
  console.log('=========================================');
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  const results: CaseResult[] = [];
  let setupError: string | undefined;
  let driver: WebDriver | null = null;

  if (process.env.E2E_SKIP_PLUGIN_BUILD !== '1') {
    ensureShellPluginBuilt();
  } else {
    console.log('[e2e] Skip plugin build (E2E_SKIP_PLUGIN_BUILD=1)');
  }

  const pluginDir = process.env.E2E_SHELL_PLUGIN_PATH
    ? path.resolve(process.env.E2E_SHELL_PLUGIN_PATH)
    : DEFAULT_SHELL_PLUGIN_DIR;

  const markerFile = `/tmp/public-tauri-shell-e2e-${Date.now()}.ok`;
  const command = `touch ${markerFile}`;

  console.log('[e2e] Waiting for WebDriver...');
  await waitForWebDriverReady(WD_URL, READY_TIMEOUT_MS);

  try {
    driver = await new Builder()
      .usingServer(WD_URL)
      .forBrowser(Browser.CHROME)
      .build();
    await driver.get(APP_URL);
    await waitForPluginsReady(driver, 120_000);

    await ensureHookAndRegisterPlugin(driver, pluginDir, 90_000);
    await driver.sleep(600);

    const t0 = Date.now();
    let caseResult: CaseResult = {
      caseId: 'run-command-via-trigger',
      command,
      passed: false,
      durationMs: 0,
    };

    try {
      const fullText = `> ${command}`;
      await setMainInputValue(driver, fullText);
      const echoed = await driver.executeScript<string>('return document.querySelector("#main-input")?.value || "";');
      if (echoed !== fullText) {
        throw new Error(`输入与 DOM 不一致: expected ${JSON.stringify(fullText)}, got ${JSON.stringify(echoed)}`);
      }
      await driver.sleep(800);

      const xpath = '//div[contains(@class,"result-item")][contains(.,"在终端执行")]';
      try {
        await driver.wait(until.elementLocated(By.xpath(xpath)), 30_000);
      } catch (waitErr) {
        const dump = await driver.executeScript<{ input: string, items: string[] }>(`
          return {
            input: document.querySelector('#main-input')?.value || '',
            items: Array.from(document.querySelectorAll('.result-item')).map((el) => (el.textContent || '').trim()),
          };
        `);
        throw new Error(`未命中 shell 结果行: ${JSON.stringify(dump)}; waitErr=${String(waitErr)}`);
      }

      await pressEnterViaActions(driver);
      await waitForPathExists(markerFile, 20_000);
      caseResult = { ...caseResult, passed: true, durationMs: Date.now() - t0 };
      console.log(`[e2e] OK: ${command}`);
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
      throw new Error(`Shell 用例失败: ${caseResult.caseId}`);
    }
  } catch (e) {
    setupError = e instanceof Error ? (e.stack || e.message) : String(e);
    throw e;
  } finally {
    if (fs.existsSync(markerFile)) {
      fs.rmSync(markerFile, { force: true });
    }
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
