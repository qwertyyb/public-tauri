import * as api from '@public/api'

declare global {
  interface Window {
    $wujie?: {
      props?: { [key: string]: any }
    }
  }
}

export const clipboard: typeof api['clipboard'] = window.$wujie?.props?.clipboard

export const dialog: typeof api['dialog'] = window.$wujie?.props?.dialog

export const mainWindow: typeof api['mainWindow'] = window.$wujie?.props?.mainWindow

export const fetch: typeof api['fetch'] = window.$wujie?.props?.mainWindow

export const utils: typeof api['utils'] = window.$wujie?.props?.utils

export const screen: typeof api['screen'] = window.$wujie?.props?.screen

export const invoke: typeof api['invoke'] = window.$wujie?.props?.invoke

export const on: typeof api['on'] = window.$wujie?.props?.on

export const onEnterCommand = (fn: (name: string, options?: { value: string }) => any) => window.$wujie?.props?.onEnterCommand?.(fn)

export const onExitCommand = (fn: (name: string) => any) => window.$wujie?.props?.onExitCommand?.(fn)
