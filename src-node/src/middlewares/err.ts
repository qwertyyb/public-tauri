import type { Middleware } from 'koa';
import { createResponse } from '../utils/response';

const createErrorHandler = (): Middleware => async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.body = createResponse(null, 500, (err as any).message);
  }
};

export default createErrorHandler;
