import { clipboard, mainWindow, Database, type IListViewCommand } from '@public-tauri/api';
import { ContentType, DATABASE_PATH } from './const';

let db: ReturnType<typeof Database['get']>;

const formatDate = function (date: Date, format = 'yyyy-MM-dd hh:mm:ss') {
  const o = {
    'M+': date.getMonth() + 1,                 // 月份
    'd+': date.getDate(),                    // 日
    'h+': date.getHours(),                   // 小时
    'm+': date.getMinutes(),                 // 分
    's+': date.getSeconds(),                 // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds(),             // 毫秒
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
    hash TEXT NULL DEFAULT NULL
  );`;
  console.log('createDatabase');
  db = await Database.load(DATABASE_PATH).catch((err) => {
    console.error('Error creating Database', err);
    throw err;
  });
  console.log('createDatabase', db);
  await db.execute(sql);
  return db.execute('CREATE INDEX IF NOT EXISTS hashIndex on clipboardHistory(hash)');
};

const insertRecord = async (record: { contentType: number, text: string, content: Buffer | null, hash: string }) => {
  const sql = 'INSERT INTO clipboardHistory(contentType, text, content, createdAt, lastUseAt, hash) values ($1, $2, $3, $4, $5, $6)';
  console.log(record);
  return db.execute(sql, [
    record.contentType || ContentType.text,
    record.text,
    record.content || null, formatDate(new Date()), formatDate(new Date()), record.hash,
  ]);
};


clipboard.onClipboardUpdate(async () => {
  console.log('Received new text in clipboard: ');
  const [html, text, imgbase64] = await Promise.all([
    clipboard.readHtml().catch(() => null),
    clipboard.readText().catch(() => null),
    clipboard.readImageBase64().catch(() => null),
  ]);
  console.log('clipboard', { html, text, imgbase64 });

  if (imgbase64) {
    console.log('base64 image received: ', imgbase64);
    // list.push({
    //   createdAt: new Date(),
    //   text,
    //   contentType: 'image',
    //   content: imgbase64,
    // });
  } else if (text) {
    console.log('text received: ', text);
    // list.push({
    //   createdAt: new Date(),
    //   text,
    //   contentType: 'html',
    //   content: text,
    // });
    insertRecord({ contentType: ContentType.text, text, content: null, hash: '' });
  }
});

createDatabase().then(() => {
  clipboard.startListening();
});

const queryRecordList = async ({ keyword = '' } = {}, { strict = false } = {}) => {
  const sql = keyword ? 'SELECT * FROM clipboardHistory where text like $1 order by lastUseAt DESC limit 30' : 'SELECT * FROM clipboardHistory order by lastUseAt DESC limit 30';
  const query = strict ? keyword : `%${keyword}%`;
  console.time('query');
  const results = await db.select<IClipboardItem[]>(sql, [query]);
  console.timeEnd('query');
  return results.map((item: any) => ({
    ...item,
    content: item.content instanceof Uint8Array ? `data:image/png;base64,${Buffer.from(item.content as Uint8Array).toString('base64')}` : null,
  }));
};

const search = async (keyword?: string) => {
  const list = await queryRecordList({ keyword });
  return list.map((item: any) => {
    const subtitle = `最后使用: ${item.lastUseAt}     创建于: ${item.createdAt}`;
    return {
      key: `plugin:clipboard:${item.text}`,
      title: item.text,
      subtitle,
      icon: item.content ? item.content : './assets/text.png',
      contentValue: item.content ? item.content : item.text,
      contentType: item.contentType,
      actions: [
        {
          name: 'paste',
          title: '粘贴',
        },
      ],
    };
  });
};

const listView: IListViewCommand = {
  async onShow(query, _, setList) {
    console.log('onShow', query);
    setList(await search());
  },
  onSearch: async (value: string, setList: (list: any[]) => void) => {
    let list = await queryRecordList({ keyword: value });
    list = list.map((item: any) => {
      const subtitle = `最后使用: ${item.lastUseAt}     创建于: ${item.createdAt}`;
      return {
        key: `plugin:clipboard:${item.text}`,
        title: item.text,
        subtitle,
        icon: item.content ? item.content : './assets/text.png',
        contentValue: item.content ? item.content : item.text,
        contentType: item.contentType,
        actions: [
          {
            name: 'paste',
            title: '粘贴',
          },
        ],
      };
    });
    setList(list);
  },
  async onSelect(item) {
    let el: HTMLElement;
    if (item.contentType === ContentType.image && item.contentValue) {
      const div = document.createElement('div');
      div.style.cssText = 'width:100%;height:var(--preview-height);display:flex;justify-content:center;align-items:center;';
      const img = document.createElement('img');
      img.src = item.contentValue;
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
