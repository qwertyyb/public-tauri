import { SERVER } from './const';
import createLogger from './logger';

const logger = createLogger('api.server');

export const invokeServerUtils = logger.wrap(
  'invokeServerUtils',
  async (method: string, args: any[] = [], options = { raw: false }) => {
    const r = await window.fetch(`${SERVER}/utils/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ method, args }),
    });
    if (options.raw) {
      return r;
    }
    const { data, errCode, errMsg } = await r.json();
    if (errCode === 0) {
      return data;
    }
    throw new Error(`调用 utils ${method}失败: ${errMsg} ${errCode}`);
  },
);
