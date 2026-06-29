import type { PathLike } from 'node:fs';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipboard, dialog, launchCommand as launchPublicCommand, mainWindow, openCommandPreferences as openPublicCommandPreferences, openPluginPreferences, storage, updateCommand, utils } from '../node';
export * from './components/Action';
export * from './components/ActionPanel';
export * from './components/Color';
export * from './components/Detail';
export * from './components/Form';
export * from './components/Icon';
export * from './components/Image';
export * from './components/List';

type PreferenceValues = Record<string, unknown>;
type StorageValue = string | number | boolean;
type ClipboardContent = string | number | { text?: string, file?: PathLike, html?: string };
type CacheSubscriber = (key: string | undefined, data: string | undefined) => void;
type PopToRootTypeValue = typeof PopToRootType[keyof typeof PopToRootType];
type LaunchTypeValue = typeof LaunchType[keyof typeof LaunchType];
type RaycastCommandManifest = Record<string, unknown> & { name: string, subtitle?: string };

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
  commands?: RaycastCommandManifest[];
  launchType?: LaunchTypeValue;
  preferences?: PreferenceValues;
  supportPath?: string;
  assetsPath?: string;
  commandMode?: 'no-view' | 'view';
};

/** tsdown 会把 @raycast/api 打进 server 与各 command chunk，模块级变量不共享；用 globalThis 存上下文。 */
const RAYCAST_CONTEXT_GLOBAL_KEY = '__publicTauriRaycastContext__';

type GlobalWithRaycastContext = typeof globalThis & {
  [RAYCAST_CONTEXT_GLOBAL_KEY]?: RaycastContext;
};

const readRaycastContext = (): RaycastContext => (
  (globalThis as GlobalWithRaycastContext)[RAYCAST_CONTEXT_GLOBAL_KEY] ?? {}
);

const writeRaycastContext = (next: RaycastContext) => {
  (globalThis as GlobalWithRaycastContext)[RAYCAST_CONTEXT_GLOBAL_KEY] = next;
};

const unsupported = (name: string) => {
  throw new Error(`[raycast-api] ${name} is not supported in the no-view compatibility layer`);
};

const shellQuote = (value: string) => `'${value.split('\'').join('\'\\\'\'')}'`;
const pathLikeToString = (value: PathLike) => (value instanceof URL ? fileURLToPath(value) : value.toString());

const getSupportPath = () => readRaycastContext().supportPath || path.join(process.cwd(), '.raycast-compat');

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
  const current = readRaycastContext();
  writeRaycastContext({
    ...current,
    ...context,
    preferences: {
      ...current.preferences,
      ...context.preferences,
    },
  });
};

export const __getRaycastContext = () => readRaycastContext();

const formatToastBody = (title: string, message?: string) => (
  [title, message].filter(Boolean).join('\n')
);

const isToastOptions = (value: unknown): value is Toast.Options => (
  typeof value === 'object'
  && value !== null
  && 'title' in value
  && typeof (value as Toast.Options).title === 'string'
);

export class Toast {
  static Style = {
    Success: 'SUCCESS',
    Failure: 'FAILURE',
    Animated: 'ANIMATED',
  } as const;

  private _style: Toast.Style = Toast.Style.Success;
  private _title = '';
  private _message?: string;
  private _primaryAction?: Toast.ActionOptions;
  private _secondaryAction?: Toast.ActionOptions;
  private _hidden = false;

  /** @deprecated Use {@link showToast} instead */
  constructor(props: Toast.Options) {
    this.applyOptions(props);
  }

  private applyOptions(props: Toast.Options) {
    this._style = props.style ?? Toast.Style.Success;
    this._title = props.title;
    this._message = props.message;
    this._primaryAction = props.primaryAction;
    this._secondaryAction = props.secondaryAction;
  }

  get style(): Toast.Style {
    return this._style;
  }

  set style(value: Toast.Style) {
    this._style = value;
    this.pushHost();
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
    this.pushHost();
  }

  get message(): string | undefined {
    return this._message;
  }

  set message(value: string | undefined) {
    this._message = value;
    this.pushHost();
  }

  get primaryAction(): Toast.ActionOptions | undefined {
    return this._primaryAction;
  }

  set primaryAction(value: Toast.ActionOptions | undefined) {
    this._primaryAction = value;
  }

  get secondaryAction(): Toast.ActionOptions | undefined {
    return this._secondaryAction;
  }

  set secondaryAction(value: Toast.ActionOptions | undefined) {
    this._secondaryAction = value;
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async show(): Promise<void> {
    this._hidden = false;
    this.pushHost();
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  async hide(): Promise<void> {
    this._hidden = true;
  }

  private pushHost() {
    if (this._hidden) return;
    const icon = (() => {
      switch (this._style) {
        case Toast.Style.Failure:
          return 'error';
        case Toast.Style.Animated:
          return 'loading';
        case Toast.Style.Success:
        default:
          return 'success';
      }
    })();
    const duration = this._style === Toast.Style.Animated ? 2_000 : undefined;
    void dialog.showToast(formatToastBody(this._title, this._message), {
      icon,
      duration,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Toast {
  export type Style = (typeof Toast.Style)[keyof typeof Toast.Style];
  export interface Options {
    title: string;
    message?: string;
    style?: Style;
    primaryAction?: ActionOptions;
    secondaryAction?: ActionOptions;
  }
  export interface ActionOptions {
    title: string;
    shortcut?: unknown;
    onAction: (toast: Toast) => void;
  }
}

/** @deprecated Use {@link Toast.Style} */
export type ToastStyle = Toast.Style;

/** @deprecated Use {@link Toast.Options} */
export type ToastOptions = Toast.Options;

/** @deprecated Use {@link Toast.Style} */
export const ToastStyle = Toast.Style;

/** @deprecated Use {@link Toast.ActionOptions} */
export type ToastActionOptions = Toast.ActionOptions;

export async function showToast(options: Toast.Options): Promise<Toast>;
export async function showToast(style: Toast.Style, title: string, message?: string): Promise<Toast>;
export async function showToast(
  styleOrOptions: Toast.Options | Toast.Style,
  title?: string,
  message?: string,
): Promise<Toast> {
  const options: Toast.Options = isToastOptions(styleOrOptions)
    ? styleOrOptions
    : {
      style: styleOrOptions as Toast.Style,
      title: title ?? '',
      message,
    };
  const toast = new Toast(options);
  await toast.show();
  return toast;
}

export const showHUD = async (title: string, options?: { clearRootSearch?: boolean, popToRootType?: PopToRootTypeValue }) => {
  await closeMainWindow(options);
  await dialog.showHUD(title);
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

/** @deprecated 使用 {@link getPreferenceValues} */
export const preferences = {
  get(name: string) {
    return readRaycastContext().preferences?.[name];
  },
  set(name: string, value: unknown) {
    const current = readRaycastContext();
    writeRaycastContext({
      ...current,
      preferences: { ...current.preferences, [name]: value },
    });
  },
};

export const getPreferenceValues = <T extends PreferenceValues = PreferenceValues>(): T => (readRaycastContext().preferences || {}) as T;

export const environment = {
  get extensionName() {
    return readRaycastContext().pluginName || '';
  },
  get commandName() {
    return readRaycastContext().commandName || '';
  },
  get assetsPath() {
    return readRaycastContext().assetsPath || path.join(process.cwd(), 'assets');
  },
  get supportPath() {
    return getSupportPath();
  },
  get isDevelopment() {
    return process.env.NODE_ENV !== 'production';
  },
  get commandMode() {
    return readRaycastContext().commandMode || 'no-view';
  },
  get launchType() {
    return readRaycastContext().launchType || LaunchType.UserInitiated;
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
    return await storage.getItem(key) as T | undefined;
  },
  async setItem(key: string, value: StorageValue) {
    await storage.setItem(key, value);
  },
  async removeItem(key: string) {
    await storage.removeItem(key);
  },
  async clear() {
    await storage.clear('');
  },
  async allItems<T extends Record<string, StorageValue> = Record<string, StorageValue>>(): Promise<T> {
    const items = await storage.allItems('') as Record<string, StorageValue>;
    const { pluginName } = readRaycastContext();
    if (!pluginName) {
      return items as T;
    }
    const prefix = `${pluginName}:`;
    return Object.entries(items).reduce<Record<string, StorageValue>>((acc, [fullKey, value]) => {
      if (fullKey.startsWith(prefix)) {
        acc[fullKey.slice(prefix.length)] = value;
      }
      return acc;
    }, {}) as T;
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
  'Form',
  'Grid',
  'MenuBarExtra',
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
export const launchCommand = (options: {
  name: string,
  type: LaunchTypeValue,
  extensionName?: string,
  ownerOrAuthorName?: string,
  arguments?: Record<string, unknown> | null,
  context?: unknown,
  fallbackText?: string | null,
}) => launchPublicCommand({
  pluginName: options.extensionName,
  commandName: options.name,
  query: options.fallbackText || '',
  payload: {
    arguments: options.arguments || {},
    context: options.context ?? null,
    fallbackText: options.fallbackText || '',
    launchType: options.type,
    ownerOrAuthorName: options.ownerOrAuthorName,
  },
});
export const updateCommandMetadata = (metadata: { subtitle?: string | null } = {}) => {
  const ctx = readRaycastContext();
  if (!ctx.commandName) {
    throw new Error('[raycast-api] updateCommandMetadata requires a command context');
  }
  if (!Object.prototype.hasOwnProperty.call(metadata, 'subtitle')) {
    return Promise.resolve();
  }
  const originalCommand = ctx.commands?.find(command => command.name === ctx.commandName);
  const subtitle = metadata.subtitle === null ? originalCommand?.subtitle : metadata.subtitle;
  return updateCommand(ctx.commandName, { subtitle });
};
export const openExtensionPreferences = () => openPluginPreferences();
export const openCommandPreferences = () => {
  const ctx = readRaycastContext();
  if (!ctx.commandName) {
    throw new Error('[raycast-api] openCommandPreferences requires a command context');
  }
  return openPublicCommandPreferences(ctx.commandName);
};

export { List } from './components/List';
export { Detail } from './components/Detail';
export type { DetailProps } from './components/Detail';
export { Color } from './components/Color';
export type { ColorLike } from './components/Color';
export { Icon } from './components/Icon';
export { Image } from './components/Image';
export {
  ActionPanel,
  ActionPanelSection,
  ActionPanelSubmenu,
} from './components/ActionPanel';
export type {
  ActionPanelProps,
  ActionPanelSectionProps,
  ActionPanelSubmenuProps,
} from './components/ActionPanel';
export {
  Action,
  ActionStyle,
  PickDateType,
} from './components/Action';
export type {
  RaycastImageLike,
  AlertActionStyle,
  ClipboardContent,
  KeyboardKeyModifier,
  KeyboardShortcut,
  Snippet,
  Quicklink,
  FormValues,
  ActionProps,
  ActionSubmitFormProps,
  ActionCopyToClipboardProps,
  ActionOpenProps,
  ActionOpenInBrowserProps,
  ActionOpenWithProps,
  ActionPasteProps,
  ActionPushProps,
  ActionShowInFinderProps,
  ActionTrashProps,
  ActionPopProps,
  ActionCreateSnippetProps,
  ActionCreateQuicklinkProps,
  ActionToggleQuickLookProps,
  ActionPickDateProps,
  PickDateTypeValue,
  ActionStyleValue,
  ActionComponent,
} from './components/Action';
export const Grid = () => unsupported('Grid');
export const MenuBarExtra = () => unsupported('MenuBarExtra');
