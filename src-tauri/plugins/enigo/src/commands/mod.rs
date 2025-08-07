use tauri::{command, AppHandle, Runtime, WebviewWindow};

#[command]
pub async fn mouse_move<R: Runtime>(app_handle: AppHandle<R>, window: WebviewWindow<R>) {
    
}