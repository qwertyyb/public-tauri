export interface IDialogOptions {
  message: string,
  type?: 'info' | 'warning' | 'error',
  title?: string,
  cancelText?: string,
  confirmText?: string,
  showCancel?: boolean,
  onCancel?: () => void,
  onConfirm?: () => void,
}

export interface IToastOptions {
  message: string,
  icon?: string,
  duration?: number,
  done?: () => void
}
