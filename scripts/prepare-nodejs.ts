import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const PROJECT_DIR = fileURLToPath(new URL('../', import.meta.url));
const BINARIES_DIR = join(PROJECT_DIR, './src-tauri/binaries');

// 从项目根目录的 .nvmrc 文件读取具体的 nodejs 版本
const getVersion = () => {
  const nvmrcPath = join(PROJECT_DIR, '.nvmrc');
  if (!existsSync(nvmrcPath)) {
    throw new Error('.nvmrc file not found in project root');
  }
  const version = execSync('cat .nvmrc', { encoding: 'utf-8' }).trim();
  return version;
};

const getTargetPath = (version: string) => {
  const extension = process.platform === 'win32' ? '.exe' : '';

  const rustInfo = execSync('rustc -vV', { encoding: 'utf-8' });
  const targetTriple = /host: (\S+)/g.exec(rustInfo)?.[1];
  if (!targetTriple) {
    console.error('Failed to determine platform target triple');
  }
  return join(BINARIES_DIR, `node-v${version}-${targetTriple}${extension}`);
};

const start = () => {
  const expectVersion = getVersion();
  const targetPath = getTargetPath(expectVersion);
  if (existsSync(targetPath)) {
    console.log(`${targetPath} 已存在，跳过`);
    return;
  }
  const curVersion = execSync('node -v', { encoding: 'utf-8' }).trim()
    .replace(/^v/i, '');
  console.log(expectVersion, curVersion);
  if (curVersion !== expectVersion) {
    throw new Error(`当前版本不符合要求，需要安装 ${expectVersion}`);
  }
  const command = process.platform === 'win32' ? `node -e "require('fs').copyFileSync(process.execPath, ${JSON.stringify(targetPath)}" ` : `cp $(command -v node) ${targetPath}`;
  return execSync(command, { encoding: 'utf-8' });
};

start();
