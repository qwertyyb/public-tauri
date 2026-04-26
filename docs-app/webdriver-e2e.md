# WebDriver E2E 测试指南

本文档指导如何通过 WebDriver 快速生成符合预期的测试脚本，实现前端自动化操作、截图验证等功能。

## 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [开发环境注入](#开发环境注入)
- [API 调用指南](#api-调用指南)
- [页面元素定位](#页面元素定位)
- [截图与验证](#截图与验证)
- [实战模板](#实战模板)
- [常见问题](#常见问题)

---

## 快速开始

### 1. 启动应用（含 WebDriver）

```bash
pnpm tauri:dev
```

这会启动 Tauri 应用，并自动启用 `tauri-plugin-webdriver`，在 `http://127.0.0.1:4445` 暴露 W3C WebDriver。

### 2. 创建测试脚本

在 `e2e/` 目录下创建 `.ts` 文件：

```typescript
import { Builder, Browser, By, until, type WebDriver } from 'selenium-webdriver';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';

async function main(): Promise<void> {
  const driver = await new Builder()
    .usingServer(WD_URL)
    .forBrowser(Browser.CHROME)
    .build();

  try {
    await driver.get(APP_URL);
    await driver.sleep(1000);

    // TODO: 添加测试逻辑

  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### 3. 运行测试

```bash
npx tsx e2e/your-test-script.ts
```

---

## 核心概念

### WebDriver 连接机制

应用通过 `tauri-plugin-webdriver` 在本地暴露 W3C WebDriver：

| 组件 | 地址 | 说明 |
|------|------|------|
| WebDriver | `http://127.0.0.1:4445` | Selenium 连接端点 |
| Vite Dev Server | `http://localhost:1420/` | 前端页面地址 |

### 就绪检测

脚本启动前会轮询 WebDriver 状态：

```typescript
async function waitForWebDriverReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/status`);
      if (res.ok) {
        const j = await res.json();
        if (j?.value?.ready !== false) return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('WebDriver not ready');
}
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TAURI_WEBDRIVER_URL` | `http://127.0.0.1:4445` | WebDriver 地址 |
| `TAURI_DEV_URL` | `http://localhost:1420/` | 应用页面地址 |

---

## 开发环境注入

### `__PUBLIC_CORE__`

在开发模式下，`src/main.ts` 会将 core API 注入到 `window.__PUBLIC_CORE__`，方便 WebDriver 脚本调用：

```typescript
// src/main.ts
if (!import.meta.env.PROD && typeof window !== 'undefined') {
  window.__PUBLIC_CORE__ = core;
}
```

### 可用的全局标志

| 变量 | 说明 |
|------|------|
| `window.__PUBLIC_CORE__` | Core API 对象 |
| `window.__PUBLIC_APP_PLUGINS_READY__` | 插件是否就绪 |
| `window.__E2E_INVOKE__` | Tauri invoke 函数 |

### 等待函数

```typescript
// 等待插件就绪
async function waitForPluginsReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await driver.executeScript(
      'return window.__PUBLIC_APP_PLUGINS_READY__ === true;'
    );
    if (ok) return;
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for plugins');
}

// 等待 core API 可用
async function waitForCoreReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await driver.executeScript(
      'return typeof window.__PUBLIC_CORE__ === "object";'
    );
    if (ok) return;
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for __PUBLIC_CORE__');
}
```

---

## API 调用指南

### 窗口操作

```typescript
// 显示主窗口
await driver.executeScript(`
  window.__PUBLIC_CORE__.mainWindow.show();
  window.__PUBLIC_CORE__.mainWindow.center();
`);

// 隐藏主窗口
await driver.executeScript(`
  window.__PUBLIC_CORE__.mainWindow.hide();
`);

// 清除输入框
await driver.executeScript(`
  window.__PUBLIC_CORE__.mainWindow.clearInput();
`);
```

### 页面导航

使用 `mainWindow.pushView()` 推送视图：

```typescript
// 打开设置页面
await driver.executeScript(`
  window.__PUBLIC_CORE__.mainWindow.pushView({ path: '/settings' });
`);

// 打开插件商店
await driver.executeScript(`
  window.__PUBLIC_CORE__.mainWindow.pushView({ path: '/storefront' });
`);
```

### 权限检查

```typescript
// 检查所有权限状态
const permissions = await driver.executeScript(`
  return window.__PUBLIC_CORE__.permissions.checkAll();
`);
console.log(permissions);
// { accessibility: 'granted', appleScript: 'denied', screenRecording: 'unknown' }

// 检查单个权限
const accessibility = await driver.executeScript(`
  return window.__PUBLIC_CORE__.permissions.checkAccessibility();
`);

// 打开权限设置页面
await driver.executeScript(`
  window.__PUBLIC_CORE__.permissions.openAccessibilitySettings();
`);
```

### 屏幕捕获

```typescript
// 获取所有显示器
const monitors = await driver.executeScript(`
  return window.__PUBLIC_CORE__.screen.getAllMonitors();
`);

// 截取指定显示器
const screenshot = await driver.executeScript(`
  return window.__PUBLIC_CORE__.screen.capture(monitorId);
`);
```

---

## 页面元素定位

### 常用定位方式

```typescript
import { By, until } from 'selenium-webdriver';

// 按 CSS 选择器
const element = await driver.findElement(By.css('#main-input'));

// 按 XPath
const element = await driver.findElement(By.xpath('//button[contains(text(), "确定")]'));

// 按文本内容（XPath）
const element = await driver.findElement(By.xpath('//li[contains(text(), "权限")]'));

// 等待元素出现
const element = await driver.wait(
  until.elementLocated(By.css('.settings-panel')),
  10000 // 超时时间（毫秒）
);
```

### 查找页面文本

调试时可获取页面所有文本内容：

```typescript
const text = await driver.executeScript(() => {
  const elements = document.querySelectorAll('*');
  const texts: string[] = [];
  for (const el of elements) {
    if (el.children.length === 0 && el.textContent.trim()) {
      const txt = el.textContent.trim();
      if (txt.length < 100) {
        texts.push(el.tagName + ': ' + txt);
      }
    }
  }
  return [...new Set(texts)];
});
console.log(text);
```

### 常见元素类型

| 元素类型 | 示例 | 说明 |
|---------|------|------|
| `<button>` | `By.css('button')` | 按钮 |
| `<li>` | `By.xpath('//li[contains(text(), "权限")]')` | 列表项（标签） |
| `<input>` | `By.css('#main-input')` | 输入框 |
| `<span>` | `By.xpath('//span[contains(text(), "Settings")]')` | 文本标签 |

---

## 截图与验证

### WebDriver 原生截图

```typescript
import * as fs from 'fs';

// 截图并保存
async function takeScreenshot(driver: WebDriver, name: string): Promise<string> {
  const base64 = await driver.takeScreenshot();
  const filename = `/tmp/${name}.png`;
  fs.writeFileSync(filename, Buffer.from(base64, 'base64'));
  console.log(`Screenshot saved: ${filename}`);
  return filename;
}

// 使用
await takeScreenshot(driver, 'main_interface');
```

### macOS 系统截图

如果需要捕获原生窗口（非 WebView）：

```bash
# 获取窗口信息
/tmp/list_windows  # 需先编译 CoreGraphics 程序

# 按窗口区域截图
screencapture -x -R{x},{y},{width},{height} /tmp/screenshot.png
```

### 完整测试脚本模板

```typescript
import { Builder, Browser, By, until, type WebDriver } from 'selenium-webdriver';
import * as fs from 'fs';

const WD_URL = process.env.TAURI_WEBDRIVER_URL ?? 'http://127.0.0.1:4445';
const APP_URL = process.env.TAURI_DEV_URL ?? 'http://localhost:1420/';
const READY_TIMEOUT_MS = 180_000;
const POLL_MS = 1500;

async function waitForWebDriverReady(baseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/status`);
      if (res.ok) {
        const j = await res.json();
        if (j?.value?.ready !== false) return;
      }
    } catch {}
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  throw new Error('WebDriver not ready');
}

async function waitForPluginsReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript(
        'return window.__PUBLIC_APP_PLUGINS_READY__ === true;'
      );
      if (ok) return;
    } catch {}
    await driver.sleep(200);
  }
  throw new Error('Timeout waiting for plugins');
}

async function waitForCoreReady(driver: WebDriver, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await driver.executeScript(
        'return typeof window.__PUBLIC_CORE__ === "object";'
      );
      if (ok) return;
    } catch {}
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
    // 1. 打开页面
    await driver.get(APP_URL);
    await driver.sleep(800);

    // 2. 等待插件就绪
    await waitForPluginsReady(driver, 120_000);
    await waitForCoreReady(driver, 30_000);

    // 3. 显示主窗口
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.show();
      window.__PUBLIC_CORE__.mainWindow.center();
    `);
    await driver.sleep(500);
    await takeScreenshot(driver, 'step1_main');

    // 4. 导航到设置页面
    await driver.executeScript(`
      window.__PUBLIC_CORE__.mainWindow.pushView({ path: '/settings' });
    `);
    await driver.sleep(1000);
    await takeScreenshot(driver, 'step2_settings');

    // 5. 点击权限标签
    const permissionsTab = await driver.wait(
      until.elementLocated(By.xpath('//li[contains(text(), "权限")]')),
      10000
    );
    await permissionsTab.click();
    await driver.sleep(500);
    await takeScreenshot(driver, 'step3_permissions');

    console.log('Test completed successfully!');

  } finally {
    await driver.quit();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## 常见问题

### 1. `window.__PUBLIC_CORE__` 为 undefined

**原因**：Vite HMR 可能未更新页面。

**解决**：
1. 刷新页面（`driver.navigate().refresh()`）
2. 确认 `src/main.ts` 中已添加注入代码
3. 检查 `import.meta.env.PROD` 是否为 false

### 2. 元素定位超时

**原因**：页面还未加载完成，或选择器不正确。

**解决**：
1. 增加等待时间
2. 使用 `executeScript` 先调试获取页面文本
3. 确认元素确实存在于 DOM 中

### 3. 输入框操作无效

**原因**：Vue v-model 绑定问题。

**解决**：
1. 使用 `element.clear()` 清空
2. 使用 `element.sendKeys()` 输入
3. 对于中文输入，可能需要模拟粘贴

### 4. 快捷键冲突

在 macOS 上，`Cmd+,` 可能被系统占用。测试设置页面时：
- 使用 `pushView` API 而非快捷键
- 或使用 `driver.actions().keyDown(Key.META).sendKeys(',').keyUp(Key.META).perform()`

### 5. 截图尺寸异常

WebDriver 截图可能使用设备像素比（DPR）：
- 1x 显示器：正常
- Retina 显示器：截图尺寸是实际像素的 2 倍

---

## 更多示例

参考 `e2e/` 目录下的现有脚本：

| 脚本 | 说明 |
|------|------|
| `webdriver-smoke.ts` | 基础冒烟测试 |
| `webdriver-confetti-plugin.ts` | 插件 E2E 示例 |
| `webdriver-screenshot.ts` | 截图功能示例 |
| `debug-page.cjs` | 页面元素调试脚本 |
