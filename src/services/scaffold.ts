import { join } from '@tauri-apps/api/path';
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';

export type PluginMode = 'none' | 'view' | 'listView';

export interface ScaffoldCommand {
  name: string;
  title: string;
  keywords: string[];
}

export interface ScaffoldOptions {
  name: string;
  title: string;
  subtitle: string;
  mode: PluginMode;
  commands: ScaffoldCommand[];
  parentDir: string;
}

function generatePackageJson(options: ScaffoldOptions): string {
  const { name, title, subtitle, mode, commands } = options;

  const publicPlugin: Record<string, any> = {
    title,
    subtitle,
    icon: './assets/icon.png',
  };

  const commandsConfig = commands.map((cmd) => {
    const entry: Record<string, any> = {
      name: cmd.name,
      title: cmd.title,
      mode: mode === 'none' ? 'none' : mode,
      matches: [
        {
          type: 'text',
          keywords: cmd.keywords,
        },
      ],
    };
    if (mode === 'listView') {
      entry.preload = `./dist/${cmd.name}.command.js`;
    }
    return entry;
  });

  publicPlugin.commands = commandsConfig;

  if (mode === 'none') {
    publicPlugin.main = './dist/index.js';
  } else if (mode === 'view') {
    publicPlugin.html = './dist/index.html';
  } else if (mode === 'listView') {
    publicPlugin.main = './dist/index.js';
    publicPlugin.template = 'listView';
  }

  const pkg: Record<string, any> = {
    name,
    version: '1.0.0',
    private: true,
    type: 'module',
    publicPlugin,
    scripts: {},
    dependencies: {
      '@public-tauri/api': 'latest',
    },
    devDependencies: {},
  };

  if (mode === 'none' || mode === 'listView') {
    pkg.scripts.build = 'rollup --config ./rollup.config.mjs';
    pkg.devDependencies = {
      '@rollup/plugin-commonjs': '^28.0.0',
      '@rollup/plugin-node-resolve': '^16.0.0',
      rollup: '^4.0.0',
      'rollup-plugin-esbuild': '^6.0.0',
    };
  } else {
    pkg.scripts = {
      dev: 'vite',
      build: 'vite build',
    };
    pkg.dependencies.vue = '^3.5.0';
    pkg.devDependencies = {
      '@vitejs/plugin-vue': '^6.0.0',
      typescript: '~5.8.0',
      vite: '^7.0.0',
      'vue-tsc': '^3.0.0',
    };
  }

  return JSON.stringify(pkg, null, 2);
}

function generateRollupConfig(options: ScaffoldOptions): string {
  const inputs: string[] = ['./src/main.ts'];
  if (options.mode === 'listView') {
    options.commands.forEach((cmd) => {
      inputs.push(`./src/${cmd.name}.command.ts`);
    });
  }

  const inputStr = inputs.length === 1
    ? `'${inputs[0]}'`
    : `[${inputs.map(i => `'${i}'`).join(', ')}]`;

  return `import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default defineConfig({
  input: ${inputStr},
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    esbuild({ target: 'es2022' }),
  ],
  external: ['@public-tauri/api'],
})
`;
}

function generateMainTs(options: ScaffoldOptions): string {
  if (options.mode === 'none') {
    return `import { definePlugin, dialog } from '@public-tauri/api'

export default definePlugin(() => {
  return {
    onAction(command, action, query) {
      dialog.showToast(\`Hello from \${command.title}! Query: \${query}\`)
    },
  }
})
`;
  }

  if (options.mode === 'listView') {
    return `import { definePlugin } from '@public-tauri/api'

export default definePlugin(() => {
  return {}
})
`;
  }

  return '';
}

function generateListViewCommandTs(_cmd: ScaffoldCommand): string {
  return `import type { IListViewCommand, IResultItem } from '@public-tauri/api'

const command: IListViewCommand = {
  onShow(_query, _options, setList) {
    setList([
      { title: 'Item 1', subtitle: 'Description 1' },
      { title: 'Item 2', subtitle: 'Description 2' },
    ])
  },
  onSearch(keyword, setList) {
    const items: IResultItem[] = [
      { title: 'Item 1', subtitle: 'Description 1' },
      { title: 'Item 2', subtitle: 'Description 2' },
    ].filter(item => item.title.toLowerCase().includes(keyword.toLowerCase()))
    setList(items)
  },
}

export default command
`;
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
  },
})
`;
}

function generateIndexHtml(options: ScaffoldOptions): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
}

function generateViewMainTs(): string {
  return `import { createApp } from 'vue'
import { createPlugin } from '@public-tauri/api'
import App from './App.vue'

createPlugin({})

createApp(App).mount('#app')
`;
}

function generateViewAppVue(options: ScaffoldOptions): string {
  return `<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello from ${options.title}!')
</script>

<template>
  <div class="container">
    <h1>{{ message }}</h1>
  </div>
</template>

<style>
* {
  padding: 0;
  margin: 0;
}
:root {
  color-scheme: light dark;
}
html, body, #app {
  height: 100%;
}
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
    },
    include: ['src'],
  }, null, 2);
}

export async function generatePlugin(options: ScaffoldOptions): Promise<string> {
  const pluginDir = await join(options.parentDir, options.name);
  const srcDir = await join(pluginDir, 'src');
  const assetsDir = await join(pluginDir, 'assets');

  await mkdir(srcDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  await writeTextFile(
    await join(pluginDir, 'package.json'),
    generatePackageJson(options),
  );

  await writeTextFile(
    await join(pluginDir, 'tsconfig.json'),
    generateTsConfig(),
  );

  if (options.mode === 'none') {
    await writeTextFile(
      await join(pluginDir, 'rollup.config.mjs'),
      generateRollupConfig(options),
    );
    await writeTextFile(
      await join(srcDir, 'main.ts'),
      generateMainTs(options),
    );
  } else if (options.mode === 'view') {
    await writeTextFile(
      await join(pluginDir, 'vite.config.ts'),
      generateViteConfig(),
    );
    await writeTextFile(
      await join(pluginDir, 'index.html'),
      generateIndexHtml(options),
    );
    await writeTextFile(
      await join(srcDir, 'main.ts'),
      generateViewMainTs(),
    );
    await writeTextFile(
      await join(srcDir, 'App.vue'),
      generateViewAppVue(options),
    );
  } else if (options.mode === 'listView') {
    await writeTextFile(
      await join(pluginDir, 'rollup.config.mjs'),
      generateRollupConfig(options),
    );
    await writeTextFile(
      await join(srcDir, 'main.ts'),
      generateMainTs(options),
    );
    for (const cmd of options.commands) {
      await writeTextFile(
        await join(srcDir, `${cmd.name}.command.ts`),
        generateListViewCommandTs(cmd),
      );
    }
  }

  return pluginDir;
}
