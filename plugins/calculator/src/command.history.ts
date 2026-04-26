import { storage } from '@public-tauri/api';

const HISTORY_KEY = 'calculator_history';
const MAX_HISTORY_SIZE = 100;

async function getHistory() {
  const history = await storage.getItem(HISTORY_KEY);
  return history || [];
}

export default async function onQuery(query) {
  const history = await getHistory();

  if (history.length === 0) {
    return [];
  }

  // 过滤匹配查询的历史记录
  const filtered = query
    ? history.filter(item =>
        item.expression.toLowerCase().includes(query.toLowerCase()) ||
        item.result.toLowerCase().includes(query.toLowerCase())
      )
    : history;

  return filtered.map((item, index) => ({
    name: `calc_history_${index}`,
    title: `${item.expression} = ${item.result}`,
    subtitle: new Date(item.timestamp).toLocaleString('zh-CN'),
    icon: './assets/icon.png',
    text: item.result,
    extra: { expression: item.expression },
    matches: [],
    actions: [
      { name: 'copy', title: '复制结果' },
    ],
  }));
}
