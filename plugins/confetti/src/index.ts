import { definePlugin, mainWindow, WebviewWindow } from '@public-tauri/api';

let webview: InstanceType<typeof WebviewWindow> | null = null;

export default definePlugin(() => ({
  async onAction() {
    await mainWindow.hide();
    if (webview) {
      return;
    }
    webview = new WebviewWindow('confetti', {
      url: 'http://confetti.plugin.localhost:2345/assets/overlay/index.html',
      transparent: true,
      decorations: false,
      acceptFirstMouse: false,
      skipTaskbar: true,
      focusable: false,
      focus: false,
      shadow: false,
      alwaysOnTop: true,
      center: true,
      width: window.screen.width,
      height: window.screen.height,
    });
    const instance = webview;
    instance.once('tauri://error', (e: unknown) => {
      console.log('an error happened creating the webview', e);
    });
    await new Promise((resolve) => {
      instance.once('tauri://webview-created', () => {
        resolve(true);
      });
      setTimeout(() => {
        resolve(false);
      }, 200);
    });
    try {
      await instance.setIgnoreCursorEvents(true);
      await instance.setSimpleFullscreen(true);
    } catch (err) {
      console.log('error setting ignore cursor events and simple fullscreen', err);
    }
    console.log('webview set ignore cursor events and simple fullscreen');
    setTimeout(async () => {
      console.log('destroying webview');
      await instance.destroy();
      webview = null;
      console.log('webview destroyed');
    }, 6000);
  },
}));
