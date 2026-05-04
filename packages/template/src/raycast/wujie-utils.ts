/** 仅声明 Raycast view 子应用用到的 wujie 字段，避免与 `@public-tauri/api` 的全局 Window 合并冲突 */

export type RaycastViewWujiePropsSubset = {
  events?: EventTarget;
  getPreferences?: () => Record<string, unknown>;
  /** 宿主搜索栏显隐；与 `RaycastSearchBar` 联动 */
  updateSearchBarVisible?: (visible: boolean) => void;
  /** 将当前查询同步到宿主搜索框 */
  updateSearchBarValue?: (value: string) => void;
};

export function getRaycastViewWujieProps(): RaycastViewWujiePropsSubset | undefined {
  return (window as Window & {
    $wujie?: { props?: RaycastViewWujiePropsSubset };
  }).$wujie?.props;
}

/** 是否在 Vite 开发服务器下独立运行（无宿主 wujie、无 `props.events`） */
export function isRaycastViewStandaloneDev(): boolean {
  return Boolean(import.meta.env.DEV && !getRaycastViewWujieProps()?.events);
}
