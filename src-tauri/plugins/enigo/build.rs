const COMMANDS: &[&str] = &["enigo"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
