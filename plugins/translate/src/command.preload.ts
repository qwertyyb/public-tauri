import { type IListViewCommand, invoke } from '@public/plugin';

const command: IListViewCommand = {
  search: async (keyword: string, setList: (list: any[]) => void) => {
    console.log('search', keyword);
    if (!keyword) return setList([]);
    const results = (await Promise.all([
      invoke('translate', keyword),
    ])).flat();
    setList(results);
  },
};

export default command;
