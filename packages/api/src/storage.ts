import { invokeServerUtils } from './utils';

export const storage = {
  getItem(key: string): Promise<any | undefined> {
    return invokeServerUtils('storage.getItem', [key]);
  },
  setItem(key: string, value: any) {
    return invokeServerUtils('storage.setItem', [key, value]);
  },
  removeItem(key: string) {
    return invokeServerUtils('storage.removeItem', [key]);
  },
  allItems(keyPrefix: string) {
    return invokeServerUtils('storage.allItems', [keyPrefix]);
  },
  clear(keyPrefix: string) {
    return invokeServerUtils('storage.clear', [keyPrefix]);
  },
};
