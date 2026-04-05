import KoaRouter from '@koa/router';

const router = new KoaRouter({
  prefix: '/health',
});

router.all('/', (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: Date.now(),
  };
});

export default router;
