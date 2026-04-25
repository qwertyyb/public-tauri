#[path = "commands/monitor.rs"]
mod monitor;
mod panel;
#[path = "commands/system_utils.rs"]
mod system_utils;

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
            monitor::get_all_monitors,
            monitor::capture,
            monitor::monitor_from_point,
            monitor::cursor_monitor,
            monitor::current_monitor,
            system_utils::get_frontmost_application,
            system_utils::get_default_application,
            system_utils::get_application
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
            app.set_activation_policy(tauri::ActivationPolicy::Prohibited);

            panel::setup_panel(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
