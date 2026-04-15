import fsPromise from 'node:fs/promises';
import fs from 'node:fs';
import type { Middleware } from 'koa';
import { plugins } from '../plugin/manager';
import path from 'node:path';

const findFilePath = async (staticPaths: string[], expect: string) => {
  for (const item of staticPaths) {
    try {
      const filePath = path.join(item, expect);
      await fsPromise.access(filePath, fsPromise.constants.R_OK);
      return filePath;
    } catch {
      continue;
    }
  }
};

export const createPluginMiddleware = (): Middleware => async (ctx, next) => {
  const [localhost, plugin, scope, name] = ctx.hostname.split('.').toReversed();
  if (localhost !== 'localhost' && plugin !== 'plugin') {
    return await next();
  }
  let pluginName = scope;
  if (name) {
    pluginName = `@${scope}/${name}`;
  }
  if (pluginName && plugins.get(pluginName)) {
    // 来自插件的请求，从插件的 staticPath 中读取数据
    const { staticPaths } = plugins.get(pluginName)!;
    if (!staticPaths?.length) {
      await next();
      return;
    }
    const expect = ctx.path.endsWith('/') ? path.join(ctx.path.slice(1), './index.html') : ctx.path.slice(1);
    const filePath = await findFilePath(staticPaths, expect);
    if (!filePath) {
      ctx.status = 404;
      return;
    }
    const stats = await fsPromise.stat(filePath);
    if (!stats.isFile()) {
      ctx.status = 404;
      return;
    }
    ctx.set('Content-Length', stats.size.toString());
    ctx.set('Last-Modified', stats.mtime.toUTCString());
    ctx.type = path.extname(filePath);
    ctx.body = fs.createReadStream(filePath);
    return;
  }
  await next();
};
