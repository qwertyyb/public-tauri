import KoaRouter from '@koa/router'
import { registerPlugin, unregisterPlugin } from '../plugin/manager'

const router = new KoaRouter({
  prefix: '/api/manager'
})

router.post('/register', async (ctx) => {
  const { name, modulePath } = ctx.request.body
  try {
    await registerPlugin(name, modulePath)
    ctx.body = { success: true }
  } catch (err) {
    ctx.throw(err)
  }
})

router.post('/unregister', (ctx) => {
  unregisterPlugin(ctx.request.body.modulePath)
  ctx.body = { success: true }
})

router.post('/updatePlugin', (ctx) => {
  unregisterPlugin(ctx.request.body.name)
  ctx.body = { success: true }
})
