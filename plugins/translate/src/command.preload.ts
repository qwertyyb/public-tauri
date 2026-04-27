import { channel, type IListViewCommand } from '@public-tauri/api';

const command: IListViewCommand = {
  onSearch: async (keyword: string, setList: (list: any[]) => void) => {
    console.log('search', keyword);
    if (!keyword) return setList([]);
    const results = (await Promise.all([
      channel.invoke('translate', keyword),
    ])).flat();
    setList(results);
  },
};

export default command;
