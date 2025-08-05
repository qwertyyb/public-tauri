import { Middleware } from "koa";

const createCacheMiddleware = (): Middleware => async (ctx, next) => {
  if (ctx.query.max_age && /^\d+$/.test(ctx.query.max_age as string)) {
    ctx.set('Cache-Control', `max_age=${ctx.query.max_age}`)
  }
  await next()
}

export default createCacheMiddleware
