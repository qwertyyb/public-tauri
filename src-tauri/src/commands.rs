use std::{io::Cursor, time::Instant};
use xcap::{Monitor};
use serde::ser::{Serialize, SerializeStruct, Serializer};

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
pub fn get_monitors() -> Vec<MonitorWrapper> {
    let monitors = Monitor::all().unwrap();
    monitors.into_iter().map(MonitorWrapper).collect()
}

#[tauri::command]
pub fn screenshot(id: u32) -> Result<Vec<u8>, String> {
    let start = Instant::now();
    let monitors = Monitor::all().unwrap();
    let monitor = monitors.iter().find(|&item| item.id().unwrap() == id).unwrap();

    let image = monitor.capture_image().unwrap();
    print!("截图耗时: {:?}", start.elapsed());
    let mut buffer = Cursor::new(Vec::new());
    image.write_to(&mut buffer, xcap::image::ImageFormat::WebP)
      .map_err(|e| e.to_string())?;

    println!("运行耗时: {:?}", start.elapsed());

    Ok(buffer.into_inner())
}