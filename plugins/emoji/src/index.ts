import type { IListViewCommand } from '@public/api';
import { gemoji } from 'gemoji';

const searchCommand: IListViewCommand = {
  onShow(query, _, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
    })));
  },
  onSearch(query, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
    })));
  },
};

export default searchCommand;

