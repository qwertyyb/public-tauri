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

## 功能

转换器读取一个 Raycast 插件目录，并生成一个 Public Tauri 插件目录。

转换后 `package.json` 的 `name` 固定为 `@public-tauri-raycast/<slug>`（由 Raycast 包名或输入目录名推导），与 Public 应用商店中已发布的包名空间区分。`raycast-conversion-report.json` 中记录 `sourcePackageName`（源 `package.json` 的 `name`，可能缺失）与 `convertedPackageName`。

生成的插件包含：

- `package.json`，包含 `publicPlugin` manifest。
- `.raycast-build/public-main.ts`，浏览器侧桥接入口。
- `.raycast-build/server.ts`，Node 侧命令运行入口。
- `tsdown.config.ts`，用于打包转换后的插件。
- `raycast-conversion-report.json`，记录已转换命令、跳过命令和 warnings。
- `assets/`，当 Raycast 插件存在资源目录时会复制过来。

如果传入 `--build`，转换器会在生成的 Public Tauri 插件目录中安装依赖，并执行 `tsdown` 构建。

## 转换流程

```text
Raycast 插件源码
-> 生成 Public Tauri 插件文件
-> 写入 package.json 和 tsdown.config.ts
-> 在生成的插件目录执行 pnpm install
-> pnpm exec tsdown --config tsdown.config.ts
```

原始 Raycast 插件源码目录不会被安装依赖，也不会被修改。

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

生成的 `tsdown.config.ts` 会将 Raycast API 映射到 Public Tauri 的兼容层：

```ts
alias: {
  '@raycast/api': '@public-tauri/api/raycast',
  '@raycast/utils': '@public-tauri/api/raycast/utils',
}
```

原 Raycast 插件中的其它依赖会保留。

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
