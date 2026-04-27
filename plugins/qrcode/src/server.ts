import { detectBase64 } from 'wechat-qrcode';
import { channel } from '@public-tauri/api/node';

channel.handle('detect', detectBase64);
