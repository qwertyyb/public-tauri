import type { ConvertWarning, RaycastPackage } from './types';

const rewriteDependencyMap = (dependencies: Record<string, string> | undefined) => {
  const rewritten = { ...(dependencies || {}) };
  const replacedRaycastApi = '@raycast/api' in rewritten;
  if (replacedRaycastApi) {
    delete rewritten['@raycast/api'];
  }
  return { dependencies: rewritten, replacedRaycastApi };
};

export const createConvertedPackage = (
  sourcePackage: RaycastPackage,
  publicPlugin: Record<string, unknown>,
  options: {
    convertedPackageName: string,
    publicApiDependency: string,
    warnings: ConvertWarning[],
    hasViewCommands?: boolean,
  },
) => {
  const dependenciesResult = rewriteDependencyMap(sourcePackage.dependencies);
  const devDependenciesResult = rewriteDependencyMap(sourcePackage.devDependencies);
  if (dependenciesResult.replacedRaycastApi || devDependenciesResult.replacedRaycastApi) {
    options.warnings.push({
      type: 'dependency',
      message: 'Replaced @raycast/api with @public-tauri/api (see tsdown alias); @raycast/utils is left as declared',
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
      start: 'tsdown --watch --config tsdown.config.ts',
      build: 'tsdown --config tsdown.config.ts',
    },
    dependencies: {
      ...dependenciesResult.dependencies,
      '@public-tauri/api': dependenciesResult.dependencies['@public-tauri/api'] || options.publicApiDependency,
      ...(options.hasViewCommands ? {
        react: dependenciesResult.dependencies.react || '^19.0.0',
        'react-reconciler': dependenciesResult.dependencies['react-reconciler'] || '^0.31.0',
      } : {}),
    },
    devDependencies: {
      ...devDependenciesResult.dependencies,
      tsdown: devDependenciesResult.dependencies.tsdown || '^0.21.7',
      ...(options.hasViewCommands ? {
        '@types/react': devDependenciesResult.dependencies['@types/react'] || '^19.0.0',
      } : {}),
    },
  };
};
