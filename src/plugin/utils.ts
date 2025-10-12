import { convertFileSrc } from '@tauri-apps/api/core';
import { pinyin as proPinyin } from 'pinyin-pro';
import { join } from 'path-browserify';
import type { IPluginManifest } from './schema';

export const getLocalPath = (
  urlOrPath: string | undefined,
  basePath: string,
) => {
  if (
    !urlOrPath
    || /^\w+:\/\//.test(urlOrPath)
    || urlOrPath.startsWith('data:')
  ) {
    return urlOrPath;
  }
  let path = urlOrPath;
  if (!urlOrPath.startsWith('/')) {
    path = join(basePath, urlOrPath);
  }
  return convertFileSrc(path);
};

export const hanziToPinyin = (hanzi: string) => proPinyin(hanzi, { toneType: 'none' }); // 获取不带音调格式拼音 pinyin("汉语拼音", { toneType: "none" }); // "han yu pin yin"

const pinyin = (text: string) => {
  if (!text) return [];
  if (/[^\x00-\xff]/.test(text)) {
    const full: string = hanziToPinyin(text);
    if (full) {
      return [
        full.replace(/\s/g, ''),
        full.split(' ').map(i => i.trim()[0])
          .filter(i => i)
          .join('')
          .toLowerCase(),
      ];
    }
  }
  return [];
};

export const formatCommand = (command: IPluginCommandConfig, manifest: IPluginManifest, pluginPath: string): IPluginCommand => {
  const item = {
    ...command,
    name: command.name,
    title: command.title,
    subtitle: command.subtitle,
    icon: getLocalPath(command.icon ?? manifest.icon, pluginPath)!,
    mode: command.mode ?? 'none',
    entry: getLocalPath(command.entry, pluginPath),
    preload: command.preload ? join(pluginPath, command.preload) : command.preload,
  };
  const keywords: string[] = [item.name, item.title, item.subtitle || '', ...pinyin(item.title), ...pinyin(item.subtitle || '')].filter(Boolean);
  const matches = (command.matches || []).map((match) => {
    if (match.type === 'text') {
      const keywords = (match.keywords || []).map<string[]>(keyword => [keyword, ...pinyin(keyword)]).flat();
      return { ...match, keywords };
    }
    return match;
  });
  return {
    ...item,
    matches: [...matches, { type: 'text', keywords } as ITextPluginCommandMatch],
  };
};

export const pushView = (options: { path: string, params?: any }) => window.dispatchEvent(new CustomEvent('push-view', { detail: { ...options } }));

export const popView = (options: { count: number } = { count: 1 }) => window.dispatchEvent(new CustomEvent('pop-view', { detail: { ...options } }));

export const popToRoot = (options?: { clearInput?: boolean }) => window.dispatchEvent(new CustomEvent('pop-to-root', { detail: { ...options } }));

export const openPluginPreferences = (plugin: string, options?: { wait?: boolean }) => {
  if (!options?.wait) {
    return pushView({ path: '/plugin/prfs', params: { plugin } });
  }
  return new Promise<void>((resolve) => {
    pushView({ path: '/plugin/prfs', params: { plugin, done: resolve } });
  });
};

export const openCommandPreferences = (plugin: string, command: string, options?: { wait?: boolean }) => {
  if (!options?.wait) {
    return pushView({ path: '/plugin/prfs', params: { plugin, command } });
  }
  return new Promise<void>((resolve) => {
    pushView({ path: '/plugin/prfs', params: { plugin, command, done: resolve } });
  });
};

export const htmlEscape = (text: string) => String(text)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll('\'', '&#39;');
