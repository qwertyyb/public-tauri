import { default as utilsService } from '../services/utils.js';
import Stream from 'stream';

const headersToObject = (headers: Headers): Record<string, string> => {
  const o: Record<string, string> = {};
  headers.forEach((v, k) => {
    if (k.toLowerCase() === 'content-encoding' || k.toLowerCase() === 'content-length') return;
    o[k] = v;
  });
  return o;
};

const utilsMod = utilsService as Record<string, any>;

/**
 * Same behavior as `POST /utils/invoke` (non-HTTP) for in-process and plugin workers.
 * For `fetch` with `raw: true` returns a Web `Response`; otherwise returns serializable data.
 */
export async function runNodeUtilsInvoke(
  method: string,
  args: any[] = [],
  options: { raw?: boolean } = {},
): Promise<unknown> {
  if (method === 'fetch') {
    const r = (await utilsMod.fetch(...args)) as Response;
    if (options.raw) {
      return r;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return {
      __fetchResult: true,
      status: r.status,
      statusText: r.statusText,
      headers: headersToObject(r.headers),
      bodyBase64: buf.toString('base64'),
    };
  }
  const fn = utilsMod[method];
  if (typeof fn !== 'function') {
    throw new Error(`方法 ${method} 不存在`);
  }
  return await fn.apply(utilsMod, args);
}

type KoaCtx = {
  status?: number
  set: (k: string, v: string) => void
  body?: unknown
  flushHeaders?: () => void
  ok: (data?: unknown) => void
};

/** Koa: stream `fetch` or `ctx.ok` with JSON (same as legacy `/utils/invoke` route). */
export async function applyKoaNodeUtilsInvoke(method: string, args: any[] = [], ctx: KoaCtx) {
  if (method === 'fetch') {
    const r = (await utilsMod.fetch(...args)) as Response;
    ctx.status = r.status;
    r.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding' || key.toLowerCase() === 'content-length') return;
      ctx.set(key, value);
    });
    ctx.flushHeaders?.();
    ctx.body = Stream.Readable.fromWeb(r.body!);
    return;
  }
  const data = await runNodeUtilsInvoke(method, args, {});
  ctx.ok(data);
}
