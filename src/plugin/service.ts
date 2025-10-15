import fuzzysort from 'fuzzysort';
import { enterCommand, getPlugins } from './manager';
import { resultsMap } from './store';
import { getLocalPath, hanziToPinyin, htmlEscape } from './utils';

// 计算匹配分数，越大表示匹配度越高，最大为1
const calcScore = (query: string, target: string) => query.length / target.length;

const match = (query: string, target: string) => {
  const arr = Array.from(query.toLocaleLowerCase());

  let index = 0;
  let indexes: number[] = [];

  const targetArr = Array.from(target.toLocaleLowerCase());
  for (let i = 0; i < arr.length; i++) {
    const char = arr[i];
    const targetIndex = targetArr.indexOf(char, index);
    if (targetIndex >= 0) {
      indexes.push(targetIndex);
      index = targetIndex + 1;
    } else {
      index = 0;
      indexes = [];
      break;
    }
  }

  let score = indexes.length / targetArr.length;

  if (indexes.length === 0 && /\p{sc=Han}/u.test(target)) {
    // 有汉字，尝试汉字转拼音匹配
    const targetArr = Array.from(target.toLocaleLowerCase())
      .map((char, index) => {
        if (/\p{sc=Han}/u.test(char)) {
          const pinyin = hanziToPinyin(char);
          return Array.from(pinyin).map(i => ({ char: i, index }));
        }
        return [{ char, index }];
      })
      .flat();

    for (let i = 0; i < arr.length; i++) {
      const char = arr[i];
      const targetIndex = targetArr.slice(index).findIndex(item => item.char === char);
      if (targetIndex < 0) {
        return {
          score: -1,
          markedText: target,
        };
      }
      const targetItem = targetArr[targetIndex + index];
      indexes.push(targetItem.index);
      index = index + targetIndex + 1;
    }
    score = indexes.length / targetArr.length;
  }

  indexes.forEach(i => (targetArr[i] = `<mark>${targetArr[i]}</mark>`));

  return {
    score,
    markedText: targetArr.join(''),
  };
};

const compileString = (template: string, vars: any) => {
  // eslint-disable-next-line no-new-func
  const func = new Function('matches', `return \`${template.replaceAll('`', '``')}\``);
  return func(vars);
};

const CommandOnInputBaseScore = 100;
const CommandAliasBaseScore = 10;
const CommandTriggerMatchBaseScore = 5;

export const calcCommandMatchInfo = (keyword: string, command: IPluginCommand, options?: { alias?: string }) => {
  if (options?.alias && match(keyword, options.alias).score > 0) {
    const result = { ...command };
    const score = CommandAliasBaseScore + calcScore(keyword, options.alias);
    return { result, matchInfo: { from: 'alias', query: keyword, score, keyword } } as {
      result: IPluginCommand,
      matchInfo: Omit<ICommandAliasMatchData, 'owner'>
    };
  }

  const titleMatch = command.title && match(keyword, command.title);
  if (titleMatch && titleMatch.score > 0) {
    const result = { ...command, title: titleMatch.markedText };
    return { result, matchInfo: { from: 'alias', query: '', score: titleMatch.score, keyword } } as {
      result: IPluginCommand,
      matchInfo: Omit<ICommandAliasMatchData, 'owner'>
    };
  }

  const subtitleMatch = command.subtitle && match(keyword, command.subtitle);
  if (subtitleMatch && subtitleMatch.score > 0) {
    const result = { ...command, subtitle: subtitleMatch.markedText };
    return {
      result,
      matchInfo: {
        from: 'alias',
        query: '',
        score: subtitleMatch.score,
        keyword,
      },
    } as {
      result: IPluginCommand;
      matchInfo: Omit<ICommandAliasMatchData, 'owner'>;
    };
  }

  const matches = command.matches || [];
  const triggerMatch = matches.find<ITriggerPluginCommandMatch>(match => match.type === 'trigger');
  if (triggerMatch) {
    const triggerIndex = triggerMatch.triggers.findIndex(trigger => keyword.startsWith(`${trigger} `));
    if (triggerIndex >= 0) {
      const trigger = triggerMatch.triggers[triggerIndex];
      const query = keyword.substring(trigger.length + 1);
      const result = {
        ...command,
        title: (query && triggerMatch.title) ? triggerMatch.title.replaceAll('$query', query) : command.title,
        subtitle: (query && triggerMatch.subtitle) ? triggerMatch.subtitle.replaceAll('$query', query) : command.subtitle,
      };
      return {
        result,
        matchInfo: { from: 'match', match: triggerMatch, keyword, score: CommandTriggerMatchBaseScore + calcScore(keyword, trigger), matchData: { trigger, query }, query },
      } as { result: IPluginCommand, matchInfo: Omit<ICommandTriggerMatchData, 'owner'> };
    }
  }
  const textMatch = matches.find<ITextPluginCommandMatch>(match => match.type === 'text');
  if (textMatch) {
    const matchKeyword = textMatch.keywords.find(word => match(keyword, word).score > 0);
    if (matchKeyword) {
      const result = { ...command };
      return {
        result,
        matchInfo: { from: 'match', keyword, score: calcScore(keyword, matchKeyword), match: textMatch, matchData: { keyword: matchKeyword }, query: '' },
      } as { result: IPluginCommand, matchInfo: Omit<ICommandTextMatchData, 'owner'> };
    }
  }
  const regExpMatch = matches.find<IRegExpPluginCommandMatch>(item => item.type === 'regexp');
  if (regExpMatch) {
    const regMatches = keyword.match(new RegExp(regExpMatch.regexp));
    if (regMatches) {
      const result = {
        ...command,
        title: compileString(regExpMatch.title || command.title, regMatches),
        subtitle: compileString(regExpMatch.subtitle || command.subtitle || '', regMatches),
      };
      return {
        result,
        matchInfo: { from: 'match', match: regExpMatch, keyword, score: 0.3, matchData: { matches: regMatches }, query: '' },
      } as { result: IPluginCommand, matchInfo: Omit<ICommandRegExpMatchData, 'owner'> };
    }
  }
  const fullMatch = matches.find<IFullPluginCommandMatch>(item => item.type === 'full');
  if (fullMatch) {
    const result = {
      ...command,
      title: (keyword && fullMatch.title) ? fullMatch.title.replaceAll('$query', keyword) : command.title,
      subtitle: (keyword && fullMatch.subtitle) ? fullMatch.subtitle.replaceAll('$query', keyword) : command.subtitle,
    };
    return {
      result,
      matchInfo: { from: 'match', keyword, score: 0.01, match: fullMatch, query: keyword },
    } as { result: IPluginCommand, matchInfo: Omit<ICommandFullMatchData, 'owner'> };
  }
};

// export const calcCommandMatchInfo = (keyword: string, command: IPluginCommand, options?: { alias?: string }) => {

// };

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

export const handleQuery = async (keyword: string) => {
  const results: IPluginCommand[] = [];

  let plugins = getPlugins();
  // let inputCount = 0;
  await Promise.all([...plugins.values()].map((plugin) => {
    if (typeof plugin.plugin?.onInput !== 'function') return;
    return Promise.resolve(plugin.plugin?.onInput(keyword)).then((list) => {
      if (!list) return;
      if (!Array.isArray(list)) return;
      list.forEach((item) => {
        if (!item.title && !item.subtitle && !item.icon) return;
        const { icon, score, ...rest } = item;
        const result = {
          ...rest,
          icon: getLocalPath(item.icon, plugin.path),
        };
        results.push(result);
        // inputCount += 1;
        resultsMap.set(result, { owner: plugin });
      });
    });
  }));

  const commandsSet = new Set<string>();

  // 执行 onInput 后，可能会更新 commands，所以需要重新获取一下
  plugins = getPlugins();
  const commands: { command: IPluginCommand, owner: IRunningPlugin, title: string, subtitle: string, titleZh: string, subtitleZh: string }[] = [];
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
  const keywordsKey = new Array(20).fill(0)
    .map((_, index) => `keywords.${index}`);
  const queryResults = fuzzysort.go(keyword, commands, {
    keys: ['command.title', 'command.subtitle', 'titleZh', 'subtitleZh', ...keywordsKey],
  });
  console.log('fuzzyResults', queryResults);
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
    resultsMap.set(command, { owner: result.obj.owner });
    commandsSet.add(`${result.obj.owner.manifest.name}:${result.obj.command.name}`);
    return command;
  }));
  fuzzysort.cleanup();

  console.log('commandsSet', commandsSet);
  // triggers
  results.push(...commands.reduce<IPluginCommand[]>((acc, item) => {
    if (commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`)) return acc;
    const triggerMatch = item.command.matches?.find(match => match.type === 'trigger');
    if (!triggerMatch) return acc;
    const triggerIndex = triggerMatch.triggers.findIndex(trigger => keyword.startsWith(`${trigger} `));
    if (triggerIndex < 0) return acc;
    const trigger = triggerMatch.triggers[triggerIndex];
    const query = keyword.substring(trigger.length + 1);
    console.log(trigger, query);
    const result = {
      ...item.command,
      title: (query && triggerMatch.title) ? triggerMatch.title.replaceAll('$query', query) : item.command.title,
      subtitle: (query && triggerMatch.subtitle) ? triggerMatch.subtitle.replaceAll('$query', query) : item.command.subtitle,
    };
    resultsMap.set(result, { owner: item.owner, query });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));


  // 正则匹配
  results.push(...commands.reduce<IPluginCommand[]>((acc, item) => {
    if (commandsSet.has(`${item.owner.manifest.name}:${item.command.name}`)) return acc;
    const regMatches = item.command.matches?.filter(match => match.type === 'regexp');
    if (!regMatches) return acc;
    const regMatch = regMatches.find(match => new RegExp(match.regexp).test(keyword));
    if (!regMatch) return acc;
    const matches = keyword.match(new RegExp(regMatch.regexp));
    const result = {
      ...item.command,
      title: compileString(regMatch.title || item.command.title, matches),
      subtitle: compileString(regMatch.subtitle || item.command.subtitle || '', matches),
    };
    resultsMap.set(result, { owner: item.owner });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));

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
    resultsMap.set(result, { owner });
    commandsSet.add(`${item.owner.manifest.name}:${item.command.name}`);
    return [...acc, result];
  }, []));

  return results;
};

export const handleSelect = (command: IPluginCommand, keyword: string) => {
  const rp = resultsMap.get(command);
  return rp?.owner.plugin?.onSelect?.(command, rp.query ?? keyword);
};

export const handleEnter = (command: IPluginCommand, keyword: string) => {
  const rp = resultsMap.get(command);
  if (!rp) return;
  enterCommand(rp.owner, command, rp.query ?? keyword);
};

export const handleAction = (command: IPluginCommand, action: IActionItem, keyword: string) => {
  const rp = resultsMap.get(command);
  if (!rp) return;
  rp.owner.plugin?.onAction?.(command, action, keyword);
};
