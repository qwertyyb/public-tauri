import Koa from 'koa'
import koaBody from '@koa/bodyparser'
const logger = require('pino')()

const app = new Koa()

app.use(async (ctx, next) => {
  logger.info(`-> ${ctx.method}: ${ctx.url}`)
  await next()
  logger.info(`<- ${ctx.body}`)
})

app.use(koaBody())

app.listen(2345, () => logger.info(`listen on ${2345}`))