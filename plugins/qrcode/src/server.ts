import { detectBase64 } from 'wechat-qrcode'

const createQrcode = () => {
  return {
    detect: detectBase64
  }
}

export default createQrcode
