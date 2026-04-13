import { type IListViewCommand, clipboard } from '@public/api';
import { gemoji } from 'gemoji';

const searchCommand: IListViewCommand = {
  onShow(query, _, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
      actions: [
        {
          name: 'copy',
          title: '复制到剪切板',
        },
      ],
    })));
  },
  onSearch(query, setList) {
    const results = query ? gemoji.filter(item => item.names.some(name => name.includes(query))) : gemoji;
    setList(results.map(emoji => ({
      title: emoji.emoji,
      subtitle: emoji.description,
      actions: [
        {
          name: 'copy',
          title: '复制到剪切板',
        },
      ],
    })));
  },
  onAction(result, action) {
    if (action.name === 'copy') {
      clipboard.writeText(result.title);
    }
  },
};

export default searchCommand;

