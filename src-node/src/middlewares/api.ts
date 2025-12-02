import type { Middleware } from 'koa';
import { createResponse } from '../utils/response';

declare module 'koa' {
  interface DefaultContext {
    ok<T = any>(data?: T): void;
    error(errCode: number, errMsg: string): void;
  }
}

const createResponseMiddleware = (): Middleware => async (ctx, next) => {
  ctx.ok = (data: any = null) => {
    ctx.body = createResponse(data);
  };
  ctx.error = (errCode: number, errMsg: string) => {
    ctx.body = createResponse(null, errCode, errMsg);
  };
  await next();
};

export default createResponseMiddleware;
