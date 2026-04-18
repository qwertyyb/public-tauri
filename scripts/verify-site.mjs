#!/usr/bin/env node
/**
 * 静态站点路由抽检：请先 `pnpm site:build && pnpm site:preview`，再执行
 *   SITE_VERIFY_BASE=http://127.0.0.1:4173/public-tauri pnpm site:verify
 */
const base = (process.env.SITE_VERIFY_BASE || 'http://127.0.0.1:4173/public-tauri').replace(/\/$/, '');
const paths = [
  '',
  'plugin-index',
  'store',
  'getting-started',
  'dev-plugins',
  'manifest',
  'commands',
];

async function main() {
  let failed = false;
  for (const p of paths) {
    const url = `${base}/${p}`;
    try {
      const r = await fetch(url);
      const ok = r.ok;
      console.log(`${ok ? 'OK' : 'FAIL'} ${r.status} ${url}`);
      if (!ok) failed = true;
    } catch (e) {
      console.error(`FAIL ${url}`, e);
      failed = true;
    }
  }
  const r = await fetch(`${base}/this-route-should-not-exist-xyz`);
  const nf = r.status === 404;
  console.log(`${nf ? 'OK' : 'FAIL'} ${r.status} ${base}/... (expect 404)`);
  if (!nf) failed = true;
  process.exit(failed ? 1 : 0);
}

main();
