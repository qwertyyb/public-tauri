import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../templates');

const workerViewRelPaths = [
  'raycast-view-protocol.ts',
  'raycast-worker-runtime.ts',
  'host-instance.ts',
  'virtual-serialize.ts',
] as const;

function copyTemplateFile(relativePath: string, buildDir: string) {
  const dest = path.join(buildDir, relativePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(templateDir, relativePath), dest);
}

/** 自 startDir 向上查找 monorepo 根（与 options.ts 一致） */
export function findPublicTauriRepoRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const { root } = path.parse(dir);
  while (dir !== root) {
    const ws = path.join(dir, 'pnpm-workspace.yaml');
    const apiPkg = path.join(dir, 'packages', 'api', 'package.json');
    if (fs.existsSync(ws) && fs.existsSync(apiPkg)) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function getTemplateRaycastViewDistDir(repoRoot: string): string {
  return path.join(repoRoot, 'packages/template/dist');
}

/** 若尚未 build，则在 repo 根执行 `pnpm --filter @public-tauri/template build` */
export function ensureRaycastViewTemplateBuilt(repoRoot: string): void {
  const marker = path.join(getTemplateRaycastViewDistDir(repoRoot), 'raycast.html');
  if (fs.existsSync(marker)) {
    return;
  }
  const result = spawnSync(
    'pnpm',
    ['--filter', '@public-tauri/template', 'run', 'build'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  if (result.status !== 0) {
    throw new Error(
      'Building @public-tauri/template failed. From the repo root run: pnpm --filter @public-tauri/template build',
    );
  }
}

/**
 * 将 `packages/template` 的 Vite 应用产物复制到插件 `dist/view/`（与 `dist/server.js` 并列）。
 * wujie `publicPlugin.html` 指向 `./dist/view/raycast.html`。
 */
export function copyRaycastViewTemplateAppDist(repoRoot: string, pluginDistDir: string): void {
  const srcDir = getTemplateRaycastViewDistDir(repoRoot);
  const marker = path.join(srcDir, 'raycast.html');
  if (!fs.existsSync(marker)) {
    throw new Error(`Missing ${marker}; build @public-tauri/template first.`);
  }
  const destDir = path.join(pluginDistDir, 'view');
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.cpSync(srcDir, destDir, { recursive: true });
}

/** 将 Worker 侧 view 模板（reconciler + 宿主类型 + 序列化 + 组件）复制到 `.raycast-build` */
export function copyRaycastWorkerViewBundle(buildDir: string) {
  for (const rel of workerViewRelPaths) {
    copyTemplateFile(rel, buildDir);
  }
}

/** @deprecated 使用 {@link copyRaycastWorkerViewBundle}；保留签名以兼容旧调用（按 dest 所在目录复制整套 Worker 模板） */
export const copyRaycastWorkerRuntimeTemplate = (destAbsolutePath: string) => {
  copyRaycastWorkerViewBundle(path.dirname(destAbsolutePath));
};
