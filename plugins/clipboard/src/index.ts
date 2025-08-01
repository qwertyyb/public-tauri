import clipboard from "tauri-plugin-clipboard-api";

interface IClipboardItem {
  createdAt: Date
  text: string
  contentType: string
  content: string
}

const list: IClipboardItem[] = []

clipboard.onClipboardUpdate(async () => {
  console.log("Received new text in clipboard: ");
  const [html, text, imgbase64] = await Promise.all([clipboard.readHtml(), clipboard.readText(), clipboard.readImageBase64()])
  console.log('clipboard', { html, text, imgbase64 })

  if (imgbase64) {
    console.log('base64 image received: ', imgbase64)
    list.push({
      createdAt: new Date(),
      text: text,
      contentType: 'image',
      content: imgbase64
    })
  } else if (text) {
    console.log('HTML received: ', text);
    list.push({
      createdAt: new Date(),
      text,
      contentType: 'html',
      content: text
    })
  }
});