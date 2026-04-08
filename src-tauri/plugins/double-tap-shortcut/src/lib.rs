// Copyright 2026 double-tap-shortcut contributors
// SPDX-License-Identifier: MIT

//! Register double-tap modifier key global shortcuts.
//!
//! Supports detecting double presses of modifier keys (Meta, Control, Alt, Shift)
//! using the uiohook-rs library for cross-platform keyboard event monitoring.

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Instant,
};

use serde::Serialize;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::{
    ipc::Channel,
    plugin::{Builder as PluginBuilder, TauriPlugin},
    AppHandle, Manager, Runtime, State,
};
use uiohook_rs::{
    hook::keyboard::{KeyCode, KeyboardEventType},
    EventHandler, Uiohook, UiohookEvent,
};

/// Default double-tap detection threshold in milliseconds
const DOUBLE_TAP_THRESHOLD_MS: u128 = 300;

/// Parsed representation of a double-tap shortcut string (e.g., "Meta+Meta")
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DoubleTapShortcut {
    /// The display name of the shortcut (e.g., "Meta+Meta")
    pub display_name: String,
    /// The target key codes that trigger this shortcut (both left and right variants)
    pub key_codes: Vec<KeyCode>,
}

/// Error type for the plugin
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Invalid shortcut format: {0}")]
    InvalidFormat(String),
    #[error("Unknown modifier key: {0}")]
    UnknownModifier(String),
    #[error(transparent)]
    Uiohook(#[from] uiohook_rs::UiohookError),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, Error>;

/// Parse a modifier key name to its KeyCode variants
fn parse_modifier_key(name: &str) -> Result<Vec<KeyCode>> {
    match name.to_lowercase().as_str() {
        "meta" | "command" | "cmd" | "super" => Ok(vec![KeyCode::MetaL, KeyCode::MetaR]),
        "control" | "ctrl" => Ok(vec![KeyCode::ControlL, KeyCode::ControlR]),
        "alt" | "option" | "opt" => Ok(vec![KeyCode::AltL, KeyCode::AltR]),
        "shift" => Ok(vec![KeyCode::ShiftL, KeyCode::ShiftR]),
        other => Err(Error::UnknownModifier(other.to_string())),
    }
}

/// Parse a double-tap shortcut string like "Meta+Meta" or "Ctrl+Ctrl"
pub fn parse_shortcut(s: &str) -> Result<DoubleTapShortcut> {
    let parts: Vec<&str> = s.split('+').collect();
    if parts.len() != 2 {
        return Err(Error::InvalidFormat(format!(
            "Expected 'Key+Key' format, got '{}'",
            s
        )));
    }
    let left = parts[0].trim();
    let right = parts[1].trim();
    if !left.eq_ignore_ascii_case(right) {
        return Err(Error::InvalidFormat(format!(
            "Both parts must be the same modifier key for double-tap: '{}' != '{}'",
            left, right,
        )));
    }

    let key_codes = parse_modifier_key(left)?;
    Ok(DoubleTapShortcut {
        display_name: format!("{}+{}", capitalize(left), capitalize(right)),
        key_codes,
    })
}

fn capitalize(s: &str) -> String {
    let mut c = s.chars();
    match c.next() {
        None => String::new(),
        Some(f) => f.to_uppercase().chain(c).collect(),
    }
}

/// Event sent to the frontend when a double-tap is detected
#[derive(Clone, Serialize)]
struct DoubleTapJsEvent {
    shortcut: String,
}

/// Plugin state managed by Tauri
struct DoubleTapStateInner {
    shortcuts: HashMap<String, DoubleTapRegisteredEntry>,
    press_times: HashMap<u32, Instant>, // keycode -> last press time
}

struct DoubleTapRegisteredEntry {
    shortcut: DoubleTapShortcut,
    handlers: Vec<Channel<DoubleTapJsEvent>>,
}

/// Wrapper to share state with the event handler via Arc
#[derive(Clone)]
struct SharedState {
    inner: Arc<Mutex<DoubleTapStateInner>>,
}

// ============================================================================
// Uiohook EventHandler implementation
// ============================================================================

struct KeyboardEventHandler {
    shared: Arc<Mutex<DoubleTapStateInner>>,
}

impl KeyboardEventHandler {
    fn new(shared: Arc<Mutex<DoubleTapStateInner>>) -> Self {
        Self { shared }
    }

    fn handle_key_press(&self, key_code: &KeyCode) {
        let now = Instant::now();

        // Determine if this is a double-tap and collect matching handlers (under lock)
        let should_fire: bool = {
            let mut inner = self.shared.lock().unwrap();

            // Find all registered shortcuts that match this key code
            let has_match = inner
                .shortcuts
                .iter()
                .any(|(_, entry)| entry.shortcut.key_codes.contains(key_code));

            if !has_match {
                return;
            }

            let kc_u32: u32 = (*key_code).into();
            if let Some(&last_time) = inner.press_times.get(&kc_u32) {
                if now.duration_since(last_time).as_millis() < DOUBLE_TAP_THRESHOLD_MS {
                    // Double-tap detected!
                    inner.press_times.remove(&kc_u32);
                    true
                } else {
                    inner.press_times.insert(kc_u32, now);
                    false
                }
            } else {
                inner.press_times.insert(kc_u32, now);
                false
            }
        };

        if !should_fire {
            return;
        }

        // Fire events outside the lock
        let matching_handlers: Vec<(String, Vec<Channel<DoubleTapJsEvent>>)> = {
            let inner = self.shared.lock().unwrap();
            inner
                .shortcuts
                .iter()
                .filter(|(_, entry)| entry.shortcut.key_codes.contains(key_code))
                .map(|(name, entry)| {
                    (
                        name.clone(),
                        entry.handlers.iter().cloned().collect::<Vec<_>>(),
                    )
                })
                .collect()
        };

        for (name, handlers) in &matching_handlers {
            let event = DoubleTapJsEvent {
                shortcut: name.clone(),
            };
            for handler in handlers {
                let _ = handler.send(event.clone());
            }
        }
    }
}

impl EventHandler for KeyboardEventHandler {
    fn handle_event(&self, event: &UiohookEvent) {
        if let UiohookEvent::Keyboard(kev) = event {
            if kev.event_type == KeyboardEventType::Pressed {
                self.handle_key_press(&kev.key_code);
            }
        }
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
fn register<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SharedState>,
    shortcuts: Vec<String>,
    handler: Channel<DoubleTapJsEvent>,
) -> Result<()> {
    let mut inner = state.inner.lock().unwrap();
    for shortcut_str in shortcuts {
        let shortcut = parse_shortcut(&shortcut_str)?;
        let display_name = shortcut.display_name.clone();
        let entry = inner
            .shortcuts
            .entry(display_name.clone())
            .or_insert_with(|| DoubleTapRegisteredEntry {
                shortcut,
                handlers: Vec::new(),
            });
        entry.handlers.push(handler.clone());

        log::info!(
            "[double-tap-shortcut] Registered: {} (total handlers: {})",
            display_name,
            entry.handlers.len()
        );
    }
    Ok(())
}

#[tauri::command]
fn unregister<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SharedState>,
    shortcuts: Vec<String>,
) -> Result<()> {
    let mut inner = state.inner.lock().unwrap();
    for shortcut_str in shortcuts {
        let shortcut = parse_shortcut(&shortcut_str)?;
        if inner.shortcuts.remove(&shortcut.display_name).is_some() {
            log::info!(
                "[double-tap-shortcut] Unregistered: {}",
                shortcut.display_name
            );
        }
    }
    Ok(())
}

#[tauri::command]
fn unregister_all<R: Runtime>(_app: AppHandle<R>, state: State<'_, SharedState>) -> Result<()> {
    let mut inner = state.inner.lock().unwrap();
    let count = inner.shortcuts.len();
    inner.shortcuts.clear();
    log::info!(
        "[double-tap-shortcut] Unregistered all ({}) shortcuts",
        count
    );
    Ok(())
}

#[tauri::command]
fn is_registered<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SharedState>,
    shortcut: String,
) -> Result<bool> {
    let parsed = parse_shortcut(&shortcut)?;
    let inner = state.inner.lock().unwrap();
    Ok(inner.shortcuts.contains_key(&parsed.display_name))
}

// ============================================================================
// Plugin Builder
// ============================================================================

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    PluginBuilder::new("double-tap-shortcut")
        .invoke_handler(tauri::generate_handler![
            register,
            unregister,
            unregister_all,
            is_registered,
        ])
        .setup(move |app, _api| {
            let shared = SharedState {
                inner: Arc::new(Mutex::new(DoubleTapStateInner {
                    shortcuts: HashMap::new(),
                    press_times: HashMap::new(),
                })),
            };

            let handler = KeyboardEventHandler::new(shared.inner.clone());
            let uiohook = Uiohook::new(handler);

            // Start the uiohook (spawns internal thread)
            match uiohook.run() {
                Ok(_) => log::info!("[double-tap-shortcut] uiohook started"),
                Err(e) => log::error!("[double-tap-shortcut] Failed to start uiohook: {}", e),
            }

            // Store the state in the app for command handlers to access
            app.manage(shared);
            // Note: we keep a handle to uiohook implicitly - it stops on drop

            log::info!("[double-tap-shortcut] Plugin initialized");
            Ok(())
        })
        .build()
}
