import { definePlugin, dialog, utils } from '@public-tauri/api';

/** 输入框里可能是整段 `gc xxx`，去掉前缀后得到有效查询 */
function stripGcPrefix(raw: string): string {
  return (raw ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^\s*gc\s+/i, '')
    .trim();
}

function escapeAppleScriptString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function buildTargetUrl(raw: string): string {
  const q = stripGcPrefix(raw);
  if (!q) return '';
  if (/^https?:\/\//i.test(q)) return q;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * 使用 `open -a Google Chrome` 打开 URL（`quoted form of` 避免 `&` 等与 shell 冲突）。
 */
async function openUrlInGoogleChrome(url: string): Promise<void> {
  const inner = escapeAppleScriptString(url);
  // shell 会把 `open -a Google Chrome` 拆成 `-a Google` + 路径 `Chrome`，必须用引号包住应用名
  const script = `set urlStr to "${inner}"
do shell script "open -a \\"Google Chrome\\" " & quoted form of urlStr`;
  await utils.runAppleScript(script);
}

async function newChromeWindow(): Promise<void> {
  const script = [
    'tell application "Google Chrome"',
    'activate',
    'make new window',
    'end tell',
  ].join('\n');
  await utils.runAppleScript(script);
}

export default definePlugin(() => ({
  async onAction(command, _action, query) {
    try {
      if (command.name === 'new-window') {
        await newChromeWindow();
        return;
      }
      if (command.name !== 'open') return;

      const url = buildTargetUrl(query ?? '');
      if (!url) {
        await dialog.showToast('请输入 gc + 空格 + 搜索词或网址');
        return;
      }
      await openUrlInGoogleChrome(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await dialog.showToast(`Chrome: ${msg}`);
    }
  },
}));
