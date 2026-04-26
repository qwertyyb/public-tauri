import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_DIR = fileURLToPath(new URL('../', import.meta.url));
const STORE_DIR = join(PROJECT_DIR, './store');
const PLUGINS_DIR = join(STORE_DIR, './plugins');
const INDEX_FILE = join(STORE_DIR, 'index.json');

// GitHub 仓库配置
const GITHUB_REPO_BASE =  'https://github.com/qwertyyb/public-tauri/blob';
const GITHUB_BRANCH = 'master';

/** 将相对路径转换为 GitHub 绝对 URL */
function resolveIconUrl(icon: string, pluginName: string): string {
  if (!icon) return '';
  // 已经是绝对 URL（如 https://...）则直接返回
  if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;
  // 相对路径 → 转为 GitHub raw 链接
  const relativePath = icon.replace(/^\.\//, '');
  return `${GITHUB_REPO_BASE}/${GITHUB_BRANCH}/store/plugins/${pluginName}/${relativePath}?raw=true`;
}

interface PluginManifest {
  name: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  main?: string;
  server?: string;
  template?: string;
  commands?: Array<{
    name: string;
    title?: string;
    subtitle?: string;
    mode?: string;
    preload?: string;
    matches?: Array<{
      type: string;
      keywords?: string[];
      triggers?: string[];
      regexp?: string;
      extensions?: string[];
      title?: string;
    }>;
    action?: { name: string; title: string };
  }>;
}

interface PluginInfo {
  name: string;
  icon: string;
  version: string;
  author: string;
  manifest: PluginManifest & { [key: string]: unknown };
}

/** 从插件目录的 package.json 中提取 publicPlugin 信息 */
function loadPlugin(pluginDir: string, dirName: string): PluginInfo {
  const pkgPath = join(pluginDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const publicPlugin = { ...(pkg.publicPlugin || {}) };
  const pluginName = pkg.name;

  // 转换 icon 相对路径为 GitHub 绝对 URL
  const rawIcon = publicPlugin.icon || '';
  const resolvedIcon = resolveIconUrl(rawIcon, dirName);
  publicPlugin.icon = resolvedIcon;

  return {
    name: pluginName,
    icon: resolvedIcon,
    version: pkg.version || '1.0.0',
    author: pkg.author || '',
    manifest: {
      name: publicPlugin.name || pluginName,
      ...publicPlugin,
    },
  };
}

/** 构建 store/index.json */
function build() {
  // 读取 store/plugins 下所有子目录（每个子目录是一个插件）
  const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(PLUGINS_DIR, entry.name))
    .sort();

  const plugins = entries.map(pluginDir => loadPlugin(pluginDir, pluginDir.split('/').pop()!));

  const index = {
    updateTime: Date.now(),
    plugins,
  };

  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`✅ Built ${plugins.length} plugins -> ${INDEX_FILE}`);
  for (const p of plugins) {
    console.log(`   - ${p.name} (${p.version})`);
  }
}

build();
