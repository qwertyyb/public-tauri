import KoaRouter from '@koa/router';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { convertRaycastPlugin } from '@public-tauri/raycast-convert';
import { fetchRaycastExtensionApiFirstWithSparseFallback } from '../raycast/fetch-extension-from-github.js';

const router = new KoaRouter({ prefix: '/raycast' });

const isPathUnderAllowedRoots = (resolved: string): boolean => {
  const home = path.resolve(os.homedir());
  const tmp = path.resolve(os.tmpdir());
  const norm = path.resolve(resolved);
  if (norm === home || norm.startsWith(`${home}${path.sep}`)) return true;
  if (norm === tmp || norm.startsWith(`${tmp}${path.sep}`)) return true;
  if (norm.startsWith('/tmp/') || norm === '/tmp') return true;
  return false;
};

const REPO_FULL_NAME_RE = /^[\w.-]+\/[\w.-]+$/;

router.post('/fetch-extension', async (ctx) => {
  const body = ctx.request.body as { repo?: string; commit?: string; sourcePath?: string; destDir?: string };
  const repo = typeof body.repo === 'string' ? body.repo.trim() : '';
  const commit = typeof body.commit === 'string' ? body.commit.trim() : '';
  const sourcePath = typeof body.sourcePath === 'string' ? body.sourcePath.replace(/\\/g, '/').trim() : '';
  const destDir = typeof body.destDir === 'string' ? body.destDir.trim() : '';
  if (!repo || !commit || !sourcePath || !destDir) {
    ctx.status = 400;
    ctx.body = { ok: false, error: 'repo、commit、sourcePath、destDir 必填' };
    return;
  }
  if (!REPO_FULL_NAME_RE.test(repo)) {
    ctx.status = 400;
    ctx.body = { ok: false, error: 'repo 格式应为 owner/name' };
    return;
  }
  if (sourcePath.includes('..') || path.posix.isAbsolute(sourcePath)) {
    ctx.status = 400;
    ctx.body = { ok: false, error: '非法 sourcePath' };
    return;
  }
  const resolvedDest = path.resolve(destDir);
  if (!isPathUnderAllowedRoots(resolvedDest)) {
    ctx.status = 403;
    ctx.body = { ok: false, error: 'destDir 必须在用户主目录或系统临时目录下' };
    return;
  }
  try {
    const { fileCount, method } = await fetchRaycastExtensionApiFirstWithSparseFallback({
      repoFullName: repo,
      commit,
      sourcePath,
      destDir: resolvedDest,
    });
    ctx.body = { ok: true, fileCount, method };
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
});

router.post('/convert', async (ctx) => {
  const body = ctx.request.body as { inputDir?: string; outputDir?: string; build?: boolean };
  const inputDir = typeof body.inputDir === 'string' ? body.inputDir.trim() : '';
  const outputDir = typeof body.outputDir === 'string' ? body.outputDir.trim() : '';
  if (!inputDir || !outputDir) {
    ctx.status = 400;
    ctx.body = { ok: false, error: 'inputDir 与 outputDir 必填' };
    return;
  }
  const resolvedIn = path.resolve(inputDir);
  const resolvedOut = path.resolve(outputDir);
  if (!isPathUnderAllowedRoots(resolvedIn) || !isPathUnderAllowedRoots(resolvedOut)) {
    ctx.status = 403;
    ctx.body = { ok: false, error: '路径必须在用户主目录或系统临时目录下' };
    return;
  }
  try {
    await fs.access(path.join(resolvedIn, 'package.json'));
  } catch {
    ctx.status = 400;
    ctx.body = { ok: false, error: 'inputDir 下缺少 package.json' };
    return;
  }
  try {
    const report = await convertRaycastPlugin({
      inputDir: resolvedIn,
      outputDir: resolvedOut,
      build: body.build !== false,
      mode: 'development',
    });
    ctx.body = { ok: true, report };
  } catch (e) {
    ctx.status = 500;
    ctx.body = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
});

export default router;
