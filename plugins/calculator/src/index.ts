
import { writeText } from 'tauri-plugin-clipboard-api';
import { dialog, definePlugin, storage, type ICommand } from '@public-tauri/api';
import { create, all } from 'mathjs';

const DECIMAL_SEPARATOR = '.';
const ARG_SEPARATOR = ',';
const HISTORY_KEY = 'calculator_history';
const MAX_HISTORY_SIZE = 100;

interface HistoryItem {
  expression: string;
  result: string;
  timestamp: number;
}

async function getHistory(): Promise<HistoryItem[]> {
  const history = await storage.getItem<HistoryItem[]>(HISTORY_KEY);
  return history || [];
}

async function addToHistory(expression: string, result: string): Promise<void> {
  const history = await getHistory();
  history.unshift({
    expression,
    result,
    timestamp: Date.now(),
  });
  // 限制历史记录数量
  if (history.length > MAX_HISTORY_SIZE) {
    history.pop();
  }
  await storage.setItem(HISTORY_KEY, history);
}

const mathjs = create(all, {
  relTol: 1e-12,
  absTol: 1e-15,
  matrix: 'Matrix',
  number: 'BigNumber',
  precision: 64,
  predictable: false,
  randomSeed: null,
});

export class Calculator {
  public static isValidInput(input: string): boolean {
    const blackListInputs = ['version', 'i'];

    if (input.length === 0) {
      return false;
    }

    if (blackListInputs.find(b => input === b) !== undefined) {
      return false;
    }

    let result;
    try {
      // Mathjs throws an error when input cannot be evaluated
      result = mathjs.evaluate?.(this.normalizeInput(input));
    } catch (e) {
      return false;
    }

    if (result === undefined) {
      return false;
    }

    return !isNaN(result)
      || false;
  }

  private static normalizeInput(input: string) {
    return input.replace(
      new RegExp(`\\${DECIMAL_SEPARATOR}|\\${ARG_SEPARATOR}`, 'g'),
      match => (match === DECIMAL_SEPARATOR ? '.' : ','),
    );
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public static calculate(input: string): string {
    const result: string = mathjs.evaluate?.(this.normalizeInput(input)).toString();
    return result.replace(
      new RegExp(',|\\.', 'g'),
      match => (match === '.' ? DECIMAL_SEPARATOR : ARG_SEPARATOR),
    );
  }
}

const calculatorPlugin = definePlugin(() => ({
  onInput(keyword: string): ICommand[] {
    if (Calculator.isValidInput(keyword)) {
      const result = Calculator.calculate(keyword);
      return [
        {
          name: 'calculator',
          title: `= ${result}`,
          subtitle: '点击复制到剪切板',
          icon: './assets/icon.png',
          text: `${result}`,
          extra: { expression: keyword },
          matches: [
            { type: 'text', keywords: [keyword] },
          ],
          actions: [
            { name: 'copy', title: '复制到剪切板' },
          ],
        },
      ];
    }
    return [];
  },
  onAction(command, action) {
    if (action.name === 'copy') {
      const extra = (command as any).extra;
      // 保存到历史
      if (extra?.expression) {
        addToHistory(extra.expression, String(command.text));
      }
      writeText(String(command.text));
      dialog.showToast('结果已复制到剪切板');
    }
  },
}));

export default calculatorPlugin;
