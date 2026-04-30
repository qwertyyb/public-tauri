import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { ResolvedConvertOptions } from './types';

const installCommand = 'pnpm';
const installArgs = ['install', '--ignore-scripts', '--frozen-lockfile=false'];

const runInstall = (cwd: string, label: string) => {
  console.log(`Installing ${label} dependencies...`);
  const result = spawnSync(installCommand, installArgs, {
    cwd,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${label} dependency install failed with exit code ${result.status}`);
  }
};

const installOutputDependencies = (options: ResolvedConvertOptions) => {
  runInstall(options.outputDir, 'converted plugin');
};

const getBuildCommand = (options: ResolvedConvertOptions) => {
  const configPath = path.join(options.outputDir, 'tsdown.config.ts');
  return {
    command: 'pnpm',
    args: ['exec', 'tsdown', '--config', configPath],
    cwd: options.outputDir,
  };
};

const buildConvertedPlugin = (options: ResolvedConvertOptions) => {
  const { command, args: buildArgs, cwd } = getBuildCommand(options);
  const result = spawnSync(command, buildArgs, {
    cwd,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`Build failed with exit code ${result.status}`);
  }
};

export const installAndBuild = (options: ResolvedConvertOptions) => {
  installOutputDependencies(options);
  buildConvertedPlugin(options);
};
