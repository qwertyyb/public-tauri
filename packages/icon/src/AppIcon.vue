<template>
  <span
    v-if="resolved"
    class="app-icon"
    :style="containerStyle"
  >
    <span
      v-if="resolved.type === 'builtin'"
      class="material-symbols-outlined app-icon-builtin"
      :style="iconStyle"
    >
      {{ resolved.name }}
    </span>

    <template v-else-if="resolved.type === 'image'">
      <img
        v-if="resolved.darkUrl"
        class="app-icon-img app-icon-light"
        :style="iconStyle"
        :src="resolved.url"
        :width="sizeValue"
        :height="sizeValue"
        alt=""
      >
      <img
        v-if="resolved.darkUrl"
        class="app-icon-img app-icon-dark"
        :style="iconStyle"
        :src="resolved.darkUrl"
        :width="sizeValue"
        :height="sizeValue"
        alt=""
      >
      <img
        v-if="!resolved.darkUrl"
        class="app-icon-img"
        :style="iconStyle"
        :src="resolved.url"
        :width="sizeValue"
        :height="sizeValue"
        alt=""
      >
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed, type StyleValue } from 'vue';
import { resolveIcon } from './resolver';
import type { AppIconProps } from './types';

const props = withDefaults(defineProps<AppIconProps>(), {
  icon: undefined,
  basePath: undefined,
  size: undefined,
});

const resolved = computed(() => (props.icon ? resolveIcon(props.icon, { basePath: props.basePath, size: typeof props.size === 'number' ? props.size : undefined }) : null));

const sizeValue = computed(() => (typeof props.size === 'number' ? props.size : props.size));

const containerStyle = computed(() => {
  if (!sizeValue.value) return undefined;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: typeof sizeValue.value === 'number' ? `${sizeValue.value}px` : sizeValue.value,
    height: typeof sizeValue.value === 'number' ? `${sizeValue.value}px` : sizeValue.value,
  };
});

const iconStyle = computed<StyleValue>(() => {
  if (!sizeValue.value) return undefined;
  const px = typeof sizeValue.value === 'number' ? `${sizeValue.value}px` : sizeValue.value;
  return {
    width: px,
    height: px,
    fontSize: px,
  };
});
</script>

<style scoped>
.app-icon {
  line-height: 1;
}

.app-icon-builtin {
  user-select: none;
}

.app-icon-img {
  display: inline-block;
  object-fit: contain;
}

/* Dark mode: light image hidden by default, dark image shown */
.app-icon-dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .app-icon-light {
    display: none;
  }
  .app-icon-dark {
    display: inline-block;
  }
}
</style>
