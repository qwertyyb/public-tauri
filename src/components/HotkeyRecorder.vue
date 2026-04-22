<template>
  <div
    class="hotkey-recorder flex items-center cursor-pointer"
    :class="{'recording': isRecording, 'large': size === 'large', 'small': size === 'small' }"
  >
    <div
      v-if="!isRecording && modelValue"
      class="prefix"
    />
    <div
      class="kbd-group"
      tabindex="0"
      @focus="startRecord"
      @blur="stopRecord"
    >
      <UKbd
        v-for="(k, i) in keyList"
        :key="i"
        :value="k"
      />
    </div>
    <UIcon
      v-if="!isRecording && modelValue"
      name="i-lucide-x"
      class="close-icon size-3.5 cursor-pointer"
      @click.stop.prevent="clear"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

const modelValue = defineModel<string>({ required: true });

defineProps<{ size?: 'small' | 'large'}>();

const isRecording = ref(false);

const recordedKeys = ref<string>('');

const keys = computed(() => {
  if (isRecording.value) {
    return recordedKeys.value.length ? recordedKeys.value : '-+-';
  }
  return modelValue.value?.length ? modelValue.value : '-+-';
});

const keyLabelMap: Record<string, string> = {
  Command: '⌘',
  Meta: '⌘',
  Control: '⌃',
  Alt: '⌥',
  Option: '⌥',
  Shift: '⇧',
  Enter: '↵',
  Backspace: '←',
  Space: '␣',
};

const keyList = computed(() =>
  keys.value.split('+').map(k => keyLabelMap[k] ?? k),
);

interface Key {
  modifiers: string[],
  key: string
}

const isMac = () => navigator.userAgent.includes('Macintosh') || navigator.userAgent.includes('Mac OS X');

const createKeyEventHandler = (onChange: (_value: Key) => void, done: (_value: Key) => void) => {
  const key: Key = {
    modifiers: [],
    key: '',
  };
  let lastModifierKeydownTime = 0;
  let lastKey = '';
  const repeatKeydownInterval = 200;
  const ModifierKeys = ['Meta', 'Control', 'Alt', 'Shift'];
  return (event: KeyboardEvent) => {
    event.preventDefault();

    if (ModifierKeys.includes(event.key)) {
      // 按下的修饰键，首先判断是否是连续第二次按下同样的键
      if (Date.now() - lastModifierKeydownTime < repeatKeydownInterval && lastKey === event.key) {
        const key = { modifiers: [lastKey, event.key], key: '' };
        onChange(key);
        done(key);
      }
      lastModifierKeydownTime = Date.now();
    }
    lastKey = event.key;

    // 根据修饰按键的状态获取平台对应的键名
    const activeModifiers = ModifierKeys.filter(key => event.getModifierState(key));
    // 排下序，已经按下过的放在前面
    // 先去掉已经抬起的键
    let modifiers = key.modifiers.filter(label => activeModifiers.includes(label));
    // 加上本次按下的键
    modifiers = modifiers.concat(...activeModifiers.filter(label => !modifiers.includes(label)));
    key.modifiers = modifiers;

    if (event.type === 'keydown' && (/^[a-zA-Z]$/.test(event.key) || event.code === 'Space')) {
      const keyLabel = event.code === 'Space' ? 'Space' : event.key.toUpperCase();
      key.key = keyLabel;
    } else {
      key.key = '';
    }
    onChange(key);

    if (key.modifiers.length && key.key) {
      done(key);
    }
  };
};


let clearListener: (() => void) | null = null;

const startRecord = () => {
  stopRecord();

  const keyEventHandler = createKeyEventHandler((key) => {
    recordedKeys.value = [...key.modifiers, key.key].filter(i => i).map((key) => {
      if (isMac() && key === 'Meta') return 'Command';
      return key;
    })
      .join('+');
    console.log(recordedKeys.value);
  }, (key) => {
    stopRecord();
    const value = [...key.modifiers, key.key].filter(i => i).map((key) => {
      if (isMac() && key === 'Meta') return 'Command';
      return key;
    })
      .join('+');
    modelValue.value = value;
  });
  clearListener = () => {
    document.removeEventListener('keydown', keyEventHandler);
    document.removeEventListener('keyup', keyEventHandler);
  };
  isRecording.value = true;
  document.addEventListener('keydown', keyEventHandler);
  document.addEventListener('keyup', keyEventHandler);
};

const stopRecord = () => {
  if (clearListener) {
    clearListener();
    clearListener = null;
  }
  isRecording.value = false;
};

const clear = () => {
  modelValue.value = '';
  recordedKeys.value = '';
};

</script>

<style lang="scss" scoped>
.kbd-group {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  outline: none;
}
.hotkey-recorder {
  border-radius: 4px;
  &.large {
    padding: 4px 16px;
    width: 160px;
    justify-content: center;
  }
  &.recording {
    opacity: 0.2;
  }
  .prefix {
    display: block;
    width: 32px;
    height: 24px;
  }
}
.hotkey-recorder:hover .close-icon {
  opacity: 1;
}
.close-icon {
  opacity: 0;
  transition: opacity 0.3s;
  margin-left: 8px;
  width: 24px;
  font-weight: bold;
}
</style>
