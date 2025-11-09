export const invokePluginServerMethod = async <T = any>(name: string, method: string, args: any[]): Promise<T> => {
  const r = await fetch('http://127.0.0.1:2345/api/manager/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, method, args }),
  });
  const { data } = await r.json();
  return data;
};

export const invokeServerUtils = async (method: string, args: any[] = [], options = { raw: false }) => {
  const r = await fetch('http://127.0.0.1:2345/utils/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method, args }),
  });
  if (options.raw) {
    return r;
  }
  const { data, errCode, errMsg } = await r.json();
  if (errCode === 0) {
    return data;
  }
  throw new Error(errMsg);
};

export const getPressedKeys = (event: KeyboardEvent) => {
  const detectKeys = ['Meta', 'Control', 'Alt', 'Shift'];
  const modifiers = detectKeys.filter(key => event.getModifierState(key));
  const isModifierKeyDown = detectKeys.includes(event.key); // 当前按下的是否就是修饰键
  const keys = isModifierKeyDown ? [...modifiers] : [...modifiers, event.key];
  return keys;
};

export const isKeyPressed = (event: KeyboardEvent, value: string | string[]) => {
  const pressedKeys = getPressedKeys(event);
  const valueKeys = typeof value === 'string' ? value.split('+') : [...value];
  return pressedKeys.sort().join('+') === valueKeys.sort().join('+');
};
