import fs from 'node:fs';
import path from 'node:path';
import type { ConvertMode, ConvertOptions, ResolvedConvertOptions } from './types';

const resolveMode = (mode: ConvertOptions['mode']): ConvertMode => mode || 'development';

/**
 * 自 startDir 向上查找 monorepo 根（pnpm-workspace.yaml + packages/api），避免依赖 process.cwd()
 *（例如从 src-node、src-node/src 启动 Node 时 cwd 并非仓库根）。
 */
const findPublicTauriRepoRoot = (startDir: string): string | undefined => {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);
  while (dir !== root) {
    const ws = path.join(dir, 'pnpm-workspace.yaml');
    const apiPkg = path.join(dir, 'packages', 'api', 'package.json');
    if (fs.existsSync(ws) && fs.existsSync(apiPkg)) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return undefined;
};

const resolveInvocationDir = (options: ConvertOptions): string => {
  if (options.invocationDir) {
    return path.resolve(options.invocationDir);
  }
  const mode = resolveMode(options.mode);
  if (mode !== 'development') {
    return path.resolve(process.cwd());
  }
  const fromRoot = findPublicTauriRepoRoot(process.cwd());
  if (fromRoot) {
    return fromRoot;
  }
  throw new Error('development 模式需要定位 monorepo 根目录（含 pnpm-workspace.yaml 与 packages/api）。请在仓库内执行、设置 invocationDir，或改用 production 模式。');
};

export const resolveConvertOptions = (options: ConvertOptions): ResolvedConvertOptions => {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir || `${inputDir}-public`);
  const invocationDir = resolveInvocationDir(options);
  const mode = resolveMode(options.mode);

  return {
    inputDir,
    outputDir,
    build: Boolean(options.build),
    mode,
    invocationDir,
    publicApiDependency: mode === 'development' ? `file:${path.join(invocationDir, 'packages', 'api')}` : 'latest',
    buildDir: path.join(outputDir, '.raycast-build'),
    distDir: path.join(outputDir, 'dist'),
  };
};
