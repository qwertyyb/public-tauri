import { definePlugin, mainWindow, WebviewWindow } from '@public-tauri/api';

export default definePlugin(() => ({
  async onAction() {
    await mainWindow.hide();
    const webview = new WebviewWindow('my-label', {
      url: 'http://confetti.plugin.localhost:2345/assets/overlay/index.html',
      transparent: true,
      decorations: false,
      acceptFirstMouse: false,
      skipTaskbar: true,
      focusable: false,
      focus: false,
      alwaysOnTop: true,
    });
    webview.once('tauri://created', () => {
      console.log('webview successfully created');
    });
    webview.once('tauri://error', (e) => {
      console.log('an error happened creating the webview', e);
    });
    await webview.setIgnoreCursorEvents(true);
    await webview.setSimpleFullscreen(true);
    setTimeout(async () => {
      await webview.destroy();
      console.log('webview destroyed');
    }, 6000);
  },
}));
