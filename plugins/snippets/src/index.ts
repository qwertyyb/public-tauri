import { mainWindow, type IPlugin } from '@public/api';
import CreateSnippetView from './CreateSnippetView.vue';

// const init = async () => {
//   await api.db.run('CREATE TABLE IF NOT EXISTS snippets (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP, lastUseAt TEXT NULL DEFAULT NULL, useCount INTEGER DEFAULT 0)')
// }

const createSnippetsPlugin: IPlugin = () =>
  // init()
  ({
    onEnter(command, matchData) {
      if (command.name === 'create-snippet') {
        mainWindow.pushView({ path: '/plugin/view/custom', params: { Component: CreateSnippetView } });
      }
    },
  });


export default createSnippetsPlugin;
