use tauri::{
    generate_handler,
    plugin::{Builder, TauriPlugin},
    Runtime,
};

mod commands;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("eco-paste")
        .setup(move |_app, _api| {

            Ok(())
        })
        .invoke_handler(generate_handler![commands::paste])
        .build()
}