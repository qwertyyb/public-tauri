use base64::{engine::general_purpose, Engine};
use serde::ser::{Serialize, SerializeStruct, Serializer};
use std::{io::Cursor, time::Instant};
use xcap::Monitor;

pub struct MonitorWrapper(pub Monitor);

impl Serialize for MonitorWrapper {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let monitor = &self.0;
        let mut s = serializer.serialize_struct("Monitor", 8)?;
        s.serialize_field("name", &monitor.name().unwrap())?;
        s.serialize_field("id", &monitor.id().unwrap())?;
        s.serialize_field("width", &monitor.width().unwrap())?;
        s.serialize_field("height", &monitor.height().unwrap())?;
        s.serialize_field("isBuiltin", &monitor.is_builtin().unwrap())?;
        s.serialize_field("isPrimary", &monitor.is_primary().unwrap())?;
        s.serialize_field("x", &monitor.x().unwrap())?;
        s.serialize_field("y", &monitor.y().unwrap())?;
        s.end()
    }
}

#[tauri::command]
pub fn get_all_monitors() -> Vec<MonitorWrapper> {
    let monitors = Monitor::all().unwrap();
    monitors.into_iter().map(MonitorWrapper).collect()
}

#[tauri::command]
pub fn monitor_from_point(x: i32, y: i32) -> Result<MonitorWrapper, String> {
    let monitor = Monitor::from_point(x, y).map_err(|e| e.to_string())?;
    Ok(MonitorWrapper(monitor))
}

#[tauri::command]
pub fn cursor_monitor(window: tauri::Window) -> Result<MonitorWrapper, String> {
    let position = window.cursor_position().map_err(|e| e.to_string())?;
    let monitor = Monitor::from_point(position.x.round() as i32, position.y.round() as i32)
        .map_err(|e| e.to_string())?;

    Ok(MonitorWrapper(monitor))
}

fn monitor_from_tauri_monitor(monitor: tauri::Monitor) -> Result<Monitor, String> {
    let position = monitor.position();
    let size = monitor.size();
    let x = position.x + (size.width / 2) as i32;
    let y = position.y + (size.height / 2) as i32;

    Monitor::from_point(x, y).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn current_monitor(window: tauri::Window) -> Result<Option<MonitorWrapper>, String> {
    let Some(monitor) = window.current_monitor().map_err(|e| e.to_string())? else {
        return Ok(None);
    };
    let monitor = monitor_from_tauri_monitor(monitor)?;

    Ok(Some(MonitorWrapper(monitor)))
}

#[tauri::command]
pub fn capture(window: tauri::Window, monitor_id: Option<u32>) -> Result<String, String> {
    let start = Instant::now();
    let monitor = if let Some(monitor_id) = monitor_id {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        monitors
            .into_iter()
            .find(|item| item.id().is_ok_and(|id| id == monitor_id))
            .ok_or_else(|| format!("monitor not found: {monitor_id}"))?
    } else {
        let monitor = window
            .current_monitor()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "current monitor can't be detected".to_string())?;

        monitor_from_tauri_monitor(monitor)?
    };

    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    print!("截图耗时: {:?}", start.elapsed());

    let mut buffer = Cursor::new(Vec::new());
    image
        .write_to(&mut buffer, xcap::image::ImageFormat::WebP)
        .map_err(|e| e.to_string())?;

    println!("运行耗时: {:?}", start.elapsed());

    Ok(general_purpose::STANDARD.encode(buffer.get_ref()))
}
