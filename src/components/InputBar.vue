<template>
  <div
    class="input-bar"
    tabindex="0"
    :class="{'is-main-input': isMainInput}"
    @pointerup="inputEl?.focus()"
  >
    <ul
      v-if="modelValue.files.length"
      class="file-list"
    >
      <li
        v-for="(file, index) in modelValue.files"
        :key="index"
        class="file-item"
      >
        <ElIcon size="12">
          <Picture />
        </ElIcon>
        <span class="file-name">{{ file.name }}</span>
        <ElIcon
          size="12"
          @click="removeFile(index)"
        >
          <CloseBold />
        </ElIcon>
      </li>
    </ul>
    <div class="text-input-wrapper">
      <input
        v-if="!disabled"
        id="main-input"
        ref="input"
        v-model="keyword"
        autofocus
        spellcheck="false"
        autocorrect="off"
        autocomplete="false"
        class="input"
        @keydown="keyDownHandler"
        @compositionstart="compositionStartHandler"
        @compositionend="compositionEndHandler"
        @paste="pasteHandler"
      >
      <div
        v-if="!disabled && !keyword"
        class="input-placeholder"
      >
        {{ placeholder }}
      </div>
    </div>
    <div class="input-suffix" />
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { onPageEnter, onPageLeave } from '@/router';
import { createAutoResizeInput } from '@/utils';
import logger from '@/utils/logger';
import { EVENT_NAME } from '@/const';
import { ElIcon } from 'element-plus';
import { Picture, CloseBold } from '@element-plus/icons-vue';

const modelValue = defineModel<{ keyword: string, files: File[] }>({ default: () => ({ keyword: '', files: [] }) });
const props = defineProps<{
  command?: { icon: string } | null,
  disabled?: boolean,
  isMainInput?: boolean,
  supportFiles?: boolean,
}>();
const emits = defineEmits<{ escape: [] }>();

const inputEl = useTemplateRef('input');
const placeholder = ref('search...');
const keyword = ref('');

watch(keyword, (value) => {
  if (value !== modelValue.value.keyword) {
    modelValue.value = {
      ...modelValue.value,
      keyword: value,
    };
  }
});

watch(() => modelValue.value.keyword, (value) => {
  if (value !== keyword.value) {
    keyword.value = value;
  }
});

watch(inputEl, (el) => {
  if (!el) return;
  createAutoResizeInput(el);
});

const keyDownHandler = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (modelValue.value.keyword) {
      event.preventDefault();
      modelValue.value = { keyword: '', files: [] };
    } else {
      event.preventDefault();
      emits('escape');
    }
  } else if (event.key === 'Backspace' && !modelValue.value.keyword && !event.isComposing) {
    event.preventDefault();
    if (modelValue.value.files.length > 0) {
      modelValue.value = {
        ...modelValue.value,
        files: [...modelValue.value.files.slice(0, -1)],
      };
    } else {
      emits('escape');
    }
  }
};

const fetchPlaceholder = async () => {
  const r = await fetch('https://v1.hitokoto.cn/');
  const json = await r.json();
  placeholder.value = json?.hitokoto || '欢迎使用 Public App';
};

const compositionStartHandler = () => {
  if (!inputEl.value?.classList.contains('composing')) {
    inputEl.value?.classList.add('composing');
  }
  inputEl.value?.focus();
};

const compositionEndHandler = () => {
  inputEl.value?.classList.remove('composing');
};

const popToRootHandler = (e: any) => {
  if (e.detail?.clearInput && props.isMainInput) {
    modelValue.value = { keyword: '', files: [] };
  }
};

const removeFile = (index: number) => {
  modelValue.value = {
    ...modelValue.value,
    files: [...modelValue.value.files.slice(0, index), ...modelValue.value.files.slice(index + 1)],
  };
};

const pasteHandler = (e: ClipboardEvent) => {
  const originFiles = Array.from(e.clipboardData?.files || []);
  const images = originFiles.filter(file => file.type.startsWith('image/'));
  // 获取文件中是否有图片
  if (images.length) {
    e.preventDefault();
    modelValue.value = {
      ...modelValue.value,
      files: [...modelValue.value.files, ...images],
    };
  }
};

const focusedHandler = () => {
  logger.info('focusedHandler');
  inputEl.value?.focus();
};

onMounted(() => {
  document.addEventListener(EVENT_NAME.FOCUSED, focusedHandler);
  window.addEventListener('pop-to-root', popToRootHandler);
});

onBeforeUnmount(() => {
  document.removeEventListener(EVENT_NAME.FOCUSED, focusedHandler);
  window.removeEventListener('pop-to-root', popToRootHandler);
});

onPageEnter(() => {
  inputEl.value?.focus();
  if (props.isMainInput) {
    fetchPlaceholder();
  }
});

onPageLeave(() => {
  inputEl.value?.blur?.();
});
</script>

<style lang="scss" scoped>
.input-bar {
  --bar-height: var(--nav-height);
  --padding-left: calc(var(--nav-width, 0px) + 16px);
  height: var(--bar-height);
  min-height: var(--bar-height);
  max-height: var(--bar-height);
  position: relative;
  z-index: 100;
  border-bottom: 1px solid light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06));
  display: flex;
  align-items: center;
  padding-left: 16px;
  &.is-main-input {
    --padding-left: 16px;
  }
}
.text-input-wrapper {
  position: relative;
  height: var(--bar-height);
  display: flex;
  flex: 1;
  align-items: center;
}
.input {
  height: 42px;
  line-height: 42px;
  min-height: 42px;
  font-size: 18px;
  min-width: 4em;
  box-sizing: border-box;
  outline: none;
  border: none;
  background: none;
  field-sizing: content;
  font-weight: 500;
  width: fit-content;
  min-width: 42px;
}
.input-placeholder {
  color: light-dark(rgba(0, 0, 0, 0.4), rgba(255, 255, 255, 0.4));
  position: absolute;
  left: 0;
  top: 0;
  height: 48px;
  line-height: 48px;
  font-size: 16px;
  pointer-events: none;
  opacity: 0;
  user-select: none;
  -webkit-user-select: none;
}
.input:empty + .input-placeholder {
  opacity: 1;
}
.input.composing + .input-placeholder {
  opacity: 0;
}
.input-suffix {
  width: fit-content;
}

.file-list {
  margin-right: 12px;
}
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 4px;
  padding: 6px 8px;
  border: 1px solid light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
  &:hover {
    background: light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06));
  }
}
</style>
