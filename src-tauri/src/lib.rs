mod commands;
mod panel;

pub const SPOTLIGHT_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
    }

    builder = builder.plugin(tauri_plugin_upload::init());
    // W3C WebDriver on http://127.0.0.1:4445 — enable with `pnpm tauri:dev` (see package.json)
    #[cfg(all(
        debug_assertions,
        feature = "webdriver",
        any(target_os = "macos", target_os = "windows", target_os = "linux")
    ))]
    {
        builder = builder.plugin(tauri_plugin_webdriver::init());
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_shellx::init(true))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_double_tap_shortcut::init())
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_monitors,
            commands::screenshot,
            commands::monitor_from_point
        ])
        .setup(move |app| {
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }

            #[cfg(desktop)]
            let _ = app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec![]), /* arbitrary number of args to pass to your app */
            ));
            // Set activation poicy to Accessory to prevent the app icon from showing on the dock
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            panel::setup_panel(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
