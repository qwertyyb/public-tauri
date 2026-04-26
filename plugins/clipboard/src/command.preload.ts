import { clipboard, mainWindow, Database, type IListViewCommand } from '@public-tauri/api';
import { ContentType, DATABASE_PATH, getHash } from './const';

let db: ReturnType<typeof Database['get']> | null = null;

const formatDate = (date: Date, format = 'yyyy-MM-dd hh:mm:ss') => {
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds(),
  };
  let fmt = format;
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (`${date.getFullYear()}`).substr(4 - RegExp.$1.length));
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      // @ts-ignore
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : ((`00${o[k]}`).substr((`${o[k]}`).length)));
    }
  }
  return fmt;
};

const createDatabase = async () => {
  const sql = `CREATE TABLE IF NOT EXISTS clipboardHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contentType INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    lastUseAt TEXT NOT NULL,
    content BLOB NULL DEFAULT NULL,
    application TEXT NULL DEFAULT NULL,
    hash TEXT NULL UNIQUE
  );`;
  db = await Database.load(DATABASE_PATH).catch((err) => {
    console.error('Error creating Database', err);
    throw err;
  });
  await db.execute(sql);
  await db.execute('CREATE INDEX IF NOT EXISTS hashIndex on clipboardHistory(hash)');
};

const checkDuplicate = async (hash: string): Promise<boolean> => {
  if (!db) return false;
  const result = await db.select<{ id: number }[]>(
    'SELECT id FROM clipboardHistory WHERE hash = $1 LIMIT 1',
    [hash],
  );
  return result.length > 0;
};

const insertRecord = async (record: {
  contentType: number;
  text: string;
  content: Uint8Array | null;
  hash: string;
}) => {
  if (!db) return;
  const sql = `INSERT INTO clipboardHistory(contentType, text, content, createdAt, lastUseAt, hash)
               values ($1, $2, $3, $4, $5, $6)`;
  return db.execute(sql, [
    record.contentType,
    record.text,
    record.content,
    formatDate(new Date()),
    formatDate(new Date()),
    record.hash,
  ]);
};

// 截断文本用于显示
const truncateText = (text: string, maxLen = 100): string => {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
};

// 清理过期记录（保留 30 天）
const cleanupExpired = async () => {
  if (!db) return;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoffStr = formatDate(cutoffDate);
  await db.execute(
    'DELETE FROM clipboardHistory WHERE createdAt < $1',
    [cutoffStr],
  );
  console.log('Cleaned up expired clipboard records');
};

const dbReady = createDatabase()
  .then(async () => {
    clipboard.startListening();
    // 启动时清理过期记录
    await cleanupExpired();
    // 每小时清理一次
    setInterval(cleanupExpired, 60 * 60 * 1000);
  })
  .catch((err) => {
    console.error('Failed to init clipboard database', err);
  });

const ensureDbReady = async () => {
  await dbReady;
  return db;
};

clipboard.onClipboardUpdate(async () => {
  const [text, imgbase64] = await Promise.all([
    clipboard.readText().catch(() => null),
    clipboard.readImageBase64().catch(() => null),
  ]);

  await ensureDbReady();

  // 处理图片
  if (imgbase64) {
    const hash = await getHash(imgbase64);

    // 去重检查
    if (await checkDuplicate(hash)) {
      console.log('Duplicate image, skipping');
      return;
    }

    // 图片的 text 字段存储简短描述
    const text = `[图片] ${formatDate(new Date())}`;
    await insertRecord({
      contentType: ContentType.image,
      text,
      content: imgbase64,
      hash,
    });
    console.log('Saved image to clipboard history');
  } else if (text) {
    const hash = await getHash(text);

    // 去重检查
    if (await checkDuplicate(hash)) {
      console.log('Duplicate text, skipping');
      return;
    }

    await insertRecord({
      contentType: ContentType.text,
      text,
      content: null,
      hash,
    });
    console.log('Saved text to clipboard history:', truncateText(text));
  }
});

const queryRecordList = async ({ keyword = '' } = {}, { strict = false } = {}) => {
  const database = await ensureDbReady();
  if (!database) return [];

  // 图片类型不参与搜索
  const sql = keyword
    ? 'SELECT * FROM clipboardHistory WHERE contentType = 0 AND text LIKE $1 ORDER BY lastUseAt DESC LIMIT 30'
    : 'SELECT * FROM clipboardHistory ORDER BY lastUseAt DESC LIMIT 30';

  const query = strict ? keyword : `%${keyword}%`;
  const results = await database.select<any[]>(sql, keyword ? [query] : []);

  return results;
};

const buildListItem = (item: any) => {
  const subtitle = `创建于: ${item.createdAt}`;
  const isImage = item.contentType === ContentType.image;

  return {
    key: `plugin:clipboard:${item.id}`,
    title: item.text,
    subtitle,
    icon: isImage ? `data:image/png;base64,${item.content}` : './assets/text.png',
    contentValue: item.text,
    contentType: item.contentType,
    actions: [
      {
        name: 'paste',
        title: '粘贴',
      },
    ],
  };
};

const search = async (keyword?: string) => {
  const list = await queryRecordList({ keyword });
  return list.map(buildListItem);
};

const listView: IListViewCommand = {
  async onShow(_query, _action, setList) {
    try {
      const list = await search();
      console.log('list', list);
      setList(list);
    } catch (err) {
      console.error('clipboard onShow failed', err);
      setList([]);
    }
  },
  onSearch: async (value: string, setList: (list: any[]) => void) => {
    try {
      const list = await search(value);
      console.log('list', list);
      setList(list);
    } catch (err) {
      console.error('clipboard onSearch failed', err);
      setList([]);
    }
  },
  async onSelect(item) {
    let el: HTMLElement;
    if (item.contentType === ContentType.image) {
      const div = document.createElement('div');
      div.style.cssText = 'width:100%;height:var(--preview-height);display:flex;justify-content:center;align-items:center;';
      const img = document.createElement('img');
      img.src = item.icon;
      img.style.cssText = 'max-width:100%;max-height:100%';
      div.appendChild(img);
      el = div;
    } else {
      el = document.createElement('pre');
      el.textContent = item.contentValue;
      el.style.cssText = 'border-radius:6px;height:var(--preview-height);overflow:auto;box-sizing:border-box;padding:12px;';
    }
    return el;
  },
  async onAction(item) {
    if (item.contentType === ContentType.text) {
      clipboard.writeText(item.contentValue);
    } else if (item.contentType === ContentType.image) {
      clipboard.writeImageBinary(item.contentValue);
    }
    await mainWindow.hide();
    clipboard.paste();
  },
};

export default listView;
