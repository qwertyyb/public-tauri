import { watch, onBeforeUnmount } from 'vue';

type RefMethods = Record<string, (value?: unknown) => void>;

const refHandleMap = new Map<string, RefMethods>();

export function useRefHandle(
  refId: () => string | undefined,
  methods: RefMethods,
) {
  let currentId: string | undefined;

  watch(refId, (newId, oldId) => {
    if (oldId) refHandleMap.delete(oldId);
    if (newId) refHandleMap.set(newId, methods);
    currentId = newId;
  }, { immediate: true });

  onBeforeUnmount(() => {
    if (currentId) refHandleMap.delete(currentId);
  });
}

export function invokeRefHandle(payload: unknown): boolean {
  const data = (payload || {}) as { refId?: unknown; op?: unknown; value?: unknown };
  const refId = typeof data.refId === 'string' ? data.refId : '';
  const op = typeof data.op === 'string' ? data.op : '';
  if (!refId || !op) return false;
  const methods = refHandleMap.get(refId);
  if (!methods || typeof methods[op] !== 'function') return false;
  methods[op](data.value);
  return true;
}
