import Koa from 'koa'
import koaBody from '@koa/bodyparser'

const app = new Koa()

app.use(koaBody())

app.listen(2345)