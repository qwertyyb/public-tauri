import Koa from 'koa'
import koaBody from '@koa/bodyparser'
import cors from '@koa/cors'
import { createServer } from "http";

import managerRoutes from './routes/manager'
import utilsRouter from './routes/utils'

import createLoggerMiddleware from './middlewares/log';
import createErrorHandler from './middlewares/err';
import { startSocketIO } from './socket.io';
import createCacheMiddleware from './middlewares/cache';
import logger from './utils/logger';

const app = new Koa()

app.use(koaBody())
app.use(cors())

app.use(createLoggerMiddleware())
app.use(createErrorHandler())
app.use(createCacheMiddleware())

app.use(managerRoutes.routes()).use(managerRoutes.allowedMethods())
app.use(utilsRouter.routes()).use(utilsRouter.allowedMethods())

const httpServer = createServer(app.callback());

startSocketIO(httpServer)

httpServer.listen(2345, () => logger.info(`listen on ${2345}`));