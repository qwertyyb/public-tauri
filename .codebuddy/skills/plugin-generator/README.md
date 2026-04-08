# Plugin Generator Skill

这是一个用于生成 Public Spotlight 插件的 Skill。它提供了完整的插件开发指南、API 参考和模板。

## 功能特性

### 1. 完整的插件架构文档
- 插件系统核心概念
- 三种插件模式（none、listView、view）
- 命令匹配机制（text、trigger、regexp、full、file）
- 插件生命周期详解

### 2. 详细的 API 参考
- `@public/api` 模块完整文档
- 所有核心 API（dialog、mainWindow、clipboard、utils、storage、Database、screen）
- `IAppContext`、`IPluginLifecycle`、`IListViewCommand` 等接口定义
- 事件处理和错误处理指南

### 3. 多种插件模板

#### 简单命令插件（none 模式）
适用于：简单工具、计算器、单操作命令
- 基础的 `onEnter` 处理
- 输入验证和结果生成
- 系统命令和 AppleScript 集成示例

#### ListView 插件（listView 模式）
适用于：列表、搜索结果、项目集合
- 预构建的列表模板
- 模糊搜索支持
- 列表项选择处理

#### Vue 视图插件（view 模式）
适用于：复杂 UI、表单、多页交互
- Vue 组件支持
- 路由和导航
- 表单处理和状态管理

### 4. 插件生成脚本

提供了一个便捷的 Shell 脚本 `scripts/create_plugin.sh` 来快速创建新插件：

```bash
# 创建简单命令插件
./scripts/create_plugin.sh my-plugin none

# 创建 ListView 插件
./scripts/create_plugin.sh my-plugin listview

# 创建 Vue 视图插件
./scripts/create_plugin.sh my-plugin view
```

脚本会自动创建：
- 插件目录结构
- `package.json` 配置文件
- `rollup.config.mjs` 构建配置
- `src/index.ts` 源代码模板

### 5. 可用的 API

**核心 API：**
- `dialog` - 弹窗和通知（alert、confirm、toast）
- `mainWindow` - 窗口管理（show、hide、pushView、popView）
- `utils` - 系统工具（runCommand、runAppleScript、getFrontmostApplication）
- `clipboard` - 剪贴板操作（read、write、paste）
- `storage` - 持久化存储
- `Database` - SQLite 数据库操作
- `screen` - 屏幕捕获和监视器信息

**插件生命周期：**
- `onInput` - 用户输入时调用
- `onEnter` - 用户按 Enter 时调用
- `onSelect` - 用户选择命令时调用
- `onAction` - 用户触发操作时调用

**应用上下文：**
- `updateCommands` - 动态更新命令列表
- `showCommands` - 立即显示命令
- `getPreferences` - 获取插件首选项
- `storage` - 插件专用存储
- `invoke` - 调用服务端方法
- `on` - 监听服务端事件

## 使用方法

### 1. 加载 Skill

当 Claude 需要创建或修改插件时，会自动加载此 Skill。

### 2. 查阅文档

- `SKILL.md` - 主要指南，包含插件架构、模板和最佳实践
- `references/plugin_api.md` - 完整的 API 参考文档

### 3. 使用模板

模板位于 `assets/plugin-templates/simple-plugin/`：
- `package.json` - 插件配置模板
- `src/index.ts` - 插件逻辑模板
- `rollup.config.mjs` - 构建配置模板

可以复制这些模板作为起点进行开发。

### 4. 运行生成脚本

```bash
cd .codebuddy/skills/plugin-generator
./scripts/create_plugin.sh <plugin-name> [type]
```

参数说明：
- `plugin-name` - 插件名称（必需）
- `type` - 插件类型（可选）：`none`（默认）、`listview`、`view`

### 5. 开发新插件

使用生成的模板：

1. **编辑 package.json**
   ```json
   {
     "name": "my-plugin",
     "publicPlugin": {
       "title": "My Plugin",
       "subtitle": "Plugin description",
       "icon": "./assets/icon.png",
       "commands": [...]
     }
   }
   ```

2. **实现插件逻辑**（src/index.ts）
   ```typescript
   import { definePlugin, dialog } from '@public/api';

   const createMyPlugin = definePlugin(() => ({
     onEnter(command, query) {
       dialog.showToast('Command executed!');
     },
   }));

   export default createMyPlugin;
   ```

3. **添加图标**
   - 尺寸：512x512 像素
   - 格式：PNG
   - 可选：添加 `icon@dark.png` 支持暗色主题

4. **构建插件**
   ```bash
   cd plugins/my-plugin
   npm run build
   ```

5. **测试插件**
   - 重启应用
   - 搜索插件命令
   - 测试执行

## 插件示例

项目中包含多个插件示例，可以作为参考：

- **calculator** - 简单命令插件，带输入验证
- **emoji** - ListView 插件，模糊搜索
- **clipboard** - ListView 插件，触发匹配
- **snippets** - Vue 视图插件，表单处理
- **applescript** - 系统工具集成
- **translate** - 外部 API 调用
- **ai** - AI 对话集成

## 常见问题

### Q: 插件没有加载？
A: 检查以下几点：
- `package.json` 中是否有正确的 `publicPlugin` 配置
- `main` 或 `preload` 路径是否正确
- 控制台是否有错误消息

### Q: 命令没有显示？
A: 检查：
- `matches` 配置是否正确
- 关键词是否能匹配输入
- 命令名称是否唯一

### Q: API 不可用？
A: 确保：
- `@public/api` 已添加为依赖
- 导入语句正确
- 插件已正确初始化

### Q: 如何调试插件？
A: 使用以下方法：
- `console.log()` 输出到控制台
- `dialog.showToast()` 向用户显示反馈
- 检查浏览器开发者工具

## 最佳实践

1. **性能优化**
   - 在 `onInput` 中最小化异步操作
   - 缓存昂贵的计算
   - 对重型操作使用防抖

2. **用户体验**
   - 使用 `dialog.showToast()` 提供反馈
   - 优雅地处理错误
   - 在处理前验证用户输入

3. **代码组织**
   - 保持 `onInput` 专注于结果生成
   - 分离业务逻辑和 UI 关注点
   - 使用 TypeScript 实现类型安全

4. **资源管理**
   - 清理事件监听器
   - 避免内存泄漏
   - 使用正确的 async/await 模式

## 扩展阅读

- 插件 Schema: `src/plugin/plugin.schema.json` - 完整的验证规则
- 类型定义: `@public/schema` 包
- API 参考: `@public/api` 包
- 现有插件: `plugins/` 目录中的示例

## 支持

如果在使用此 Skill 时遇到问题，可以：
1. 查看 `SKILL.md` 获取详细指南
2. 查看 `references/plugin_api.md` 获取 API 参考
3. 参考现有插件实现
4. 使用生成脚本快速创建插件模板
