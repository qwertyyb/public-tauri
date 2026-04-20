import { definePlugin, dialog, utils } from '@public-tauri/api';

function normalizeCommand(input: string): string {
  return (input ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^>\s*/, '')
    .trim();
}

function escapeAppleScriptString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

async function runInTerminal(raw: string): Promise<void> {
  const command = normalizeCommand(raw);
  if (!command) {
    await dialog.showToast('请在 > 后输入要执行的命令');
    return;
  }

  const escaped = escapeAppleScriptString(command);
  const script = [
    'tell application "Terminal"',
    'activate',
    `do script "${escaped}"`,
    'end tell',
  ].join('\n');

  await utils.runAppleScript(script);
}

export default definePlugin(() => ({
  async onAction(_command, _action, query) {
    await runInTerminal(query);
  },
}));
