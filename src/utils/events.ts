import { app } from "@tauri-apps/api";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const listenEvents = () => {
  if (!isTauri()) return;
  app.setDockVisibility(false)
  getCurrentWindow().onFocusChanged((event) => {
    if (!event.payload) {
      getCurrentWindow().hide()
    }
  })
}