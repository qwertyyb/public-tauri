import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function isFocusable(element: Element) {
  // 1. 检查是否是有效 DOM 元素
  if (!(element instanceof HTMLElement)) return false;

  // 2. 检查可见性
  const isVisible = () => {
    if (element.offsetParent === null) return false; // display: none
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden'
           && style.opacity !== '0'
           && element.offsetWidth > 0
           && element.offsetHeight > 0;
  };

  // 3. 检查禁用状态
  const isDisabled = () => {
    if ((element as any).disabled) return true;

    // 检查是否在禁用的 fieldset 中
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'FIELDSET' && (element as any).disabled) {
        return !parent.contains(element.closest('legend'));
      }
      parent = parent.parentElement;
    }
    return false;
  };

  // 4. 检查可聚焦性
  const isIntrinsicallyFocusable = () => {
    const focusableTags = [
      'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
      'IFRAME', 'AREA', 'SUMMARY', 'DETAILS',
    ];

    // 原生可聚焦元素
    if (focusableTags.includes(element.tagName)) {
      // 特殊处理：<a> 必须有 href
      if (element.tagName === 'A' && !(element as any).href) return false;
      return true;
    }

    // contenteditable 元素
    if (element.contentEditable === 'true' || element.contentEditable === 'plaintext-only') return true;

    // 有 tabindex 属性（包括负值）
    if (element.hasAttribute('tabindex')) return true;

    return false;
  };

  return isVisible() && !isDisabled() && isIntrinsicallyFocusable();
}

export const createDraggable = () => {
  if (!isTauri()) return;
  let startDragTimeout: ReturnType<typeof setTimeout> | null = null;
  const pointerDownHandler = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const dragArea = e.clientY < 48;
    const canFocus = isFocusable(e.target as Element);
    const shouldDrag = dragArea && !canFocus;
    if (shouldDrag) {
      startDragTimeout = setTimeout(() => {
        getCurrentWindow().startDragging();
      }, 200);
    }
  };

  const pointerUpHandler = () => {
    startDragTimeout && clearTimeout(startDragTimeout);
  };

  window.addEventListener('pointerdown', pointerDownHandler, true);
  window.addEventListener('pointerup', pointerUpHandler, true);
};
