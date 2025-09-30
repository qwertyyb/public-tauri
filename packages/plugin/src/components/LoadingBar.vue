<template>
  <div class="loading-bar">
    <div class="loading-bar-inner" />
  </div>
</template>

<style lang="scss" scoped>
.loading-bar {
  width: 100%;
  position: relative;
}

.loading-bar-inner {
  width: 100%;
  height: 1px;
  background: linear-gradient(to right, transparent, #838383, transparent);
  position: absolute;
  top: 0;
  left: -100%;
  animation: loading 1.5s infinite;
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
