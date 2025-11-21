import clipboard from 'tauri-plugin-clipboard-api';
import Database from '@tauri-apps/plugin-sql';
import { ContentType, DATABASE_PATH } from './const';

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
  Object.keys(o).forEach((k) => {
    if (new RegExp(`(${k})`).test(fmt)) {
      // @ts-ignore
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : ((`00${o[k]}`).substr((`${o[k]}`).length)));
    }
  });
  return fmt;
};

const list: IClipboardItem[] = [];

let db: Database | null = null;

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

createDatabase();

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
    list.push({
      createdAt: new Date(),
      text,
      contentType: 'image',
      content: imgbase64,
    });
  } else if (text) {
    console.log('text received: ', text);
    list.push({
      createdAt: new Date(),
      text,
      contentType: 'html',
      content: text,
    });
    insertRecord({ contentType: ContentType.text, text, content: null, hash: '' });
  }
});

clipboard.startListening();
