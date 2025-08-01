import KoaRouter from '@koa/router'
import { registerModule } from '../services/manager'

const router = new KoaRouter({
  prefix: '/api/manager'
})

router.post('/register', (ctx) => {
  const modulePath = ctx.request.body
  try {
    registerModule(modulePath)
    ctx.body = { success: true }
  } catch (err) {
    ctx.throw(err)
  }
})

router.post('/unregister', (ctx) => {
  registerModule(ctx.request.body.modulePath)
  ctx.body = { success: true }
})
