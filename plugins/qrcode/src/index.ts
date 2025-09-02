import { clipboard, ICommand, IPlugin, invoke, mainWindow, dialog } from '@public/api'
import { getChromeCurrentUrl, getSafariCurrentUrl } from "./utils";
import QRCode from 'qrcode'

const createClipboardItem = (text: string) => {
  const item: ICommand = {
    name: 'detect',
    title: `二维码内容: ${text}`,
    subtitle: '来自剪切板,点击复制',
    icon: './assets/qrcode.png',
    text,
    matches: [
      { type: 'text', keywords: [''] }
    ]
  }
  return item
}

const createQrcodePlugin: IPlugin = (utils) => {

  const detectClipboard = async () => {
    try {
      const imgbase64 = await clipboard.readImageBase64()
      if (!imgbase64) return
      
      const texts = (await invoke<string[]>('detect', imgbase64)) || []
      const list = texts.map(text => createClipboardItem(text))
      utils.showCommands(list)
    } catch (err) {
      console.error(err)
    }
  }

  detectClipboard()

  mainWindow.onShow(detectClipboard)

  return {
    async onSelect(command, match) {
      let text = match.from === 'match' && match.match.type === 'trigger' ? (match as any).matchData.query : match.keyword
      if (command.name === 'generate-for-current-url') {
        text = await getChromeCurrentUrl() || await getSafariCurrentUrl() || '未获取到当前页面地址'
      }
      if(command.name === 'generate' || command.name === 'generate-for-current-url') {
        if (!text) return;
        // 生成二维码
        const res: { html: string, url: string } = await new Promise(resolve => QRCode.toDataURL(text).then((url: string) => {
          const html = `
            <div class="flex flex-col justify-center items-center w-full h-full">
              <img src="${url}" class="w-full" />
              <div class="text-single-line mt-2" style="max-width:100%" title=${JSON.stringify(text)}>${text}</div>
            </div>
          `
          resolve({ html, url })
        }))
        return res.html
      }
    },
    onEnter: (command) => {
      console.log(command)
      if (command.name === 'detect' && command.text) {
        clipboard.writeText(command.text)
        dialog.showToast('已写入到剪切板')
      }
    },
  }
}

export default createQrcodePlugin
