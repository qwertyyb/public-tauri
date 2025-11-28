export type ToolCallStatus = 'waiting' | 'running' | 'success' | 'error';

export const ToolCallStatusLabel: Record<ToolCallStatus, string> = {
  waiting: '等待中',
  running: '运行中',
  success: '成功',
  error: '失败',
};
