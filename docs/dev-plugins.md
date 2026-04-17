# 开发插件（本地目录动态加载）

无需修改配置文件或重启应用来「声明」开发插件路径。

## 内置命令：加载开发插件

与「插件商店」类似，应用内置 **`load-dev-plugin`** 插件：

1. 在搜索框输入 **「加载开发插件」**（或 `load dev plugin` / `dev plugin` / `本地插件` 等关键词）。
2. 回车执行 **「加载开发插件」** 命令。
3. 在系统文件夹选择器中选中插件根目录（需包含 **`package.json`**，且已按该包脚本构建出 **`dist`** 等入口）。
4. 成功后会出现 Toast，插件立即注册；路径写入 **`devPluginPathList`**（与商店安装的 **`storePluginPathList`** 分开存储），下次启动仍会加载。

## 与商店安装的关系

- 商店下载安装的目录记录在 **`storePluginPathList`**；从本地目录加载的开发插件记录在 **`devPluginPathList`**，便于分别管理。卸载商店插件时只从商店列表中移除对应路径。

## 网页搜索示例 `@public-tauri-ext/search`

1. 在仓库内执行：`pnpm --filter @public-tauri-ext/search run build`。
2. 在应用中选择目录：`<仓库根>/store/plugins/search`。
3. 在搜索框输入 `g 关键词` 应出现「谷歌搜索"…"」；回车在默认浏览器打开 Google 结果。

## 插件就绪

`init()` 结束后会设置 `window.__PUBLIC_APP_PLUGINS_READY__` 并派发 `public-app:plugins-ready`；前端可 `import { whenPluginsReady } from '@/plugin/manager'`。
