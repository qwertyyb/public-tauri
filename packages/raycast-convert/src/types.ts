export type RaycastPreference = {
  name: string;
  title?: string;
  label?: string;
  description?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  default?: unknown;
  defaultValue?: unknown;
  data?: { title?: string, label?: string, value: string | number | boolean }[];
};

export type RaycastCommand = {
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  mode?: string;
  keywords?: string[];
  icon?: string;
  preferences?: RaycastPreference[];
};

export type RaycastPackage = {
  name: string;
  version?: string;
  type?: string;
  title?: string;
  description?: string;
  icon?: string;
  commands?: RaycastCommand[];
  preferences?: RaycastPreference[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} & Record<string, unknown>;

export type ConvertWarning = {
  type: string;
  message: string;
};

export type ConvertedCommand = RaycastCommand & {
  entry: string;
};

export type ConvertMode = 'development' | 'production';

export type ConvertOptions = {
  inputDir: string;
  outputDir?: string;
  build?: boolean;
  mode?: ConvertMode;
  invocationDir?: string;
};

export type ResolvedConvertOptions = Required<Omit<ConvertOptions, 'outputDir' | 'mode'>> & {
  outputDir: string;
  mode: ConvertMode;
  publicApiDependency: string;
  buildDir: string;
  distDir: string;
  assetsDir: string;
};

export type ConversionReport = {
  source: string;
  output: string;
  convertedCommands: { name: string, entry: string }[];
  skippedCommands: { name: string, reason: string }[];
  warnings: ConvertWarning[];
};
