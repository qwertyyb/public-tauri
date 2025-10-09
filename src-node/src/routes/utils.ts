import KoaRouter from '@koa/router';
import { getFileIcon } from '../lib/macos';
import utils from '../services/utils';
import { createResponse } from '../utils/response';
import Stream from 'stream';

const router = new KoaRouter({
  prefix: '/utils',
});

router.get('/file-icon', async (ctx) => {
  const { path, size } = ctx.query as { path: string, size: string };
  const buffer = await getFileIcon(path, parseInt(size, 10));
  ctx.set('Content-Type', 'image/png');
  ctx.body = buffer;
});

router.post('/invoke', async (ctx) => {
  const { method, args } = ctx.request.body as { method: string, args: any[] };
  if (method === 'fetch') {
    // @ts-ignore
    const r = await utils.fetch(...args);
    ctx.status = r.status;
    ctx.set({
      ...[...r.headers].reduce((acc, item) => {
        if (item[0] === 'content-encoding') {
          return acc;
        }
        if (item[0] === 'content-length') {
          return acc;
        }
        return { ...acc, [item[0]]: item[1] };
      }, {}),
    });
    ctx.flushHeaders();
    // @ts-ignore
    ctx.body = Stream.Readable.fromWeb(r.body!);
    return;
  }
  if (typeof utils[method as keyof typeof utils] === 'function') {
    // @ts-ignore
    ctx.body = createResponse(await utils[method as keyof typeof utils](...args));
    return;
  }
  throw new Error(`方法 ${method} 不存在`);
});

export default router;
