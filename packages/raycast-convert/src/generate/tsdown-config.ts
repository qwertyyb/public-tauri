import path from 'node:path';
import type { ResolvedConvertOptions } from '../types';

const formatAlias = (aliases: Record<string, string>) => Object.entries(aliases)
  .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const formatAliasProperty = (aliases: Record<string, string>) => {
  const entries = formatAlias(aliases);
  return entries ? `    alias: {\n${entries}\n    },` : '    alias: {},';
};

const getServerAliases = (): Record<string, string> => ({
  '@raycast/api': '@public-tauri/api/raycast',
  '@raycast/utils': '@public-tauri/api/raycast/utils',
});

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
${formatAliasProperty(getServerAliases())}
  },
];
`;
