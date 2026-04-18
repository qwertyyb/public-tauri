# WebDriver E2E 测试

应用通过 **`tauri-plugin-webdriver`** 在本地暴露 **W3C WebDriver**（默认 `http://127.0.0.1:4445`）。`scripts/` 下的脚本使用 **Selenium 4**（`selenium-webdriver`）连接该端点，在 **Vite 开发页**（默认 `http://localhost:1420/`）里驱动 **WKWebView** 做自动化。

## 前置条件

1. 使用带 WebDriver 的开发构建启动应用（与 `package.json` 中一致）：

   ```bash
   pnpm tauri:dev
   ```

   即 `tauri dev --features webdriver`。未启用时，脚本会一直停在「等待 WebDriver」。

2. 终端需能访问 `http://127.0.0.1:4445/status`（脚本会轮询直至就绪，默认最长约 **180 秒**，间隔约 **1.5 秒**）。

**就绪条件（两脚本不一致）**：`webdriver-smoke.ts` 在 `/status` 返回 200 后还会解析 JSON，仅当 **`value.ready !== false`** 才继续；`webdriver-search-plugin.ts` 只要求 **`/status` HTTP 成功**，不读 `ready` 字段。

## 脚本与命令

| 脚本 | npm 命令 | 作用 |
|------|-----------|------|
| `scripts/webdriver-smoke.ts` | `pnpm test:webdriver` | 冒烟：打开页面、等待 `#main-input`、输入一段中文、打印标题与 URL |
| `scripts/webdriver-search-plugin.ts` | `pnpm test:webdriver:search` | E2E：构建 `@public-tauri-ext/search`，通过开发环境钩子注册本地插件目录，依次跑 Google / 必应 / 百度三条用例（触发词 `g` / `b` / `bd`），断言结果行后模拟回车 |

**典型用法**：一个终端跑 `pnpm tauri:dev`，另一个终端再执行 `pnpm test:webdriver` 或 `pnpm test:webdriver:search`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TAURI_WEBDRIVER_URL` | `http://127.0.0.1:4445` | WebDriver 基址（与 `src-tauri` 中插件说明一致） |
| `TAURI_DEV_URL` | `http://localhost:1420/` | 浏览器打开的页面 URL，应与 `src-tauri/tauri.conf.json` 中 **`build.devUrl`** 一致（末尾是否带 `/` 通常皆可） |
| `E2E_SEARCH_PLUGIN_PATH` | （未设置则为仓库内 `store/plugins/search`） | Search 插件 E2E 时传给 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__` 的目录 |

## Search 插件 E2E 流程（与 `webdriver-search-plugin.ts` 一致）

1. **先**执行 `pnpm --filter @public-tauri-ext/search run build`（`ensureSearchPluginBuilt`，在连接 WebDriver 之前）。
2. 轮询 `/status` 直至 WebDriver 可用（见上文：仅 HTTP 成功即可）。
3. `Builder` 连接 → `driver.get(TAURI_DEV_URL)`。
4. 轮询 `window.__PUBLIC_APP_PLUGINS_READY__ === true`（`waitForPluginsReady`，最长约 **120 秒**，间隔 200 ms）。
5. 在约 **60 秒**内轮询，直到 `typeof window.__PUBLIC_DEV_REGISTER_PLUGIN_PATH__ === 'function'`。
6. 调用该钩子注册 `E2E_SEARCH_PLUGIN_PATH` 指向的目录；若已加载，控制台会出现「Plugin already registered」并继续；随后 **sleep(600 ms)**。
7. 每个用例：`#main-input` 填入 `触发词 + 空格 + 唯一查询串` → 读 DOM 断言 `input.value` → **sleep(800 ms)** → XPath 等待包含 `resultLabel` 的 `result-item` → 校验行内 `innerText` 含标签与查询串 → **`pressEnterViaActions`** → sleep(500 ms) 后计为通过（**不**断言系统浏览器是否已打开）。

失败时进程以非零退出；无论成败都会在 `finally` 里写报告并 `driver.quit()`。

运行结束后会在仓库根目录生成 **`reports/search-plugin-e2e-report.md`**（本地报告；仓库 `.gitignore` 已忽略 `reports/`）。

## 主输入框、Vue v-model 与按键

在 Tauri + WKWebView 下自动化 `#main-input` 时，若列表不出现、界面仍像占位状态，常见原因是 **`keyword` 未随你期望更新**，需先保证 **插件已就绪** 再操作输入框。

### 等待插件就绪

应用会在 `init()` 结束后设置 `window.__PUBLIC_APP_PLUGINS_READY__ === true`，并派发 `public-app:plugins-ready`。Search E2E 脚本会轮询该标志；前端也可使用 `import { whenPluginsReady } from '@/plugin/manager'`。

### 填入文本（`setMainInputValue`）

当前 Search 脚本使用 **`element.clear()` + `element.sendKeys(text)`**，并用 **`document.querySelector('#main-input')?.value`** 与预期字符串对比。

在部分环境下，`sendKeys` 可能出现 **最后一个字符异常**（IME / 合成与注入时机）。若遇此类问题，可改为在页面内使用 **`HTMLInputElement` 原型上的原生 `value` setter**，并派发 **`InputEvent('input', …)`**，使行为贴近真实输入与 Vue 3 `v-model`；**不要**仅设 `el.value` 再随便 `dispatchEvent(new Event('input'))`，否则可能出现 DOM 有字但响应式未同步。

### 回车（`pressEnterViaActions`）

对**输入框**调用 **`sendKeys(Key.ENTER)`** 会走 WebDriver 的 **`sendKeysToElement`**，在 **WebKit** 下容易在 **`#main-input` 末尾多出乱码**。Search 脚本改为使用 **Selenium W3C Actions**：

`driver.actions().keyDown(Key.ENTER).keyUp(Key.ENTER).perform()`（即 `performActions`），避免经 `sendKeysToElement` 注入 Enter。

应用内结果列表的回车逻辑监听在 **`document` 的 `keydown`** 上；上述 Actions 路径与真实键盘更接近。

### 其他经验

- **先出现 `#main-input` 再执行 `executeScript`**：过早读 `window` 在部分阶段可能抛 `JavascriptError`。
- **`Element.clear()`**：部分驱动/元素上会失败；若首屏为空可直接 `sendKeys`，或视情况用全选+退格。
- **开发插件手动加载**：见 [开发插件](../docs/dev-plugins.md)。E2E 则通过 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__` 注册目录，无需手动点选文件夹。

## 冒烟脚本（`webdriver-smoke.ts`）

- 使用 `Builder().usingServer(TAURI_WEBDRIVER_URL).forBrowser(Browser.CHROME)`（与 Tauri WebDriver 约定一致）。
- 就绪检测见上文：**`/status` 成功且 `value.ready !== false`** 才继续。
- `driver.get(APP_URL)` 后 **sleep(800 ms)**，再等待 **`body`**（最长 30 秒），随后操作 `#main-input`（`clear` + 一段中文 `sendKeys`），打印标题与当前 URL；**不**校验 `input.value`。
- 连接页面为 **Vite 开发 URL**，不是打包后的 `tauri://localhost`。
