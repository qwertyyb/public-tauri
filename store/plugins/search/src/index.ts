import { definePlugin, dialog, opener } from '@public-tauri/api';

export default definePlugin(() => ({
  async onEnter(_command, query) {
    const q = (query ?? '').trim();
    if (!q) {
      dialog.showToast('请先输入搜索关键词（触发词后的内容）');
      return;
    }
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    await opener.openUrl(url);
  },
}));
