# 应用开发（本仓库）

本文档说明如何在本仓库中 **运行与调试 Public Tauri 桌面应用**，以及如何用 **WebDriver** 对前端做自动化操作。

> **与插件文档的区别**：若你要编写或发布 **用户插件**（`publicPlugin`、`definePlugin`、商店包等），请参阅 [插件开发文档索引](../docs/plugin-index.md) 与 [本地开发插件加载](../docs/dev-plugins.md)。本文不替代插件清单、命令匹配或 `@public-tauri/api` 的说明。

## 环境要求

- **Node.js** ≥ 20，包管理器 **pnpm**
- **Rust** 与 **Tauri 2** 开发依赖（参见根目录 `README.md` 中的编辑器与工具链建议）

## 启动开发构建

```bash
pnpm install
pnpm tauri:dev
```

**`pnpm tauri:dev` 的行为**：该命令会 **持续占用当前终端**（同时跑 Vite 与 Tauri 开发进程），在开发过程中 **一直保持运行**，直到你在该终端中 **手动结束**（例如 <kbd>Ctrl</kbd>+<kbd>C</kbd>）。**结束该命令时，开发版桌面应用会随之退出**，WebDriver 与 Vite 也会随之停止。

`tauri:dev` 在根目录 `package.json` 中等价于 **`tauri dev --features webdriver`**。开发模式下会启用 **tauri-plugin-webdriver**，便于本地自动化连接 W3C WebDriver（默认 `http://127.0.0.1:4445`）。

前端由 Vite 提供；开发页 URL 需与 `src-tauri/tauri.conf.json` 中的 **`build.devUrl`** 一致（通常为 `http://localhost:1420/`，可通过环境变量覆盖，见下文）。

## 使用 WebDriver 模拟前端操作

端到端（WebDriver）脚本位于仓库根目录 **`e2e/`**，使用 **Selenium 4**（`selenium-webdriver`）连接本机 WebDriver，在 **Vite 开发页** 中驱动 **WKWebView**。

### 前置

1. **先**在一个终端启动应用：`pnpm tauri:dev`（需 WebDriver feature，否则脚本会长时间停在「等待 WebDriver」）。
2. 在**另一终端**执行下方 npm 脚本；确保能访问 `http://127.0.0.1:4445/status`（脚本会轮询直至就绪）。

### 脚本与命令对照

| 目的 | 命令 | 实现文件 |
|------|------|----------|
| 冒烟：打开页面、等待 `#main-input`、输入一段文案、打印标题与 URL | `pnpm test:webdriver` | [`e2e/webdriver-smoke.ts`](../e2e/webdriver-smoke.ts) |
| E2E（依赖 Search 插件构建与开发环境注册钩子）：Google / 必应 / 百度 三条检索用例 | `pnpm test:webdriver:search` | [`e2e/webdriver-search-plugin.ts`](../e2e/webdriver-search-plugin.ts) |
| E2E：Shell 插件（`>` 触发等） | `pnpm test:webdriver:shell` | [`e2e/webdriver-shell-plugin.ts`](../e2e/webdriver-shell-plugin.ts) |
| E2E：Google Chrome 插件（打开系统 Chrome 并带查询串） | `pnpm test:webdriver:google-chrome` | [`e2e/webdriver-google-chrome-plugin.ts`](../e2e/webdriver-google-chrome-plugin.ts) |
| E2E：内置 snippets（create / search、wujie + Shadow DOM） | `pnpm test:webdriver:snippets` | [`e2e/webdriver-snippets-plugin.ts`](../e2e/webdriver-snippets-plugin.ts) |

实现要点简述：

- **冒烟**（`webdriver-smoke.ts`）：轮询 WebDriver `/status`，解析 JSON，仅当 **`value.ready !== false`** 时继续；`driver.get(TAURI_DEV_URL)` 后对 `#main-input` 执行 `clear` + `sendKeys`。
- **Search 插件 E2E**（`webdriver-search-plugin.ts`）：先构建 `@public-tauri-ext/search`；轮询 `/status`（仅要求 HTTP 成功）；等待 `window.__PUBLIC_APP_PLUGINS_READY__` 与 `__PUBLIC_DEV_REGISTER_PLUGIN_PATH__`；通过开发钩子注册本地插件目录后再跑用例。该脚本面向 **插件行为的回归**，属于「带插件场景的 E2E」，与纯应用冒烟不同；插件作者能力说明仍以 [插件文档](../docs/plugin-index.md) 为准。

### 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `TAURI_WEBDRIVER_URL` | `http://127.0.0.1:4445` | WebDriver 服务基址 |
| `TAURI_DEV_URL` | `http://localhost:1420/` | 应对齐 `build.devUrl` |
| `E2E_SEARCH_PLUGIN_PATH` | 仓库内 `store/plugins/search` | 仅 **Search 插件 E2E** 使用 |
| `E2E_SHELL_PLUGIN_PATH` | 仓库内 `store/plugins/shell` | 仅 **Shell 插件 E2E** 使用 |
| `E2E_GOOGLE_CHROME_PLUGIN_PATH` | 仓库内 `store/plugins/google-chrome` | 仅 **Google Chrome 插件 E2E** 使用 |
| `E2E_SKIP_PLUGIN_BUILD` | 未设置 | 设为 `1` 时跳过部分 E2E 中的预先 `pnpm build`（若 dist 已就绪） |

### 更细的说明

输入框、`sendKeys`、回车键在 WebKit 下的注意事项、报告路径等，见 **[WebDriver E2E 测试](./webdriver-e2e-input.md)**（该文档偏 **运行与排障**，与插件 `manifest` 教程互补，不重复插件 API 章节）。

## 其他常用脚本（应用侧）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 仅启动 Vite（不启动 Tauri；一般完整调试用 `pnpm tauri:dev`） |
| `pnpm app:build` | 构建桌面应用（具体步骤见根目录 `package.json` 与构建相关文档） |

## 文档地图

| 文档 | 内容 |
|------|------|
| 本文 | 本仓库应用运行、WebDriver 冒烟与 E2E 入口 |
| [开发日志](../docs/dev-log.md) | 壳应用疑难记录（如 ActionPanel 与 WKWebView 合成闪现等） |
| [插件开发文档索引](../docs/plugin-index.md) | 插件清单、命令、模式、API、构建与发布 |
| [WebDriver E2E 测试](./webdriver-e2e-input.md) | WebDriver 环境变量、脚本行为细节与输入注意事项 |
| [本地开发插件](../docs/dev-plugins.md) | 在应用内加载本地插件目录（与 E2E 注册钩子相关，但是 **插件使用/开发** 视角） |
