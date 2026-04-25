use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Application {
    display_name: String,
    executable_path: String,
    bundle_identifier: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontmostApplication {
    display_name: String,
    executable_path: String,
    bundle_identifier: String,
    pid: i32,
}

#[cfg(target_os = "macos")]
mod platform {
    use super::{Application, FrontmostApplication};
    use objc2_app_kit::{NSRunningApplication, NSWorkspace};
    use objc2_foundation::{ns_string, NSBundle, NSString, NSURL};
    use std::path::Path;

    fn make_url(file_or_url: &str) -> Result<objc2::rc::Retained<NSURL>, String> {
        let input = NSString::from_str(file_or_url);

        if is_url(file_or_url) {
            return NSURL::URLWithString(&input)
                .ok_or_else(|| format!("invalid URL: {file_or_url}"));
        }

        Ok(NSURL::fileURLWithPath(&input))
    }

    fn is_url(input: &str) -> bool {
        let Some((scheme, _)) = input.split_once(':') else {
            return false;
        };

        let mut chars = scheme.chars();
        chars.next().is_some_and(|c| c.is_ascii_alphabetic())
            && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '-' | '.'))
    }

    fn ns_string(value: Option<objc2::rc::Retained<NSString>>) -> String {
        value.map(|value| value.to_string()).unwrap_or_default()
    }

    fn bundle_name(bundle: &NSBundle) -> Option<String> {
        bundle
            .objectForInfoDictionaryKey(ns_string!("CFBundleDisplayName"))
            .and_then(|value| value.downcast::<NSString>().ok())
            .or_else(|| {
                bundle
                    .objectForInfoDictionaryKey(ns_string!("CFBundleName"))
                    .and_then(|value| value.downcast::<NSString>().ok())
            })
            .map(|value| value.to_string())
    }

    fn app_name_from_url(app_url: &NSURL) -> String {
        let Some(path) = app_url.path() else {
            return String::new();
        };

        Path::new(&path.to_string())
            .file_stem()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default()
    }

    fn application_from_url(app_url: &NSURL) -> Application {
        let bundle = NSBundle::bundleWithURL(app_url);

        Application {
            display_name: bundle
                .as_deref()
                .and_then(bundle_name)
                .unwrap_or_else(|| app_name_from_url(app_url)),
            executable_path: bundle
                .as_deref()
                .map(|bundle| ns_string(bundle.executablePath()))
                .unwrap_or_default(),
            bundle_identifier: bundle
                .as_deref()
                .map(|bundle| ns_string(bundle.bundleIdentifier()))
                .unwrap_or_default(),
        }
    }

    fn frontmost_application_from_running_app(
        application: &NSRunningApplication,
    ) -> FrontmostApplication {
        let display_name = ns_string(application.localizedName());
        let executable_path = application
            .executableURL()
            .and_then(|url| url.path())
            .map(|path| path.to_string())
            .unwrap_or_default();
        let bundle_identifier = ns_string(application.bundleIdentifier());
        let pid = application.processIdentifier() as i32;

        FrontmostApplication {
            display_name,
            executable_path,
            bundle_identifier,
            pid,
        }
    }

    pub fn get_frontmost_application() -> Result<Option<FrontmostApplication>, String> {
        Ok(NSWorkspace::sharedWorkspace()
            .frontmostApplication()
            .as_deref()
            .map(frontmost_application_from_running_app))
    }

    pub fn get_default_application(file_or_url: &str) -> Result<Option<Application>, String> {
        let url = make_url(file_or_url)?;
        let app_url = NSWorkspace::sharedWorkspace().URLForApplicationToOpenURL(&url);

        Ok(app_url
            .as_deref()
            .map(|app_url| application_from_url(app_url)))
    }

    pub fn get_application(file_or_url: &str) -> Result<Vec<Application>, String> {
        let url = make_url(file_or_url)?;
        let app_urls = NSWorkspace::sharedWorkspace().URLsForApplicationsToOpenURL(&url);
        let mut applications = Vec::with_capacity(app_urls.count());

        for index in 0..app_urls.count() {
            applications.push(application_from_url(&app_urls.objectAtIndex(index)));
        }

        Ok(applications)
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use super::{Application, FrontmostApplication};

    pub fn get_frontmost_application() -> Result<Option<FrontmostApplication>, String> {
        Err("get frontmost application command is only supported on macOS".to_string())
    }

    pub fn get_default_application(_file_or_url: &str) -> Result<Option<Application>, String> {
        Err("get application commands are only supported on macOS".to_string())
    }

    pub fn get_application(_file_or_url: &str) -> Result<Vec<Application>, String> {
        Err("get application commands are only supported on macOS".to_string())
    }
}

#[tauri::command]
pub fn get_frontmost_application() -> Result<Option<FrontmostApplication>, String> {
    platform::get_frontmost_application()
}

#[tauri::command]
pub fn get_default_application(file_or_url: String) -> Result<Option<Application>, String> {
    platform::get_default_application(&file_or_url)
}

#[tauri::command]
pub fn get_application(file_or_url: String) -> Result<Vec<Application>, String> {
    platform::get_application(&file_or_url)
}
