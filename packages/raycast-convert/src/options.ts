import path from 'node:path';
import type { ConvertMode, ConvertOptions, ResolvedConvertOptions } from './types';

const resolveMode = (mode: ConvertOptions['mode']): ConvertMode => mode || 'development';

export const resolveConvertOptions = (options: ConvertOptions): ResolvedConvertOptions => {
  const inputDir = path.resolve(options.inputDir);
  const outputDir = path.resolve(options.outputDir || `${inputDir}-public`);
  const invocationDir = path.resolve(options.invocationDir || process.cwd());
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
    assetsDir: path.join(outputDir, 'assets'),
  };
};
