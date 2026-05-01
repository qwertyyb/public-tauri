export type RaycastStoreSource = {
  type: string;
  repo: string;
  path: string;
  ref: string;
};

export type RaycastStoreCommand = {
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  mode?: string;
  keywords?: string[];
  icon?: string;
  preferences?: unknown[];
};

export type RaycastStoreExtension = {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  author?: string;
  contributors?: string[];
  categories?: string[];
  license?: string;
  platforms?: string[];
  version?: string;
  storeUrl?: string;
  source: RaycastStoreSource;
  commands: RaycastStoreCommand[];
  preferences?: unknown[];
};

export type RaycastStoreIndex = {
  version: number;
  generatedAt: string;
  source: { repo: string; ref: string; commit: string };
  count: number;
  extensions: RaycastStoreExtension[];
  skipped: { name: string; reason: string }[];
};
