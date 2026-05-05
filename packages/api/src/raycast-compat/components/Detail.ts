/**
 * Raycast {@link Detail} 兼容：与 view Worker 序列化宿主的 `raycast:detail` 一致；
 * {@link Detail.Metadata} 子树对齐 `@raycast/api` Detail 侧栏元数据。
 * @see https://developers.raycast.com/api-reference/user-interface/detail
 */
import React from 'react';
import type { Color } from './Color';
import type { Image } from './Image';

export type DetailProps = {
  markdown?: string;
  metadata?: React.ReactNode;
  navigationTitle?: string;
};

function DetailImpl(props: DetailProps) {
  return React.createElement('raycast:detail', props);
}

export type DetailMetadataProps = {
  children?: React.ReactNode;
};

function DetailMetadataRoot(props: DetailMetadataProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:detail-metadata', rest, ...(React.Children.toArray(children)));
}

export type DetailMetadataLabelProps = {
  title: string;
  icon?: Image.ImageLike;
  text?: string | { color: Color.ColorLike; value: string };
};

function DetailMetadataLabel(props: DetailMetadataLabelProps) {
  return React.createElement('raycast:detail-metadata-label', props);
}

export type DetailMetadataSeparatorProps = Record<string, never>;

function DetailMetadataSeparator(_props: DetailMetadataSeparatorProps) {
  return React.createElement('raycast:detail-metadata-separator', {});
}

export type DetailMetadataLinkProps = {
  target: string;
  text: string;
  title: string;
};

function DetailMetadataLink(props: DetailMetadataLinkProps) {
  return React.createElement('raycast:detail-metadata-link', props);
}

export type DetailMetadataTagListItemProps = {
  color?: Color.ColorLike;
  icon?: Image.ImageLike;
  onAction?: () => void;
  text?: string;
};

function DetailMetadataTagListItem(props: DetailMetadataTagListItemProps) {
  return React.createElement('raycast:detail-metadata-tag-item', props);
}

export type DetailMetadataTagListProps = {
  title: string;
  children?: React.ReactNode;
};

function DetailMetadataTagListFn(props: DetailMetadataTagListProps) {
  const { children, ...rest } = props;
  return React.createElement(
    'raycast:detail-metadata-tag-list',
    rest,
    ...(React.Children.toArray(children)),
  );
}

const DetailMetadataTagList = Object.assign(DetailMetadataTagListFn, {
  Item: DetailMetadataTagListItem,
});

const DetailMetadata = Object.assign(DetailMetadataRoot, {
  Label: DetailMetadataLabel,
  Separator: DetailMetadataSeparator,
  Link: DetailMetadataLink,
  TagList: DetailMetadataTagList,
});

/** @see https://developers.raycast.com/api-reference/user-interface/detail */
export const Detail = Object.assign(DetailImpl, {
  Metadata: DetailMetadata,
});
