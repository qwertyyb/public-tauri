/**
 * Raycast {@link ActionPanel} 兼容实现。
 * @see https://developers.raycast.com/api-reference/user-interface/action-panel
 */
import React from 'react';
import type { KeyboardShortcut, RaycastImageLike } from './Action';

export type ActionPanelProps = {
  title?: string;
  children?: React.ReactNode;
};

export type ActionPanelSectionProps = {
  title?: string;
  children?: React.ReactNode;
};

export type ActionPanelSubmenuProps = {
  title: string;
  autoFocus?: boolean;
  children?: React.ReactNode;
  filtering?: boolean | { keepSectionOrder?: boolean };
  icon?: RaycastImageLike;
  isLoading?: boolean;
  onOpen?: () => void;
  onSearchTextChange?: (text: string) => void;
  shortcut?: KeyboardShortcut;
  throttle?: boolean;
};

export function ActionPanelSection(props: ActionPanelSectionProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:action-panel-section', rest, children);
}

export function ActionPanelSubmenu(props: ActionPanelSubmenuProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:action-panel-submenu', rest, children);
}

export function ActionPanel(props: ActionPanelProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:action-panel', rest, children);
}

Object.assign(ActionPanel, {
  Section: ActionPanelSection,
  Submenu: ActionPanelSubmenu,
});
