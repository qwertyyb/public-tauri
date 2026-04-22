<template>
  <PublicLayout no-top>
    <div class="transition-test">
      <header class="intro">
        <h1 class="title">
          过渡 / 动画残影测试
        </h1>
        <p class="hint">
          用于对比：在<strong>过渡或动画进行中</strong>将窗口 <code>hide()</code>，再在短时间后 <code>show()</code>，重新可见时是否出现「首帧与当前 DOM 不一致」的残影。
          每行先点「开始过渡 / 动画」，再在动画中途点「隐藏再显示」；记录哪几行更容易闪。
        </p>
        <div class="controls">
          <label>隐藏持续（ms）<input
            v-model.number="hideMs"
            type="number"
            min="100"
            max="5000"
            step="100"
            class="ms-input"
          ></label>
          <button
            type="button"
            class="btn primary"
            :disabled="!tauri || hiding"
            @click="hideThenShow"
          >
            {{ hiding ? '隐藏中…' : '隐藏窗口 → 等待 → 再显示' }}
          </button>
          <button
            type="button"
            class="btn"
            @click="resetAll"
          >
            重置全部状态
          </button>
          <span
            v-if="!tauri"
            class="warn"
          >当前非 Tauri 环境，无法真实隐藏窗口；请在桌面开发版中测。</span>
        </div>
      </header>

      <ul class="cases">
        <li
          v-for="row in rows"
          :key="row.id"
          class="case"
        >
          <div class="case-head">
            <span class="case-title">{{ row.title }}</span>
            <span class="case-prop">{{ row.props }}</span>
          </div>
          <div
            class="viewport"
            :class="{ wide: row.wideTrack }"
          >
            <div
              class="probe"
              :class="[row.probeClass, probeState[row.id] ? 'probe-on' : '']"
            >
              <span
                v-if="row.labelInside"
                class="probe-label"
              >Aa</span>
            </div>
          </div>
          <div class="case-actions">
            <button
              type="button"
              class="btn small"
              @click="toggle(row.id)"
            >
              {{ probeState[row.id] ? '回到起点' : '开始过渡 / 动画' }}
            </button>
          </div>
        </li>
      </ul>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import PublicLayout from '@/components/PublicLayout.vue';

const tauri = isTauri();
const hideMs = ref(800);
const hiding = ref(false);

type Row = {
  id: string;
  title: string;
  props: string;
  probeClass: string;
  wideTrack?: boolean;
  labelInside?: boolean;
};

const rows: Row[] = [
  { id: 'bg', title: '背景色', props: 'transition: background-color 3s', probeClass: 'probe-bg' },
  { id: 'color', title: '文字颜色', props: 'transition: color 3s', probeClass: 'probe-color', labelInside: true },
  { id: 'width', title: '宽度', props: 'transition: width 3s', probeClass: 'probe-width', wideTrack: true },
  { id: 'opacity', title: '透明度', props: 'transition: opacity 3s', probeClass: 'probe-opacity' },
  { id: 'transform', title: '位移', props: 'transition: transform 3s', probeClass: 'probe-transform' },
  { id: 'shadow', title: '阴影', props: 'transition: box-shadow 3s', probeClass: 'probe-shadow' },
  { id: 'radius', title: '圆角', props: 'transition: border-radius 3s', probeClass: 'probe-radius' },
  { id: 'filter', title: '滤镜 blur', props: 'transition: filter 3s', probeClass: 'probe-filter' },
  { id: 'backdrop', title: '背景模糊（近 ActionPanel）', props: 'backdrop-filter + rgba 底 + opacity/transform', probeClass: 'probe-backdrop' },
  { id: 'combo', title: 'opacity + transform 组合', props: '同左侧面板常见写法', probeClass: 'probe-combo' },
  { id: 'keyframes', title: 'CSS 动画（非 transition）', props: 'animation: rotate 4s linear infinite', probeClass: 'probe-spin' },
];

const probeState = reactive<Record<string, boolean>>({});
rows.forEach((r) => {
  probeState[r.id] = false;
});

const toggle = (id: string) => {
  probeState[id] = !probeState[id];
};

const resetAll = () => {
  rows.forEach((r) => {
    probeState[r.id] = false;
  });
};

const hideThenShow = async () => {
  if (!tauri || hiding.value) return;
  hiding.value = true;
  try {
    const w = getCurrentWindow();
    await w.hide();
    await new Promise((r) => setTimeout(r, Math.max(100, hideMs.value)));
    await w.show();
  } finally {
    hiding.value = false;
  }
};
</script>

<style lang="scss" scoped>
.transition-test {
  padding: 16px 16px 24px;
  max-width: 720px;
  margin: 0 auto;
  box-sizing: border-box;
}

.intro {
  margin-bottom: 20px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}

.hint {
  font-size: 13px;
  line-height: 1.5;
  opacity: 0.85;
  margin: 0 0 12px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  font-size: 13px;
}

.ms-input {
  width: 72px;
  margin-left: 6px;
  padding: 4px 6px;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.25));
  background: light-dark(#f5f5f5, #3a3b42);
  cursor: pointer;
  font-size: 13px;
  &.primary {
    background: light-dark(#2563eb, #3b82f6);
    color: #fff;
    border-color: transparent;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &.small {
    padding: 4px 10px;
    font-size: 12px;
  }
}

.warn {
  font-size: 12px;
  color: #b45309;
}

.cases {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.case {
  border: 1px solid light-dark(rgba(0, 0, 0, 0.12), rgba(255, 255, 255, 0.12));
  border-radius: 10px;
  padding: 12px;
  background: light-dark(rgba(0, 0, 0, 0.02), rgba(255, 255, 255, 0.04));
}

.case-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.case-title {
  font-weight: 600;
  font-size: 14px;
}

.case-prop {
  font-size: 12px;
  font-family: ui-monospace, monospace;
  opacity: 0.7;
}

.viewport {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 8px;
  background: light-dark(rgba(0, 0, 0, 0.06), rgba(255, 255, 255, 0.06));
  &.wide {
    min-height: 56px;
    overflow-x: auto;
  }
}

.probe {
  flex-shrink: 0;
  border-radius: 6px;
  background: light-dark(#93c5fd, #1e3a5f);
  border: 1px solid light-dark(rgba(0, 0, 0, 0.15), rgba(255, 255, 255, 0.15));
}

.probe-label {
  font-weight: 700;
  font-size: 18px;
  padding: 0 10px;
}

/* --- per-property probes --- */
.probe-bg {
  width: 120px;
  height: 40px;
  background-color: #60a5fa;
  transition: background-color 3s linear;
  &.probe-on {
    background-color: #f472b6;
  }
}

.probe-color {
  width: 120px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e3a8a;
  transition: color 3s linear;
  &.probe-on .probe-label {
    color: #fce7f3;
  }
}

.probe-width {
  height: 40px;
  width: 30%;
  max-width: 45%;
  transition: width 3s linear;
  &.probe-on {
    width: 85%;
    max-width: 95%;
  }
}

.probe-opacity {
  width: 120px;
  height: 40px;
  opacity: 1;
  transition: opacity 3s linear;
  &.probe-on {
    opacity: 0.15;
  }
}

.probe-transform {
  width: 120px;
  height: 40px;
  transform: translateX(0);
  transition: transform 3s linear;
  &.probe-on {
    transform: translateX(120px);
  }
}

.probe-shadow {
  width: 120px;
  height: 40px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: box-shadow 3s linear;
  &.probe-on {
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  }
}

.probe-radius {
  width: 120px;
  height: 40px;
  border-radius: 4px;
  transition: border-radius 3s linear;
  &.probe-on {
    border-radius: 20px;
  }
}

.probe-filter {
  width: 120px;
  height: 40px;
  filter: blur(0);
  transition: filter 3s linear;
  &.probe-on {
    filter: blur(6px);
  }
}

.probe-backdrop {
  width: 200px;
  height: 44px;
  background-color: light-dark(rgba(255, 255, 255, 0.65), rgba(40, 42, 54, 0.75));
  backdrop-filter: blur(10px);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 3s ease, transform 3s ease;
  &.probe-on {
    opacity: 0.2;
    transform: translateY(10px);
  }
}

.probe-combo {
  width: 160px;
  height: 40px;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 3s ease, transform 3s ease;
  &.probe-on {
    opacity: 0.1;
    transform: translateY(12px);
  }
}

.probe-spin {
  width: 44px;
  height: 44px;
  animation: none;
  &.probe-on {
    animation: tr-spin 4s linear infinite;
  }
}

@keyframes tr-spin {
  to {
    transform: rotate(360deg);
  }
}

.case-actions {
  margin-top: 8px;
}
</style>
