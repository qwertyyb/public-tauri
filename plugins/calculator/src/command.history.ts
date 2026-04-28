import { storage, dialog, clipboard } from '@public-tauri/api';

const HISTORY_KEY = 'calculator_history';
const MAX_HISTORY_SIZE = 100;

interface HistoryItem {
  expression: string;
  result: string;
  timestamp: number;
}

async function getHistory(): Promise<HistoryItem[]> {
  const history: HistoryItem[] | null = await storage.getItem(HISTORY_KEY);
  return history || [];
}

async function searchHistory(keyword: string): Promise<any[]> {
  const history = await getHistory();

  if (history.length === 0) {
    return [];
  }

  // 过滤匹配查询的历史记录
  const filtered = keyword
    ? history.filter(item => item.expression.toLowerCase().includes(keyword.toLowerCase())
        || item.result.toLowerCase().includes(keyword.toLowerCase()))
    : history;

  return filtered.map((item, index) => ({
    key: `calc:history:${index}`,
    title: `${item.expression} = ${item.result}`,
    subtitle: new Date(item.timestamp).toLocaleString('zh-CN'),
    icon: './assets/icon.png',
    contentValue: item.result,
    extra: { expression: item.expression },
    actions: [
      { name: 'copy', title: '复制结果' },
    ],
  }));
}

const listView = {
  async onShow(_query: string, _action: string, setList: (items: any[]) => void) {
    try {
      const list = await searchHistory('');
      console.log('list', list);
      setList(list);
    } catch (err) {
      console.error('calc history onShow failed', err);
      setList([]);
    }
  },
  async onSearch(value: string, setList: (items: any[]) => void) {
    try {
      const list = await searchHistory(value);
      setList(list);
    } catch (err) {
      console.error('calc history onSearch failed', err);
      setList([]);
    }
  },
  async onAction(item: any) {
    const extra = item.extra || {};
    const expression = extra.expression || '';
    // 保存到历史
    if (expression && item.contentValue) {
      const history = await getHistory();
      const exists = history.some(h => h.expression === expression);
      if (!exists) {
        history.unshift({
          expression,
          result: item.contentValue,
          timestamp: Date.now(),
        });
        if (history.length > MAX_HISTORY_SIZE) {
          history.pop();
        }
        await storage.setItem(HISTORY_KEY, history);
      }
    }
    await clipboard.writeText(String(item.contentValue));
    await dialog.showToast('结果已复制到剪切板');
  },
};

export default listView;
