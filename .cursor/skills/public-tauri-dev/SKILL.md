---
name: public-tauri-dev
description: >-
  Runs and tests the public-tauri desktop app (pnpm tauri:dev, Vite, tauri-plugin-webdriver).
  Use when starting local development, authoring or running Selenium WebDriver scripts against
  the dev UI, WebDriver smoke or plugin E2E, CI-style frontend checks, or when the user asks
  how to run or test this repository. Does not cover plugin authoring; for plugins see
  docs/README.md and docs/dev-plugins.md.
---

# public-tauri：运行与测试（应用仓库）

基于仓库内 **[docs/development.md](../../../docs/development.md)**。**插件开发**（`publicPlugin`、`definePlugin`、商店包）见 **[docs/README.md](../../../docs/README.md)**，勿与本 skill 混用。

## 运行开发环境

**前置**：Node.js ≥ 20、pnpm、Rust/Tauri 2 工具链（见根目录 `README.md`）。

**标准入口**（根目录）：

```bash
pnpm install
pnpm tauri:dev
```

- `tauri:dev` 等价于 `tauri dev --features webdriver`（见 `package.json`），会启用 **tauri-plugin-webdriver**（默认 `http://127.0.0.1:4445`）。
- 该进程 **长期占用终端**（Vite + 桌面应用），**按 Ctrl+C 结束命令时，开发版应用、WebDriver、Vite 会一并停止**。
- 开发页 URL 须与 `src-tauri/tauri.conf.json` 的 **`build.devUrl`** 一致（通常 `http://localhost:1420/`）。

**仅前端、不跑 Tauri**：`pnpm dev`（一般完整调试仍用 `pnpm tauri:dev`）。

## 自动化测试（WebDriver）

使用 **Selenium 4**（`selenium-webdriver`）连本机 W3C WebDriver，在 **Vite 开发页** 驱动 **WKWebView**。细则与排障见 **[docs/webdriver-e2e-input.md](../../../docs/webdriver-e2e-input.md)**。

### 必须的两步

1. **终端 A**：`pnpm tauri:dev`（保持运行；无 webdriver feature 时脚本会一直等 WebDriver）。
2. **终端 B**：执行下表命令；可先 `curl -sSf http://127.0.0.1:4445/status` 确认服务存在（脚本内也会轮询）。

### 命令与脚本

| 场景 | 命令 | 脚本 |
|------|------|------|
| 应用冒烟：打开页、`#main-input` 输入 | `pnpm test:webdriver` | `scripts/webdriver-smoke.ts` |
| Search 插件 E2E（构建插件 + DEV 注册钩子 + 三条检索） | `pnpm test:webdriver:search` | `scripts/webdriver-search-plugin.ts` |
| Shell 插件 E2E（`>` 触发等） | `pnpm test:webdriver:shell` | `scripts/webdriver-shell-plugin.ts` |

**区别简述**：

- **Smoke**：`/status` 中 **`value.ready !== false`** 才继续；对 `#main-input` 做 `clear` + `sendKeys`。
- **Search E2E**：先构建 `@public-tauri-ext/search`；等 `__PUBLIC_APP_PLUGINS_READY__` 与 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__`；注册本地插件目录后跑用例；报告默认 `reports/search-plugin-e2e-report.md`。属 **带插件的 E2E**，不是纯应用能力说明。
- **Shell E2E**：构建并注册 `@public-tauri-ext/shell` 目录后跑用例；报告默认 `reports/shell-plugin-e2e-report.md`。

### 新建 WebDriver 脚本（驱动前端页面）

新增自动化时，在 **`scripts/`** 下添加 **`*.ts`**，用 **Selenium 4**（`selenium-webdriver`）连接本机 **`tauri-plugin-webdriver`**（W3C，默认 `http://127.0.0.1:4445`），通过 **`driver.get(TAURI_DEV_URL)`** 打开与 `tauri dev` 一致的 **Vite 开发页**，在 **WKWebView** 里对页面做等待元素、输入、点击、断言等操作。

**建议结构（与现有脚本对齐）**：

1. **等待 WebDriver 就绪**：轮询 `GET {TAURI_WEBDRIVER_URL}/status` 至 HTTP 成功；若需与冒烟一致，再解析 JSON，仅当 **`value.ready !== false`** 时继续（可复制 `scripts/webdriver-smoke.ts` 中的 `waitForWebDriverReady`）。
2. **创建会话**：`new Builder().usingServer(WD_URL).forBrowser(Browser.CHROME).build()`。
3. **打开应用页**：`await driver.get(APP_URL)`，`APP_URL` 取自 **`TAURI_DEV_URL`**（默认 `http://localhost:1420/`），须与 **`src-tauri/tauri.conf.json`** 的 **`build.devUrl`** 一致。
4. **操作 DOM**：使用 `By` / `until.elementLocated`、`findElement`、`sendKeys`、`executeScript` 等；涉及插件加载时，可参考 **`webdriver-search-plugin.ts`** / **`webdriver-shell-plugin.ts`**（等待 `__PUBLIC_APP_PLUGINS_READY__`、`__PUBLIC_DEV_REGISTER_PLUGIN_PATH__` 等）。
5. **退出**：`try { … } finally { await driver.quit(); }`，失败路径 **`process.exit(1)`**。

**接入 npm**：在根目录 **`package.json`** 的 **`scripts`** 中增加一项，例如 `"test:webdriver:foo": "tsx scripts/webdriver-foo.ts"`，与现有 **`test:webdriver*`** 命名一致；用 **`pnpm exec tsx`** 或 **`pnpm test:webdriver:foo`** 运行。

**输入框、Vue `v-model`、回车与 WebKit 注意点**：见 **[docs/webdriver-e2e-input.md](../../../docs/webdriver-e2e-input.md)**。

### 环境变量

| 变量 | 默认 |
|------|------|
| `TAURI_WEBDRIVER_URL` | `http://127.0.0.1:4445` |
| `TAURI_DEV_URL` | `http://localhost:1420/`（对齐 `build.devUrl`） |
| `E2E_SEARCH_PLUGIN_PATH` | 仓库 `store/plugins/search`（仅 Search E2E） |
| `E2E_SHELL_PLUGIN_PATH` | 仓库 `store/plugins/shell`（仅 Shell E2E） |

## Agent 执行建议

- **`pnpm tauri:dev`（Agent）**：**必须在后台运行**（阻塞式前景会话会一直占用 shell，无法在同一工作流里再执行测试命令）。使用 IDE/Agent 提供的 **后台任务**、或等价「非阻塞启动」方式；待 `http://127.0.0.1:4445/status`（及需要时 `1420`）可用后，再在**另一命令**中执行 `pnpm test:webdriver` / `pnpm test:webdriver:search` / `pnpm test:webdriver:shell`（或你新增的 `test:webdriver:*`）。
- **需要验证前端自动化**：顺序为 **后台 `pnpm tauri:dev` → 再跑测试脚本**；超时或连不上时查 4445/1420 是否监听、是否启用了带 `webdriver` 的 dev 命令。
- **停止应用**：人工在前景终端跑 `tauri:dev` 时用 **Ctrl+C**。Agent 用后台任务启动时，通过 **结束该后台任务** 或对 `public-tauri` / `tauri` dev 父进程发 **SIGTERM**（避免误杀无关 Node 进程）。
- **插件 API、manifest、商店**：读 **docs/README.md**，不要用本 skill 代替插件文档。

## 延伸阅读（一层）

- [docs/development.md](../../../docs/development.md) — 应用开发总览
- [docs/webdriver-e2e-input.md](../../../docs/webdriver-e2e-input.md) — WebDriver 细节与输入注意事项
