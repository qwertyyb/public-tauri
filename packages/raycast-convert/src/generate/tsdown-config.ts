import path from 'node:path';
import type { ResolvedConvertOptions } from '../types';

const formatAlias = (aliases: Record<string, string>) => Object.entries(aliases)
  .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const formatAliasProperty = (aliases: Record<string, string>) => {
  const entries = formatAlias(aliases);
  return entries ? `    alias: {\n${entries}\n    },` : '    alias: {},';
};

/** Server 入口：`@raycast/api` → `@public-tauri/api/raycast` 源码；view 与 no-view 一致。 */
const getServerAliases = (_outputDir: string): Record<string, string> => ({
  '@raycast/api': '@public-tauri/api/raycast',
  // '@raycast/utils': '@public-tauri/api/utils',
});

export const generateTsdownConfig = (
  options: ResolvedConvertOptions,
  flags: { hasPublicMain: boolean },
) => {
  const entries: string[] = [];

  if (flags.hasPublicMain) {
    entries.push(`  {
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
  },`);
  }

  entries.push(`  {
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
  },`);

  return `export default [
${entries.join('\n')}
];
`;
};
