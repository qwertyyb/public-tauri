import Koa from 'koa';
import koaBody from '@koa/bodyparser';
import cors from '@koa/cors';
import { createServer } from 'http';

import managerRoutes from './routes/manager.ts';
import utilsRouter from './routes/utils.ts';

import createLoggerMiddleware from './middlewares/log.ts';
import createErrorHandler from './middlewares/err.ts';
import { startSocketIO } from './socket.io.ts';
import createCacheMiddleware from './middlewares/cache.ts';
import logger from './utils/logger.ts';

const app = new Koa();

app.use(koaBody({
  jsonLimit: '100mb',
}));
app.use(cors());

app.use(createLoggerMiddleware());
app.use(createErrorHandler());
app.use(createCacheMiddleware());

app.use(managerRoutes.routes()).use(managerRoutes.allowedMethods());
app.use(utilsRouter.routes()).use(utilsRouter.allowedMethods());

console.log(app.callback());

// app.callback 的类型定义有问题，先 disable 一下
// eslint-disable-next-line @typescript-eslint/no-misused-promises
const httpServer = createServer(app.callback());

startSocketIO(httpServer);

httpServer.listen(2345, () => logger.info(`listen on ${2345}`));
