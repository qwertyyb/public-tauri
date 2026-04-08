# Plugin API Reference

Complete API reference for Public Spotlight plugin development.

## @public/api Module

### definePlugin()

Plugin factory function that creates a plugin instance.

```typescript
function definePlugin(
  factory: (app: IAppContext) => IPluginLifecycle
): () => IPluginLifecycle
```

**Parameters:**
- `factory` - Function that receives app context and returns plugin lifecycle

**Returns:**
- Plugin factory function

**Example:**
```typescript
const createMyPlugin = definePlugin((app) => ({
  onEnter: (command, query) => {
    // Plugin logic
  }
}));
```

---

## Core APIs

### dialog

Dialog and notification APIs.

#### showAlert()
```typescript
dialog.showAlert(
  message: string,
  title?: string,
  options?: {
    type: 'info' | 'warning' | 'error',
    confirmText: string
  }
): Promise<void>
```

#### showConfirm()
```typescript
dialog.showConfirm(
  message: string,
  title?: string,
  options?: {
    type: 'info' | 'warning' | 'error',
    confirmText: string,
    cancelText: string
  }
): Promise<void>
```

#### showToast()
```typescript
dialog.showToast(
  message: string,
  options?: {
    duration?: number,
    icon?: string
  }
): Promise<void>
```

### mainWindow

Window management APIs.

#### mainWindow.hide()
```typescript
mainWindow.hide(): Promise<void>
```
Hide the main window.

#### mainWindow.show()
```typescript
mainWindow.show(): Promise<void>
```
Show the main window.

#### mainWindow.center()
```typescript
mainWindow.center(): Promise<void>
```
Center the main window.

#### mainWindow.clearInput()
```typescript
mainWindow.clearInput(): void
```
Clear the search input field.

#### mainWindow.pushView()
```typescript
mainWindow.pushView(options: {
  path: string,
  params?: any
}): void
```
Push a new view to the navigation stack.

**Paths:**
- `/settings` - Settings view
- `/plugin/prfs` - Plugin preferences
- `/plugin/view/wujie` - Plugin Wujie view
- `/mcp/config` - MCP configuration

#### mainWindow.popView()
```typescript
mainWindow.popView(options?: { count?: number }): void
```
Pop views from the navigation stack.

#### mainWindow.onShow()
```typescript
mainWindow.onShow(callback: () => void): Promise<UnlistenFn>
```
Register callback for when window is shown.

#### mainWindow.offShow()
```typescript
mainWindow.offShow(callback: () => void): void
```
Unregister window show callback.

### clipboard

Clipboard operations.

#### clipboard.read()
```typescript
clipboard.read(): Promise<string>
```
Read text from clipboard.

#### clipboard.write()
```typescript
clipboard.write(text: string): Promise<void>
```
Write text to clipboard.

#### clipboard.paste()
```typescript
clipboard.paste(): Promise<void>
```
Trigger paste (Cmd+V).

### utils

System utility functions.

#### utils.getCurrentPath()
```typescript
utils.getCurrentPath(): Promise<string>
```
Get current file path.

#### utils.getSelectedPath()
```typescript
utils.getSelectedPath(): Promise<string[]>
```
Get selected file paths.

#### utils.getFrontmostApplication()
```typescript
utils.getFrontmostApplication(): Promise<IApplication | null>
```
Get the frontmost application.

```typescript
interface IApplication {
  displayName: string
  executablePath: string
  bundleIdentifier: string
}
```

#### utils.runCommand()
```typescript
utils.runCommand(command: string): Promise<string>
```
Execute a shell command.

#### utils.runAppleScript()
```typescript
utils.runAppleScript(script: string): Promise<string>
```
Execute an AppleScript.

#### utils.open()
```typescript
utils.open(path: string): Promise<void>
```
Open a file or URL.

#### utils.getMousePosition()
```typescript
utils.getMousePosition(): Promise<{ x: number, y: number }>
```
Get current mouse position.

### storage

Persistent storage API for plugin data.

```typescript
storage: IPluginStorage

interface IPluginStorage {
  getItem(key: string): Promise<any>
  setItem(key: string, value: any): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}
```

### Database

SQLite database operations.

```typescript
new Database(sqliteFile: string)

interface Database {
  execute(query: string, params?: any[]): Promise<void>
  select(query: string, params?: any[]): Promise<any[]>
  insert(table: string, data: any): Promise<number>
  update(table: string, data: any, where: any): Promise<number>
  delete(table: string, where: any): Promise<number>
}
```

### screen

Screen capture and monitor information.

```typescript
screen: {
  getDetails(): Promise<ScreenDetail[]>
  capture(id: number): Promise<string>
  screenFromPoint(x: number, y: number): Promise<ScreenDetail>
}

interface ScreenDetail {
  id: number
  name: number
  width: number
  height: number
  isBuiltin: boolean
  isPrimary: boolean
  x: number
  y: number
}
```

---

## IAppContext

Plugin context provided by `definePlugin()`.

```typescript
interface IAppContext {
  updateCommands: (commands: ICommand[]) => void
  showCommands: (commands: ICommand[]) => void
  getPreferences: () => Record<string, any>
  storage: IPluginStorage
  invoke: (method: string, ...args: any[]) => Promise<any>
  on: (event: string, callback: Function) => UnlistenFn
}
```

### updateCommands()
Dynamically update the plugin's command list at runtime.

```typescript
app.updateCommands([
  {
    name: 'new-command',
    title: 'New Command',
    icon: './assets/new.png',
    matches: [
      { type: 'text', keywords: ['new'] }
    ]
  }
])
```

### showCommands()
Show commands in the search results immediately.

```typescript
app.showCommands([
  {
    name: 'command1',
    title: 'Command 1',
    subtitle: 'Description',
    icon: './assets/icon1.png'
  },
  {
    name: 'command2',
    title: 'Command 2',
    subtitle: 'Description',
    icon: './assets/icon2.png'
  }
])
```

### getPreferences()
Get plugin preferences from storage.

```typescript
const prefs = app.getPreferences();
const apiKey = prefs.apiKey;
```

### storage
Plugin-specific storage instance.

```typescript
app.storage.setItem('myKey', 'myValue');
const value = await app.storage.getItem('myKey');
```

### invoke()
Invoke server-side methods (for plugins with server module).

```typescript
const result = await app.invoke('myMethod', arg1, arg2);
```

### on()
Listen for server-side events.

```typescript
const unlisten = app.on('myEvent', (data) => {
  console.log('Received:', data);
});

// Later
unlisten();
```

---

## IPluginLifecycle

Plugin lifecycle hooks.

```typescript
interface IPluginLifecycle {
  onInput?: (keyword: string) => Promise<IListItem[] | void>
  onEnter?: (
    command: ICommand,
    query: string,
    options: ICommandActionOptions
  ) => void | Promise<void>
  onSelect?: (
    command: ICommand,
    query: string,
    options: ICommandActionOptions
  ) => void | Promise<void>
  onAction?: (
    command: ICommand,
    action: IActionItem,
    keyword: string
  ) => void | Promise<void>
}
```

### onInput()
Called when user types in search input.

**Parameters:**
- `keyword` - Current search text

**Returns:**
- Promise resolving to array of list items or void

**Example:**
```typescript
onInput(keyword: string) {
  if (isValidInput(keyword)) {
    const results = processData(keyword);
    return results.map(item => ({
      title: item.name,
      subtitle: item.description,
      icon: './assets/result.png',
      text: item.value
    }));
  }
}
```

### onEnter()
Called when user presses Enter on a command.

**Parameters:**
- `command` - The selected command
- `query` - Current search query
- `options` - Action context

**Example:**
```typescript
onEnter(command, query) {
  dialog.showToast(`Executing: ${command.title}`);
  // Execute command logic
}
```

### onSelect()
Called when user selects a command (not pressing Enter).

**Parameters:**
- `command` - The selected command
- `query` - Current search query
- `options` - Action context

**Example:**
```typescript
onSelect(command, query) {
  // Show preview or perform selection action
}
```

### onAction()
Called when user triggers an action on a command.

**Parameters:**
- `command` - The command with actions
- `action` - The triggered action
- `keyword` - Current search query

**Example:**
```typescript
onAction(command, action, keyword) {
  switch (action.id) {
    case 'copy':
      clipboard.write(keyword);
      break;
    case 'share':
      utils.open(`https://example.com/share?q=${keyword}`);
      break;
  }
}
```

---

## IListViewCommand

Special interface for listView mode plugins.

```typescript
interface IListViewCommand {
  onShow: (
    query: string,
    items: any[] | null,
    setList: (items: IListItem[]) => void
  ) => void
  onSearch: (
    query: string,
    setList: (items: IListItem[]) => void
  ) => void
  onEnter: (item: IListItem) => void
}
```

### onShow()
Called when the list view is shown.

**Parameters:**
- `query` - Current search query
- `items` - Items to display (from `showCommands`)
- `setList` - Function to set displayed items

**Example:**
```typescript
onShow(query, items, setList) {
  const allItems = items || ['Item 1', 'Item 2', 'Item 3'];
  const filtered = query ? allItems.filter(item => item.includes(query)) : allItems;
  setList(filtered.map(item => ({
    title: item,
    subtitle: 'Description'
  })));
}
```

### onSearch()
Called when user types in the list view.

**Parameters:**
- `query` - Current search query
- `setList` - Function to set displayed items

**Example:**
```typescript
onSearch(query, setList) {
  this.onShow(query, null, setList);
}
```

### onEnter()
Called when user presses Enter on a list item.

**Parameters:**
- `item` - The selected list item

**Example:**
```typescript
onEnter(item) {
  clipboard.write(item.title);
  dialog.showToast('Copied!');
}
```

---

## ICommand

Command definition interface.

```typescript
interface ICommand {
  name: string
  title: string
  subtitle?: string
  icon?: string
  mode?: 'none' | 'view' | 'listView' | 'web'
  entry?: string
  preload?: string
  matches?: IMatch[]
  preferences?: IPreference[]
  actions?: IActionItem[]
}
```

### IMatch Types

#### Text Match
```typescript
{
  type: 'text'
  keywords: string[]  // Array of keywords to match
}
```

#### Trigger Match
```typescript
{
  type: 'trigger'
  triggers: string[]  // Prefixes that trigger
  title?: string  // Can use $query placeholder
  subtitle?: string  // Can use $query placeholder
}
```

#### Regexp Match
```typescript
{
  type: 'regexp'
  regexp: string  // Regular expression
  title?: string  // Can use $1, $2, ...$n placeholders
  subtitle?: string  // Can use $1, $2, ...$n placeholders
}
```

#### Full Match
```typescript
{
  type: 'full'  // Match all queries
}
```

#### File Match
```typescript
{
  type: 'file'
  extensions?: string[]  // File extensions to match
  nameRegexp?: string  // File name regexp to match
}
```

---

## IPreference

Preference definition for plugin settings.

```typescript
interface IPreference {
  name: string
  title: string
  description?: string
  type: 'text' | 'number' | 'textarea' | 'password' | 'select'
  required?: boolean
  placeholder?: string
  defaultValue?: string | number | boolean
  options?: Array<{
    label: string
    value: string | number | boolean
  }>
}
```

---

## IActionItem

Action definition for commands.

```typescript
interface IActionItem {
  id: string
  title: string
  icon?: string
}
```

**Example:**
```typescript
const command = {
  name: 'my-command',
  title: 'My Command',
  actions: [
    { id: 'copy', title: 'Copy', icon: './assets/copy.png' },
    { id: 'share', title: 'Share', icon: './assets/share.png' }
  ]
}
```

---

## Plugin Configuration (package.json)

### publicPlugin Section

```typescript
interface IPluginConfig {
  name: string
  title: string
  subtitle: string
  description?: string
  icon: string
  version?: string
  main?: string  // Path to main/preload JS
  server?: string  // Path to server module
  html?: string  // Path to HTML (for view mode)
  template?: 'listView'  // Use built-in list template
  root?: string  // Root directory
  entry?: string  // Entry file
  preferences?: IPreference[]  // Plugin-level preferences
  commands?: ICommandConfig[]  // Command definitions
}

interface ICommandConfig {
  name: string
  title: string
  subtitle?: string
  description?: string
  icon?: string
  mode?: 'none' | 'view' | 'listView' | 'web'
  entry?: string  // Required for view mode
  preload?: string  // Required for listView mode
  preferences?: IPreference[]  // Command-level preferences
  matches?: IMatchConfig[]  // Matching rules
}
```

---

## Event Handling

### Window Events

#### clearInput
```typescript
window.dispatchEvent(new CustomEvent('clearInput'));
```
Clear the search input.

#### push-view
```typescript
window.dispatchEvent(new CustomEvent('push-view', {
  detail: { path: '/settings', params: {} }
}));
```
Push a new view.

#### pop-view
```typescript
window.dispatchEvent(new CustomEvent('pop-view', {
  detail: { count: 1 }
}));
```
Pop views from stack.

#### pop-to-root
```typescript
window.dispatchEvent(new CustomEvent('pop-to-root', {
  detail: { clearInput: false }
}));
```
Navigate to root view.

---

## Built-in Icons

If using Material Symbols, use:
```typescript
<div class="material-symbols-outlined">icon_name</div>
```

Common icons:
- `search` - Search
- `settings` - Settings
- `clipboard` - Clipboard
- `favorite` - Favorite
- `delete` - Delete
- `edit` - Edit
- `share` - Share
- `copy` - Copy
- `arrow_back` - Back

---

## Error Handling

### Graceful Degradation

```typescript
onInput(keyword: string) {
  try {
    const results = await processInput(keyword);
    return results;
  } catch (error) {
    console.error('Plugin error:', error);
    // Return empty array or show error to user
    dialog.showToast('Processing failed');
    return [];
  }
}
```

### Validation

```typescript
function isValidInput(input: string): boolean {
  if (!input || input.trim().length === 0) {
    return false;
  }
  // Add custom validation
  return true;
}
```

---

## Testing Your Plugin

### Manual Testing

1. **Build the plugin:**
```bash
cd plugins/my-plugin
npm run build
```

2. **Restart the application** to load the plugin

3. **Test command matching:**
   - Type keywords defined in `matches`
   - Verify commands appear in results

4. **Test execution:**
   - Press Enter on command
   - Verify `onEnter` is called

5. **Test preferences:**
   - Open plugin settings
   - Modify preferences
   - Verify they persist

### Debugging

```typescript
// Add console logs
console.log('Plugin loaded');
console.log('Query:', keyword);
console.log('Results:', results);

// Use dialog.showToast for user feedback
dialog.showToast('Processing...');
dialog.showToast('Complete!');
```

---

## Best Practices

1. **Performance**
   - Minimize async operations in `onInput`
   - Cache expensive computations
   - Use debouncing for heavy operations

2. **User Experience**
   - Provide feedback with `dialog.showToast()`
   - Handle errors gracefully
   - Validate user input before processing

3. **Code Organization**
   - Keep `onInput` focused on result generation
   - Separate business logic from UI concerns
   - Use TypeScript for type safety

4. **Resource Management**
   - Clean up event listeners
   - Avoid memory leaks
   - Use proper async/await patterns
