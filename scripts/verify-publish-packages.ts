import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

type PackageJson = {
  name?: string;
  private?: boolean;
  files?: string[];
  publishConfig?: {
    access?: string;
    registry?: string;
  };
};

const workspaceRoot = process.cwd();
const fixedPackageDirs = [
  'packages/api',
  'packages/raycast-convert',
];

async function readPackageJson(packageDir: string): Promise<PackageJson> {
  const packageJsonPath = path.join(workspaceRoot, packageDir, 'package.json');
  return JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;
}

async function getStorePluginDirs() {
  const storePluginsDir = path.join(workspaceRoot, 'store/plugins');
  const entries = await readdir(storePluginsDir, { withFileTypes: true });

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => `store/plugins/${entry.name}`)
    .sort();
}

function verifyPackage(packageDir: string, packageJson: PackageJson) {
  const errors: string[] = [];

  if (!packageJson.name?.startsWith('@public-tauri/')) {
    if (!packageJson.name?.startsWith('@public-tauri-ext/')) {
      errors.push('package name must use @public-tauri or @public-tauri-ext scope');
    }
  }

  if (packageJson.private === true) {
    errors.push('package must not be private');
  }

  if (!packageJson.files?.includes('dist')) {
    errors.push('files must include dist');
  }

  if (packageJson.publishConfig?.access !== 'public') {
    errors.push('publishConfig.access must be public');
  }

  if (packageJson.publishConfig?.registry !== 'https://registry.npmjs.org/') {
    errors.push('publishConfig.registry must be https://registry.npmjs.org/');
  }

  return errors.map(error => `${packageDir}: ${error}`);
}

async function main() {
  const publishPackageDirs = [
    ...fixedPackageDirs,
    ...await getStorePluginDirs(),
  ];

  const results = await Promise.all(publishPackageDirs.map(async (packageDir) => {
    const packageJson = await readPackageJson(packageDir);

    return verifyPackage(packageDir, packageJson);
  }));
  const errors = results.flat();

  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }

  console.log(`Verified ${publishPackageDirs.length} publish packages.`);
}

await main();
