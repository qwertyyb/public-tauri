// @ts-ignore
import decodeImage from 'image-decode';
import { createOpencvModule } from './module';
import { initWechatFile } from './files';

// @ts-ignore
import createOpencv from './opencv';

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

/**
 * Base64 图片转换为 { width, height, data: Buffer }
 * @param base64Str Base64 图片字符串（支持带 dataURL 前缀）
 * @returns { width: number, height: number, data: Buffer }
 */
function base64ToImageData(base64Str: string): {
  width: number;
  height: number;
  data: Buffer;
} {
  // 步骤 1：移除 Base64 前缀（如 data:image/png;base64,）
  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');

  // 步骤 2：Base64 转 Buffer（原生 API，无依赖）
  const buffer = Buffer.from(base64Data, 'base64');

  // 步骤 3：解析图片
  return decodeImage(buffer);
}

export const detectBase64 = async (imgbase64: string) => {
  const { width, height, data } = base64ToImageData(imgbase64);
  return detect({
    width,
    height,
    data,
  });
};

