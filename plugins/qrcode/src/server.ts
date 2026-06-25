import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { detectBase64 } from '@public-tauri/wechat-qrcode';
import { channel } from '@public-tauri/api/node';

const screenCapture = () => {
  const filePath = path.join(os.tmpdir(), `${Date.now()}.png`);
  return new Promise<string>((resolve, reject) => {
    exec(`screencapture -C -x -d -t png ${filePath}`, (error) => {
      if (error) {
        reject(error);
      }
      resolve(filePath);
    });
  });
};

const detectScreen = async () => {
  const filePath = await screenCapture();
  const imgbase64 = await fs.readFile(filePath, { encoding: 'base64' });
  return await detectBase64(imgbase64);
};

channel.handle('detect', detectBase64);
channel.handle('detectScreen', detectScreen);
