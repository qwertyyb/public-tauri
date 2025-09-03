import md5 from 'md5';
import { DOMParser } from '@xmldom/xmldom';
import lib from './lib';
import { exec } from 'child_process';

export const lookupIciba = async (keyword: string) => {
  const rawWord = keyword;
  const now = Date.now();
  const wordCapital = true
    ? rawWord.substring(0, 1).toLowerCase()
    : rawWord.substring(0, 1);
  const word = `${wordCapital}${rawWord.substring(1)}`;
  // hard code in http://www.iciba.com/_next/static/chunks/8caea17ae752a5965491f530aed3596fce3ca5a9.f4f0c70d4f1b9d4253e3.js
  const hashKey = '7ece94d9f9c202b0d2ec557dg4r9bc';
  const hashMessageBody = `61000006${now}${word}`;
  const hashMessage = `/dictionary/word/query/web${hashMessageBody}${hashKey}`;
  const signature = md5(hashMessage);
  const query = [
    'client=6',
    'key=1000006',
    `timestamp=${now}`,
    `word=${encodeURIComponent(word)}`,
    `signature=${signature}`,
  ];
  const apiUrl = `https://dict.iciba.com/dictionary/word/query/web?${query.join('&')}`;

  console.log('apiUrl sss', apiUrl);
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
    },
  });
  console.log('after fetch', response);
  const data = await response.json();
  console.log('data', data);
  const { baesInfo: baseInfo } = data.message;
  if (!baseInfo) {
    return [{
      title: '未找到翻译结果',
      subtitle: '请检查网络或稍后再试',
      icon: './assets/google-translate.png',
    }];
  }
  const means = baseInfo.symbols
    .map((item: any) => item.parts.map((part: any) => [part.part, part.means.join(',')].join(' ')))
    .flat()
    .map((item: string) => ({
      title: item,
      icon: './assets/google-translate.png',
    }));

  const exchange = Object.entries(baseInfo.exchange || {}).map(([key, value]) => {
    const labels: Record<string, string | undefined> = {
      word_done: '过去分词',
      word_past: '过去式',
      word_ing: '现在分词',
      word_third: '第三人称',
    };
    return {
      title: `${value}`,
      subtitle: labels[key] || key,
      icon: './assets/google-translate.png',
    };
  });
  return [...means, ...exchange];
};

export const parser = new DOMParser();

const lookupFromDict = (keyword: string) => {
  const results: any[] = [];
  const dictionaries = lib.lookupWordHTML(keyword);
  dictionaries.forEach((d) => {
    if (!d.entries.length) return;
    d.entries.forEach((entry) => {
      const doc = parser.parseFromString(entry.html, 'application/xhtml+xml');
      Array.from(doc.getElementsByTagName('d:entry')).forEach((item) => {
        const title = item.getAttribute('d:title');
        results.push({
          subtitle: d.dictionary,
        });
        Array.from(item.childNodes).forEach((item) => {
          if (item.textContent?.trim()) {
            results.push({
              title: item.textContent?.trim(),
              subtitle: d.dictionary,
              icon: './assets/google-translate.png',
            });
          }
        });
      });
    });
  });
  return results;
};

const translateUseApple = (keyword: string) => new Promise<any[]>((resolve, reject) => {
  exec(`shortcuts run "翻译(public专用)" -i ${JSON.stringify(keyword)} | cat`, { encoding: 'utf-8' }, (err, stdout) => {
    if (err) {
      return reject(err);
    }
    if (!stdout) {
      resolve([]);
      return;
    }
    return resolve([
      {
        subtitle: '翻译',
      },
      {
        title: stdout,
        subtitle: '复制到剪切板',
        icon: './assets/google-translate.png',
      },
    ]);
  });
});

export const translate = async (keyword: string) => {
  const results = await Promise.all([
    lookupIciba(keyword),
    lookupFromDict(keyword),
    translateUseApple(keyword),
  ]);
  return results.flat();
};

const createPlugin = () => ({
  translate,
});

export default createPlugin;
