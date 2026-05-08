# @public-tauri/raycast-convert

将 Raycast 插件转换为 Public Tauri 插件。

转换器支持 Raycast `no-view` 与 **view（MVP）** 命令：`no-view` 走 Node Worker + 浏览器 `public-main`；`view` 在 Worker 内用 React reconciler 执行组件，通过 snapshot 协议由 wujie 加载 **`@public-tauri/template`** 中的 **`raycast.html`** 入口（Vue 渲染；构建产物拷贝到插件 **`dist/view/`**）。

仓库根目录提供了以下脚本：

```bash
pnpm raycast:convert <raycast-plugin-dir> --out <public-plugin-dir> [--build]
pnpm raycast:convert:production <raycast-plugin-dir> --out <public-plugin-dir> [--build]
```

该包也提供 CLI：

```bash
raycast-convert <raycast-plugin-dir> --out <public-plugin-dir> [--build] [--mode development|production]
```

## 关键步骤（转换逻辑）

转换器按固定顺序处理，核心步骤如下：

1. **准备输出目录**  
   删除目标 `outDir`（若存在），保证输出是一次干净的生成结果。

2. **复制 Raycast 源码树**  
   将输入插件目录下的文件与子目录**递归复制**到 `outDir`。  
   **不复制** `package.json`（由下一步生成）。  
   为便于在 `outDir` 内重新解析依赖，同时**跳过** `node_modules` 以及常见 lockfile（`pnpm-lock.yaml`、`package-lock.json`、`yarn.lock`）。  
   其它文件（含 `src/`、`assets/`、`tsconfig.json` 等）原样保留。

3. **生成 Public 插件清单与打包入口**  
   - 写入 **`package.json`**：`publicPlugin` manifest、`@public-tauri/api` 依赖、合并后的 `dependencies` / `devDependencies`（仅移除 **`@raycast/api`**；**`@raycast/utils`** 若存在则保留原声明）、以及 `build` 脚本等。  
   - 存在 **no-view** 命令时写入 **`.raycast-build/public-main.ts`**（浏览器侧 `raycast:run` 桥接）。  
   - 写入 **`.raycast-build/server.ts`**（Node / Worker 侧入口：`raycast:run` 与 `raycast:view:*`）。  
   - 存在 **view** 命令时写入 `.raycast-build/raycast-view-protocol.ts`、Worker 侧 **`raycast-worker-runtime.ts`**（及宿主序列化等）。**`development`**（CLI 默认）：`publicPlugin.html` 为 **`http://localhost:5173/raycast.html`**，指向本仓库 **`@public-tauri/template`** 的 Vite 开发服务器，**不**拷贝 `dist/view`，便于先执行 `pnpm --filter @public-tauri/template dev` 再打开 `/raycast.html` 调试 view。**`production`**（或 `pnpm raycast:convert:production`）：将 **`packages/template` 的 `dist/`** 复制到插件 **`dist/view/`**，`publicPlugin.html` 为 **`./dist/view/raycast.html`**。浏览器逻辑（wujie、`channel`、Markdown）均在模板应用 bundle 内；插件侧 **tsdown 只打 `server.js`**（及可选 **`public-main.js`**）。依赖侧为 Worker 补充 **`react`** / **`react-reconciler`**。  
   - 写入 **`tsdown.config.ts`**：no-view 时的 browser 入口 + **node（server）入口**，产出写入 **`dist/`**（与 **`dist/view/`** 并列）。  
   - 写入 **`raycast-conversion-report.json`**：已转换命令、跳过命令与 warnings。

4. **安装依赖并打包（可选）**  
   若传入 `--build`，在 **`outDir`** 内依次执行：  
   `pnpm install` → `pnpm exec tsdown --config tsdown.config.ts` → **再次将 `packages/template` 的构建产物拷入 `dist/view/`**（tsdown 会清空 `dist/`）。

原始 Raycast 插件目录不会被修改；依赖安装与构建仅在生成的 `outDir` 中进行。

## 功能

转换器读取一个 Raycast 插件目录，并生成一个 Public Tauri 插件目录。

转换后 `package.json` 的 `name` 固定为 `@public-tauri-raycast/<slug>`（由 Raycast 包名或输入目录名推导），与 Public 应用商店中已发布的包名空间区分。`raycast-conversion-report.json` 中记录 `sourcePackageName`（源 `package.json` 的 `name`，可能缺失）与 `convertedPackageName`。

生成的插件包含：

- `package.json`，包含 `publicPlugin` manifest（含 `server`；有 no-view 时有 `main`；有 view 时有 `html` 指向 **`dist/view/raycast.html`**）。
- `.raycast-build/server.ts`，Node / Worker 命令与 view session 入口。
- 有 no-view 命令时：`.raycast-build/public-main.ts`。
- 有 view 命令时：**`dist/view/`**（完整 Vite 子应用）及 `.raycast-build` 内 Worker runtime / protocol 等源码。
- `tsdown.config.ts`，用于打包转换后的插件。
- `raycast-conversion-report.json`，记录已转换命令、跳过命令和 warnings。
- 自 Raycast 插件目录复制的其余源码与资源（不含上述跳过项）。

如果传入 `--build`，转换器会在生成的 Public Tauri 插件目录中安装依赖，并执行 `tsdown` 构建。

## 模式

### development

默认模式。

用于在当前 monorepo 内开发和调试。生成的 `package.json` 会让 `@public-tauri/api` 指向本地开发代码：

```json
{
  "dependencies": {
    "@public-tauri/api": "file:/path/to/public-tauri/packages/api"
  }
}
```

### production

用于生产环境或打包应用内转换。生成的插件依赖已发布的 API 包：

```json
{
  "dependencies": {
    "@public-tauri/api": "latest"
  }
}
```

## Raycast API 映射

- **Node（server）入口**（no-view 与 view 相同）：将 **`@raycast/api`** 解析到已安装的 **`@public-tauri/api/src/raycast.ts`**（与包导出 **`@public-tauri/api/raycast`** 同源）。**`@raycast/utils`** 不配置别名，仍使用 `package.json` 中的 npm 包。**浏览器（public-main）入口** 不使用 `@raycast/api` 别名。  
- **含 view 命令**：**`server.ts`** 会引入 **`.raycast-build/raycast-worker-runtime.ts`**，其中提供 **`createRaycastViewSession`** / **`__setRaycastViewContext`**：在 Worker 内挂 **React reconciler**，把业务组件树打成 snapshot，经 `channel` 交给 wujie 里 **`@public-tauri/template`** 的 **`raycast.html`**（`dist/view/raycast.html`）用 Vue 渲染。业务代码仍只从 **`@raycast/api`** 导入 `List`、`Detail`、`Action` 等与 API，与 no-view 一致。

原 Raycast 插件中除 **`@raycast/api`**（由 `@public-tauri/api` + 上述别名替代）外的其它依赖会保留在生成的 `package.json` 中。

## 当前支持范围

转换器支持：

- Raycast `mode: "no-view"`：转换为 Public Tauri 命令 `mode: "none"`，由 Node Worker 执行默认导出函数。
- Raycast `mode: "view"`（未写 `mode` 时 Raycast 默认为 view）：转换为 Public Tauri `mode: "view"`，React 组件在 Worker 内执行，snapshot 由 wujie 加载的 **`packages/template`**（`raycast.html`）子应用以 Vue 渲染。

**MVP 已支持：**

- `List`、`List.Item`、`Detail`、`ActionPanel`、`Action`
- Raycast command `arguments`（`text` / `password` / `dropdown`）参数表单前置并透传至 `LaunchProps.arguments`
- `Detail.markdown` 在浏览器侧由 **`packages/template`** 产物内的 `markdown-it` 渲染为 HTML（禁用 raw HTML）
- React 函数组件、`useState`、`useEffect`
- Worker 侧 action 回调与 snapshot 更新
- `CopyToClipboard`、`Paste`、`OpenInBrowser`、`ShowInFinder`、`Action.Pop`（`Action.Push` 会抛出明确错误）

**暂不支持：**

- `Grid`、`Form`、`MenuBarExtra`
- OAuth / BrowserExtension
- 依赖完整 Raycast runtime 的复杂 `@raycast/utils` hooks

其它 command mode（如 `menuBar`）会被跳过并记入 `raycast-conversion-report.json`。

## 限制

- 命令入口文件需符合常见 Raycast 布局，例如 `src/<command>.ts`、`src/<command>.tsx` 或 `src/<command>/index.ts`。
- Worker 侧兼容能力仍受 `@public-tauri/api/raycast` 与上述 MVP 组件集合约束。
