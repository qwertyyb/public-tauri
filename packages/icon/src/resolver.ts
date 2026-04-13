import { convertFileSrc } from '@tauri-apps/api/core';
import type { ResolvedIcon, ResolveContext } from './types';

const PUBLIC_ICON_SCHEME = 'public-icon://';

/** 解析后的协议描述（parseIconProtocol 返回） */
export type ParsedIcon =
  | { type: 'builtin'; name: string }
  | { type: 'fileicon'; path: string; darkPath?: string; size?: number }
  | { type: 'local'; path: string; darkPath?: string }
  | { type: 'remote'; url: string; darkUrl?: string }
  | { type: 'data'; value: string; darkValue?: string }
  | { type: 'passthrough'; value: string };

function parsePublicIconScheme(icon: string): ParsedIcon {
  const url = new URL(icon);
  const { host } = url;

  switch (host) {
    case 'builtin': {
      const name = url.pathname.slice(1);
      return { type: 'builtin', name };
    }
    case 'fileicon': {
      const p = url.searchParams.get('path');
      if (!p) throw new Error('fileicon protocol requires "path" parameter');
      const dark = url.searchParams.get('dark') ?? undefined;
      const sizeParam = url.searchParams.get('size');
      const size = sizeParam ? Number(sizeParam) : undefined;
      return { type: 'fileicon', path: p, darkPath: dark, size };
    }
    case 'local': {
      const path = url.searchParams.get('path');
      if (!path) throw new Error('local protocol requires "path" parameter');
      const dark = url.searchParams.get('dark') ?? undefined;
      return { type: 'local', path, darkPath: dark };
    }
    case 'remote': {
      const urlParam = url.searchParams.get('url');
      if (!urlParam) throw new Error('remote protocol requires "url" parameter');
      const dark = url.searchParams.get('dark') ?? undefined;
      return { type: 'remote', url: urlParam, darkUrl: dark };
    }
    case 'data': {
      const value = url.searchParams.get('value');
      if (!value) throw new Error('data protocol requires "value" parameter');
      const dark = url.searchParams.get('dark') ?? undefined;
      return { type: 'data', value, darkValue: dark };
    }
    default:
      throw new Error(`Unknown public-icon host: "${host}"`);
  }
}

/**
 * 安全拼接路径，避免双斜杠
 */
function joinPath(base: string, segment: string): string {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${b}/${segment}`;
}

/**
 * 将文件路径解析为绝对路径，再转换为 Tauri 可访问的 asset URL
 */
export function resolveLocalPath(path: string, context?: ResolveContext): string {
  let absolutePath: string;

  if (path.startsWith('/')) {
    absolutePath = path;
  } else if (path.startsWith('./')) {
    if (!context?.basePath) {
      throw new Error(`Relative path "${path}" requires "basePath" in context`);
    }
    absolutePath = joinPath(context.basePath, path.slice(2));
  } else {
    if (!context?.basePath) {
      throw new Error(`Relative path "${path}" requires "basePath" in context`);
    }
    absolutePath = joinPath(context.basePath, path);
  }

  return convertFileSrc(absolutePath);
}

export function resolveFileIcon(path: string, context?: ResolveContext): string {
  let absolutePath: string;

  if (path.startsWith('/')) {
    absolutePath = path;
  } else if (path.startsWith('./')) {
    if (!context?.basePath) {
      throw new Error(`Relative path "${path}" requires "basePath" in context`);
    }
    absolutePath = joinPath(context.basePath, path.slice(2));
  } else {
    if (!context?.basePath) {
      throw new Error(`Relative path "${path}" requires "basePath" in context`);
    }
    absolutePath = joinPath(context.basePath, path);
  }
  return `${PUBLIC_ICON_SCHEME}fileicon?path=${encodeURIComponent(absolutePath)}&size=${context?.size ?? 48}`;
}
/**
 * 解析图标协议字符串，返回结构化的协议描述（不执行路径解析）
 *
 * 解析优先级：
 * 1. public-icon://  → 按 host 分发（builtin / fileicon / local / remote / data）
 * 2. data:           → 透传
 * 3. https:// / http:// / asset:// → 透传
 * 4. ./              → 相对路径
 * 5. /               → 绝对路径
 * 6. 其他            → 当作内置图标名
 */
export function parseIconProtocol(icon: string): ParsedIcon {
  if (icon.startsWith(PUBLIC_ICON_SCHEME)) {
    return parsePublicIconScheme(icon);
  }

  if (icon.startsWith('data:')) {
    return { type: 'passthrough', value: icon };
  }

  if (icon.startsWith('https://') || icon.startsWith('http://')) {
    return { type: 'passthrough', value: icon };
  }

  if (icon.startsWith('asset://')) {
    return { type: 'passthrough', value: icon };
  }

  if (icon.startsWith('./') || icon.startsWith('/')) {
    return { type: 'local', path: icon };
  }

  // 裸字符串当作内置图标名
  return { type: 'builtin', name: icon };
}

/**
 * 解析图标协议字符串，返回可直接用于渲染的图标信息
 *
 * 与 parseIconProtocol 的区别：本函数会执行路径解析（相对路径 → 绝对路径 → Tauri asset URL）
 */
export function resolveIcon(icon: string, context?: ResolveContext): ResolvedIcon {
  const parsed = parseIconProtocol(icon);

  switch (parsed.type) {
    case 'builtin':
      return { type: 'builtin', name: parsed.name };

    case 'fileicon': {
      const size = parsed.size ?? context?.size ?? 48;
      const maxAge = 24 * 60 * 60;
      const buildUrl = (p: string) => `http://localhost:2345/utils/file-icon?path=${encodeURIComponent(p)}&size=${size}&max_age=${maxAge}`;
      return {
        type: 'image',
        url: buildUrl(parsed.path),
        darkUrl: parsed.darkPath ? buildUrl(parsed.darkPath) : null,
      };
    }

    case 'local':
      return {
        type: 'image',
        url: resolveLocalPath(parsed.path, context),
        darkUrl: parsed.darkPath
          ? resolveLocalPath(parsed.darkPath, context)
          : null,
      };

    case 'remote':
      return {
        type: 'image',
        url: parsed.url,
        darkUrl: parsed.darkUrl ?? null,
      };

    case 'data':
      return {
        type: 'image',
        url: parsed.value,
        darkUrl: parsed.darkValue ?? null,
      };

    case 'passthrough':
      return {
        type: 'image',
        url: parsed.value,
        darkUrl: null,
      };
  }
}

export const isIconSchema = (icon: string) => icon.startsWith(PUBLIC_ICON_SCHEME);
