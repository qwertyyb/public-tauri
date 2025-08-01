import { app } from "@tauri-apps/api";
import { isTauri } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

let unlisten: UnlistenFn | null = null

export const listenEvents = async () => {
  if (!isTauri()) return;
  app.setDockVisibility(false)
  unlisten = await getCurrentWindow().onFocusChanged((event) => {
    if (!event.payload) {
      getCurrentWindow().hide()
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