import type { PathLike } from 'fs';
import React from 'react';
import type { Color } from './Color';
import type { Image } from './Image';

/** 与 Raycast List 一致；见 https://developers.raycast.com/api-reference/user-interface/list */
export type ListProps = {
  searchBarPlaceholder?: string;
  navigationTitle?: string;
  searchText?: string;
  selectedItemId?: string;
  isLoading?: boolean;
  isShowingDetail?: boolean;
  filtering?: boolean | { keepSectionOrder?: boolean };
  throttle?: boolean;
  pagination?: { hasMore: boolean; onLoadMore?: () => void; pageSize: number };
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onSearchTextChange?: (text: string) => void;
  onSelectionChange?: (id: string) => void;
  searchBarAccessory?: React.ReactNode;
};

export function List(props: ListProps) {
  const { children, ...rest } = props;
  return React.createElement('raycast:list', rest, children);
}

export type ListSectionProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactElement<ListItemProps>[];
};

export function ListSection(props: ListSectionProps) {
  return React.createElement('raycast:list-section', props);
}

export type ListItemProps = {
  title: string;
  id?: string;
  subtitle?: string;
  keywords?: string[];
  icon?: Image.ImageLike;
  accessories?: any; /** @todo Raycast accessories：暂未渲染，保留类型 */
  detail?: React.ReactElement<ListItemDetailProps>;
  actions?: React.ReactNode;
  quickLook?: { name?: string, path: PathLike };
};

function ListItem(props: ListItemProps) {
  return React.createElement('raycast:list-item', props);
}

export type ListItemDetailProps = {
  isLoading?: boolean;
  markdown?: string;
  meta?: React.ReactNode;
};

export function ListItemDetail(props: ListItemDetailProps) {
  return React.createElement('raycast:list-item-detail', props);
}

export type ListItemDetailMetadataLabelProps = {
  title: string;
  icon?: Image.ImageLike;
  text?: string | { color: Color.ColorLike; value: string };
};

export function ListItemDetailMetadataLabel(props: ListItemDetailMetadataLabelProps) {
  return React.createElement('raycast:list-item-detail-metadata-label', props);
}

export type ListItemDetailMetadataSeparatorProps = {};

export function ListItemDetailMetadataSeparator(props: ListItemDetailMetadataSeparatorProps) {
  return React.createElement('raycast:list-item-detail-metadata-separator', props);
}

export type ListItemDetailMetadataLinkProps = {
  target: string;
  text: string;
  title: string;
};

export function ListItemDetailMetadataLink(props: ListItemDetailMetadataLinkProps) {
  return React.createElement('raycast:list-item-detail-metadata-link', props);
}

export type ListItemDetailMetadataTagListItemProps = {
  color?: Color.ColorLike;
  icon?: Image.ImageLike;
  onAction?: () => void;
  text?: string
};

export function ListItemDetailMetadataTagListItem(props: ListItemDetailMetadataTagListItemProps) {
  return React.createElement('raycast:list-item-detail-metadata-tag-item', props);
}

export type ListItemDetailMetadataTagListProps = {
  title: string;
  children: React.ReactElement<ListItemDetailMetadataTagListItemProps>[];
};

export function ListItemDetailMetadataTagList(props: ListItemDetailMetadataTagListProps) {
  return React.createElement('raycast:list-item-detail-metadata-tag-list', props, ...props.children);
}

export type ListItemDetailMetadataProps = {
  children?: (React.ReactElement<ListItemDetailMetadataLabelProps>
  | React.ReactElement<ListItemDetailMetadataSeparatorProps>
  | React.ReactElement<ListItemDetailMetadataLinkProps>
  | React.ReactElement<ListItemDetailMetadataTagListProps>)[];
};

export function ListItemDetailMetadata(props: ListItemDetailMetadataProps) {
  return React.createElement('raycast:list-item-detail-metadata', props, ...(props.children || []));
}

export type ListEmptyViewProps = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

function EmptyView(props: ListEmptyViewProps) {
  return React.createElement('raycast:empty', props);
}

ListItemDetailMetadataTagList.Item = ListItemDetailMetadataTagListItem;

ListItemDetailMetadata.Label = ListItemDetailMetadataLabel;
ListItemDetailMetadata.Separator = ListItemDetailMetadataSeparator;
ListItemDetailMetadata.Link = ListItemDetailMetadataLink;
ListItemDetailMetadata.TagList = ListItemDetailMetadataTagList;

ListItemDetail.Metadata = ListItemDetailMetadata;

ListItem.Detail = ListItemDetail;

List.Item = ListItem;
List.Section = ListSection;
List.EmptyView = EmptyView;
