import { detectBase64 } from '@public-tauri/wechat-qrcode';
import { channel } from '@public-tauri/api/node';

channel.handle('detect', detectBase64);
