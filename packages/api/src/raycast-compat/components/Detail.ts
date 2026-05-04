/**
 * Raycast {@link Detail} 兼容：与 view Worker 序列化宿主的 `raycast:detail` 一致。
 * @see https://developers.raycast.com/api-reference/user-interface/detail
 */
import React from 'react';

export type DetailProps = {
  markdown?: string;
  metadata?: React.ReactNode;
  children?: React.ReactNode;
};

export function Detail(props: DetailProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:detail', rest, children);
}
