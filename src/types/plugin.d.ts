type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

interface IActionItem {
  name: string
  icon: string
  title: string
  shortcuts?: string
}

interface IListItem {
  title: string,
  icon?: string,
  subtitle?: string,
  actions?: IActionItem[]
}

type IPluginLifecycle  = {
  onInput?: (keyword: string) => void | IPluginCommand[] | Promise<void> | Promise<IPluginCommand[]>,
  onSelect?: (command: IPluginCommand, matchData: ICommandMatchData) => string | undefined | HTMLElement | Promise<string | HTMLElement | undefined>,
  onEnter?: (command: IPluginCommand, matchData?: ICommandMatchData) => void,
  onExit?: (command: IPluginCommand) => void,
  onAction?: (command: IPluginCommand, action: IActionItem, keyword: string) => void,
};

type IPluginReturn = IPluginLifecycle | undefined | null;

interface IPluginSettings {
  disabled?: boolean,
  commands: Record<string, ICommandSettings | undefined>,
  preferences?: Record<string, string | number | boolean>
}

interface ITriggerPluginCommandMatch {
  type: 'trigger'
  triggers: string[]
  title?: string
  subtitle?: string
}
interface ITextPluginCommandMatch {
  type: 'text'
  keywords: string[]
}

interface IFullPluginCommandMatch {
  type: 'full'
  title?: string
  subtitle?: string
}

interface IRegExpPluginCommandMatch {
  type: 'regexp',
  regexp: string
  title?: string
  subtitle?: string
}

type IPluginCreator = (utils: {
  updateCommands: (commands: IPluginCommandConfig[]) => void,
  showCommands: (commands: IPluginCommandConfig[]) => void,
  getPreferences: () => any,
}) => IPluginReturn;

type IPluginCommandMatch = ITextPluginCommandMatch | ITriggerPluginCommandMatch | IFullPluginCommandMatch | IRegExpPluginCommandMatch;

interface IPreference {
  name: string
  title: string
  description?: string
  type: 'text' | 'select',
  required?: boolean,
  default?: any,
  placeholder?: string,

  options?: { value: any, label: string }[]
}

// interface IPluginManifestConfig extends Required<IListItem> {
//   name: string
//   descript?: string,
//   commands?: IPluginCommandConfig[]
//   preload?: string,
//   preferences?: IPreference[]
// }

interface IPluginCommandConfig extends IListItem, Record<string, any> {
  name: string
  mode?: 'listView' | 'none' | 'view'
  matches?: IPluginCommandMatch[]
  entry?: string
  server?: string
  preload?: string,
  preferences?: IPreference[]
}

type IPluginCommand = IPluginCommandConfig;

// interface IPluginManifest extends WithRequired<IPluginCommandConfig, 'name' | 'icon' | 'title'> {
//   commands: IPluginCommandConfig[]
// }

interface IRunningPlugin {
  plugin?: IPluginReturn
  path: string
  manifest: IPluginManifest
  commands: IPluginCommandConfig[]
  settings?: IPluginSettings
  lifecycle?: IPluginLifecycle
}

interface IPluginCommandListView<Item extends IResultItem = IResultItem> {
  enter?: (query: string, setList: (list: Item[]) => void, options: { command: IPluginCommand }) => void,
  leave?: () => void,
  search?: (keyword: string, setList: (list: Item[]) => void) => void,
  select?: (result: Item, query: string) => string | HTMLElement | Promise<string> | Promise<HTMLElement>,
  action?: (result: Item, action?: IActionItem) => void
}

interface ICommandSettings {
  alias?: string
  shortcut?: string
  disabled?: boolean
  preferences?: Record<string, any>
}

interface IPluginSettings {
  disabled?: boolean,
  commands: Record<string, ICommandSettings | undefined>,
  preferences?: Record<string, string | number | boolean>
}

type IPluginsSettings = Record<string, IPluginSettings | undefined>;


interface ICommandBaseMatchData {
  keyword: string, score: number, query: string
}

interface ICommandTextMatchData extends ICommandBaseMatchData {
  from: 'match', match: ITextPluginCommandMatch, matchData: { keyword: string }
}

interface ICommandTriggerMatchData extends ICommandBaseMatchData {
  from: 'match', match: ITriggerPluginCommandMatch, matchData: { trigger: string, query: string }
}

interface ICommandRegExpMatchData extends ICommandBaseMatchData {
  from: 'match', match: IRegExpPluginCommandMatch, matchData: { matches: RegExpMatchArray }
}

interface ICommandFullMatchData extends ICommandBaseMatchData {
  from: 'match', match: IFullPluginCommandMatch
}

interface ICommandHotKeyMatchData extends ICommandBaseMatchData {
  from: 'hotkey'
}

interface ICommandAliasMatchData extends ICommandBaseMatchData {
  from: 'alias'
}

interface ICommandOnInputMatchData extends ICommandBaseMatchData {
  from: 'onInput'
}

type ICommandMatchData = ICommandTextMatchData | ICommandTriggerMatchData | ICommandRegExpMatchData | ICommandFullMatchData | ICommandHotKeyMatchData | ICommandAliasMatchData | ICommandOnInputMatchData | null;

interface IResultItem extends IListItem, Record<string, any> { }
