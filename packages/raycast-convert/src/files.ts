import fs from 'node:fs/promises';
import path from 'node:path';

export const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await fs.readFile(filePath, 'utf8')) as T;

export const writeJson = async (filePath: string, value: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const exists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const copyAssetsDir = async (inputDir: string, assetsDir: string) => {
  const source = path.join(inputDir, 'assets');
  if (!await exists(source)) return;
  await fs.cp(source, assetsDir, { recursive: true });
};
