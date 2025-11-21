import { createOpencvModule } from './module';
import { initWechatFile } from './files';
import createOpencv from './opencv';
import sharp from 'sharp';

const loadOpencv = async () => {
  const opencvModule = createOpencvModule();

  initWechatFile(opencvModule);

  const opencv = await createOpencv(opencvModule);

  return opencv;
};

let wr: any = null;
let opencv: any = null;

export const detect = async (image: { width: number, height: number, data: Uint8Array }) => {
  if (!wr) {
    opencv = await loadOpencv();
    wr = new opencv.wechat_qrcode_WeChatQRCode('wechat_qrcode/detect.prototxt', 'wechat_qrcode/detect.caffemodel', 'wechat_qrcode/sr.prototxt', 'wechat_qrcode/sr.caffemodel');
  }


  const results = wr.detectAndDecode(opencv.matFromImageData(image));
  if (results.size() < 1) {
    throw new Error('未识别到二维码');
  }
  let i = 0;
  const arr: string[] = [];
  while (i < results.size()) {
    arr.push(results.get(i));
    i += 1;
  }
  results.delete();
  return arr;
};

export const detectBase64 = async (imgbase64: string) => {
  const buffer = Buffer.from(imgbase64, 'base64');
  const image = sharp(buffer);
  const metadata = await image.metadata();
  return detect({
    width: metadata.width,
    height: metadata.height,
    data: await image.raw().toBuffer(),
  });
};

