import ActionDialog from '@/components/ActionDialog.vue';
import AppToast from '@/components/AppToast.vue';
import type { IDialogOptions, IToastOptions } from '@/types/index';
import logger from '@/utils/logger';
import { createApp } from 'vue';

const createDialog = (options: IDialogOptions) => {
  logger.info('createDialog', options);
  // eslint-disable-next-line vue/one-component-per-file
  const dialogApp = createApp(ActionDialog, { options });
  const div = document.createElement('div');
  div.classList.add('dialog');
  document.body.appendChild(div);
  dialogApp.mount(div);
  return dialogApp;
};

export const showAlert = (
  message: string,
  title?: string,
  options?: Partial<Omit<IDialogOptions, 'message' | 'title' | 'onCancel' | 'showCancel'>>,
) => new Promise<void>((resolve) => {
  const dialog = createDialog({
    message,
    title,
    ...options,
    showCancel: false,
    onConfirm: () => {
      dialog.unmount();
      options?.onConfirm?.();
      resolve();
    },
  });
});

export const showConfirm = (
  message: string,
  title?: string,
  options?: Partial<Omit<IDialogOptions, 'message' | 'title' | 'showCancel'>>,
) => new Promise<void>((resolve, reject) => {
  const dialog = createDialog({
    message,
    title,
    ...options,
    showCancel: true,
    onConfirm: () => {
      dialog.unmount();
      options?.onConfirm?.();
      resolve();
    },
    onCancel: () => {
      dialog.unmount();
      options?.onCancel?.();
      reject(new Error('user cancel'));
    },
  });
});

const createToast = (options: IToastOptions) => {
  // eslint-disable-next-line vue/one-component-per-file
  const toast = createApp(AppToast, { options });
  const div = document.createElement('div');
  div.classList.add('dialog');
  document.body.appendChild(div);
  toast.mount(div);
  return toast;
};

export const showToast = (message: string, options?: Partial<IToastOptions>) => new Promise<void>((resolve) => {
  const toast = createToast({
    message,
    ...options,
    done() {
      options?.done?.();
      toast.unmount();
      resolve();
    },
  });
});
