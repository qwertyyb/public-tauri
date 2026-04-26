use serde::{Deserialize, Serialize};

/// Permission status enum
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PermissionStatus {
    Granted,
    Denied,
    Unknown,
}

/// All permissions status for the application
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionsStatus {
    pub accessibility: PermissionStatus,
    pub apple_script: PermissionStatus,
    pub screen_recording: PermissionStatus,
}

#[cfg(target_os = "macos")]
mod platform {
    use super::PermissionStatus;
    use std::process::Command;

    /// Check if accessibility permission is granted using AXIsProcessTrusted
    pub fn check_accessibility() -> PermissionStatus {
        // Use uiohook's built-in check or use CGWindowList copy
        // For macOS, we can use the accessibility API
        let trusted = is_ax_enabled();
        if trusted {
            PermissionStatus::Granted
        } else {
            PermissionStatus::Denied
        }
    }

    /// Check accessibility using Objective-C runtime
    fn is_ax_enabled() -> bool {
        // Try using CGWindowListCopyWindowInfo to check if we can capture screen
        // This is a workaround since AXIsProcessTrusted requires Objective-C

        // Method: Try to get frontmost application info - this requires accessibility
        let result = Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to return name of first process"])
            .output();

        match result {
            Ok(output) => output.status.success(),
            Err(_) => false,
        }
    }

    /// Check if AppleScript permission is granted
    pub fn check_apple_script() -> PermissionStatus {
        let result = Command::new("osascript")
            .args(["-e", "return \"test\""])
            .output();

        match result {
            Ok(output) => {
                if output.status.success() {
                    PermissionStatus::Granted
                } else {
                    // Check stderr for permission denied message
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if stderr.contains("not allowed") || stderr.contains("permission") {
                        PermissionStatus::Denied
                    } else {
                        PermissionStatus::Unknown
                    }
                }
            }
            Err(_) => PermissionStatus::Unknown,
        }
    }

    /// Check if screen recording permission is granted
    pub fn check_screen_recording() -> PermissionStatus {
        // Try to capture a minimal screen region using screencapture
        // Exit code 1 typically means permission denied
        let result = Command::new("screencapture")
            .args(["-x", "/dev/null"])
            .output();

        match result {
            Ok(output) => {
                if output.status.success() {
                    PermissionStatus::Granted
                } else {
                    PermissionStatus::Denied
                }
            }
            Err(e) => {
                // If screencapture command fails entirely, it might be permission issue
                if e.kind() == std::io::ErrorKind::PermissionDenied {
                    PermissionStatus::Denied
                } else {
                    PermissionStatus::Unknown
                }
            }
        }
    }

    /// Open Accessibility settings in System Preferences
    pub fn open_accessibility_settings() -> Result<(), String> {
        let output = Command::new("open")
            .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err("Failed to open Accessibility settings".to_string())
        }
    }

    /// Open Screen Recording settings in System Preferences
    pub fn open_screen_recording_settings() -> Result<(), String> {
        let output = Command::new("open")
            .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err("Failed to open Screen Recording settings".to_string())
        }
    }

    /// Open Automation settings in System Preferences
    pub fn open_automation_settings() -> Result<(), String> {
        let output = Command::new("open")
            .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err("Failed to open Automation settings".to_string())
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use super::PermissionStatus;

    pub fn check_accessibility() -> PermissionStatus {
        PermissionStatus::Unknown
    }

    pub fn check_apple_script() -> PermissionStatus {
        PermissionStatus::Unknown
    }

    pub fn check_screen_recording() -> PermissionStatus {
        PermissionStatus::Unknown
    }

    pub fn open_accessibility_settings() -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn open_screen_recording_settings() -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }

    pub fn open_automation_settings() -> Result<(), String> {
        Err("Not supported on this platform".to_string())
    }
}

/// Check all permissions status
#[tauri::command]
pub fn check_permissions() -> PermissionsStatus {
    PermissionsStatus {
        accessibility: platform::check_accessibility(),
        apple_script: platform::check_apple_script(),
        screen_recording: platform::check_screen_recording(),
    }
}

/// Check if accessibility permission is granted (for double-tap shortcut)
#[tauri::command]
pub fn check_accessibility_permission() -> PermissionStatus {
    platform::check_accessibility()
}

/// Check if AppleScript permission is granted
#[tauri::command]
pub fn check_applescript_permission() -> PermissionStatus {
    platform::check_apple_script()
}

/// Check if screen recording permission is granted (for screen capture)
#[tauri::command]
pub fn check_screen_recording_permission() -> PermissionStatus {
    platform::check_screen_recording()
}

/// Open Accessibility settings
#[tauri::command]
pub fn open_accessibility_settings() -> Result<(), String> {
    platform::open_accessibility_settings()
}

/// Open Screen Recording settings
#[tauri::command]
pub fn open_screen_recording_settings() -> Result<(), String> {
    platform::open_screen_recording_settings()
}

/// Open Automation settings
#[tauri::command]
pub fn open_automation_settings() -> Result<(), String> {
    platform::open_automation_settings()
}
