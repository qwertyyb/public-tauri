import { clipboard, dialog, ICommand, IListViewCommand, invoke, mainWindow, screen } from '@public/api';

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
  await mainWindow.hide();
  const imgbase64 = await screen.capture(2);
  const texts = (await invoke<string[]>('detect', imgbase64)) || [];
  return texts;
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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
