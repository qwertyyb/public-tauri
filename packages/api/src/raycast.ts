import type { PathLike } from 'node:fs';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipboard, dialog, mainWindow, utils } from './node';

type PreferenceValues = Record<string, unknown>;
type StorageValue = string | number | boolean;
type ClipboardContent = string | number | { text?: string, file?: PathLike, html?: string };
type CacheSubscriber = (key: string | undefined, data: string | undefined) => void;
type PopToRootTypeValue = typeof PopToRootType[keyof typeof PopToRootType];

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
const pathLikeToString = (value: PathLike) => (value instanceof URL ? fileURLToPath(value) : value.toString());

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

const readJsonFileSync = <T>(filePath: string, fallback: T): T => {
  try {
    return JSON.parse(fsSync.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
};

const writeJsonFileSync = (filePath: string, value: unknown) => {
  fsSync.mkdirSync(path.dirname(filePath), { recursive: true });
  fsSync.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
      ...currentContext.preferences,
      ...context.preferences,
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

export const showHUD = async (title: string, options?: { clearRootSearch?: boolean, popToRootType?: PopToRootTypeValue }) => {
  await closeMainWindow(options);
  await dialog.showToast(title);
};

export const closeMainWindow = async (options?: { clearRootSearch?: boolean, popToRootType?: PopToRootTypeValue }) => {
  if (options?.clearRootSearch) {
    await mainWindow.clearInput();
  }
  if (options?.popToRootType === PopToRootType.Immediate) {
    await mainWindow.popToRoot({ clearInput: options.clearRootSearch });
  }
  await mainWindow.hide();
};

export const clearSearchBar = async (_options?: { forceScrollToTop?: boolean }) => {
  await mainWindow.clearInput();
};

export const popToRoot = async (options?: { clearSearchBar?: boolean }) => {
  await mainWindow.popToRoot({ clearInput: options?.clearSearchBar });
};

export const getSelectedText = () => utils.getSelectedText();

export const getSelectedFinderItems = async () => {
  const paths = await utils.getSelectedPath();
  if (!paths.length) {
    throw new Error('[raycast-api] No selected Finder items found');
  }
  return paths.map(item => ({ path: item }));
};

export const getFrontmostApplication = async () => {
  const app = toRaycastApplication(await utils.getFrontmostApplication());
  if (!app) {
    throw new Error('[raycast-api] No frontmost application found');
  }
  return app;
};

export const getDefaultApplication = async (fileOrUrl: PathLike) => {
  const target = pathLikeToString(fileOrUrl);
  const app = toRaycastApplication(await utils.getDefaultApplication(target));
  if (!app) {
    throw new Error(`[raycast-api] No default application found for ${target}`);
  }
  return app;
};

export const getApplications = async (fileOrUrl?: PathLike) => {
  if (fileOrUrl === undefined) {
    throw new Error('[raycast-api] getApplications without a path is not supported in the no-view compatibility layer');
  }
  const apps = await utils.getApplications(fileOrUrl === undefined ? '' : pathLikeToString(fileOrUrl));
  return Array.isArray(apps) ? apps.map(toRaycastApplication).filter(Boolean) : [];
};

const getClipboardText = (content: ClipboardContent) => {
  if (typeof content === 'string' || typeof content === 'number') return String(content);
  if (content.text !== undefined) return content.text;
  if (content.html !== undefined) return content.text || content.html;
  if (content.file !== undefined) {
    throw new Error('[raycast-api] Clipboard file content is not supported in the no-view compatibility layer');
  }
  return '';
};

export const Clipboard = {
  readText: async () => (await clipboard.readText()) as string | undefined,
  read: async () => {
    const text = await clipboard.readText();
    return text ? { text } : {};
  },
  clear: () => clipboard.writeText(''),
  writeText: (text: string) => clipboard.writeText(text),
  copy: (content: ClipboardContent, _options?: { concealed?: boolean }) => clipboard.writeText(getClipboardText(content)),
  async paste(content?: ClipboardContent) {
    if (content !== undefined) {
      await clipboard.writeText(getClipboardText(content));
    }
    return clipboard.paste();
  },
};

export const open = async (target: string, application?: Application | string) => {
  if (!application) {
    await utils.runCommand(`open ${shellQuote(target)}`);
    return;
  }
  const app = typeof application === 'string' ? application : application.bundleId || application.path || application.name;
  const flag = typeof application === 'object' && application.bundleId ? '-b' : '-a';
  await utils.runCommand(`open ${flag} ${shellQuote(app)} ${shellQuote(target)}`);
};

export const trash = async (target: PathLike | PathLike[]) => {
  const paths = (Array.isArray(target) ? target : [target]).map(pathLikeToString);
  await utils.trash(paths);
};

export const showInFinder = async (target: PathLike) => {
  await utils.runCommand(`open -R ${shellQuote(pathLikeToString(target))}`);
};

export const captureException = (exception: unknown) => {
  console.error('[raycast-api] captured exception', exception);
};

export const Alert = {
  ActionStyle: {
    Default: 'default',
    Destructive: 'destructive',
    Cancel: 'cancel',
  },
} as const;

export const confirmAlert = async (options: {
  title: string,
  message?: string,
  primaryAction?: { onAction?: () => void },
  dismissAction?: { onAction?: () => void },
}) => {
  try {
    await dialog.showConfirm(options.message || options.title, options.title);
    options.primaryAction?.onAction?.();
    return true;
  } catch {
    options.dismissAction?.onAction?.();
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
  get commandMode() {
    return 'no-view';
  },
  get launchType() {
    return LaunchType.UserInitiated;
  },
  get appearance() {
    return 'light';
  },
  get textSize() {
    return 'medium';
  },
  get ownerOrAuthorName() {
    return '';
  },
  get raycastVersion() {
    return '0.0.0-public-tauri';
  },
  canAccess: () => false,
};

export const LocalStorage = {
  async getItem<T extends StorageValue = StorageValue>(key: string): Promise<T | undefined> {
    const data = await readJsonFile<Record<string, StorageValue>>(getLocalStoragePath(), {});
    return data[key] as T | undefined;
  },
  async setItem(key: string, value: StorageValue) {
    const filePath = getLocalStoragePath();
    const data = await readJsonFile<Record<string, StorageValue>>(filePath, {});
    data[key] = value;
    await writeJsonFile(filePath, data);
  },
  async removeItem(key: string) {
    const filePath = getLocalStoragePath();
    const data = await readJsonFile<Record<string, StorageValue>>(filePath, {});
    delete data[key];
    await writeJsonFile(filePath, data);
  },
  async clear() {
    await writeJsonFile(getLocalStoragePath(), {});
  },
  async allItems<T extends Record<string, StorageValue> = Record<string, StorageValue>>(): Promise<T> {
    const items = await readJsonFile<Record<string, StorageValue>>(getLocalStoragePath(), {});
    return items as T;
  },
};

export class Cache {
  private readonly namespace: string;
  private readonly subscribers = new Set<CacheSubscriber>();

  constructor(options: { namespace?: string, capacity?: number } = {}) {
    this.namespace = options.namespace || 'default';
  }

  private get filePath() {
    return getCachePath(this.namespace);
  }

  get isEmpty() {
    return Object.keys(readJsonFileSync<Record<string, string>>(this.filePath, {})).length === 0;
  }

  get(key: string): string | undefined {
    const data = readJsonFileSync<Record<string, string>>(this.filePath, {});
    return data[key];
  }

  has(key: string): boolean {
    const data = readJsonFileSync<Record<string, string>>(this.filePath, {});
    return Object.prototype.hasOwnProperty.call(data, key);
  }

  set(key: string, value: string) {
    const data = readJsonFileSync<Record<string, string>>(this.filePath, {});
    data[key] = value;
    writeJsonFileSync(this.filePath, data);
    this.notify(key, value);
  }

  remove(key: string) {
    const data = readJsonFileSync<Record<string, string>>(this.filePath, {});
    const existed = Object.prototype.hasOwnProperty.call(data, key);
    delete data[key];
    writeJsonFileSync(this.filePath, data);
    if (existed) this.notify(key, undefined);
    return existed;
  }

  clear(options: { notifySubscribers?: boolean } = { notifySubscribers: true }) {
    writeJsonFileSync(this.filePath, {});
    if (options.notifySubscribers !== false) this.notify(undefined, undefined);
  }

  subscribe(subscriber: CacheSubscriber) {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify(key: string | undefined, data: string | undefined) {
    this.subscribers.forEach(subscriber => subscriber(key, data));
  }
}

export const LaunchType = {
  UserInitiated: 'userInitiated',
  Background: 'background',
} as const;

export const PopToRootType = {
  Default: 'default',
  Immediate: 'immediate',
  Suspended: 'suspended',
} as const;

export const UNIMPLEMENTED_RAYCAST_APIS = [
  'AI.ask',
  'BrowserExtension.getContent',
  'BrowserExtension.getTabs',
  'OAuth.PKCEClient',
  'launchCommand',
  'updateCommandMetadata',
  'openExtensionPreferences',
  'openCommandPreferences',
  'getApplications() without a path',
  'Clipboard.copy/paste file content',
  'Clipboard.copy/paste html content as rich HTML',
  'Clipboard.read file/html/history offsets',
  'Toast primaryAction/secondaryAction interactions',
  'Alert icon/rememberUserChoice/action styles',
  'Cache LRU capacity enforcement',
  'environment.canAccess real entitlement checks',
  'environment.appearance real theme',
  'environment.textSize real setting',
  'environment.raycastVersion real Raycast version',
  'environment.ownerOrAuthorName manifest value',
  'LaunchProps.arguments from command manifest',
  'LaunchProps.launchType/background launches',
  'LaunchProps.draftValues',
  'LaunchProps.launchContext from launchCommand',
  'List',
  'Form',
  'Detail',
  'Grid',
  'ActionPanel',
  'Action',
  'MenuBarExtra',
  'Icon',
  'Image',
  'Color',
  'Keyboard',
] as const;

export const AI = { ask: () => unsupported('AI.ask') };
export const BrowserExtension = {
  getContent: () => unsupported('BrowserExtension.getContent'),
  getTabs: () => unsupported('BrowserExtension.getTabs'),
};
export const OAuth = { PKCEClient: class PKCEClient {
  constructor() {
    unsupported('OAuth.PKCEClient');
  }
} };
export const launchCommand = () => unsupported('launchCommand');
export const updateCommandMetadata = () => unsupported('updateCommandMetadata');
export const openExtensionPreferences = () => unsupported('openExtensionPreferences');
export const openCommandPreferences = () => unsupported('openCommandPreferences');

export const List = () => unsupported('List');
export const Form = () => unsupported('Form');
export const Detail = () => unsupported('Detail');
export const Grid = () => unsupported('Grid');
export const ActionPanel = () => unsupported('ActionPanel');
export const Action = () => unsupported('Action');
export const MenuBarExtra = () => unsupported('MenuBarExtra');
