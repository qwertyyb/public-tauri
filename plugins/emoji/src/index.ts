import type { IListViewCommand } from '@public/plugin';
import { gemoji } from 'gemoji';

const searchCommand: IListViewCommand = {
  enter(query, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
    })));
  },
  search(query, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
    })));
  },
};

export default searchCommand;

