import Koa from 'koa'
import koaBody from '@koa/bodyparser'
import cors from '@koa/cors'
import { createServer } from "http";
import { Server } from "socket.io";

import managerRoutes from './routes/manager'

const logger = require('pino')()

const app = new Koa()

app.use(async (ctx, next) => {
  logger.info(`-> ${ctx.method}: ${ctx.url}`)
  await next()
  logger.info(`<- ${ctx.body}`)
})

app.use(koaBody())
app.use(cors())
app.use(managerRoutes.routes()).use(managerRoutes.allowedMethods())

const httpServer = createServer(app.callback());
const io = new Server(httpServer, {
  path: '/socket.io'
});

io.on("connection", (socket) => {
  
});

httpServer.listen(2345, () => logger.info(`listen on ${2345}`));