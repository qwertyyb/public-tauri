import fs from 'node:fs/promises';
import path from 'node:path';
import { clipboard, dialog, mainWindow, utils } from './node';

type PreferenceValues = Record<string, unknown>;

export type Application = {
  name: string;
  path: string;
  bundleId?: string;
  localizedName?: string;
  windowsAppId?: string;
};

export type RaycastContext = {
  pluginName?: string;
  commandName?: string;
  preferences?: PreferenceValues;
  supportPath?: string;
  assetsPath?: string;
};

let currentContext: RaycastContext = {};

const unsupported = (name: string) => {
  throw new Error(`[raycast-api] ${name} is not supported in the no-view compatibility layer`);
};

const shellQuote = (value: string) => `'${value.split('\'').join('\'\\\'\'')}'`;

const getSupportPath = () => currentContext.supportPath || path.join(process.cwd(), '.raycast-compat');

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const writeJsonFile = async (filePath: string, value: unknown) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const getLocalStoragePath = () => path.join(getSupportPath(), 'local-storage.json');

const getCachePath = (namespace = 'default') => path.join(getSupportPath(), 'cache', `${namespace}.json`);

const toRaycastApplication = (value: unknown): Application | null => {
  if (!value || typeof value !== 'object') return null;
  const app = value as {
    displayName?: string;
    executablePath?: string;
    bundleIdentifier?: string;
    name?: string;
    path?: string;
    bundleId?: string;
    localizedName?: string;
    windowsAppId?: string;
  };
  return {
    name: app.name || app.displayName || '',
    path: app.path || app.executablePath || '',
    bundleId: app.bundleId || app.bundleIdentifier || undefined,
    localizedName: app.localizedName || app.displayName || app.name || undefined,
    windowsAppId: app.windowsAppId,
  };
};

export const __setRaycastContext = (context: RaycastContext) => {
  currentContext = {
    ...currentContext,
    ...context,
    preferences: {
      ...(currentContext.preferences || {}),
      ...(context.preferences || {}),
    },
  };
};

export const __getRaycastContext = () => currentContext;

export const Toast = {
  Style: {
    Success: 'SUCCESS',
    Failure: 'FAILURE',
    Animated: 'ANIMATED',
  },
} as const;

export type ToastStyle = typeof Toast.Style[keyof typeof Toast.Style];

export type ToastOptions = {
  style?: ToastStyle;
  title: string;
  message?: string;
  primaryAction?: unknown;
  secondaryAction?: unknown;
};

export const showToast = async (
  styleOrOptions: ToastStyle | ToastOptions,
  title?: string,
  message?: string,
) => {
  const options: ToastOptions = typeof styleOrOptions === 'string'
    ? { style: styleOrOptions, title: title || '', message }
    : styleOrOptions;
  const text = [options.title, options.message].filter(Boolean).join('\n');
  await dialog.showToast(text || options.style || '');
  return {
    ...options,
    hide: async () => {},
    show: async () => {},
  };
};

export const showHUD = async (title: string) => showToast({ title });

export const closeMainWindow = async () => {
  await mainWindow.hide();
};

export const getSelectedText = () => utils.getSelectedText();

export const getFrontmostApplication = async () => {
  const app = toRaycastApplication(await utils.getFrontmostApplication());
  if (!app) {
    throw new Error('[raycast-api] No frontmost application found');
  }
  return app;
};

export const getDefaultApplication = async (fileOrUrl: string) => {
  const app = toRaycastApplication(await utils.getDefaultApplication(fileOrUrl));
  if (!app) {
    throw new Error(`[raycast-api] No default application found for ${fileOrUrl}`);
  }
  return app;
};

export const Clipboard = {
  readText: () => clipboard.readText() as Promise<string | null>,
  writeText: (text: string) => clipboard.writeText(text),
  copy: (content: string | { text?: string }) => {
    const text = typeof content === 'string' ? content : content.text;
    if (text === undefined) {
      throw new Error('[raycast-api] Clipboard.copy only supports text content in Phase 1');
    }
    return clipboard.writeText(text);
  },
  paste: () => clipboard.paste(),
};

export const open = async (target: string) => {
  await utils.runCommand(`open ${shellQuote(target)}`);
};

export const confirmAlert = async (options: { title: string, message?: string, primaryAction?: unknown, dismissAction?: unknown }) => {
  try {
    await dialog.showConfirm(options.message || options.title, options.title);
    return true;
  } catch {
    return false;
  }
};

export const getPreferenceValues = <T extends PreferenceValues = PreferenceValues>(): T => (currentContext.preferences || {}) as T;

export const environment = {
  get extensionName() {
    return currentContext.pluginName || '';
  },
  get commandName() {
    return currentContext.commandName || '';
  },
  get assetsPath() {
    return currentContext.assetsPath || path.join(process.cwd(), 'assets');
  },
  get supportPath() {
    return getSupportPath();
  },
  get isDevelopment() {
    return process.env.NODE_ENV !== 'production';
  },
};

export const LocalStorage = {
  async getItem<T extends string = string>(key: string): Promise<T | undefined> {
    const data = await readJsonFile<Record<string, string>>(getLocalStoragePath(), {});
    return data[key] as T | undefined;
  },
  async setItem(key: string, value: string) {
    const filePath = getLocalStoragePath();
    const data = await readJsonFile<Record<string, string>>(filePath, {});
    data[key] = value;
    await writeJsonFile(filePath, data);
  },
  async removeItem(key: string) {
    const filePath = getLocalStoragePath();
    const data = await readJsonFile<Record<string, string>>(filePath, {});
    delete data[key];
    await writeJsonFile(filePath, data);
  },
  async clear() {
    await writeJsonFile(getLocalStoragePath(), {});
  },
  async allItems<T extends Record<string, string> = Record<string, string>>(): Promise<T> {
    return await readJsonFile<T>(getLocalStoragePath(), {} as T);
  },
};

export class Cache {
  private readonly namespace: string;

  constructor(options: { namespace?: string } = {}) {
    this.namespace = options.namespace || 'default';
  }

  private get filePath() {
    return getCachePath(this.namespace);
  }

  async get(key: string): Promise<string | undefined> {
    const data = await readJsonFile<Record<string, string>>(this.filePath, {});
    return data[key];
  }

  async set(key: string, value: string) {
    const data = await readJsonFile<Record<string, string>>(this.filePath, {});
    data[key] = value;
    await writeJsonFile(this.filePath, data);
  }

  async remove(key: string) {
    const data = await readJsonFile<Record<string, string>>(this.filePath, {});
    delete data[key];
    await writeJsonFile(this.filePath, data);
  }

  async clear() {
    await writeJsonFile(this.filePath, {});
  }
}

export const List = () => unsupported('List');
export const Form = () => unsupported('Form');
export const Detail = () => unsupported('Detail');
export const Grid = () => unsupported('Grid');
export const ActionPanel = () => unsupported('ActionPanel');
export const Action = () => unsupported('Action');
export const MenuBarExtra = () => unsupported('MenuBarExtra');
