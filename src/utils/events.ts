import { app } from "@tauri-apps/api";
import { isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { popToRoot } from "@/plugin/utils";
import logger from "./logger";
import { POP_TO_ROOT_TIMEOUT } from "@/const";

let unlisten: UnlistenFn | null = null

let popToRootTimeout: ReturnType<typeof setTimeout> | null

export const listenEvents = async () => {
  if (!isTauri()) return;
  if (import.meta.env.PROD) {
    app.setDockVisibility(false)
  }
  unlisten = await listen('focus', (event) => {
    logger.info('onFocusChanged', event)
    if (!event.payload) {
      // if (import.meta.env.PROD) {
        getCurrentWindow().hide()
      // }
      popToRootTimeout = setTimeout(() => {
        logger.info('popToTimeout callback')
        popToRoot({ clearInput: true })
      }, POP_TO_ROOT_TIMEOUT)
    } else {
      if (popToRootTimeout) {
        clearTimeout(popToRootTimeout)
      }
    }
  })
}

if (import.meta.hot) {
  if (unlisten) {
    // @ts-ignore
    unlisten();
  }
  import.meta.hot.accept();
}