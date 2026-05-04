/**
 * Raycast {@link Image} 类型与 `Image.Mask` 枚举，与 `@raycast/api` 对齐。
 * @see https://developers.raycast.com/api-reference/user-interface/icons-and-images
 */

/* eslint-disable @typescript-eslint/no-namespace -- 与 Raycast 一致：type Image 与 namespace Image 合并 */
import type { ColorLike } from './Color';
import type { FileIcon, Icon } from './Icon';

export namespace Image {
  /**
   * 用于裁剪图标的形状（如列表头像）。
   * @see https://developers.raycast.com/api-reference/user-interface/icons-and-images
   */
  export enum Mask {
    Circle = 'circle',
    RoundedRectangle = 'roundedRectangle',
  }

  /**
   * `Image.source`：HTTPS URL、扩展 `assets/` 内资源名、{@link Icon}、单 emoji 字符串，
   * 或亮/暗主题下的 URL / 资源名对。
   */
  export type Source = string | Icon | { light: string; dark: string };

  /** 主图无法加载时的回退（资源名、Icon 或亮/暗资源对） */
  export type Fallback = string | Icon | { light: string; dark: string };
}

/** 带 `source` 与可选 `mask` / `tintColor` / `fallback` 的图像描述 */
export type Image = {
  source: Image.Source;
  fallback?: Image.Fallback;
  mask?: Image.Mask;
  tintColor?: ColorLike;
};

export namespace Image {
  /** 与 Raycast 一致：`URL | Asset | Icon | FileIcon | Image`（URL / Asset 均为 `string`） */
  export type ImageLike = string | Icon | FileIcon | Image;
}
/* eslint-enable @typescript-eslint/no-namespace */
