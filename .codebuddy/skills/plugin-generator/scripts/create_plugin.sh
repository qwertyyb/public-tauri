#!/bin/bash
# Create a new plugin based on template
# Usage: ./scripts/create_plugin.sh <plugin-name> <type>

PLUGIN_NAME=$1
PLUGIN_TYPE=${2:-"none"}  # default to simple command plugin

if [ -z "$PLUGIN_NAME" ]; then
  echo "Usage: $0 <plugin-name> [type]"
  echo "Types: none, listview, view"
  exit 1
fi

PLUGIN_DIR="../../plugins/$PLUGIN_NAME"

echo "Creating plugin: $PLUGIN_NAME (type: $PLUGIN_TYPE)"
mkdir -p "$PLUGIN_DIR/src"
mkdir -p "$PLUGIN_DIR/assets"

# Create package.json
cat > "$PLUGIN_DIR/package.json" << EOF
{
  "name": "$PLUGIN_NAME",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "scripts": {
    "build": "rollup --config ./rollup.config.mjs"
  },
  "publicPlugin": {
    "title": "$PLUGIN_NAME",
    "subtitle": "Plugin description",
    "icon": "./assets/icon.png",
    "main": "./dist/index.js"
EOF

if [ "$PLUGIN_TYPE" = "listview" ]; then
  cat >> "$PLUGIN_DIR/package.json" << EOF
,
    "template": "listView",
    "commands": [
      {
        "name": "list",
        "title": "List Items",
        "matches": [
          {
            "type": "text",
            "keywords": ["list", "items"]
          }
        ],
        "mode": "listView",
        "preload": "./dist/index.js"
      }
    ]
EOF
elif [ "$PLUGIN_TYPE" = "view" ]; then
  cat >> "$PLUGIN_DIR/package.json" << EOF
,
    "html": "./dist/index.html",
    "commands": [
      {
        "name": "view",
        "title": "Open View",
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
EOF
else
  cat >> "$PLUGIN_DIR/package.json" << EOF
,
    "commands": [
      {
        "name": "command",
        "title": "My Command",
        "matches": [
          {
            "type": "text",
            "keywords": ["command", "my"]
          }
        ],
        "mode": "none"
      }
    ]
EOF
fi

cat >> "$PLUGIN_DIR/package.json" << EOF
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
EOF

# Create rollup.config.mjs
cat > "$PLUGIN_DIR/rollup.config.mjs" << EOF
import esbuild from 'rollup-plugin-esbuild';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
  },
  plugins: [esbuild()],
};
EOF

# Create source file based on type
if [ "$PLUGIN_TYPE" = "listview" ]; then
  cat > "$PLUGIN_DIR/src/index.ts" << EOF
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
    this.onShow(query, null, setList);
  },
  onEnter(item) {
    // Handle item selection
  },
};

export default listCommand;
EOF
elif [ "$PLUGIN_TYPE" = "view" ]; then
  cat > "$PLUGIN_DIR/src/index.ts" << EOF
import { definePlugin } from '@public/api';

const create$PLUGIN_NAME = definePlugin((app) => {
  app.updateCommands([
    {
      name: 'view',
      title: 'Open View',
      icon: './assets/icon.png',
    },
  ]);

  return {
    async onEnter(command) {
      // View is handled by Vue component
    },
  };
});

export default create$PLUGIN_NAME;
EOF
else
  cat > "$PLUGIN_DIR/src/index.ts" << EOF
import { definePlugin, dialog } from '@public/api';

const create$PLUGIN_NAME = definePlugin(() => ({
  onEnter(command, query) {
    // Handle command execution
    dialog.showToast('Command executed!');
  },
}));

export default create$PLUGIN_NAME;
EOF
fi

echo "✅ Plugin created: $PLUGIN_DIR"
echo "📝 Next steps:"
echo "   1. Edit package.json to update title, subtitle, and commands"
echo "   2. Implement your plugin logic in src/index.ts"
echo "   3. Add icon.png to assets/ folder (512x512px)"
echo "   4. Run: cd $PLUGIN_DIR && npm run build"
