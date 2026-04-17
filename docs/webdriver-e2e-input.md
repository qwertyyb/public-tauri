# WebDriver E2E：主输入框与 Vue v-model

在 Tauri + Vite 开发页（`http://localhost:1420/`）里，对 `#main-input` 做自动化时，若列表不出现、正文里只剩一言占位（hitokoto）或 `search...`，通常是 **Vue 的 `keyword` 没有随 DOM 更新**，而不是选择器写错。

## 成功经验（推荐顺序）

1. **等待插件就绪**  
   应用会在 `init()` 结束后设置 `window.__PUBLIC_APP_PLUGINS_READY__ === true`，并派发 `public-app:plugins-ready`。E2E 应先轮询就绪再操作输入框，而不是固定 `sleep`（除非仅作短延迟）。

2. **先点击输入框，再写入内容**  
   确保焦点在真实的 `<input>` 上。若在 `wait(#main-input)` 之后还有较长 `sleep`（等待插件注册），**sleep 后应重新 `findElement(#main-input)`**，否则 Vue 可能重建节点，旧 WebElement 的 `click()` 会抛 `JavascriptError`。

3. **`sendKeys` 与 WebKit（Tauri 面板）**  
   在 **macOS + WKWebView + Tauri WebDriver** 下，`sendKeys` 偶发 **最后一个字符乱码**（IME/合成与 WebDriver 注入时机问题）。  
   此时应使用 **`HTMLInputElement.prototype` 上的原生 `value` setter**，再派发 **`InputEvent('input', …)`**（与 `insertFromPaste` 语义接近），使 Vue 的 `v-model` 与 `watch(input)` 一致更新；并在脚本里读回 `input.value` 做断言。  
   参考：`scripts/webdriver-search-plugin.ts` 中的 `setMainInputValue`。

4. **为何曾不推荐「只设 `el.value`」**  
   若**直接**写 `el.value = '…'` 再随便 `dispatchEvent(new Event('input'))`，在部分 Vue 版本/组合下曾出现 **DOM 有字但 ref 未同步**。  
   若采用 **原生 `value` setter**（`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`）+ **`InputEvent`**，则与 Vue 3 对 `<input>` 的更新路径一致，可放心用于 E2E。

## 应用侧约定

- `import { whenPluginsReady } from '@/plugin/manager'` 可在前端逻辑中 `await whenPluginsReady`（与 `window` 标志二选一）。
- E2E（Selenium）脚本里若过早调用 `executeScript` 读 `window.__PUBLIC_APP_PLUGINS_READY__`，在部分 WebDriver/页面阶段可能抛 `JavascriptError`；更稳妥的是**先**等到 `#main-input` 出现，再**短延迟**或**在点击、输入之后**再执行脚本读 DOM。

## 其他坑

- **`Element.clear()`** 在部分 WebDriver 目标上会抛 `JavascriptError`；若首屏输入框本为空，可直接 `sendKeys`，或用 Cmd/Ctrl+A 再退格。
- **开发插件**：在应用内用内置命令「加载开发插件」选择目录即可；路径会持久化，自动化环境若需预置列表需自行处理存储（见 `docs/dev-plugins.md`）。

## 相关脚本

- `pnpm test:webdriver:search`：覆盖 `@public-tauri-ext/search` 插件的检索与回车行为。
