import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

type RaycastPreference = {
  name: string;
  title?: string;
  label?: string;
  description?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  default?: unknown;
  defaultValue?: unknown;
  data?: { title?: string, label?: string, value: string | number | boolean }[];
};

type RaycastCommand = {
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  mode?: string;
  keywords?: string[];
  icon?: string;
  preferences?: RaycastPreference[];
};

type RaycastPackage = {
  name: string;
  title?: string;
  description?: string;
  icon?: string;
  commands?: RaycastCommand[];
  preferences?: RaycastPreference[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type ConvertWarning = {
  type: string;
  message: string;
};

type ConvertedCommand = RaycastCommand & {
  entry: string;
};

const args = process.argv.slice(2);

const usage = () => {
  console.error('Usage: pnpm raycast:convert <raycast-plugin-dir> --out <public-plugin-dir> [--build]');
};

const getArgValue = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
};

const shouldBuild = args.includes('--build');
const inputArg = args.find(arg => !arg.startsWith('--') && args[args.indexOf(arg) - 1] !== '--out');

if (!inputArg) {
  usage();
  process.exit(1);
}

const inputDir = path.resolve(inputArg);
const outputDir = path.resolve(getArgValue('--out') || `${inputDir}-public`);
const buildDir = path.join(outputDir, '.raycast-build');
const distDir = path.join(outputDir, 'dist');
const assetsDir = path.join(outputDir, 'assets');
const invocationDir = process.cwd();
const publicApiPath = path.join(invocationDir, 'packages', 'api', 'src', 'index.ts');
const publicApiNodePath = path.join(invocationDir, 'packages', 'api', 'src', 'node.ts');
const raycastShimPath = path.join(invocationDir, 'packages', 'api', 'src', 'raycast.ts');
const raycastUtilsShimPath = path.join(invocationDir, 'packages', 'api', 'src', 'raycast-utils.ts');
const defaultPluginIcon = 'extension';
const warnings: ConvertWarning[] = [];

const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await fs.readFile(filePath, 'utf8')) as T;

const writeJson = async (filePath: string, value: unknown) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const exists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const isUrlLike = (value: string) => /^(?:https?:|data:|asset:|public-icon:)/.test(value);
const hasPathSegment = (value: string) => value.includes('/') || value.includes('\\');

const findCommandEntry = async (command: RaycastCommand) => {
  const candidates = [
    path.join(inputDir, 'src', `${command.name}.tsx`),
    path.join(inputDir, 'src', `${command.name}.ts`),
    path.join(inputDir, 'src', `${command.name}.jsx`),
    path.join(inputDir, 'src', `${command.name}.js`),
    path.join(inputDir, 'src', command.name, 'index.tsx'),
    path.join(inputDir, 'src', command.name, 'index.ts'),
    path.join(inputDir, 'src', command.name, 'index.jsx'),
    path.join(inputDir, 'src', command.name, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
};

const mapPreferenceType = (type?: string) => {
  switch (type) {
    case 'password':
      return 'password';
    case 'textarea':
      return 'textarea';
    case 'dropdown':
      return 'select';
    case 'checkbox':
      return 'select';
    case 'textfield':
    case 'appPicker':
    case undefined:
      return 'text';
    default:
      warnings.push({ type: 'preference', message: `Unsupported preference type "${type}", converted to text` });
      return 'text';
  }
};

const convertPreference = (preference: RaycastPreference) => {
  const type = mapPreferenceType(preference.type);
  const options = preference.type === 'checkbox'
    ? [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ]
    : preference.data?.map(item => ({
      label: item.title || item.label || String(item.value),
      value: item.value,
    }));
  return {
    name: preference.name,
    title: preference.title || preference.label || preference.name,
    description: preference.description,
    type,
    required: Boolean(preference.required),
    placeholder: preference.placeholder,
    defaultValue: preference.defaultValue ?? preference.default,
    ...(options?.length ? { options } : {}),
  };
};

const copyAssetsDir = async () => {
  const source = path.join(inputDir, 'assets');
  if (!await exists(source)) return;
  await fs.cp(source, assetsDir, { recursive: true });
};

const normalizeRaycastIcon = (icon: string | undefined) => {
  if (!icon) return undefined;
  if (isUrlLike(icon)) return icon;
  if (icon.startsWith('./') || icon.startsWith('../') || icon.startsWith('/')) return icon;
  if (hasPathSegment(icon)) return `./${icon}`;
  return `./assets/${icon}`;
};

const generatePublicMain = () => `export default function createPlugin() {
  const getApi = () => window.$wujie?.props;
  return {
  async onAction(command, action, query, options) {
    const api = getApi();
    try {
      await api.channel.invoke('raycast:run', {
        commandName: command.name,
        query,
        action,
        options,
        preferences: api.getPreferences?.() || {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await api.dialog.showToast(message);
      throw error;
    }
  },
  };
}
`;

const toImportName = (index: number) => `command${index}`;

const generateServer = (commands: ConvertedCommand[], packageName: string) => {
  const imports = commands.map((command, index) => `import * as ${toImportName(index)} from ${JSON.stringify(command.entry)};`).join('\n');
  const commandMapEntries = commands.map((command, index) => `  ${JSON.stringify(command.name)}: ${toImportName(index)},`).join('\n');
  return `import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { channel } from '@public-tauri/api/node';
import { __setRaycastContext } from '@raycast/api';

${imports}

const commandModules: Record<string, any> = {
${commandMapEntries}
};

const distDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.dirname(distDir);

channel.handle('raycast:run', async (payload = {}) => {
  const commandName = String(payload.commandName || '');
  const commandModule = commandModules[commandName];
  if (!commandModule) {
    throw new Error(\`Unknown Raycast command: \${commandName}\`);
  }
  const run = commandModule.default;
  if (typeof run !== 'function') {
    throw new Error(\`Raycast command \${commandName} has no default function export\`);
  }
  __setRaycastContext({
    pluginName: ${JSON.stringify(packageName)},
    commandName,
    preferences: payload.preferences || {},
    supportPath: path.join(pluginRoot, '.raycast-compat'),
    assetsPath: path.join(pluginRoot, 'assets'),
  });
  return await run({
    arguments: {},
    fallbackText: payload.query || '',
    launchContext: payload,
  });
});
`;
};

const generateTsdownConfig = () => `export default [
  {
    entry: ${JSON.stringify(path.join(buildDir, 'public-main.ts'))},
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outDir: ${JSON.stringify(distDir)},
    outExtensions: () => ({ js: '.js' }),
    deps: {
      alwaysBundle: () => true,
    },
    alias: {
      '@public-tauri/api': ${JSON.stringify(publicApiPath)},
    },
  },
  {
    entry: ${JSON.stringify(path.join(buildDir, 'server.ts'))},
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    outDir: ${JSON.stringify(distDir)},
    outExtensions: () => ({ js: '.js' }),
    deps: {
      alwaysBundle: () => true,
    },
    alias: {
      '@public-tauri/api/node': ${JSON.stringify(publicApiNodePath)},
      '@raycast/api': ${JSON.stringify(raycastShimPath)},
      '@raycast/utils': ${JSON.stringify(raycastUtilsShimPath)},
    },
  },
];
`;

const convert = async () => {
  const sourcePackage = await readJson<RaycastPackage>(path.join(inputDir, 'package.json'));
  const sourceCommands = sourcePackage.commands || [];
  const convertedCommands: ConvertedCommand[] = [];
  const skippedCommands: { name: string, reason: string }[] = [];

  for (const command of sourceCommands) {
    if (command.mode !== 'no-view') {
      skippedCommands.push({ name: command.name, reason: `Unsupported mode: ${command.mode || '<empty>'}` });
      continue;
    }
    const entry = await findCommandEntry(command);
    if (!entry) {
      skippedCommands.push({ name: command.name, reason: 'Command entry not found under src/' });
      continue;
    }
    convertedCommands.push({ ...command, entry });
  }

  if (!convertedCommands.length) {
    throw new Error('No Raycast no-view commands were converted');
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyAssetsDir();

  const icon = normalizeRaycastIcon(sourcePackage.icon || convertedCommands[0]?.icon) || defaultPluginIcon;
  const pluginPreferences = (sourcePackage.preferences || []).map(convertPreference);
  const commandPreferences = convertedCommands.flatMap(command => (command.preferences || []).map(convertPreference));
  const preferenceNames = new Set<string>();
  const preferences = [...pluginPreferences, ...commandPreferences].filter((preference) => {
    if (preferenceNames.has(preference.name)) {
      warnings.push({ type: 'preference', message: `Duplicate preference "${preference.name}" was skipped` });
      return false;
    }
    preferenceNames.add(preference.name);
    return true;
  });

  const publicCommands = convertedCommands.map(command => ({
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

  const publicPlugin = {
    title: sourcePackage.title || sourcePackage.name,
    subtitle: sourcePackage.description || sourcePackage.name,
    description: sourcePackage.description,
    icon,
    main: './dist/public-main.js',
    server: './dist/server.js',
    ...(preferences.length ? { preferences } : {}),
    commands: publicCommands,
  };

  await writeJson(path.join(outputDir, 'package.json'), {
    name: sourcePackage.name,
    version: '1.0.0',
    type: 'module',
    private: true,
    publicPlugin,
    scripts: {
      build: 'tsdown --config tsdown.config.ts',
    },
    dependencies: {
      '@public-tauri/api': 'workspace:^',
    },
    devDependencies: {
      tsdown: 'catalog:plugin',
    },
  });
  await fs.writeFile(path.join(buildDir, 'public-main.ts'), generatePublicMain(), 'utf8');
  await fs.writeFile(path.join(buildDir, 'server.ts'), generateServer(convertedCommands, sourcePackage.name), 'utf8');
  await fs.writeFile(path.join(outputDir, 'tsdown.config.ts'), generateTsdownConfig(), 'utf8');
  await writeJson(path.join(outputDir, 'raycast-conversion-report.json'), {
    source: inputDir,
    output: outputDir,
    convertedCommands: convertedCommands.map(command => ({ name: command.name, entry: command.entry })),
    skippedCommands,
    warnings,
  });

  if (shouldBuild) {
    const result = spawnSync('pnpm', ['--filter', '@public-tauri/api', 'exec', 'tsdown', '--config', path.join(outputDir, 'tsdown.config.ts')], {
      cwd: invocationDir,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error(`Build failed with exit code ${result.status}`);
    }
  }

  console.log(`Converted ${convertedCommands.length} command(s) to ${outputDir}`);
  if (skippedCommands.length) {
    console.log(`Skipped ${skippedCommands.length} command(s). See raycast-conversion-report.json`);
  }
};

convert().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
