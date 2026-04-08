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
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);

    let handle = app.app_handle();

    let window = handle.get_webview_window("main").unwrap();

    // Convert the window to a spotlight panel
    let panel = window.to_panel::<MainPanel>().unwrap();

    panel.set_level(PanelLevel::MainMenu.value() + 1);
    panel.set_collection_behavior(NSWindowCollectionBehavior::FullScreenAuxiliary);
    panel.set_style_mask(NSWindowStyleMask::NonactivatingPanel);

    let handler = PanelEventHandler::new();

    panel.show();

    panel.set_event_handler(Some(handler.as_protocol_object()));

    let handle1 = handle.clone();
    handler.window_did_become_key(move |_notification| {
        let _ = handle1.emit_to("main", "focus", true);
    });

    let handle1 = handle.clone();
    handler.window_did_resign_key(move |_notification| {
        println!("[info]: panel resigned from key window!");
        let _ = handle1.emit_to("main", "focus", false);
        // panel.hide();
    });
}
