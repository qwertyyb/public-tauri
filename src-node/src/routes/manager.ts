import KoaRouter from '@koa/router';
import { callPlugin, registerPlugin, unregisterPlugin, updatePlugin } from '../plugin/manager';

const router = new KoaRouter({
  prefix: '/api/manager',
});

router.post('/register', async (ctx) => {
  const { name, modulePath, staticPaths } = ctx.request.body;
  await registerPlugin(name, { modulePath, staticPaths });
  ctx.ok();
});

router.post('/unregister', (ctx) => {
  const { name, modulePath } = ctx.request.body;
  if (name || modulePath) {
    unregisterPlugin(name || modulePath);
  }
  ctx.ok();
});

router.post('/updatePlugin', async (ctx) => {
  const { name, modulePath, staticPaths } = ctx.request.body;
  await updatePlugin(name, { modulePath, staticPaths });
  ctx.ok();
});

router.post('/invoke', async (ctx) => {
  ctx.ok(await callPlugin(ctx.request.body.name, ctx.request.body.method, ctx.request.body.args));
});

export default router;
