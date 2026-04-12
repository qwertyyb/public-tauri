import { type IListViewCommand, fetch, utils } from '@public/api';

// const withCache = <F extends (...args: any[]) => any>(fn: F) => {
//   const results = new Map<string, any>();
//   return (...args: Parameters<F>): ReturnType<F> => {
//     const key = JSON.stringify(args);
//     const value = results.get(key);
//     if (value) return value;
//     const result = fn(...args);
//     results.set(key, result);
//     return result;
//   };
// };

const getData = async (type: 'hot' | 'latest' = 'hot') => {
  const url = type === 'hot' ? `https://www.v2ex.com/api/topics/hot.json?${Date.now()}` : `https://www.v2ex.com/api/topics/latest.json?${Date.now()}`;
  const response = await fetch(url);
  console.log(response);
  const list: { id: string, title: string, subtitle: string, icon: string }[] = (await response.json()).map((item: any) => ({
    id: item.id,
    title: item.title,
    subtitle: `${item.replies}/${item.node.title}/${item.content}`,
    icon: item.member.avatar_large,
    url: item.url,
    actions: [
      {
        name: 'open',
        title: '在浏览器中打开',
      },
    ],
  }));
  return list;
};

export const createCommand = (name: 'hot' | 'latest'): IListViewCommand => ({
  onShow(query, _, setList) {
    getData(name).then((list) => {
      setList(list);
    });
  },
  onAction(item: any) {
    utils.open(item.url);
  },
});
