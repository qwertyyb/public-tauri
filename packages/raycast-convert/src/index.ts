import fs from 'node:fs/promises';
import path from 'node:path';
import { installAndBuild } from './build';
import { resolveNoViewCommands } from './commands';
import { copyAssetsDir, readJson, writeJson } from './files';
import { generatePublicMain } from './generate/public-main';
import { generateServerModule } from './generate/server-module';
import { generateTsdownConfig } from './generate/tsdown-config';
import { DEFAULT_PLUGIN_ICON, normalizeRaycastIcon } from './icons';
import { resolveConvertOptions } from './options';
import { createConvertedPackage } from './package-json';
import { resolveConvertedPackageName } from './package-name';
import { mergePreferences } from './preferences';
import type { ConversionReport, ConvertOptions, ConvertWarning, RaycastPackage } from './types';

export type * from './types';
export { RAYCAST_CONVERTED_SCOPE, resolveConvertedPackageName, resolveRaycastSlug } from './package-name';

const createPublicCommands = (commands: { name: string, title?: string, subtitle?: string, description?: string, icon?: string, keywords?: string[] }[], icon: string) => commands.map(command => ({
  name: command.name,
  title: command.title || command.name,
  subtitle: command.subtitle || command.description,
  description: command.description,
  icon: normalizeRaycastIcon(command.icon) || icon,
  mode: 'none',
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
  const { convertedCommands, skippedCommands } = await resolveNoViewCommands(options.inputDir, sourceCommands);

  await fs.rm(options.outputDir, { recursive: true, force: true });
  await fs.mkdir(options.buildDir, { recursive: true });
  await fs.mkdir(options.distDir, { recursive: true });
  await copyAssetsDir(options.inputDir, options.assetsDir);

  const icon = normalizeRaycastIcon(sourcePackage.icon || convertedCommands[0]?.icon) || DEFAULT_PLUGIN_ICON;
  const commandPreferences = convertedCommands.flatMap(command => command.preferences || []);
  const preferences = mergePreferences(sourcePackage.preferences || [], commandPreferences, warnings);
  const publicCommands = createPublicCommands(convertedCommands, icon);
  const publicPlugin = {
    title: sourcePackage.title || sourcePackage.name || convertedPackageName,
    subtitle: sourcePackage.description || sourcePackage.name || convertedPackageName,
    description: sourcePackage.description,
    icon,
    main: './dist/public-main.js',
    server: './dist/server.js',
    ...(preferences.length ? { preferences } : {}),
    commands: publicCommands,
  };

  await writeJson(path.join(options.outputDir, 'package.json'), createConvertedPackage(sourcePackage, publicPlugin, {
    convertedPackageName,
    publicApiDependency: options.publicApiDependency,
    warnings,
  }));
  await fs.writeFile(path.join(options.buildDir, 'public-main.ts'), generatePublicMain(), 'utf8');
  await fs.writeFile(path.join(options.buildDir, 'server.ts'), generateServerModule(convertedCommands, convertedPackageName, publicCommands), 'utf8');
  await fs.writeFile(path.join(options.outputDir, 'tsdown.config.ts'), generateTsdownConfig(options), 'utf8');

  const report: ConversionReport = {
    source: options.inputDir,
    output: options.outputDir,
    sourcePackageName: typeof sourcePackage.name === 'string' ? sourcePackage.name : undefined,
    convertedPackageName,
    convertedCommands: convertedCommands.map(command => ({ name: command.name, entry: command.entry })),
    skippedCommands,
    warnings,
  };
  await writeJson(path.join(options.outputDir, 'raycast-conversion-report.json'), report);

  if (options.build) {
    installAndBuild(options);
  }

  return report;
};
