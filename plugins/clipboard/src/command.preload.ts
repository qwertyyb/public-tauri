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

const firstId = (rows: { id: number }[] | null | undefined) => {
  const id = rows?.[0]?.id;
  return typeof id === 'number' ? id : null;
};

const findRecordId = async (hash: string, text?: string) => {
  if (!db) return null;
  const byHash = await db.select<{ id: number }[]>(
    'SELECT id FROM clipboardHistory WHERE hash = $1 LIMIT 1',
    [hash],
  );
  const hashId = firstId(byHash);
  if (hashId) return hashId;
  if (!text) return null;
  const byText = await db.select<{ id: number }[]>(
    'SELECT id FROM clipboardHistory WHERE text = $1 ORDER BY lastUseAt DESC LIMIT 1',
    [text],
  );
  return firstId(byText);
};

const touchRecordById = async (id: number) => {
  if (!db) return;
  await db.execute(
    'UPDATE clipboardHistory SET lastUseAt = $1 WHERE id = $2',
    [formatDate(new Date()), id],
  );
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

let suppressClipboardUntil = 0;

const rememberClipboard = async (text: string | null, imgbase64: string | null) => {
  const textValue = typeof text === 'string' ? text : '';

  // 正文已在历史里时先置顶。网页复制经常同时带一份图片，不能因此放过原来的文本记录。
  if (textValue) {
    const id = await findRecordId(await getHash(textValue), textValue);
    if (id) {
      await touchRecordById(id);
      await reloadActiveList();
      return;
    }
  }

  if (imgbase64) {
    const hash = await getHash(imgbase64);
    const id = await findRecordId(hash);
    if (id) {
      await touchRecordById(id);
      await reloadActiveList();
      return;
    }
    await insertRecord({
      contentType: ContentType.image,
      text: `[图片] ${formatDate(new Date())}`,
      content: imgbase64,
      hash,
    });
    await reloadActiveList();
    return;
  }

  if (!textValue) return;
  const textHash = await getHash(textValue);
  await insertRecord({
    contentType: ContentType.text,
    text: textValue,
    content: null,
    hash: textHash,
  });
  await reloadActiveList();
};

clipboard.onClipboardUpdate(async () => {
  if (Date.now() < suppressClipboardUntil) return;
  try {
    const [text, imgbase64] = await Promise.all([
      clipboard.readText().catch(() => null),
      clipboard.readImageBase64().catch(() => null),
    ]);
    await ensureDbReady();
    await rememberClipboard(text, imgbase64);
  } catch (err) {
    console.error('clipboard update failed', err);
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
    id: item.id,
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

let activeQuery = '';
let activeSetList: ((list: any[]) => void) | null = null;
let listSeq = 0;

const publishList = async (keyword: string | undefined, setList: (list: any[]) => void) => {
  const seq = ++listSeq;
  activeQuery = keyword || '';
  activeSetList = setList;
  const list = await search(activeQuery);
  if (seq !== listSeq) return;
  setList(list);
};

const reloadActiveList = async () => {
  if (!activeSetList) return;
  await publishList(activeQuery, activeSetList);
};

const showList = async (keyword: string | undefined, setList: (list: any[]) => void) => {
  await publishList(keyword, setList);
};

const listView: IListViewCommand = {
  async onShow(_query, _action, setList) {
    try {
      await showList(undefined, setList);
    } catch (err) {
      console.error('clipboard onShow failed', err);
      setList([]);
    }
  },
  onHide() {
    activeSetList = null;
  },
  onSearch: async (value: string, setList: (list: any[]) => void) => {
    try {
      await showList(value, setList);
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
    suppressClipboardUntil = Date.now() + 2000;
    try {
      await ensureDbReady();
      if (item.id != null) {
        await touchRecordById(Number(item.id));
      }
      await reloadActiveList();
      if (item.contentType === ContentType.image) {
        const base64 = String(item.icon || '').replace(/^data:image\/\w+;base64,/, '');
        if (base64) await clipboard.writeImageBase64(base64);
      } else {
        await clipboard.writeText(item.contentValue ?? '');
      }
    } catch (err) {
      console.error('clipboard paste failed', err);
    }
    await mainWindow.hide();
    clipboard.paste();
  },
};

export default listView;
