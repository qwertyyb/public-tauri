import type { IPluginManifest } from '@public/schema';

export interface IStorePlugin {
  name: string;
  icon: string;
  version: string; // npm version
  author: string; // npm author
  homepage?: string; // npm homepage
  downloadCount?: number;
  manifest: IPluginManifest;
}
export interface IStore {
  updateTime: number; // 最后更新时间
  plugins: IStorePlugin[];
}
