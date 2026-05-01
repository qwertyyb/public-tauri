import type { ConvertWarning, RaycastPackage } from './types';

const raycastApiPackages = new Set(['@raycast/api', '@raycast/utils']);

const rewriteDependencyMap = (dependencies: Record<string, string> | undefined) => {
  const rewritten = { ...(dependencies || {}) };
  let replacedRaycastApi = false;
  for (const packageName of raycastApiPackages) {
    if (packageName in rewritten) {
      delete rewritten[packageName];
      replacedRaycastApi = true;
    }
  }
  return { dependencies: rewritten, replacedRaycastApi };
};

export const createConvertedPackage = (
  sourcePackage: RaycastPackage,
  publicPlugin: Record<string, unknown>,
  options: { convertedPackageName: string, publicApiDependency: string, warnings: ConvertWarning[] },
) => {
  const dependenciesResult = rewriteDependencyMap(sourcePackage.dependencies);
  const devDependenciesResult = rewriteDependencyMap(sourcePackage.devDependencies);
  if (dependenciesResult.replacedRaycastApi || devDependenciesResult.replacedRaycastApi) {
    options.warnings.push({
      type: 'dependency',
      message: 'Replaced @raycast/api and/or @raycast/utils with @public-tauri/api',
    });
  }

  return {
    ...sourcePackage,
    name: options.convertedPackageName,
    version: sourcePackage.version || '1.0.0',
    type: 'module',
    private: true,
    publicPlugin,
    scripts: {
      ...(sourcePackage.scripts || {}),
      build: 'tsdown --config tsdown.config.ts',
    },
    dependencies: {
      ...dependenciesResult.dependencies,
      '@public-tauri/api': dependenciesResult.dependencies['@public-tauri/api'] || options.publicApiDependency,
    },
    devDependencies: {
      ...devDependenciesResult.dependencies,
      tsdown: devDependenciesResult.dependencies.tsdown || '^0.21.7',
    },
  };
};
