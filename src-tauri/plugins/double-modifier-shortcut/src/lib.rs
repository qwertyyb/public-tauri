// Copyright 2026 double-modifier-shortcut contributors
// SPDX-License-Identifier: MIT

//! Register double-tap modifier key global shortcuts.
//!
//! Detects double presses of modifier keys (Meta/Command, Control, Alt/Option, Shift).
//!
//! - macOS: uses `NSEvent` global + local monitors on `.flagsChanged`. Because these
//!   events only carry modifier state (no typed-key content), macOS does **not** require
//!   Accessibility / Input-Monitoring authorization — same approach launchers like Raycast use.
//! - Other platforms: uses `uiohook` for cross-platform keyboard event monitoring.

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

/// Default double-tap detection threshold in milliseconds
const DOUBLE_TAP_THRESHOLD_MS: u128 = 300;

/// The kind of modifier key a double-tap shortcut targets (left/right not distinguished).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ModifierKind {
    Command,
    Control,
    Option,
    Shift,
}

impl ModifierKind {
    const ALL: [ModifierKind; 4] = [
        ModifierKind::Command,
        ModifierKind::Control,
        ModifierKind::Option,
        ModifierKind::Shift,
    ];

    /// Device-independent `NSEventModifierFlags` bit for this modifier.
    #[cfg(target_os = "macos")]
    fn mask(self) -> usize {
        match self {
            ModifierKind::Shift => 1 << 17,
            ModifierKind::Control => 1 << 18,
            ModifierKind::Option => 1 << 19,
            ModifierKind::Command => 1 << 20,
        }
    }
}

/// Parsed representation of a double-tap shortcut string (e.g., "Meta+Meta")
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DoubleModifierShortcut {
    /// The display name of the shortcut (e.g., "Meta+Meta")
    pub display_name: String,
    /// The modifier key that triggers this shortcut
    pub kind: ModifierKind,
}

/// Error type for the plugin
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Invalid shortcut format: {0}")]
    InvalidFormat(String),
    #[error("Unknown modifier key: {0}")]
    UnknownModifier(String),
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

/// Parse a modifier key name to its [`ModifierKind`]
fn parse_modifier_key(name: &str) -> Result<ModifierKind> {
    match name.to_lowercase().as_str() {
        "meta" | "command" | "cmd" | "super" => Ok(ModifierKind::Command),
        "control" | "ctrl" => Ok(ModifierKind::Control),
        "alt" | "option" | "opt" => Ok(ModifierKind::Option),
        "shift" => Ok(ModifierKind::Shift),
        other => Err(Error::UnknownModifier(other.to_string())),
    }
}

/// Parse a double-tap shortcut string like "Meta+Meta" or "Ctrl+Ctrl"
pub fn parse_shortcut(s: &str) -> Result<DoubleModifierShortcut> {
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

    let kind = parse_modifier_key(left)?;
    Ok(DoubleModifierShortcut {
        display_name: format!("{}+{}", capitalize(left), capitalize(right)),
        kind,
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
struct DoubleModifierJsEvent {
    shortcut: String,
}

/// Plugin state managed by Tauri
struct DoubleModifierStateInner {
    shortcuts: HashMap<String, DoubleModifierRegisteredEntry>,
    /// modifier kind -> last press time, for double-tap timing
    last_press: HashMap<ModifierKind, Instant>,
    /// previous device-independent modifier flags (macOS `.flagsChanged` state tracking)
    #[allow(dead_code)]
    prev_flags: usize,
}

struct DoubleModifierRegisteredEntry {
    kind: ModifierKind,
    handlers: Vec<Channel<DoubleModifierJsEvent>>,
}

/// Wrapper to share state with the platform event monitor via Arc
#[derive(Clone)]
struct SharedState {
    inner: Arc<Mutex<DoubleModifierStateInner>>,
}

// ============================================================================
// Shared double-tap detection
// ============================================================================

/// Handle a single clean press of a modifier key and fire registered handlers
/// when a double-tap (two presses within the threshold) is detected.
fn handle_modifier_press(shared: &Arc<Mutex<DoubleModifierStateInner>>, kind: ModifierKind) {
    let now = Instant::now();

    let fire = {
        let mut inner = shared.lock().unwrap();
        let has_match = inner.shortcuts.values().any(|e| e.kind == kind);
        if !has_match {
            inner.last_press.remove(&kind);
            false
        } else if let Some(&last) = inner.last_press.get(&kind) {
            if now.duration_since(last).as_millis() < DOUBLE_TAP_THRESHOLD_MS {
                inner.last_press.remove(&kind);
                true
            } else {
                inner.last_press.insert(kind, now);
                false
            }
        } else {
            inner.last_press.insert(kind, now);
            false
        }
    };

    if !fire {
        return;
    }

    let matching: Vec<(String, Vec<Channel<DoubleModifierJsEvent>>)> = {
        let inner = shared.lock().unwrap();
        inner
            .shortcuts
            .iter()
            .filter(|(_, e)| e.kind == kind)
            .map(|(name, e)| (name.clone(), e.handlers.clone()))
            .collect()
    };

    for (name, handlers) in &matching {
        let event = DoubleModifierJsEvent {
            shortcut: name.clone(),
        };
        for handler in handlers {
            let _ = handler.send(event.clone());
        }
    }
}

// ============================================================================
// Platform event source
// ============================================================================

#[cfg(target_os = "macos")]
mod platform {
    use super::{handle_modifier_press, DoubleModifierStateInner, ModifierKind};
    use block2::RcBlock;
    use objc2_app_kit::{NSEvent, NSEventMask};
    use std::ptr::NonNull;
    use std::sync::{Arc, Mutex};

    /// Mask of the four modifier bits we care about (device-independent flags).
    const RELEVANT_MASK: usize = (1 << 17) | (1 << 18) | (1 << 19) | (1 << 20);

    /// Start global + local `.flagsChanged` monitors. No special authorization required:
    /// `.flagsChanged` only exposes modifier state, not typed-key content.
    pub fn start(shared: Arc<Mutex<DoubleModifierStateInner>>) {
        // Global monitor: fires while OTHER apps are focused (read-only).
        let s_global = shared.clone();
        let global_block = RcBlock::new(move |event: NonNull<NSEvent>| {
            let flags = unsafe { event.as_ref().modifierFlags() }.bits();
            handle_flags(&s_global, flags);
        });
        let global = NSEvent::addGlobalMonitorForEventsMatchingMask_handler(
            NSEventMask::FlagsChanged,
            &global_block,
        );

        // Local monitor: fires while OUR app is focused; must pass the event through.
        let s_local = shared.clone();
        let local_block = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
            let flags = unsafe { event.as_ref().modifierFlags() }.bits();
            handle_flags(&s_local, flags);
            event.as_ptr()
        });
        let local = unsafe {
            NSEvent::addLocalMonitorForEventsMatchingMask_handler(
                NSEventMask::FlagsChanged,
                &local_block,
            )
        };

        // The monitors live for the whole app lifetime; keep the tokens alive.
        std::mem::forget(global);
        std::mem::forget(local);
    }

    /// Translate a `.flagsChanged` snapshot into a "clean single modifier press" and
    /// forward it to the shared double-tap detector.
    fn handle_flags(shared: &Arc<Mutex<DoubleModifierStateInner>>, flags: usize) {
        let cur = flags & RELEVANT_MASK;

        let pressed_kind = {
            let mut inner = shared.lock().unwrap();
            let prev = inner.prev_flags;
            inner.prev_flags = cur;
            let changed = prev ^ cur;
            let mut found = None;
            if changed != 0 {
                for kind in ModifierKind::ALL {
                    let mask = kind.mask();
                    // `changed & mask != 0` -> this modifier just toggled;
                    // `cur == mask` -> it is now the ONLY active modifier (a clean press,
                    // excludes combos like Cmd+Shift).
                    if changed & mask != 0 && cur == mask {
                        found = Some(kind);
                        break;
                    }
                }
            }
            found
        };

        if let Some(kind) = pressed_kind {
            handle_modifier_press(shared, kind);
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use super::{handle_modifier_press, DoubleModifierStateInner, ModifierKind};
    use std::sync::{Arc, Mutex};
    use uiohook_rs::{
        hook::keyboard::{KeyCode, KeyboardEventType},
        EventHandler, Uiohook, UiohookEvent,
    };

    fn keycode_to_kind(kc: &KeyCode) -> Option<ModifierKind> {
        match kc {
            KeyCode::MetaL | KeyCode::MetaR => Some(ModifierKind::Command),
            KeyCode::ControlL | KeyCode::ControlR => Some(ModifierKind::Control),
            KeyCode::AltL | KeyCode::AltR => Some(ModifierKind::Option),
            KeyCode::ShiftL | KeyCode::ShiftR => Some(ModifierKind::Shift),
            _ => None,
        }
    }

    struct KeyboardEventHandler {
        shared: Arc<Mutex<DoubleModifierStateInner>>,
    }

    impl EventHandler for KeyboardEventHandler {
        fn handle_event(&self, event: &UiohookEvent) {
            if let UiohookEvent::Keyboard(kev) = event {
                if kev.event_type == KeyboardEventType::Pressed {
                    if let Some(kind) = keycode_to_kind(&kev.key_code) {
                        handle_modifier_press(&self.shared, kind);
                    }
                }
            }
        }
    }

    pub fn start(shared: Arc<Mutex<DoubleModifierStateInner>>) {
        let handler = KeyboardEventHandler { shared };
        let uiohook = Uiohook::new(handler);
        match uiohook.run() {
            Ok(_) => log::info!("[double-modifier-shortcut] uiohook started"),
            Err(e) => log::error!("[double-modifier-shortcut] Failed to start uiohook: {}", e),
        }
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn register<R: Runtime>(
    _app: AppHandle<R>,
    state: State<'_, SharedState>,
    shortcuts: Vec<String>,
    handler: Channel<DoubleModifierJsEvent>,
) -> Result<()> {
    let mut inner = state.inner.lock().unwrap();
    for shortcut_str in shortcuts {
        let shortcut = parse_shortcut(&shortcut_str)?;
        let display_name = shortcut.display_name.clone();
        let kind = shortcut.kind;
        let entry = inner
            .shortcuts
            .entry(display_name.clone())
            .or_insert_with(|| DoubleModifierRegisteredEntry {
                kind,
                handlers: Vec::new(),
            });
        entry.handlers.push(handler.clone());

        log::info!(
            "[double-modifier-shortcut] Registered: {} (total handlers: {})",
            display_name,
            entry.handlers.len()
        );
    }
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
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
                "[double-modifier-shortcut] Unregistered: {}",
                shortcut.display_name
            );
        }
    }
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
fn unregister_all<R: Runtime>(_app: AppHandle<R>, state: State<'_, SharedState>) -> Result<()> {
    let mut inner = state.inner.lock().unwrap();
    let count = inner.shortcuts.len();
    inner.shortcuts.clear();
    log::info!(
        "[double-modifier-shortcut] Unregistered all ({}) shortcuts",
        count
    );
    Ok(())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
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
    PluginBuilder::new("double-modifier-shortcut")
        .invoke_handler(tauri::generate_handler![
            register,
            unregister,
            unregister_all,
            is_registered,
        ])
        .setup(move |app, _api| {
            let shared = SharedState {
                inner: Arc::new(Mutex::new(DoubleModifierStateInner {
                    shortcuts: HashMap::new(),
                    last_press: HashMap::new(),
                    prev_flags: 0,
                })),
            };

            // Start the platform keyboard/modifier monitor.
            platform::start(shared.inner.clone());

            // Store the state in the app for command handlers to access
            app.manage(shared);

            log::info!("[double-modifier-shortcut] Plugin initialized");
            Ok(())
        })
        .build()
}
