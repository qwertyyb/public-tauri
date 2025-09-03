import { detectBase64 } from 'wechat-qrcode';

const createQrcode = () => ({
  detect: detectBase64,
});

export default createQrcode;
