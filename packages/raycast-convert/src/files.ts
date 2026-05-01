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

/** Names skipped when mirroring the Raycast plugin into outDir (see README). */
export const PLUGIN_COPY_SKIP_NAMES = new Set([
  'package.json',
  'node_modules',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
]);

/**
 * Recursively copy the Raycast plugin directory into `outputDir`, except entries in `skipNames`.
 * Source `package.json` is never copied; generated `package.json` is written separately.
 */
export const copyPluginSourceToOutput = async (
  inputDir: string,
  outputDir: string,
  skipNames: ReadonlySet<string> = PLUGIN_COPY_SKIP_NAMES,
) => {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const from = path.join(inputDir, entry.name);
    const to = path.join(outputDir, entry.name);
    await fs.cp(from, to, { recursive: true });
  }
};
