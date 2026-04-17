import { definePlugin, dialog, opener } from '@public-tauri/api';

function buildSearchUrl(commandName: string, q: string): string {
  const encoded = encodeURIComponent(q);
  switch (commandName) {
    case 'bing':
      return `https://www.bing.com/search?q=${encoded}`;
    case 'baidu':
      return `https://www.baidu.com/s?wd=${encoded}`;
    case 'google':
    default:
      return `https://www.google.com/search?q=${encoded}`;
  }
}

export default definePlugin(() => ({
  async onEnter(command: { name: string }, query: string) {
    const q = (query ?? '').trim();
    if (!q) {
      dialog.showToast('请先输入搜索关键词（触发词后的内容）');
      return;
    }
    const { name } = command;
    const url = buildSearchUrl(name, q);
    await opener.openUrl(url);
  },
}));
