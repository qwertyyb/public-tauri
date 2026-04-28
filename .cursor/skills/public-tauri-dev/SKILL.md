---
name: public-tauri-dev
description: >-
  Runs and tests the public-tauri desktop app (pnpm tauri:dev, Vite, tauri-plugin-webdriver).
  Use when starting local development, authoring or running Selenium WebDriver scripts against
  the dev UI (including wujie view plugins via wujie-app shadowRoot), WebDriver smoke or plugin
  E2E, CI-style frontend checks, or when the user asks how to run or test this repository.
  Does not cover plugin authoring; for plugins see docs/plugin-index.md and docs/dev-plugins.md.
---

# public-tauri：运行与测试（应用仓库）

基于仓库内 **[docs-app/development.md](../../../docs-app/development.md)**。**插件开发**（`publicPlugin`、`definePlugin`、商店包）见 **[docs/plugin-index.md](../../../docs/plugin-index.md)**，勿与本 skill 混用。

## 运行开发环境

**前置**：Node.js ≥ 20、pnpm、Rust/Tauri 2 工具链（见根目录 `README.md`）。

**标准入口**（根目录）：

```bash
pnpm install
pnpm tauri:dev
```

- **Agent 启动开发时**（Cursor 等环境可能注入 `CARGO_TARGET_DIR` 指向沙箱缓存）：须在仓库根目录执行 **`unset CARGO_TARGET_DIR && pnpm tauri:dev`**，使 Cargo 使用默认 **`src-tauri/target/debug/`**，避免日志中出现 `cursor-sandbox-cache/.../cargo-target` 下的二进制路径。人工在本机终端开发可直接 `pnpm tauri:dev`。
- `tauri:dev` 等价于 `tauri dev`（见 `package.json`），debug 构建默认启用 **tauri-plugin-webdriver**（默认 `http://127.0.0.1:4445`）。
- 该进程 **长期占用终端**（Vite + 桌面应用），**按 Ctrl+C 结束命令时，开发版应用、WebDriver、Vite 会一并停止**。
- 开发页 URL 须与 `src-tauri/tauri.conf.json` 的 **`build.devUrl`** 一致（通常 `http://localhost:1420/`）。

**仅前端、不跑 Tauri**：`pnpm dev`（一般完整调试仍用 `pnpm tauri:dev`）。

## 自动化测试（WebDriver）

使用 **Selenium 4**（`selenium-webdriver`）连本机 W3C WebDriver，在 **Vite 开发页** 驱动 **WKWebView**。细则与排障见 **[docs-app/webdriver-e2e-input.md](../../../docs-app/webdriver-e2e-input.md)**。

### 必须的两步

1. **终端 A**：`pnpm tauri:dev`（保持运行；**Agent** 用 **`unset CARGO_TARGET_DIR && pnpm tauri:dev`**；debug 构建默认启用 WebDriver）。
2. **终端 B**：执行下表命令；可先 `curl -sSf http://127.0.0.1:4445/status` 确认服务存在（脚本内也会轮询）。

### 命令与脚本

| 场景 | 命令 | 脚本 |
|------|------|------|
| 应用冒烟：打开页、`#main-input` 输入 | `pnpm test:webdriver` | `e2e/webdriver-smoke.ts` |
| Search 插件 E2E（构建插件 + DEV 注册钩子 + 三条检索） | `pnpm test:webdriver:search` | `e2e/webdriver-search-plugin.ts` |
| Shell 插件 E2E（`>` 触发等） | `pnpm test:webdriver:shell` | `e2e/webdriver-shell-plugin.ts` |
| Google Chrome 插件 E2E（系统 Chrome + 查询串） | `pnpm test:webdriver:google-chrome` | `e2e/webdriver-google-chrome-plugin.ts` |
| 内置 snippets（create / search、`wujie-app` + Shadow DOM） | `pnpm test:webdriver:snippets` | `e2e/webdriver-snippets-plugin.ts` |

**区别简述**：

- **Smoke**：`/status` 中 **`value.ready !== false`** 才继续；对 `#main-input` 做 `clear` + `sendKeys`。
- **Search E2E**：先构建 `@public-tauri-ext/search`；等 `__PUBLIC_APP_PLUGINS_READY__` 与 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__`；注册本地插件目录后跑用例；报告默认 `reports/search-plugin-e2e-report.md`。属 **带插件的 E2E**，不是纯应用能力说明。
- **Shell E2E**：构建并注册 `@public-tauri-ext/shell` 目录后跑用例；报告默认 `reports/shell-plugin-e2e-report.md`。
- **Snippets E2E**：内置插件、无额外注册；覆盖 **首页进入 view 命令**、**宿主壳与 wujie 子应用 Shadow DOM** 的写法（见下节与 `webdriver-snippets-plugin.ts`）。

### 新建 WebDriver 脚本（驱动前端页面）

新增自动化时，在 **`e2e/`** 下添加 **`*.ts`**，用 **Selenium 4**（`selenium-webdriver`）连接本机 **`tauri-plugin-webdriver`**（W3C，默认 `http://127.0.0.1:4445`），通过 **`driver.get(TAURI_DEV_URL)`** 打开与 `tauri dev` 一致的 **Vite 开发页**，在 **WKWebView** 里对页面做等待元素、输入、点击、断言等操作。

**建议结构（与现有脚本对齐）**：

1. **等待 WebDriver 就绪**：轮询 `GET {TAURI_WEBDRIVER_URL}/status` 至 HTTP 成功；若需与冒烟一致，再解析 JSON，仅当 **`value.ready !== false`** 时继续（可复制 `e2e/webdriver-smoke.ts` 中的 `waitForWebDriverReady`）。
2. **创建会话**：`new Builder().usingServer(WD_URL).forBrowser(Browser.CHROME).build()`。
3. **打开应用页**：`await driver.get(APP_URL)`，`APP_URL` 取自 **`TAURI_DEV_URL`**（默认 `http://localhost:1420/`），须与 **`src-tauri/tauri.conf.json`** 的 **`build.devUrl`** 一致。
4. **操作 DOM**：使用 `By` / `until.elementLocated`、`findElement`、`sendKeys`、`executeScript` 等；涉及插件加载时，可参考 **`webdriver-search-plugin.ts`** / **`webdriver-shell-plugin.ts`**（等待 `__PUBLIC_APP_PLUGINS_READY__`、`__PUBLIC_DEV_REGISTER_PLUGIN_PATH__` 等）。
5. **退出**：`try { … } finally { await driver.quit(); }`，失败路径 **`process.exit(1)`**。

**接入 npm**：在根目录 **`package.json`** 的 **`scripts`** 中增加一项，例如 `"test:webdriver:foo": "tsx e2e/webdriver-foo.ts"`，与现有 **`test:webdriver*`** 命名一致；用 **`pnpm exec tsx`** 或 **`pnpm test:webdriver:foo`** 运行。

**输入框、Vue `v-model`、回车与 WebKit 注意点**：见 **[docs-app/webdriver-e2e-input.md](../../../docs-app/webdriver-e2e-input.md)**。

### WebDriver：view 模式插件、wujie 与 Shadow DOM（必读）

宿主 **`src/views/PluginWujieView.vue`** 用 **wujie** 加载插件 HTML；子应用挂在 **`<wujie-app>`** 上，真实 UI（Vue 根、表单、列表）在 **`wujie-app` 的 Shadow Root** 里，而不是普通 `document` 下的可穿透子树。自动化时 **不能用「宿主页 + iframe」思路去 `switchTo().frame(iframe)` 再找 `.el-input__inner`**——应 **定位 `wujie-app` → `getShadowRoot()` → 在 shadow 内查找**。

**参考实现**：**[e2e/webdriver-snippets-plugin.ts](../../../e2e/webdriver-snippets-plugin.ts)**（当前 snippets E2E 脚本）。

**1. 首页进入 view 命令（`mode: "view"`）**

- 匹配到命令后，底部主操作往往是 **「Open Command」**，表示尚未进入插件页；需 **点击 `.main-action`**（或等价触发 `service.enter`），再等待 **`.plugin-view`**。
- 若主操作已是插件自定义文案（例如 **「创建」**），则 **不要** 再当「Open Command」处理；脚本里可先读 `.main-action .main-action-label` 再决定是否点击（见脚本中 `enterPluginViewFromHome`）。

**2. 宿主壳（light DOM）vs 插件页（shadow）**

| 区域 | 典型选择器 / 节点 | 说明 |
|------|-------------------|------|
| 宿主 ActionBar、插件顶栏搜索框 | `.plugin-view .main-action`、` .plugin-view #main-input` | 仍在 **宿主页** light DOM；**listView 插件**里带搜索栏时，过滤关键字用这里的 `#main-input`。 |
| 插件正文（Vue 应用） | `.plugin-view .wujie-container wujie-app` → **`getShadowRoot()`** | wujie 把子应用封在 **shadow** 内；**表单、列表项、预览内容**等应在 **shadow root 上** `findElement` / `findElements`。 |

**3. 在 Shadow DOM 内操作（Selenium 4）**

- 等待 **`wujie-app`** 出现（子应用在 `startApp` 后异步就绪，需 **显式等待**，超时建议 ≥ 数十秒）。
- `const wujieApp = await driver.findElement(By.css('.plugin-view .wujie-container wujie-app'));`
- `const shadowRoot = await wujieApp.getShadowRoot();`
- 在 **`shadowRoot` 上** 使用相对选择器，例如：
  - 表单：`shadowRoot.findElements(By.css('input, textarea'))`（行内顺序与 UI 一致时再用下标）。
  - 列表项：`shadowRoot.findElement(By.css('.public-list-item'))` 等。
- **不要**在 shadow 内写 **`.plugin-view ...`**：`.plugin-view` 在宿主文档上，**不在** shadow 树内，会导致匹配失败或误等。

**4. 与 `switchTo().frame()` 的关系**

- 若仍能看到 **iframe**，通常与 wujie 内部实现有关；**可靠做法是 `wujie-app` + `getShadowRoot()`**（与当前通过测试的 snippets 脚本一致），而不是假设「一定有一个可 `switchTo` 的 iframe 且内部就是 Vue 根」。

**5. 主操作条**

- 插件通过 **`setActions` / `updateActions`** 更新的 **「创建」「粘贴」** 等仍在 **宿主** `.plugin-view` 的 ActionBar 上断言，与 shadow 内表单/列表分工明确：**壳上主操作 + shadow 内内容区**。

### 环境变量

| 变量 | 默认 |
|------|------|
| `TAURI_WEBDRIVER_URL` | `http://127.0.0.1:4445` |
| `TAURI_DEV_URL` | `http://localhost:1420/`（对齐 `build.devUrl`） |
| `E2E_SEARCH_PLUGIN_PATH` | 仓库 `store/plugins/search`（仅 Search E2E） |
| `E2E_SHELL_PLUGIN_PATH` | 仓库 `store/plugins/shell`（仅 Shell E2E） |

## Agent 执行建议

- **启动开发（Agent）**：在仓库根目录执行 **`unset CARGO_TARGET_DIR && pnpm tauri:dev`**，且 **必须在后台运行**（阻塞式前景会话会一直占用 shell，无法在同一工作流里再执行测试命令）。使用 IDE/Agent 提供的 **后台任务**、或等价「非阻塞启动」方式；待 `http://127.0.0.1:4445/status`（及需要时 `1420`）可用后，再在**另一命令**中执行 `pnpm test:webdriver` / `pnpm test:webdriver:search` / `pnpm test:webdriver:shell` / `pnpm test:webdriver:google-chrome` / `pnpm test:webdriver:snippets`（或你新增的 `test:webdriver:*`）。
- **需要验证前端自动化**：顺序为 **后台 `unset CARGO_TARGET_DIR && pnpm tauri:dev` → 再跑上列 `pnpm test:webdriver*`**；超时或连不上时查 4445/1420 是否监听。
- **停止应用**：人工在前景终端跑 `tauri:dev` 时用 **Ctrl+C**。Agent 用后台任务启动时，通过 **结束该后台任务** 或对 `public-tauri` / `tauri` dev 父进程发 **SIGTERM**（避免误杀无关 Node 进程）。
- **插件 API、manifest、商店**：读 **docs/plugin-index.md**，不要用本 skill 代替插件文档。

## 延伸阅读（一层）

- [docs-app/development.md](../../../docs-app/development.md) — 应用开发总览
- [docs-app/webdriver-e2e-input.md](../../../docs-app/webdriver-e2e-input.md) — WebDriver 细节与输入注意事项
- [e2e/webdriver-snippets-plugin.ts](../../../e2e/webdriver-snippets-plugin.ts) — view 插件 + `wujie-app` / Shadow DOM 的完整示例
