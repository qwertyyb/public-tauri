# tools

> 一个类似 Alfred、Raycast、utools 的工具，但更快、更便捷、更强大

## 技术环境

基于 Tauri，前端基于 Vue3，支持 Nodejs

### 推荐开发环境

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 开发步骤

相关命令

```shell
# 安装依赖
pnpm install

# 运行 Nodejs Server
cd src-node && pnpm dev

# 开发调试
pnpm tauri dev

# 构建插件 
pnpm plugin:build

# 构建应用
pnpm tauri build
```

快捷键 <kbd>Cmd</kbd> + <kbd>Space</kbd> 显示/隐藏窗口

# License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE.md) file for details.
