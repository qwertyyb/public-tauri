---
name: plugin-generator
description: Generate plugins for the Public Spotlight application based on the existing plugin system and architecture. Use this skill when the user requests to create a new plugin, generate plugin boilerplate, or needs guidance on plugin development patterns.
---

# Plugin Generator

## Overview

This skill provides comprehensive guidance and templates for creating plugins for the Public Spotlight application (a Tauri-based macOS Spotlight-like application). The plugin system supports multiple types including simple command handlers, ListView templates, and Vue-based view plugins.

## When to Use This Skill

Use this skill when:
- User requests to create a new plugin for Public Spotlight
- User needs boilerplate code for a plugin
- User asks about plugin architecture or patterns
- User wants to understand how existing plugins work
- User needs guidance on plugin configuration and manifest

## Plugin Architecture

### Core Concepts

**1. Plugin Manifest (package.json)**
Every plugin must have a `publicPlugin` configuration section with:
- `name` - Unique plugin identifier (must be URL-safe)
- `title` - Display name (max 60 chars)
- `subtitle` - Short description (max 100 chars)
- `icon` - Path to icon (512x512px PNG, supports `@dark` suffix)
- `main` - Path to main/preload JS file
- `commands` - Array of command definitions
- Optional: `template`, `html`, `server`, `preferences`

**2. Plugin Modes**
- **none**: Simple command handler with `onEnter` callback
- **view**: Full UI view using Vue components
- **listView**: Pre-built list template for displaying items
- **web**: External web content

**3. Command Matching**
- **text**: Keyword matching (fuzzy search)
- **trigger**: Prefix matching (e.g., "calc 2+2")
- **regexp**: Regular expression matching
- **full**: Match all queries
- **file**: File type matching

**4. Plugin Lifecycle**
```typescript
interface IPluginLifecycle {
  onInput?: (keyword: string) => Promise<IListItem[]>;
  onEnter?: (command: ICommand, query: string, options: ICommandActionOptions) => void | Promise<void>;
  onSelect?: (command: ICommand, query: string, options: ICommandActionOptions) => void | Promise<void>;
  onAction?: (command: ICommand, action: IActionItem, keyword: string) => void | Promise<void>;
}
```

## Plugin Templates

### Template 1: Simple Command Plugin (none mode)

Best for: Simple utilities, calculators, single-action commands

**Structure:**
```
plugins/my-plugin/
├── package.json
├── src/
│   └── index.ts
├── assets/
│   └── icon.png
└── rollup.config.mjs
```

**package.json:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "rollup --config ./rollup.config.mjs"
  },
  "publicPlugin": {
    "title": "My Plugin",
    "subtitle": "Plugin description",
    "icon": "./assets/icon.png",
    "main": "./dist/index.js",
    "commands": [
      {
        "name": "my-command",
        "title": "My Command",
        "matches": [
          {
            "type": "text",
            "keywords": ["my", "command"]
          }
        ],
        "mode": "none"
      }
    ]
  }
  },
  "dependencies": {
    "@public/api": "workspace:^"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "catalog:plugin",
    "@rollup/plugin-node-resolve": "catalog:plugin",
    "rollup": "catalog:plugin",
    "rollup-plugin-esbuild": "catalog:plugin",
    "@rollup/plugin-replace": "catalog:plugin"
  }
}
```

**src/index.ts:**
```typescript
import { definePlugin, dialog } from '@public/api';

const createMyPlugin = definePlugin(() => ({
  onEnter(command, query) {
    // Handle command execution
    dialog.showToast('Command executed!');
  },
}));

export default createMyPlugin;
```

### Template 2: ListView Plugin (listView mode)

Best for: Lists, search results, item collections

**Structure:**
```
plugins/my-plugin/
├── package.json
├── src/
│   └── index.ts
├── assets/
│   └── icon.png
└── rollup.config.mjs
```

**package.json:**
```json
{
  "publicPlugin": {
    "title": "My Plugin",
    "subtitle": "Plugin description",
    "icon": "./assets/icon.png",
    "template": "listView",
    "commands": [
      {
        "name": "my-list",
        "title": "My List",
        "matches": [
          {
            "type": "text",
            "keywords": ["list"]
          }
        ],
        "mode": "listView",
        "preload": "./dist/index.js"
      }
    ]
  }
}
```

**src/index.ts:**
```typescript
import type { IListViewCommand } from '@public/api';

const listCommand: IListViewCommand = {
  onShow(query, _, setList) {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const results = query ? items.filter(item => item.includes(query)) : items;
    setList(results.map(item => ({
      title: item,
      subtitle: 'Description',
    })));
  },
  onSearch(query, setList) {
    // Handle search within list
    this.onShow(query, null, setList);
  },
  onEnter(item) {
    // Handle item selection
  },
};

export default listCommand;
```

### Template 3: Vue View Plugin (view mode)

Best for: Complex UI, forms, multi-page interactions

**Structure:**
```
plugins/my-plugin/
├── package.json
├── src/
│   ├── index.ts
│   ├── App.vue
│   └── main.ts
├── assets/
│   └── icon.png
├── index.html
└── vite.config.ts
```

**package.json:**
```json
{
  "publicPlugin": {
    "title": "My Plugin",
    "subtitle": "Plugin description",
    "icon": "./assets/icon.png",
    "html": "./dist/index.html",
    "commands": [
      {
        "name": "my-view",
        "title": "My View",
        "matches": [
          {
            "type": "text",
            "keywords": ["view"]
          }
        ],
        "mode": "view",
        "entry": "./index.html"
      }
    ]
  }
}
```

**src/index.ts:**
```typescript
import { definePlugin } from '@public/api';

const createMyPlugin = definePlugin((app) => {
  app.updateCommands([
    {
      name: 'my-view',
      title: 'My View',
      icon: './assets/icon.png',
    },
  ]);

  return {
    async onEnter(command) {
      // View is handled by Vue component
    },
  };
});

export default createMyPlugin;
```

## Available APIs

**From @public/api:**
- `definePlugin()` - Plugin factory function
- `dialog` - Alert, confirm, toast dialogs
- `mainWindow` - Window management (show, hide, pushView, popView)
- `utils` - System utilities (runCommand, runAppleScript)
- `clipboard` - Clipboard operations (read, write, paste)
- `storage` - Persistent storage API
- `Database` - SQLite database operations
- `screen` - Screen capture and monitor info

**IPluginLifecycle Parameters:**
```typescript
interface IAppContext {
  updateCommands: (commands: ICommand[]) => void;
  showCommands: (commands: ICommand[]) => void;
  getPreferences: () => Record<string, any>;
  storage: IPluginStorage;
}
```

## Common Patterns

### Pattern 1: Fuzzy Search with Input Validation

```typescript
onInput(keyword: string) {
  if (isValidInput(keyword)) {
    const results = processData(keyword);
    return results.map(item => ({
      name: 'my-command',
      title: item.title,
      subtitle: item.description,
      icon: './assets/result.png',
      text: item.value,
    }));
  }
}
```

### Pattern 2: Trigger Matching

```json
{
  "matches": [
    {
      "type": "trigger",
      "triggers": ["calc", "calculate"],
      "title": "Calculate \"$query\""
    }
  ]
}
```

### Pattern 3: Preferences Integration

**In package.json:**
```json
{
  "publicPlugin": {
    "preferences": [
      {
        "name": "apiKey",
        "title": "API Key",
        "type": "text",
        "required": true,
        "description": "Enter your API key"
      }
    ]
  }
}
```

**In plugin:**
```typescript
const createMyPlugin = definePlugin((app) => {
  const prefs = app.getPreferences();
  const apiKey = prefs.apiKey;
  // Use apiKey in plugin logic
});
```

## Build and Development

**Development:**
```bash
cd plugins/my-plugin
npm run build
```

**Rollup Configuration:**
```javascript
import esbuild from 'rollup-plugin-esbuild';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
  },
  plugins: [esbuild()]
};
```

## Plugin Loading Process

1. **Registration** (`src/plugin/manager.ts`):
   - Read `package.json` from plugin path
   - Parse `publicPlugin` configuration
   - Load main/preload scripts
   - Register server modules if needed

2. **Lifecycle**:
   - Initialize Wujie iframe for view/listView modes
   - Inject plugin APIs (dialog, utils, clipboard, etc.)
   - Execute plugin factory function with app context
   - Register commands in the system

3. **Execution**:
   - User types query → `onInput` called
   - User selects item → `onSelect` called
   - User presses Enter → `onEnter` called
   - User triggers action → `onAction` called

## Existing Plugin Examples

Study these for reference:
- `calculator` - Simple command with input validation
- `emoji` - ListView with fuzzy search
- `clipboard` - ListView with trigger matching
- `snippets` - Vue view with form
- `applescript` - System utility integration

## Quick Start Guide

To create a new plugin:

1. **Choose plugin type** (none, listView, or view)
2. **Create directory** in `plugins/` folder
3. **Copy template** for chosen plugin type
4. **Edit package.json** with your configuration
5. **Implement logic** in `src/index.ts`
6. **Add icon** (512x512px PNG) to `assets/`
7. **Build plugin** with `npm run build`
8. **Test plugin** by restarting the app

## Common Issues

**Issue:** Plugin not loading
- Check `package.json` has correct `publicPlugin` section
- Verify `main` or `preload` paths are correct
- Check console for error messages

**Issue:** Commands not showing
- Verify `matches` configuration is correct
- Test with different keywords
- Check command name uniqueness

**Issue:** API not available
- Ensure `@public/api` is a dependency
- Check import statements
- Verify plugin is properly initialized

## Resources

- **Plugin Schema**: `src/plugin/plugin.schema.json` - Full validation rules
- **Type Definitions**: `@public/schema` package
- **API Reference**: `@public/api` package
- **Examples**: See existing plugins in `plugins/` directory
