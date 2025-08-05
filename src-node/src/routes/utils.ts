import KoaRouter from '@koa/router'
import { getFileIcon } from '../lib/macos'

const router = new KoaRouter({
  prefix: '/utils'
})

router.get('/file-icon', async ctx => {
  const { path, size } = ctx.query as { path: string, size: string }
  const buffer = await getFileIcon(path, parseInt(size, 10))
  ctx.set('Content-Type', 'image/png')
  ctx.body = buffer
})

export default router