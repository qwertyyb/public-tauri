import KoaRouter from '@koa/router';
import { callPlugin, registerPlugin, unregisterPlugin, updatePlugin } from '../plugin/manager';
import { createResponse } from '../utils/response';

const router = new KoaRouter({
  prefix: '/api/manager',
});

router.post('/register', async (ctx) => {
  const { name, modulePath, staticPaths } = ctx.request.body;
  await registerPlugin(name, { modulePath, staticPaths });
  ctx.body = createResponse();
});

router.post('/unregister', (ctx) => {
  unregisterPlugin(ctx.request.body.modulePath);
  ctx.body = createResponse();
});

router.post('/updatePlugin', (ctx) => {
  const { name, modulePath, staticPaths } = ctx.request.body;
  updatePlugin(name, { modulePath, staticPaths });
  ctx.body = createResponse();
});

router.post('/invoke', async (ctx) => {
  ctx.body = createResponse(await callPlugin(ctx.request.body.name, ctx.request.body.method, ctx.request.body.args));
});

export default router;
