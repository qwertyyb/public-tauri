import KoaRouter from '@koa/router';
import { getFileIcon } from '../lib/macos';
import { applyKoaNodeUtilsInvoke } from '../lib/invoke-node-utils';

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
  await applyKoaNodeUtilsInvoke(method, args, ctx as any);
});

export default router;
