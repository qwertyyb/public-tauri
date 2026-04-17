/** 与 Vite dev（localhost:1420）同属 localhost，避免 WKWebView 对 127.0.0.1 与 localhost 混用导致 fetch 失败 */
export const SERVER = 'http://localhost:2345';

export const CORE_API_KEY: symbol = Symbol.for('public-core-api');
