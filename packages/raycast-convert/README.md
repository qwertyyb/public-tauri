# @public-tauri/raycast-convert

将 Raycast 插件转换为 Public Tauri 插件。

当前阶段暂时只支持 Raycast `no-view` 命令；Raycast view 插件的适配正在进行中。

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
   - 写入 **`package.json`**：`publicPlugin` manifest、`@public-tauri/api` 依赖、合并后的 `dependencies` / `devDependencies`（移除 `@raycast/api`、`@raycast/utils`）、以及 `build` 脚本等。  
   - 写入 **`.raycast-build/public-main.ts`**（浏览器侧桥接）与 **`.raycast-build/server.ts`**（Node 侧命令入口）。  
   - 写入 **`tsdown.config.ts`**：双入口（browser / node）打包到 `dist/`。  
   - 写入 **`raycast-conversion-report.json`**：已转换命令、跳过命令与 warnings。

4. **安装依赖并打包（可选）**  
   若传入 `--build`，在 **`outDir`** 内依次执行：  
   `pnpm install` → `pnpm exec tsdown --config tsdown.config.ts`。

原始 Raycast 插件目录不会被修改；依赖安装与构建仅在生成的 `outDir` 中进行。

## 功能

转换器读取一个 Raycast 插件目录，并生成一个 Public Tauri 插件目录。

转换后 `package.json` 的 `name` 固定为 `@public-tauri-raycast/<slug>`（由 Raycast 包名或输入目录名推导），与 Public 应用商店中已发布的包名空间区分。`raycast-conversion-report.json` 中记录 `sourcePackageName`（源 `package.json` 的 `name`，可能缺失）与 `convertedPackageName`。

生成的插件包含：

- `package.json`，包含 `publicPlugin` manifest。
- `.raycast-build/public-main.ts`，浏览器侧桥接入口。
- `.raycast-build/server.ts`，Node 侧命令运行入口。
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

生成的 `tsdown.config.ts` 在 **Node（server）入口** 上将 `@raycast/api` 与 `@raycast/utils` 解析到已安装的 `@public-tauri/api` 包内对应源码路径（见生成文件中的 `alias`）。**浏览器（public-main）入口** 不配置这两项别名。

原 Raycast 插件中除 `@raycast/api` / `@raycast/utils` 外的其它依赖会保留在生成的 `package.json` 中。

## 当前支持范围

目前暂时只转换以下类型的 Raycast 命令：

```json
{
  "mode": "no-view"
}
```

其它 command mode 会被跳过，并写入 `raycast-conversion-report.json`。这不是该包的长期边界，Raycast view 插件的适配正在进行中。

## 限制

- 暂时不转换 Raycast React UI 命令。
- 命令入口文件需要符合常见 Raycast 布局，例如 `src/<command>.ts`、`src/<command>.tsx` 或 `src/<command>/index.ts`。
- 运行时能力取决于 `@public-tauri/api/raycast` 提供的兼容层。
