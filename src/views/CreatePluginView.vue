<template>
  <PublicLayout
    :main-action="mainAction"
  >
    <div class="create-plugin">
      <h3 class="section-title">
        插件信息
      </h3>
      <UFormField
        label="插件名称"
        required
        class="form-group"
      >
        <UInput
          v-model="form.name"
          class="w-full"
          placeholder="my-plugin (合法 npm 包名)"
        />
      </UFormField>
      <UFormField
        label="插件标题"
        required
        class="form-group"
      >
        <UInput
          v-model="form.title"
          class="w-full"
          placeholder="我的插件"
        />
      </UFormField>
      <UFormField
        label="插件描述"
        class="form-group"
      >
        <UInput
          v-model="form.subtitle"
          class="w-full"
          placeholder="插件功能简要描述"
        />
      </UFormField>

      <h3 class="section-title">
        模板选择 <span class="text-error">*</span>
      </h3>
      <div class="mode-selector">
        <div
          v-for="opt in modeOptions"
          :key="opt.value"
          class="mode-option"
          :class="{ active: form.mode === opt.value }"
          @click="form.mode = opt.value"
        >
          <UIcon
            :name="opt.icon"
            class="size-5 text-primary"
          />
          <div class="mode-info">
            <span class="mode-name">{{ opt.label }}</span>
            <span class="mode-desc">{{ opt.desc }}</span>
          </div>
        </div>
      </div>

      <h3 class="section-title">
        命令配置
      </h3>
      <div
        v-for="(cmd, index) in form.commands"
        :key="index"
        class="command-card"
      >
        <div class="command-header">
          <span class="command-index">命令 {{ index + 1 }}</span>
          <UButton
            v-if="form.commands.length > 1"
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="removeCommand(index)"
          />
        </div>
        <UFormField
          label="命令名称"
          required
          class="form-group"
        >
          <UInput
            v-model="cmd.name"
            class="w-full"
            placeholder="hello"
          />
        </UFormField>
        <UFormField
          label="命令标题"
          required
          class="form-group"
        >
          <UInput
            v-model="cmd.title"
            class="w-full"
            placeholder="Hello World"
          />
        </UFormField>
        <UFormField
          label="匹配关键词"
          class="form-group"
        >
          <UInput
            v-model="cmd.keywordsStr"
            class="w-full"
            placeholder="用逗号分隔，如: hello, 你好"
          />
        </UFormField>
      </div>
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        color="neutral"
        block
        @click="addCommand"
      >
        添加命令
      </UButton>

      <h3 class="section-title">
        创建目录 <span class="text-error">*</span>
      </h3>
      <div
        class="dir-picker"
        @click="pickDirectory"
      >
        <UIcon
          name="i-lucide-folder-open"
          class="size-5 text-primary"
        />
        <span class="dir-path">{{ form.parentDir || '点击选择父目录...' }}</span>
      </div>
      <p
        v-if="form.parentDir && form.name"
        class="dir-preview"
      >
        将创建: {{ form.parentDir }}/{{ form.name }}
      </p>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import PublicLayout from '@/components/PublicLayout.vue';
import type { ActionPanelAction } from '@/types/plugin';
import { generatePlugin, type PluginMode } from '@/services/scaffold';
import { registerPluginFromLocalPath } from '@/services/store';
import { showToast } from '@/utils/feedback';
import { popView } from '@/plugin/utils';
import { opener } from '@public/core';

interface CommandForm {
  name: string;
  title: string;
  keywordsStr: string;
}

const modeOptions = [
  { value: 'none' as PluginMode, label: '无 UI 模式', icon: 'i-lucide-terminal', desc: '适合简单操作，无需界面' },
  { value: 'view' as PluginMode, label: '自定义页面', icon: 'i-lucide-globe', desc: 'Vue 自定义页面，适合复杂 UI' },
  { value: 'listView' as PluginMode, label: '列表视图', icon: 'i-lucide-list', desc: '列表展示和搜索结果' },
];

const form = reactive({
  name: '',
  title: '',
  subtitle: '',
  mode: 'none' as PluginMode,
  commands: [{ name: '', title: '', keywordsStr: '' }] as CommandForm[],
  parentDir: '',
});

const addCommand = () => {
  form.commands.push({ name: '', title: '', keywordsStr: '' });
};

const removeCommand = (index: number) => {
  form.commands.splice(index, 1);
};

const pickDirectory = async () => {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择插件创建的父目录',
  });
  if (selected) {
    form.parentDir = Array.isArray(selected) ? selected[0] : selected;
  }
};

const isValid = computed(() => {
  if (!form.name.trim() || !form.title.trim()) return false;
  if (!form.parentDir) return false;
  if (!form.commands.length) return false;
  return form.commands.every(cmd => cmd.name.trim() && cmd.title.trim());
});

const creating = reactive({ value: false });

const doCreate = async () => {
  if (!isValid.value || creating.value) return;
  creating.value = true;
  try {
    const commands = form.commands.map(cmd => ({
      name: cmd.name.trim(),
      title: cmd.title.trim(),
      keywords: cmd.keywordsStr
        ? cmd.keywordsStr.split(/[,，]/).map(s => s.trim())
          .filter(Boolean)
        : [cmd.name.trim()],
    }));
    const pluginDir = await generatePlugin({
      name: form.name.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      mode: form.mode,
      commands,
      parentDir: form.parentDir,
    });
    try {
      await registerPluginFromLocalPath(pluginDir);
    } catch {
      // 插件尚未构建，加载失败是预期行为
    }
    await opener.openPath(pluginDir);
    await showToast(`插件已创建: ${pluginDir}`);
    popView();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await showToast(`创建失败: ${msg}`);
  } finally {
    creating.value = false;
  }
};

const mainAction = computed<ActionPanelAction>(() => ({
  name: 'create',
  title: creating.value ? '创建中...' : '创建插件',
  icon: 'add',
  action: doCreate,
}));
</script>

<style lang="scss" scoped>
.create-plugin {
  padding: 16px 20px;
  overflow: auto;
  height: 100%;
  box-sizing: border-box;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary-color);
  margin: 16px 0 8px;
  &:first-child {
    margin-top: 0;
  }
}

.form-group {
  margin-bottom: 10px;
}

.mode-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--ui-border-color, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: var(--ui-bg-muted);
  }
  &.active {
    border-color: var(--ui-primary);
    background: color-mix(in srgb, var(--ui-primary) 8%, transparent);
  }
}

.mode-info {
  display: flex;
  flex-direction: column;
}

.mode-name {
  font-size: 13px;
  font-weight: 500;
}

.mode-desc {
  font-size: 11px;
  color: var(--text-secondary-color);
  margin-top: 1px;
}

.command-card {
  border: 1px solid var(--ui-border-color, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.command-index {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary-color);
}

.dir-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--ui-border-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--ui-primary);
  }
}

.dir-path {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dir-preview {
  font-size: 11px;
  color: var(--text-secondary-color);
  margin-top: 4px;
  padding-left: 4px;
}
</style>
