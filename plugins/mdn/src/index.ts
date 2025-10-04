import { fetch, utils, type IListViewCommand } from '@public/plugin';

const command: IListViewCommand = {
  search: async (keyword, setList) => {
    const url = new URL('https://developer.mozilla.org/api/v1/search');
    url.searchParams.set('q', keyword);
    url.searchParams.set('sort', 'best');
    url.searchParams.set('locale', 'zh-CN');
    const response = await fetch(url.href);
    const docs = ((await response.json()).documents || []).map((doc: { title: string, summary: string, mdn_url: string }) => ({
      title: doc.title,
      subtitle: doc.summary,
      icon: './assets/mdn.png',
      url: `https://developer.mozilla.org${doc.mdn_url}`,
      mdn_url: doc.mdn_url,
    }));
    return setList(docs);
  },
  action(item: any) {
    utils.open(item.url);
  },
};

export default command;
