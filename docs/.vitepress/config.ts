import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Public Tauri',
  description: '类 Alfred / Raycast 的快速启动器与插件生态',
  lang: 'zh-CN',
  base: '/public-tauri/',
  cleanUrls: true,
  themeConfig: {
    outline: [2, 4],
    nav: [
      { text: '首页', link: '/' },
      { text: '文档', link: '/plugin-index' },
      { text: '插件商店', link: '/store' },
    ],
    sidebar: [
      {
        text: '插件开发',
        items: [
          { text: '文档索引', link: '/plugin-index' },
          { text: '快速开始', link: '/getting-started' },
          { text: '加载插件', link: '/dev-plugins' },
          { text: '插件配置清单', link: '/manifest' },
          { text: '命令与匹配规则', link: '/commands' },
          { text: '插件模式', link: '/modes' },
          { text: '生命周期 API', link: '/lifecycle' },
          { text: 'API 参考', link: '/api-reference' },
          { text: '组件参考', link: '/components' },
          { text: '偏好设置', link: '/preferences' },
          { text: '服务端插件', link: '/server-side' },
          { text: '构建与发布', link: '/build-and-publish' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/qwertyyb/public-tauri' }],
    footer: {
      message: 'MIT License',
      copyright: 'Copyright © Public Tauri contributors',
    },
    search: {
      provider: 'local',
    },
  },
});
