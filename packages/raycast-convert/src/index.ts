import fs from 'node:fs/promises';
import path from 'node:path';
import { installAndBuild } from './build';
import { resolveSupportedCommands } from './commands';
import {
  copyRaycastViewTemplateAppDist,
  copyRaycastWorkerViewBundle,
  ensureRaycastViewTemplateBuilt,
  findPublicTauriRepoRoot,
} from './generate/copy-templates';
import { copyPluginSourceToOutput, readJson, writeJson } from './files';
import { generatePublicMain } from './generate/public-main';
import { generateServerModule } from './generate/server-module';
import { generateTsdownConfig } from './generate/tsdown-config';
import { DEFAULT_PLUGIN_ICON, normalizeRaycastIcon } from './icons';
import { resolveConvertOptions } from './options';
import { createConvertedPackage } from './package-json';
import { resolveConvertedPackageName } from './package-name';
import { mergePreferences } from './preferences';
import type { ConversionReport, ConvertOptions, ConvertWarning, ConvertedCommand, RaycastPackage } from './types';

export type * from './types';
export { RAYCAST_CONVERTED_SCOPE, resolveConvertedPackageName, resolveRaycastSlug, sanitizeSlug } from './package-name';

/**
 * `development` 模式下 view 插件的 wujie 入口：指向 `@public-tauri/template` 的 Vite 默认端口下的 `raycast.html`，
 * 便于先 `pnpm --filter @public-tauri/template dev` 再转换插件即可调试 UI，无需模板 `build`/拷贝 `dist/view`。
 * `production` 模式使用 `./dist/view/raycast.html`。
 */
export const RAYCAST_VIEW_TEMPLATE_DEV_ENTRY = 'http://localhost:5173/raycast.html';

const createPublicCommands = (
  commands: ConvertedCommand[],
  icon: string,
) => commands.map(command => ({
  name: command.name,
  title: command.title || command.name,
  subtitle: command.subtitle || command.description,
  description: command.description,
  icon: normalizeRaycastIcon(command.icon) || icon,
  mode: command.mode === 'no-view' ? 'none' : 'view',
  matches: [
    {
      type: 'text',
      keywords: command.keywords?.length ? command.keywords : [command.title || command.name],
    },
  ],
}));

export const convertRaycastPlugin = async (rawOptions: ConvertOptions): Promise<ConversionReport> => {
  const options = resolveConvertOptions(rawOptions);
  const warnings: ConvertWarning[] = [];
  const sourcePackage = await readJson<RaycastPackage>(path.join(options.inputDir, 'package.json'));
  const convertedPackageName = resolveConvertedPackageName(sourcePackage, options.inputDir);
  const sourceCommands = sourcePackage.commands || [];
  const { convertedCommands, skippedCommands } = await resolveSupportedCommands(options.inputDir, sourceCommands);

  const noViewCommands = convertedCommands.filter(command => command.mode === 'no-view');
  const viewCommands = convertedCommands.filter(command => command.mode === 'view');
  const hasViewCommands = viewCommands.length > 0;
  const viewHtmlUsesDevServer = hasViewCommands && options.mode === 'development';

  await fs.rm(options.outputDir, { recursive: true, force: true });
  await copyPluginSourceToOutput(options.inputDir, options.outputDir);
  await fs.mkdir(options.buildDir, { recursive: true });
  await fs.mkdir(options.distDir, { recursive: true });

  const icon = normalizeRaycastIcon(sourcePackage.icon || convertedCommands[0]?.icon) || DEFAULT_PLUGIN_ICON;
  const commandPreferences = convertedCommands.flatMap(command => command.preferences || []);
  const preferences = mergePreferences(sourcePackage.preferences || [], commandPreferences, warnings);
  const publicCommands = createPublicCommands(convertedCommands, icon);
  const publicPlugin = {
    title: sourcePackage.title || sourcePackage.name || convertedPackageName,
    subtitle: sourcePackage.description || sourcePackage.name || convertedPackageName,
    description: sourcePackage.description,
    icon,
    ...(noViewCommands.length ? { main: './dist/public-main.js' } : {}),
    server: './dist/server.js',
    ...(viewCommands.length
      ? { html: viewHtmlUsesDevServer ? RAYCAST_VIEW_TEMPLATE_DEV_ENTRY : './dist/view/raycast.html' }
      : {}),
    ...(preferences.length ? { preferences } : {}),
    commands: publicCommands,
  };

  await writeJson(path.join(options.outputDir, 'package.json'), createConvertedPackage(sourcePackage, publicPlugin, {
    convertedPackageName,
    publicApiDependency: options.publicApiDependency,
    warnings,
    hasViewCommands,
  }));

  if (noViewCommands.length) {
    await fs.writeFile(path.join(options.buildDir, 'public-main.ts'), generatePublicMain(), 'utf8');
  }
  await fs.writeFile(
    path.join(options.buildDir, 'server.ts'),
    generateServerModule(
      { noView: noViewCommands, view: viewCommands },
      convertedPackageName,
      publicCommands,
      {
        inputDir: options.inputDir,
        outputDir: options.outputDir,
        buildDir: options.buildDir,
      },
    ),
    'utf8',
  );

  let raycastViewRepoRoot: string | null = null;
  if (hasViewCommands) {
    copyRaycastWorkerViewBundle(options.buildDir);
    if (viewHtmlUsesDevServer) {
      raycastViewRepoRoot = null;
    } else {
      raycastViewRepoRoot = findPublicTauriRepoRoot(options.invocationDir)
        ?? findPublicTauriRepoRoot(process.cwd());
      if (!raycastViewRepoRoot) {
        throw new Error('Could not locate Public Tauri repo root (pnpm-workspace.yaml + packages/api). '
          + 'Run raycast-convert from the monorepo, set invocationDir, or copy packages/template dist into dist/view manually.');
      }
      ensureRaycastViewTemplateBuilt(raycastViewRepoRoot);
      if (!options.build) {
        copyRaycastViewTemplateAppDist(raycastViewRepoRoot, options.distDir);
      }
    }
  }

  await fs.writeFile(path.join(options.outputDir, 'tsdown.config.ts'), generateTsdownConfig(options, {
    hasPublicMain: noViewCommands.length > 0,
  }), 'utf8');

  const report: ConversionReport = {
    source: options.inputDir,
    output: options.outputDir,
    sourcePackageName: typeof sourcePackage.name === 'string' ? sourcePackage.name : undefined,
    convertedPackageName,
    convertedCommands: convertedCommands.map((command) => {
      const outputEntry = path.join(options.outputDir, path.relative(path.resolve(options.inputDir), path.resolve(command.entry)));
      const entry = path.relative(options.outputDir, outputEntry).split(path.sep)
        .join('/') || '.';
      return { name: command.name, entry };
    }),
    skippedCommands,
    warnings,
  };
  await writeJson(path.join(options.outputDir, 'raycast-conversion-report.json'), report);

  if (options.build) {
    installAndBuild(options);
    // tsdown 会清空 `dist/`；view 子应用在 tsdown 之后重新拷贝
    if (hasViewCommands && raycastViewRepoRoot) {
      copyRaycastViewTemplateAppDist(raycastViewRepoRoot, options.distDir);
    }
  }

  return report;
};
