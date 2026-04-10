<template>
  <div
    class="loading-bar"
    :class="{ loading }"
  >
    <div
      class="loading-bar-inner"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ loading: boolean }>();
</script>

<style lang="scss" scoped>
.loading-bar {
  width: 100%;
  position: absolute;
  top: var(--input-bar-height);
  left: 0;
  right: 0;
  &.loading .loading-bar-inner {
    background: linear-gradient(to right, transparent, #838383, transparent);
    position: absolute;
    top: 0;
    left: -100%;
    animation: loading 1.5s infinite;
  }
}

.loading-bar-inner {
  width: 100%;
  height: 1px;
  background: light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06));
}

@keyframes loading {
  0% {
      left: -50%;
  }
  50% {
      left: 50%;
  }
  100% {
      left: -50%;
  }
}
</style>
