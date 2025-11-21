import { clipboard, dialog, ICommand, IListViewCommand, mainWindow, screen, utils } from '@public/api';
import { createPluginChannel } from '@public/api/core';

const { invoke } = createPluginChannel('qrcode');

const createClipboardItem = (text: string) => {
  const item: ICommand = {
    name: 'detect',
    title: `二维码内容: ${text}`,
    subtitle: '来自剪切板,点击复制',
    icon: './assets/qrcode.png',
    text,
    matches: [
      { type: 'text', keywords: [''] },
    ],
  };
  return item;
};


const detectClipboard = async (): Promise<string[]> => {
  const imgbase64 = await clipboard.readImageBase64().catch(() => null);
  if (!imgbase64) return [];

  const texts = (await invoke<string[]>('detect', imgbase64)) || [];
  return texts;
};

const detectScreen = async (): Promise<string[]> => {
  try {
    await mainWindow.hide();
    const cursorPosition = await utils.getMousePosition();
    const monitor = await screen.screenFromPoint(cursorPosition.x, cursorPosition.y);
    const imgbase64 = await screen.capture(monitor.id);
    const texts = (await invoke<string[]>('detect', imgbase64)) || [];
    return texts;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const detect = async () => {
  const texts = (await Promise.all([detectClipboard(), detectScreen()])).flat();
  console.log('detect', texts);
  if (!texts?.length) {
    mainWindow.show();
    dialog.showToast('未检测到二维码');
    return [];
  }
  const list = texts.map(text => createClipboardItem(text));
  await mainWindow.show();
  return list;
};

const detectCommand: IListViewCommand = {

  async enter(_query, setList) {
    const list = await detect() || [];
    if (list.length) {
      setList(list);
    } else {
      mainWindow.popToRoot();
    }
  },
  action(item: any) {
    console.log('detect qrcode enter', item);
    clipboard.writeText(item.text);
    dialog.showToast('已复制到粘贴板');
  },
};

export default detectCommand;
