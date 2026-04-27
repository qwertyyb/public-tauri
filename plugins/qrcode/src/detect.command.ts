import { type ICommand, type IListViewCommand, AsyncFile, utils, dialog, clipboard, mainWindow, screen, channel } from '@public-tauri/api';

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
  const imgbase64 = await clipboard.readImageBase64().catch((err) => {
    console.error('readImageBase64 error', err);
    return null;
  });
  if (!imgbase64) return [];

  const texts = (await channel.invoke<string[]>('detect', imgbase64)) || [];
  return texts;
};

const detectScreen = async (): Promise<string[]> => {
  try {
    await mainWindow.hide();
    const cursorPosition = await utils.getMousePosition();
    const monitor = await screen.monitorFromPoint(cursorPosition.x, cursorPosition.y);
    const imgbase64 = await screen.capture(monitor.id);
    const texts = (await channel.invoke<string[]>('detect', imgbase64)) || [];
    return texts;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const detectFile = async (file: AsyncFile) => {
  try {
    const imgbase64 = await file.base64();
    console.log('detectFile', file, imgbase64);
    const texts = (await channel.invoke<string[]>('detect', imgbase64)) || [];
    return texts;
  } catch (err) {
    console.error(err);
    return [];
  }
};

const detect = async (input: ('clipboard' | 'screen' | AsyncFile)[]) => {
  const requests = [];
  if (input.includes('clipboard')) {
    requests.push(detectClipboard());
  }
  if (input.includes('screen')) {
    requests.push(detectScreen());
  }
  const files = input.filter(item => typeof (item as any).base64 === 'function') as AsyncFile[];
  requests.push(...files.map(detectFile));
  const texts = (await Promise.all(requests)).flat();
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

  async onShow(_query, options, setList) {
    const file = options?.from === 'search' && 'match' in options && options.match?.type === 'file' && options.result && ('file' in options.result) ? options.result.file : null;
    const list = await detect(file ? [file] : ['clipboard', 'screen']) || [];
    if (list.length) {
      setList(list);
    } else {
      mainWindow.popToRoot();
    }
  },
  onAction(item: any) {
    console.log('detect qrcode enter', item);
    clipboard.writeText(item.text);
    dialog.showToast('已复制到粘贴板');
  },
};

export default detectCommand;
