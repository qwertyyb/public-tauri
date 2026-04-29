use tauri::{App, Emitter, Manager};
use tauri_nspanel::{
    panel::{NSWindowCollectionBehavior, NSWindowStyleMask},
    tauri_panel, PanelLevel, WebviewWindowExt,
};

// Define your custom panel type
tauri_panel! {
    panel!(MainPanel {
        config: {
            canBecomeKeyWindow: true,
        }
    })

    panel_event!(PanelEventHandler {
        windowDidBecomeKey(notification: &NSNotification) -> (),
        windowDidResignKey(notification: &NSNotification) -> ()
    })
}

pub fn setup_panel(app: &mut App) {
    app.set_activation_policy(tauri::ActivationPolicy::Prohibited);

    let handle = app.app_handle();

    let window = handle.get_webview_window("main").unwrap();

    // Convert the window to a spotlight panel
    let panel = window.to_panel::<MainPanel>().unwrap();

    panel.set_level(PanelLevel::MainMenu.value() + 1);
    panel.set_collection_behavior(NSWindowCollectionBehavior::FullScreenAuxiliary);
    panel.set_style_mask(NSWindowStyleMask::NonactivatingPanel);

    let handler = PanelEventHandler::new();

    panel.set_event_handler(Some(handler.as_ref()));

    let handle1 = handle.clone();
    handler.window_did_become_key(move |_notification| {
        let _ = handle1.emit_to("main", "focus", true);
    });

    let handle1 = handle.clone();
    handler.window_did_resign_key(move |_notification| {
        println!("[info]: panel resigned from key window!");

        // 必须使用异步调用，不能在主线程中同步检测。
        // 因为 windowDidResignKey 触发时，新窗口可能正在创建过程中。
        // 如果阻塞主线程（如 thread::sleep），会导致系统弹窗的创建也被阻塞，
        // 从而永远无法获取到新的 keyWindow，形成死锁。
        let handle_async = handle1.clone();
        tauri::async_runtime::spawn(async move {
            // 延迟 10ms 再检测，确保系统弹窗（NSSavePanel/NSOpenPanel）已完成创建并成为 Key Window。
            // 此值为经验值，过短可能导致弹窗尚未就绪，过长则影响用户体验。
            tokio::time::sleep(std::time::Duration::from_millis(10)).await;
            let should_hide = check_key_window_now();
            println!("[info] should_hide (async) = {}", should_hide);

            if should_hide {
                let _ = handle_async.emit_to("main", "focus", false);
            } else {
                println!("[info]: focus lost to system dialog, not hiding panel");
            }
        });
    });
}

/// 同步检查当前 Key Window（在子线程中被调用）
fn check_key_window_now() -> bool {
    use tauri_nspanel::objc2::{class, msg_send};
    use tauri_nspanel::objc2_app_kit::{NSApplication, NSWindow};

    unsafe {
        let app: *const NSApplication = msg_send![class!(NSApplication), sharedApplication];
        let key_window: Option<tauri_nspanel::objc2::rc::Retained<NSWindow>> =
            msg_send![&*app, keyWindow];

        println!(
            "[debug]: key_window (async) = {:?}",
            key_window.as_ref().map(|w| w as *const _)
        );

        match key_window {
            None => true,
            Some(window) => {
                let cls = window.class();
                let class_name = cls.name().to_string_lossy().into_owned();

                println!("[debug]: new key window class: {}", class_name);

                !class_name.contains("NSSavePanel")
                    && !class_name.contains("NSOpenPanel")
                    && !class_name.contains("NSAlert")
            }
        }
    }
}
