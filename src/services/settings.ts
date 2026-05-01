import { register, unregister } from '@public-tauri/plugin-double-tap-shortcut';
import { storage, mainWindow, permissions } from '@public-tauri/core';
import { isTauri } from '@tauri-apps/api/core';
import { getPlugins as getAllPlugins } from '@/plugin/manager';
import type { ISettings } from '@/types/plugin';

const DEFAULT_SHORTCUT = 'Meta+Meta';

export type PermissionCheckResult = {
  hasPermission: boolean;
  permissionStatus: 'granted' | 'denied' | 'unknown';
  openSettings: () => Promise<void>;
};

export const getSettings = async (): Promise<ISettings> => {
  const defaultSettings = {
    launchAtLogin: true,
    shortcuts: DEFAULT_SHORTCUT,
    clearTimeout: 90,
  };
  const settings = await storage.getItem('settings/settings') as ISettings;
  return {
    ...defaultSettings,
    ...settings,
  };
};

export const updateSettings = (settings: Partial<ISettings>) => storage.setItem('settings/settings', settings);

export const getPlugins = () => Promise.resolve([...getAllPlugins({ includeDisabledPlugins: true, includeDisabledCommands: true }).values() ?? []]).then(list => list.sort((prev, next) => prev.manifest.name.localeCompare(next.manifest.name)));

let last = DEFAULT_SHORTCUT;

export const registerMainShortcut = async (shortcut: string, showPermissionTip = true): Promise<{ registered: boolean; needsPermission?: 'accessibility' | 'appleScript' | 'screenRecording' }> => {
  if (!isTauri()) return { registered: false };

  // Check accessibility permission before registering
  const permResult = await checkAccessibilityPermission();
  if (!permResult.hasPermission && showPermissionTip) {
    console.warn('[Permissions] Accessibility permission not granted, shortcut may not work');
    // Don't block registration, but log warning
  }

  last = shortcut;
  await register(shortcut, async () => {
    mainWindow.show();
    mainWindow.center();
  });

  return { registered: true };
};

export const unregisterMainShortcut = () => {
  if (!isTauri()) return;
  return unregister(last);
};

export const updateMainShortcut = async (shortcut?: string) => {
  console.log('updateMainShortcut', shortcut);
  await unregisterMainShortcut();
  if (!shortcut?.trim()) return;
  await registerMainShortcut(shortcut);
};

/// Check if accessibility permission is granted for double-tap shortcut
export const checkAccessibilityPermission = async (): Promise<PermissionCheckResult> => {
  const permissionStatus = await permissions.checkAccessibility();
  return {
    hasPermission: permissionStatus === 'granted',
    permissionStatus,
    openSettings: () => permissions.openAccessibilitySettings(),
  };
};

/// Check if AppleScript permission is granted
export const checkAppleScriptPermission = async (): Promise<PermissionCheckResult> => {
  const permissionStatus = await permissions.checkAppleScript();
  return {
    hasPermission: permissionStatus === 'granted',
    permissionStatus,
    openSettings: () => permissions.openAutomationSettings(),
  };
};

/// Check if screen recording permission is granted
export const checkScreenRecordingPermission = async (): Promise<PermissionCheckResult> => {
  const permissionStatus = await permissions.checkScreenRecording();
  return {
    hasPermission: permissionStatus === 'granted',
    permissionStatus,
    openSettings: () => permissions.openScreenRecordingSettings(),
  };
};

/// Check all permissions at once
export const checkAllPermissions = async () => {
  const [accessibility, appleScript, screenRecording] = await Promise.all([
    checkAccessibilityPermission(),
    checkAppleScriptPermission(),
    checkScreenRecordingPermission(),
  ]);
  return { accessibility, appleScript, screenRecording };
};
