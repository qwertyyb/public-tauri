<template>
  <div
    class="markdown-renderer"
    v-html="renderedContent"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';

interface Props {
  content?: string;
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
});

const md = new MarkdownIt();

const renderedContent = computed(() => md.render(props.content || ''));
</script>

<style scoped lang="scss">
.markdown-renderer {
  :deep(pre) {
    white-space: pre-line;
    word-break: break-all;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
    font-weight: bold;
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;

    code {
      background-color: transparent;
      padding: 0;
    }
  }

  :deep(code) {
    background-color: #f0f0f0;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 14px;
  }

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 0.3em;
    margin-bottom: 0.5em;
  }

  :deep(ul), :deep(ol) {
    padding-left: 20px;
    margin: 10px 0;
  }

  // Dark mode styles
  @media (prefers-color-scheme: dark) {
    :deep(code) {
      background-color: #2d2d2d;
      color: #e0e0e0;
    }

    :deep(pre) {
      background-color: #1e1e1e;
      color: #dcdcdc;

      code {
        color: inherit;
      }
    }

    :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
      color: #ffffff;
    }

    :deep(ul), :deep(ol) {
      color: #dcdcdc;
    }
  }
}
</style>
