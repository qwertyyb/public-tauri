/**
 * Raycast {@link Action} 兼容实现。
 * @see https://developers.raycast.com/api-reference/user-interface/actions
 */
import type { PathLike } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { clipboard, dialog, launchCommand, mainWindow, utils } from '../../node';
import type { Image } from './Image';

/** 与 Raycast {@link Image.ImageLike} 一致 */
export type RaycastImageLike = Image.ImageLike;

/** Raycast `Keyboard.KeyModifier` */
export type KeyboardKeyModifier = 'cmd' | 'ctrl' | 'opt' | 'shift' | 'windows' | 'alt';

/** Raycast `Keyboard.Shortcut` */
export type KeyboardShortcut = { modifiers?: KeyboardKeyModifier[]; key?: string };

/** Raycast `Clipboard.Content` */
export type ClipboardContent = string | number | { text?: string; html?: string; file?: PathLike };

/** Raycast `Application`（与 utilities 文档一致） */
export type RaycastApplication = {
  name: string;
  path: string;
  bundleId?: string;
  localizedName?: string;
  windowsAppId?: string;
};

/** Raycast `Alert.ActionStyle` */
export type AlertActionStyle = 'default' | 'destructive' | 'cancel';

export type Snippet = {
  text: string;
  keyword?: string;
  name?: string;
};

export type Quicklink = {
  link: string;
  application?: string | RaycastApplication;
  icon?: unknown;
  name?: string;
};

/** Raycast `Form.Values` 占位；完整 Form 未实现时为宽松字典 */
export type FormValues = Record<string, unknown>;

export type ActionProps = {
  title: string;
  autoFocus?: boolean;
  icon?: RaycastImageLike;
  shortcut?: KeyboardShortcut;
  style?: AlertActionStyle;
  onAction?: () => void | Promise<void>;
};

const shellQuote = (value: string) => `'${String(value).split('\'')
  .join('\'\\\'\'')}'`;

const pathLikeToString = (value: PathLike) => (value instanceof URL ? fileURLToPath(value) : value.toString());

async function writeClipboardContent(content: ClipboardContent): Promise<void> {
  if (typeof content === 'string' || typeof content === 'number') {
    await clipboard.writeText(String(content));
    return;
  }
  const filePath = content.file === undefined || content.file === null
    ? ''
    : pathLikeToString(content.file as PathLike);
  const text = content.text ?? content.html ?? filePath;
  await clipboard.writeText(String(text));
}

async function raycastOpen(target: string, application?: string | RaycastApplication): Promise<void> {
  if (!application) {
    await utils.runCommand(`open ${shellQuote(target)}`);
    return;
  }
  const app = typeof application === 'string' ? application : application.bundleId || application.path || application.name;
  const flag = typeof application === 'object' && application.bundleId ? '-b' : '-a';
  await utils.runCommand(`open ${flag} ${shellQuote(app)} ${shellQuote(target)}`);
}

function toApplicationLike(fromUnknown: unknown): string | RaycastApplication | undefined {
  if (typeof fromUnknown === 'string') return fromUnknown;
  if (!fromUnknown || typeof fromUnknown !== 'object') return undefined;
  const o = fromUnknown as RaycastApplication;
  if (o.path || o.name || o.bundleId) return o;
  return undefined;
}

function pickDateIsFullDay(date: Date): boolean {
  return (
    date.getHours() === 0
    && date.getMinutes() === 0
    && date.getSeconds() === 0
    && date.getMilliseconds() === 0
  );
}

function ActionImpl(props: ActionProps) {
  return React.createElement('raycast:action', props);
}

export const ActionStyle = {
  Regular: 'regular',
  Destructive: 'destructive',
} as const;

export type ActionStyleValue = (typeof ActionStyle)[keyof typeof ActionStyle];

export type ActionSubmitFormProps = {
  icon?: RaycastImageLike;
  onSubmit?: (input: FormValues) => boolean | void | Promise<boolean | void>;
  shortcut?: KeyboardShortcut;
  style?: AlertActionStyle;
  title?: string;
};

function ActionSubmitForm(props: ActionSubmitFormProps) {
  return React.createElement(ActionImpl, {
    title: props.title ?? 'Submit',
    icon: props.icon,
    shortcut: props.shortcut,
    style: props.style,
    onAction: () => {
      void props.onSubmit?.({});
    },
  });
}

export type ActionCopyToClipboardProps = {
  content: ClipboardContent;
  concealed?: boolean;
  icon?: RaycastImageLike;
  onCopy?: (content: ClipboardContent) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionCopyToClipboard(props: ActionCopyToClipboardProps) {
  return React.createElement(ActionImpl, {
    title: props.title ?? 'Copy to Clipboard',
    icon: props.icon,
    shortcut: props.shortcut,
    onAction: async () => {
      await writeClipboardContent(props.content);
      props.onCopy?.(props.content);
      void dialog.showHUD('Copied to clipboard');
    },
  });
}

export type ActionOpenProps = {
  target: string;
  title: string;
  application?: string | RaycastApplication;
  icon?: RaycastImageLike;
  onOpen?: (target: string) => void;
  shortcut?: KeyboardShortcut;
};

function ActionOpen(p: ActionOpenProps) {
  return React.createElement(ActionImpl, {
    title: p.title,
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: async () => {
      await raycastOpen(p.target, p.application);
      p.onOpen?.(p.target);
    },
  });
}

export type ActionOpenInBrowserProps = {
  url: string;
  icon?: RaycastImageLike;
  onOpen?: (url: string) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionOpenInBrowser(p: ActionOpenInBrowserProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Open in Browser',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: async () => {
      await utils.runCommand(`open ${shellQuote(p.url)}`);
      p.onOpen?.(p.url);
    },
  });
}

export type ActionOpenWithProps = {
  path: string;
  icon?: RaycastImageLike;
  onOpen?: (path: string) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionOpenWith(p: ActionOpenWithProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Open With',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: async () => {
      try {
        const apps = (await utils.getApplications(p.path)) as unknown[];
        const first = apps?.[0];
        const app = toApplicationLike(first);
        await raycastOpen(p.path, app);
      } catch {
        await utils.runCommand(`open ${shellQuote(p.path)}`);
      }
      p.onOpen?.(p.path);
    },
  });
}

export type ActionPasteProps = {
  content: ClipboardContent;
  icon?: RaycastImageLike;
  onPaste?: (content: ClipboardContent) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionPaste(p: ActionPasteProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Paste',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: async () => {
      await writeClipboardContent(p.content);
      await clipboard.paste();
      p.onPaste?.(p.content);
    },
  });
}

export type ActionPushProps = {
  target: React.ReactNode;
  title: string;
  icon?: RaycastImageLike;
  onPop?: () => void;
  onPush?: () => void;
  shortcut?: KeyboardShortcut;
};

function ActionPush(p: ActionPushProps) {
  void p.target;
  return React.createElement(ActionImpl, {
    title: p.title,
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: () => {
      p.onPush?.();
      void dialog.showHUD('Push navigation is not available in this runtime.');
    },
  });
}

export type ActionShowInFinderProps = {
  path: PathLike;
  icon?: RaycastImageLike;
  onShow?: (path: PathLike) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionShowInFinder(p: ActionShowInFinderProps) {
  const pathStr = pathLikeToString(p.path);
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Show in Finder',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: async () => {
      await utils.runCommand(`open -R ${shellQuote(pathStr)}`);
      p.onShow?.(p.path);
    },
  });
}

export type ActionTrashProps = {
  paths: PathLike | PathLike[];
  icon?: RaycastImageLike;
  onTrash?: (paths: PathLike | PathLike[]) => void;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionTrash(p: ActionTrashProps) {
  const pathsArr = Array.isArray(p.paths) ? p.paths : [p.paths];
  const asStrings = pathsArr.map(pathLikeToString);
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Move to Trash',
    icon: p.icon,
    shortcut: p.shortcut,
    style: 'destructive',
    onAction: async () => {
      await utils.trash(asStrings);
      p.onTrash?.(p.paths);
    },
  });
}

export type ActionPopProps = { title?: string };

function ActionPop(p: ActionPopProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Back',
    onAction: () => {
      mainWindow.popView({ count: 1 });
    },
  });
}

export type ActionCreateSnippetProps = {
  snippet: Snippet;
  icon?: RaycastImageLike;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionCreateSnippet(p: ActionCreateSnippetProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Create Snippet',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: () => {
      void launchCommand({
        commandName: 'create-snippet',
        payload: { arguments: { snippet: p.snippet } },
      }).catch(() => {
        void dialog.showHUD('Create Snippet is only available in Raycast.');
      });
    },
  });
}

export type ActionCreateQuicklinkProps = {
  quicklink: Quicklink;
  icon?: RaycastImageLike;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionCreateQuicklink(p: ActionCreateQuicklinkProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Create Quicklink',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: () => {
      void launchCommand({
        commandName: 'create-quicklink',
        payload: { arguments: { quicklink: p.quicklink } },
      }).catch(() => {
        void dialog.showHUD('Create Quicklink is only available in Raycast.');
      });
    },
  });
}

export type ActionToggleQuickLookProps = {
  icon?: RaycastImageLike;
  shortcut?: KeyboardShortcut;
  title?: string;
};

function ActionToggleQuickLook(p: ActionToggleQuickLookProps) {
  return React.createElement(ActionImpl, {
    title: p.title ?? 'Toggle Quick Look',
    icon: p.icon,
    shortcut: p.shortcut,
    onAction: () => {
      void dialog.showHUD('Quick Look is not available in this runtime.');
    },
  });
}

export const PickDateType = {
  DateTime: 'date-time',
  Date: 'date',
} as const;

export type PickDateTypeValue = (typeof PickDateType)[keyof typeof PickDateType];

export type ActionPickDateProps = {
  title: string;
  onChange: (date: Date) => void;
  icon?: RaycastImageLike;
  max?: Date;
  min?: Date;
  shortcut?: KeyboardShortcut;
  type?: PickDateTypeValue;
};

function ActionPickDate(props: ActionPickDateProps) {
  const { title, icon, shortcut, onChange, type, min, max } = props;
  void onChange;
  void type;
  void min;
  void max;
  return React.createElement(ActionImpl, {
    title,
    icon,
    shortcut,
    onAction: () => {
      void dialog.showHUD('Date picker is not available in this runtime.');
    },
  });
}

Object.assign(ActionPickDate, {
  Type: PickDateType,
  isFullDay: pickDateIsFullDay,
});

export type ActionComponent = typeof ActionImpl & {
  Style: typeof ActionStyle;
  CopyToClipboard: typeof ActionCopyToClipboard;
  Open: typeof ActionOpen;
  OpenInBrowser: typeof ActionOpenInBrowser;
  OpenWith: typeof ActionOpenWith;
  Paste: typeof ActionPaste;
  Push: typeof ActionPush;
  ShowInFinder: typeof ActionShowInFinder;
  SubmitForm: typeof ActionSubmitForm;
  Trash: typeof ActionTrash;
  Pop: typeof ActionPop;
  CreateSnippet: typeof ActionCreateSnippet;
  CreateQuicklink: typeof ActionCreateQuicklink;
  ToggleQuickLook: typeof ActionToggleQuickLook;
  PickDate: typeof ActionPickDate;
};

export const Action = Object.assign(ActionImpl, {
  Style: ActionStyle,
  CopyToClipboard: ActionCopyToClipboard,
  Open: ActionOpen,
  OpenInBrowser: ActionOpenInBrowser,
  OpenWith: ActionOpenWith,
  Paste: ActionPaste,
  Push: ActionPush,
  ShowInFinder: ActionShowInFinder,
  SubmitForm: ActionSubmitForm,
  Trash: ActionTrash,
  Pop: ActionPop,
  CreateSnippet: ActionCreateSnippet,
  CreateQuicklink: ActionCreateQuicklink,
  ToggleQuickLook: ActionToggleQuickLook,
  PickDate: ActionPickDate,
}) as ActionComponent;

/** @deprecated 使用 {@link Action.CopyToClipboard} */
export const CopyToClipboardAction = ActionCopyToClipboard;

/** @deprecated 使用 {@link Action.Open} */
export const OpenAction = ActionOpen;

/** @deprecated 使用 {@link Action.OpenInBrowser} */
export const OpenInBrowserAction = ActionOpenInBrowser;

/** @deprecated 使用 {@link Action.OpenWith} */
export const OpenWithAction = ActionOpenWith;

/** @deprecated 使用 {@link Action.Paste} */
export const PasteAction = ActionPaste;

/** @deprecated 使用 {@link Action.Push} */
export const PushAction = ActionPush;

/** @deprecated 使用 {@link Action.ShowInFinder} */
export const ShowInFinderAction = ActionShowInFinder;

/** @deprecated 使用 {@link Action.SubmitForm} */
export const SubmitFormAction = ActionSubmitForm;

/** @deprecated 使用 {@link Action.Trash} */
export const TrashAction = ActionTrash;
