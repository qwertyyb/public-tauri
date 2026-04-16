import { clipboard, definePlugin, dialog } from '@public-tauri/api';
import { getChromeCurrentUrl, getSafariCurrentUrl } from './utils';
import QRCode from 'qrcode';

const createQrcodePlugin = definePlugin(() => ({
  async onSelect(command, query) {
    let text = query;
    if (command.name === 'generate-for-current-url') {
      text = await getChromeCurrentUrl() || await getSafariCurrentUrl() || '未获取到当前页面地址';
    }
    if (command.name === 'generate' || command.name === 'generate-for-current-url') {
      if (!text) return;
      // 生成二维码
      const res: { html: string, url: string } = await new Promise<{html: string, url: string}>((resolve) => {
        QRCode.toDataURL(text)
          .then((url: string) => {
            const html = `
              <div class="flex flex-col justify-center items-center w-full h-full">
                <img src="${url}" class="w-full" />
                <div class="text-single-line mt-2" style="max-width:100%" title=${JSON.stringify(text)}>${text}</div>
              </div>
            `;
            resolve({ html, url });
          });
      });
      return res.html;
    }
  },
  onEnter: async (command, query) => {
    if (command.name === 'detect' && command.text) {
      clipboard.writeText(command.text);
      dialog.showToast('已写入到剪切板');
    } else if (['generate', 'generate-for-current-url'].includes(command.name)) {
      const base64 = await QRCode.toDataURL(query);
      await clipboard.writeImageBase64(base64.split(',')[1]);
      dialog.showToast('已写入到剪切板');
    }
  },

  async onAction(command, action, query) {
    if (action.name === 'copy-to-clipboard' && ['generate', 'generate-for-current-url'].includes(command.name)) {
      const base64 = await QRCode.toDataURL(query);
      await clipboard.writeImageBase64(base64.split(',')[1]);
      dialog.showToast('已写入到剪切板');
    }
    if (command.name === 'detect' && action.name === 'copy-to-clipboard') {
      await clipboard.writeText(command.text);
      dialog.showToast('已写入到剪切板');
    }
  },
}));

export default createQrcodePlugin;
