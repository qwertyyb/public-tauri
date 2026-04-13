/** 解析完成可渲染的图标信息 */
export type ResolvedIcon =
  | { type: 'builtin'; name: string }
  | { type: 'image'; url: string; darkUrl: string | null };

/** 解析上下文 */
export type ResolveContext = {
  /** 相对路径的基准路径（如插件目录、应用资源目录） */
  basePath?: string
  /** 图标尺寸（如 fileicon 协议需要） */
  size?: number
};

/** AppIcon 组件 Props */
export type AppIconProps = {
  /** 图标字符串，支持所有协议格式 */
  icon?: string
  /** 相对路径基准路径，透传给 resolver */
  basePath?: string
  /** 图标尺寸 */
  size?: number | string
};
