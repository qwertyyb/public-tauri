import path from 'node:path';
import type { ResolvedConvertOptions } from '../types';

const formatAlias = (aliases: Record<string, string>) => Object.entries(aliases)
  .map(([key, value]) => `      ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
  .join('\n');

const formatAliasProperty = (aliases: Record<string, string>) => {
  const entries = formatAlias(aliases);
  return entries ? `    alias: {\n${entries}\n    },` : '    alias: {},';
};

const formatHooks = () => `    hooks(hooks) {
      hooks.hook('build:done', () => {
        reload()
      })
    }`;

/** Server 入口：`@raycast/api` → `@public-tauri/api/raycast` 源码；view 与 no-view 一致。 */
const getServerAliases = (_outputDir: string): Record<string, string> => ({
  '@raycast/api': '@public-tauri/api/raycast',
  // '@raycast/utils': '@public-tauri/api/utils',
});

const RELOAD_HELPER = `import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

let timeout: ReturnType<typeof setTimeout>
const reload = async () => {
  if (timeout) {
    clearTimeout(timeout)
  }
  timeout = setTimeout(async () => {
    const r = await fetch('http://localhost:2345/api/manager/developer/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: join(fileURLToPath(import.meta.url), '../')
      })
    })
    if (r.ok) {
      console.log('插件已同步到主应用')
    }
  }, 500)
}

`;

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
    alias: {},
${formatHooks()}
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
${formatHooks()}
  },`);

  return `${RELOAD_HELPER}export default defineConfig([
${entries.join('\n')}
]);
`;
};
