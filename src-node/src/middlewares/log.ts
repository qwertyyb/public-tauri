import type { Middleware } from 'koa';
import logger from '../utils/logger.ts';

const createLoggerMiddleware = (): Middleware => async (ctx, next) => {
  logger.info(`-> ${ctx.method}: ${ctx.url}, body: ${ctx.method === 'POST' ? JSON.stringify(ctx.request.body) : ''}`);
  try {
    await next();
    logger.info(`<- ${ctx.method}: ${ctx.url}, response ${Buffer.isBuffer(ctx.body) ? `Buffer(${ctx.body.length})` : JSON.stringify(ctx.body)}`);
  } catch (err) {
    logger.error(`<- ${ctx.method}: ${ctx.url}, error: ${(err as any).message}, stack: ${(err as any).stack}`);
    throw err;
  }
};

export default createLoggerMiddleware;
