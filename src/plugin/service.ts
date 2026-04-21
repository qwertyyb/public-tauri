import fuzzysort from 'fuzzysort';
import { dispatchPluginAction, enterCommand, getPlugins } from './manager';
import { resultsMap } from './store';
import { getLocalPath, hanziToPinyin, htmlEscape } from './utils';
import { AsyncFile, type IAction, type ICommandFileMatch, type ICommand as IPluginCommand, type ICommandActionOptions } from '@public/schema';
import type { IRunningPlugin } from '@/types/plugin';

const compileString = (template: string, vars: any) => {
  // eslint-disable-next-line no-new-func
  const func = new Function('matches', `return \`${template.replaceAll('`', '``')}\``);
  return func(vars);
};

const pinyinHighlight = (words: string, pinyin: string, indexes: readonly number[]) => {
  let startIndex = -1;
  const pinyinArr = pinyin.split(' ');
  return Array.from(words).map((word, i) => {
    const pinyin = pinyinArr[i];
    const shouldHighlight = indexes.some(index => index > startIndex && index <= startIndex + pinyin.length);
    startIndex += (pinyin.length + 1);
    if (shouldHighlight) {
      return `<b>${word}</b>`;
    }
    return word;
  })
    .join('');
};

export const handleQuery = async (input: { keyword: string, files?: File[] }) => {
  const { keyword } = input;
  const files = input.files?.map(file => AsyncFile.fromFile(file));
  const results: IPluginCommand[] = [];

  let plugins = getPlugins();
  await Promise.all([...plugins.values()].map((plugin) => {
    if (typeof plugin.plugin?.onInput !== 'function') return false;
    return Promise.resolve(plugin.plugin?.onInput(keyword)).then((list) => {
      if (!list) return;
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        if (!item.title && !item.subtitle && !item.icon) return;
        const { icon, ...rest } = item;
        const result = {
          ...rest,
          icon: getLocalPath(item.icon, plugin.path),
        };
        results.push(result);
        resultsMap.set(result, { owner: plugin, query: keyword, command: result });
      });
    });
  }));

  const commandsSet = new Set<string>();

  // 执行 onInput 后，可能会更新 commands，所以需要重新获取一下
  plugins = getPlugins();

  let commands: { command: IPluginCommand, owner: IRunningPlugin, title: string, subtitle: string, titleZh: string, subtitleZh: string }[] = [];
  plugins.forEach((plugin) => {
    commands.push(...plugin.commands.map((command) => {
      const title = htmlEscape(command.title);
      const subtitle = command.subtitle ? htmlEscape(command.subtitle) : '';
      const titleZh = /\p{sc=Han}/u.test(title) ? hanziToPinyin(title) : '';
      const subtitleZh = subtitle && /\p{sc=Han}/u.test(subtitle) ? hanziToPinyin(subtitle) : '';
      const keywords = command.matches?.find(item => item.type === 'text')?.keywords || [];
      return { command, owner: plugin, title, titleZh, subtitle, subtitleZh, keywords };
    }));
  });

  // 如果文件存在，先过滤一遍
  if (files?.length) {
    const { name } = files[0];
    const extension = name.split('.').pop();
    commands = commands.filter((item) => {
      const match = item.command.matches?.find((match) => {
        if (match.type === 'file') {
          if (extension && match.extensions?.length && match.extensions.includes(extension)) return true;
          if (match.nameRegexp && new RegExp(match.nameRegexp).test(name)) return true;
          return false;
        }
        return false;
      }) as ICommandFileMatch | undefined | null;
      if (!match) return false;
      resultsMap.set(item.command, { query: '', owner: item.owner, command: item.command, match, result: { file: files![0] } });
      results.push(item.command);
      commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
      return true;
    });
  }

  // 正则匹配（先于触发词与 fuzzysort，避免模糊命中抢先写入 resultsMap 且跳过后续正则分支）
  results.push(...commands.reduce<IPluginCommand[]>((acc, item) => {
    if (commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`)) return acc;
    const regMatches = item.command.matches?.filter(match => match.type === 'regexp');
    if (!regMatches) return acc;
    const regMatch = regMatches.find(match => new RegExp(match.regexp).test(keyword));
    if (!regMatch) return acc;
    const matches = keyword.match(new RegExp(regMatch.regexp));
    if (!matches) return acc;
    const result = {
      ...item.command,
      title: compileString(regMatch.title || item.command.title, matches),
      subtitle: compileString(regMatch.subtitle || item.command.subtitle || '', matches),
    };
    resultsMap.set(result, { owner: item.owner, command: item.command, match: regMatch, result: { matches }, query: keyword });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));

  // triggers
  results.push(...commands.reduce<IPluginCommand[]>((acc, item) => {
    if (commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`)) return acc;
    const triggerMatch = item.command.matches?.find(match => match.type === 'trigger');
    if (!triggerMatch) return acc;
    const triggerIndex = triggerMatch.triggers.findIndex(trigger => keyword.startsWith(`${trigger} `));
    if (triggerIndex < 0) return acc;
    const trigger = triggerMatch.triggers[triggerIndex];
    const query = keyword.substring(trigger.length + 1);
    const result = {
      ...item.command,
      title: (query && triggerMatch.title) ? triggerMatch.title.replaceAll('$query', query) : item.command.title,
      subtitle: (query && triggerMatch.subtitle) ? triggerMatch.subtitle.replaceAll('$query', query) : item.command.subtitle,
    };
    resultsMap.set(result, { owner: item.owner, query, command: result, match: triggerMatch, result: { trigger, query } });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));

  const keywordsKey = new Array(20).fill(0)
    .map((_, index) => `keywords.${index}`);
  const commandsForFuzzy = commands.filter(item => !commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`));
  const queryResults = fuzzysort.go(keyword, commandsForFuzzy, {
    keys: ['command.title', 'command.subtitle', 'titleZh', 'subtitleZh', ...keywordsKey],
  });
  results.push(...queryResults.map((result) => {
    const command = { ...result.obj.command };
    if (result[0].target) {
      command.title = result[0].highlight();
    }
    if (result[1].target) {
      command.subtitle = result[1].highlight();
    }
    if (result[2].target) {
      // 拼音匹配标题
      command.title = pinyinHighlight(result.obj.title, result[2].target, result[2].indexes);
    }
    if (result[3].target) {
      // 拼音匹配副标题
      command.subtitle = pinyinHighlight(result.obj.subtitle!, result[3].target, result[3].indexes);
    }
    resultsMap.set(command, { owner: result.obj.owner, query: keyword, command: result.obj.command });
    commandsSet.add(`${result.obj.owner.manifest.name}:${result.obj.command.name}`);
    return command;
  }));
  fuzzysort.cleanup();

  // full 匹配
  results.push(...commands.reduce<IPluginCommand[]>((acc, item) => {
    if (commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`)) return acc;
    const { command, owner } = item;
    const fullMatch = command.matches?.find(match => match.type === 'full');
    if (!fullMatch) return acc;
    const result = {
      ...command,
      title: (keyword && fullMatch.title) ? fullMatch.title.replaceAll('$query', keyword) : command.title,
      subtitle: (keyword && fullMatch.subtitle) ? fullMatch.subtitle.replaceAll('$query', keyword) : command.subtitle,
    };
    resultsMap.set(result, { owner, command: result, match: fullMatch, result: { query: keyword }, query: keyword });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));

  return results;
};

export const handleSelect = (command: IPluginCommand, keyword: string) => {
  const rp = resultsMap.get(command);
  if (!rp) return;
  const query = rp.query ?? keyword;
  return rp.owner.plugin?.onSelect?.(rp.command, query, { from: 'search', match: rp.match, result: rp.result });
};

export const handleEnter = (command: IPluginCommand, keyword: string) => {
  const rp = resultsMap.get(command);
  if (!rp) return;

  const query = rp.query ?? keyword;
  // 统一处理内置插件和动态插件
  enterCommand(rp.owner, rp.command, query, { from: 'search', match: rp.match, result: rp.result });
};

export const handleAction = async (command: IPluginCommand, action: IAction, keyword: string) => {
  const rp = resultsMap.get(command);
  if (!rp) return;
  const query = rp.query ?? keyword;
  const options: ICommandActionOptions = {
    from: 'search',
    match: rp.match,
    result: rp.result,
  };
  await dispatchPluginAction(rp.owner, rp.command, action, query, options);
};
