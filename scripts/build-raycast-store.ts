import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type RaycastCommand = {
  name?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  mode?: string;
  keywords?: string[];
  icon?: string;
  preferences?: unknown[];
};

type RaycastPackage = {
  name?: string;
  title?: string;
  description?: string;
  icon?: string;
  author?: string;
  contributors?: string[];
  categories?: string[];
  license?: string;
  platforms?: string[];
  version?: string;
  commands?: RaycastCommand[];
  preferences?: unknown[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const args = process.argv.slice(2);

const getArgValue = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
};

const raycastRoot = path.resolve(getArgValue('--raycast-root') || '.tmp/raycast-extensions');
const outputPath = path.resolve(getArgValue('--out') || 'store/raycast/index.json');
const extensionsRoot = path.join(raycastRoot, 'extensions');

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

const getRaycastCommit = () => execSync(`git -C ${JSON.stringify(raycastRoot)} rev-parse HEAD`, {
  encoding: 'utf8',
}).trim();

const extensionNames = fs.readdirSync(extensionsRoot)
  .filter(name => fs.statSync(path.join(extensionsRoot, name)).isDirectory())
  .sort((a, b) => a.localeCompare(b));

const extensions = [];
const skipped = [];
const commit = getRaycastCommit();

for (const extensionName of extensionNames) {
  const extensionDir = path.join(extensionsRoot, extensionName);
  const packageJsonPath = path.join(extensionDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    skipped.push({ name: extensionName, reason: 'missing package.json' });
    continue;
  }

  try {
    const pkg = readJson<RaycastPackage>(packageJsonPath);
    const name = pkg.name || extensionName;
    extensions.push({
      name,
      title: pkg.title || name,
      description: pkg.description,
      icon: pkg.icon,
      author: pkg.author,
      contributors: pkg.contributors || [],
      categories: pkg.categories || [],
      license: pkg.license,
      platforms: pkg.platforms || [],
      version: pkg.version,
      storeUrl: pkg.author ? `https://www.raycast.com/${pkg.author}/${name}` : undefined,
      source: {
        type: 'github-monorepo',
        repo: 'raycast/extensions',
        path: `extensions/${extensionName}`,
        ref: 'main',
      },
      commands: (pkg.commands || []).map(command => ({
        name: command.name,
        title: command.title,
        subtitle: command.subtitle,
        description: command.description,
        mode: command.mode,
        keywords: command.keywords || [],
        icon: command.icon,
        preferences: command.preferences || [],
      })),
      preferences: pkg.preferences || [],
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    });
  } catch (error) {
    skipped.push({
      name: extensionName,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  source: {
    repo: 'raycast/extensions',
    ref: 'main',
    commit,
  },
  count: extensions.length,
  extensions,
  skipped,
}, null, 2)}\n`);

console.log(`Built Raycast store index: ${outputPath}`);
console.log(`Indexed ${extensions.length} extension(s), skipped ${skipped.length}.`);
