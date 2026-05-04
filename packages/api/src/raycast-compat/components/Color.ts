/**
 * Raycast {@link Color} 兼容实现（与 `@raycast/api` 枚举值与类型结构对齐）。
 * @see https://developers.raycast.com/api-reference/user-interface/colors.md
 */

/* eslint-disable @typescript-eslint/no-namespace -- 与 Raycast 一致：enum Color 与 namespace Color 合并 */
export enum Color {
  Blue = 'raycast-blue',
  Green = 'raycast-green',
  Magenta = 'raycast-magenta',
  Orange = 'raycast-orange',
  Purple = 'raycast-purple',
  Red = 'raycast-red',
  Yellow = 'raycast-yellow',
  PrimaryText = 'raycast-green',
  SecondaryText = 'raycast-green',
}

export namespace Color {
  export type Raw = string;
  export interface Dynamic {
    /** The color which is used in light theme. */
    light: Raw;
    /** The color which is used in dark theme. */
    dark: Raw;
    /**
     * Enables dynamic contrast adjustment for light and dark theme color.
     * @defaultValue `true`
     */
    adjustContrast?: boolean | null | undefined;
  }
  /** Union type for the supported color types. */
  export type ColorLike = Color | Dynamic | Raw;
  /**
   * @deprecated `Color.Brown` isn't part of the custom themes and might look off
   * for some users. Use another color instead.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention -- 与 Raycast 导出名 `Brown` 一致
  export const Brown: Dynamic = {
    light: '#9B7653',
    dark: '#B8956E',
    adjustContrast: true,
  };
}
/* eslint-enable @typescript-eslint/no-namespace */

/** @deprecated Use {@link Color.ColorLike} instead */
export type ColorLike = Color.ColorLike;
