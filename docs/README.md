# Public Tauri 插件开发文档

欢迎使用 Public Tauri 插件开发文档。本文档将帮助你了解如何为 Public Tauri 开发插件。

## 目录

- [快速开始](./getting-started.md) - 从零开始创建你的第一个插件
- [插件配置清单](./manifest.md) - `package.json` 中 `publicPlugin` 字段的完整说明
- [命令与匹配规则](./commands.md) - 定义命令及其触发匹配规则
- [插件模式](./modes.md) - 三种插件运行模式（none / listView / view）
- [生命周期 API](./lifecycle.md) - 插件生命周期钩子详解
- [API 参考](./api-reference.md) - `@public-tauri/api` 提供的所有 API
- [组件参考](./components.md) - `@public-tauri/api/components` 提供的 Vue 组件
- [偏好设置](./preferences.md) - 为插件和命令添加用户可配置的偏好设置
- [服务端插件](./server-side.md) - 使用 Node.js 编写服务端逻辑
- [构建与发布](./build-and-publish.md) - 构建插件并发布到应用商店
- [WebDriver E2E 测试](./webdriver-e2e-input.md) - 本地 WebDriver 脚本、环境变量与输入/按键注意事项
