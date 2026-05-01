<template>
  <div class="plugin-prfs-view">
    <header class="prfs-header">
      <img
        :src="manifest?.icon"
        alt=""
        class="prfs-image"
      >
      <h2 class="prfs-title">
        {{ manifest?.title }}
      </h2>
      <p class="prfs-desc">
        {{ manifest?.description }}
      </p>
      <p class="fill-desc">
        为保障功能正常使用，请先填写配置信息
      </p>
    </header>
    <div class="prfs-form">
      <UFormField
        v-for="item in preferences"
        :key="item.name"
        class="prfs-form-item"
        :label="item.title"
        :required="item.required"
      >
        <UInput
          v-if="item.type === 'text' || item.type === 'textarea'"
          v-model="formValue[item.name]"
          :placeholder="item.placeholder"
          class="w-full"
        />
        <USelect
          v-if="item.type === 'select'"
          v-model="formValue[item.name]"
          :placeholder="item.placeholder"
          :items="(item.options || []).map(o => ({ value: o.value, label: o.label }))"
          class="w-full"
        />
        <p class="form-item-desc">
          {{ item.description }}
        </p>
      </UFormField>
      <div
        v-if="done"
        class="btn-item"
      >
        <UButton
          color="primary"
          class="mx-auto"
          :disabled="btnDisabled"
          @click="confirm"
        >
          继续
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getPlugin, updateCommandPreferences, updatePluginPreferences } from '@/plugin/manager';
import type { IPluginManifest } from '@public-tauri/schema';
import { computed, nextTick, ref, shallowRef, toRaw, watch } from 'vue';

const props = defineProps<{ plugin: string, command?: string, done?:() => void }>();

const manifest = shallowRef<Omit<IPluginManifest, 'commands'>>();

const preferences = shallowRef<{
  name: string,
  title: string,
  description?: string,
  type: 'text' | 'textarea' | 'select',
  required?: boolean,
  placeholder?: string,
  options?: { value: string, label: string }[]
}[]>([]);

const formValue = ref<Record<string, any>>({});

const btnDisabled = computed(() => {
  const requiredFields = preferences.value.filter(item => item.required);
  return requiredFields.some(item => !formValue.value[item.name]);
});

let inited = false;
watch(formValue, () => {
  if (!inited) return;
  if (props.command) {
    updateCommandPreferences(props.plugin, props.command, toRaw(formValue.value));
  } else {
    updatePluginPreferences(props.plugin, toRaw(formValue.value));
  }
}, { deep: true });

const refresh = async () => {
  const plugin = getPlugin(props.plugin);
  if (!plugin) return;
  manifest.value = plugin.manifest;
  if (props.command) {
    preferences.value = plugin.commands.find(c => c.name === props.command)?.preferences || [];
    formValue.value = plugin.settings?.commands?.[props.command]?.preferences || {};
  } else {
    preferences.value = plugin.manifest.preferences || [];
    formValue.value = plugin.settings?.preferences || {};
  }
  await nextTick();
  inited = true;
};

refresh();

const confirm = () => {
  props.done?.();
};

</script>

<style lang="scss" scoped>
.plugin-prfs-view {
  padding: 48px 16px;

  .prfs-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 24px;
  }
  .prfs-image {
    width: 48px;
    height: 48px;
  }
  .prfs-title {
    margin-top: 16px;
  }
  .fill-desc {
    opacity: 0.4;
    font-size: 14px;
  }

  .prfs-form {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .form-item-desc {
    opacity: 0.6;
    font-size: 13px;
    margin-top: 4px;
  }
  .btn-item {
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }
}
</style>
