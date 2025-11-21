import './utils/prepare';
import Koa from 'koa';
import koaBody from '@koa/bodyparser';
import cors from '@koa/cors';
import { createServer } from 'http';

import managerRoutes from './routes/manager';
import utilsRouter from './routes/utils';

import createLoggerMiddleware from './middlewares/log';
import createErrorHandler from './middlewares/err';
import { startSocketIO } from './socket.io';
import createCacheMiddleware from './middlewares/cache';
import logger from './utils/logger';
import { createPluginMiddleware } from './middlewares/plugin';

const app = new Koa();

app.use(koaBody({
  jsonLimit: '100mb',
}));
app.use(cors());

app.use(createLoggerMiddleware());
app.use(createErrorHandler());
app.use(createCacheMiddleware());
app.use(createPluginMiddleware());

app.use(managerRoutes.routes()).use(managerRoutes.allowedMethods());
app.use(utilsRouter.routes()).use(utilsRouter.allowedMethods());

// app.callback 的类型定义有问题，先 disable 一下

const httpServer = createServer(app.callback());

startSocketIO(httpServer);

httpServer.listen(2345, () => {
  logger.info('public server is ready');
  logger.info(`listen on ${2345}`);
  logger.info(`nodeVersion: ${process.version}`);
});
