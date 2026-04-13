import { fetch, type IListViewCommand, opener } from '@public/api';

const command: IListViewCommand = {
  onSearch: async (keyword, setList) => {
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
      actions: [
        {
          name: '在浏览器中打开',
          title: '打开',
        },
      ],
    }));
    return setList(docs);
  },
  onAction(item: any) {
    opener.openUrl(item.url);
  },
};

export default command;
