/**
 * Register double-tap modifier key global shortcuts.
 *
 * @module
 * @example
 * ```typescript
 * import { register, unregister, unregisterAll, isRegistered } from '@public-tauri/plugin-double-tap-shortcut';
 *
 * // Register a single double-tap shortcut
 * await register('Meta+Meta', (event) => {
 *   console.log('Double tap detected:', event.shortcut);
 * });
 *
 * // Register multiple at once
 * await register(['Meta+Meta', 'Ctrl+Ctrl'], (event) => { ... });
 *
 * // Unregister
 * await unregister('Meta+Meta');
 *
 * // Check if registered
 * const registered = await isRegistered('Meta+Meta');
 * ```
 */

import { invoke, Channel } from '@tauri-apps/api/core'

export interface DoubleTapEvent {
  /** The shortcut string that triggered this event (e.g., "Meta+Meta") */
  shortcut: string
}

/** Handler callback type for double-tap events */
export type DoubleTapHandler = (event: DoubleTapEvent) => void

/**
 * Register a double-tap modifier key shortcut or a list of shortcuts.
 *
 * Supported formats:
 * - `"Meta+Meta"` / `"Command+Command"` — Double press Command/Meta key
 * - `"Control+Control"` / `"Ctrl+Ctrl"` — Double press Control key
 * - `"Alt+Alt"` — Double press Alt/Option key
 * - `"Shift+Shift"` — Double press Shift key
 *
 * @param shortcut Shortcut definition (e.g., "Meta+Meta"), or an array of shortcuts
 * @param handler Callback function invoked when the double-tap is detected
 *
 * @since 0.1.0
 */
async function register(
  shortcuts: string | string[],
  handler: DoubleTapHandler,
): Promise<void> {
  const channel = new Channel<DoubleTapEvent>()
  channel.onmessage = handler

  return await invoke('plugin:double-tap-shortcut|register', {
    shortcuts: Array.isArray(shortcuts) ? shortcuts : [shortcuts],
    handler: channel,
  })
}

/**
 * Unregister one or more double-tap shortcuts.
 *
 * @param shortcut Shortcut definition to unregister (e.g., "Meta+Meta"), or an array
 *
 * @since 0.1.0
 */
async function unregister(shortcuts: string | string[]): Promise<void> {
  return await invoke('plugin:double-tap-shortcut|unregister', {
    shortcuts: Array.isArray(shortcuts) ? shortcuts : [shortcuts],
  })
}

/**
 * Unregister all registered double-tap shortcuts.
 *
 * @since 0.1.0
 */
async function unregisterAll(): Promise<void> {
  return await invoke('plugin:double-tap-shortcut|unregister_all', {})
}

/**
 * Check whether a specific double-tap shortcut is currently registered.
 *
 * @param shortcut Shortcut definition to check (e.g., "Meta+Meta")
 * @returns `true` if the shortcut is registered, `false` otherwise
 *
 * @since 0.1.0
 */
async function isRegistered(shortcut: string): Promise<boolean> {
  return await invoke('plugin:double-tap-shortcut|is_registered', { shortcut })
}

export { register, unregister, unregisterAll, isRegistered }
