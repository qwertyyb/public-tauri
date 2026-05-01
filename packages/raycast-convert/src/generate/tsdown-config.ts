import path from 'node:path';
import type { ResolvedConvertOptions } from '../types';

const formatAlias = (aliases: Record<string, string>) => Object.entries(aliases)
  .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const formatAliasProperty = (aliases: Record<string, string>) => {
  const entries = formatAlias(aliases);
  return entries ? `    alias: {\n${entries}\n    },` : '    alias: {},';
};

/**
 * 指向插件目录下已安装的 `@public-tauri/api` 源码入口（pnpm install 之后必存在）。
 * 仅用裸模块别名 `@public-tauri/api/raycast` 时，在 `deps.alwaysBundle` + DepsPlugin 的 resolve 链路上
 * 仍可能解析不到已从 package.json 移除的 `@raycast/api`，导致打包报错。
 */
const getServerAliases = (outputDir: string): Record<string, string> => {
  const apiSrc = path.join(outputDir, 'node_modules', '@public-tauri', 'api', 'src');
  return {
    '@raycast/api': path.join(apiSrc, 'raycast.ts'),
    '@raycast/utils': path.join(apiSrc, 'raycast-utils.ts'),
  };
};

export const generateTsdownConfig = (options: ResolvedConvertOptions) => `export default [
  {
    entry: ${JSON.stringify(path.join(options.buildDir, 'public-main.ts'))},
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outDir: ${JSON.stringify(options.distDir)},
    outExtensions: () => ({ js: '.js' }),
    deps: {
      alwaysBundle: () => true,
    },
${formatAliasProperty({})}
  },
  {
    entry: ${JSON.stringify(path.join(options.buildDir, 'server.ts'))},
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outDir: ${JSON.stringify(options.distDir)},
    outExtensions: () => ({ js: '.js' }),
    deps: {
      alwaysBundle: () => true,
    },
${formatAliasProperty(getServerAliases(options.outputDir))}
  },
];
`;
