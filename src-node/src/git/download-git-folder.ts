import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** `git sparse-checkout` 子命令（Git 2.25+） */
const MIN_GIT_SPARSE = [2, 25, 0] as const;
/** `fetch --filter=tree:0`（Git 2.36+）；更低版本改用 `blob:none` */
const MIN_GIT_TREE_FILTER = [2, 36, 0] as const;

export type DownloadGitFolderParams = {
  /** 远程仓库 URL，如 `https://github.com/owner/repo.git` */
  repoUrl: string;
  /** 提交 SHA（或 `git fetch origin <rev>` 可解析的 rev） */
  commit: string;
  /** 仓库内目录，POSIX、无首尾 `/`，如 `extensions/foo` */
  pathInRepo: string;
  /** 目标目录（会先清空再写入该文件夹内容，不含 `.git`） */
  destDir: string;
  /** 检出后必须在目录内存在的相对文件，用于校验（如 `package.json`） */
  requiredFile?: string;
};

const gitEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_LFS_SKIP_SMUDGE: '1',
});

function runGit(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: gitEnv(),
    });
    let combined = '';
    child.stderr?.on('data', (c: Buffer) => {
      combined += c.toString();
    });
    child.stdout?.on('data', (c: Buffer) => {
      combined += c.toString();
    });
    child.on('error', (e) => {
      reject(e);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git ${args.join(' ')} 退出码 ${code}\n${combined.slice(-2000)}`));
    });
  });
}

function semverGte(v: readonly [number, number, number], min: readonly [number, number, number]): boolean {
  if (v[0] !== min[0]) return v[0] > min[0];
  if (v[1] !== min[1]) return v[1] > min[1];
  return v[2] >= min[2];
}

let gitVersionCache: Promise<[number, number, number]> | undefined;

async function readGitVersion(): Promise<[number, number, number]> {
  try {
    const { stdout } = await execFileAsync('git', ['version'], { env: gitEnv() });
    const m = stdout.trim().match(/git version (\d+)\.(\d+)\.(\d+)/);
    if (!m) {
      throw new Error(`无法解析 git version: ${stdout.trim().slice(0, 120)}`);
    }
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') {
      throw new Error('未找到 git 可执行文件');
    }
    throw e;
  }
}

async function getGitVersionCached(): Promise<[number, number, number]> {
  gitVersionCache ??= readGitVersion();
  return gitVersionCache;
}

async function countFilesRecursive(dir: string): Promise<number> {
  let n = 0;
  const walk = async (d: string) => {
    const ents = await fs.readdir(d, { withFileTypes: true });
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        n += 1;
      }
    }
  };
  await walk(dir);
  return n;
}

/**
 * 用非 cone sparse-checkout + shallow fetch + partial clone filter，仅拉取仓库内某一目录到本地。
 * Git 版本低于 2.25 会直接抛错，不发起 fetch。
 */
export async function downloadGitFolder(params: DownloadGitFolderParams): Promise<{ fileCount: number }> {
  const repoUrl = params.repoUrl.trim();
  const commit = params.commit.trim();
  const pathInRepo = params.pathInRepo.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const destDir = path.resolve(params.destDir);
  const segments = pathInRepo.split('/').filter(Boolean);

  if (!repoUrl) {
    throw new Error('repoUrl 不能为空');
  }
  if (!commit || !segments.length) {
    throw new Error('commit 与 pathInRepo 不能为空');
  }

  let sparsePattern = `/${pathInRepo}`;
  if (!sparsePattern.endsWith('/')) sparsePattern += '/';

  const gitVer = await getGitVersionCached();
  if (!semverGte(gitVer, MIN_GIT_SPARSE)) {
    throw new Error(`Git ${gitVer.join('.')} 不支持 sparse-checkout（需要 ≥${MIN_GIT_SPARSE.join('.')}），已跳过稀疏克隆`);
  }
  const fetchFilterFlag = semverGte(gitVer, MIN_GIT_TREE_FILTER) ? '--filter=tree:0' : '--filter=blob:none';

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-folder-sparse-'));

  try {
    await runGit(workDir, ['init', '--quiet']);
    await runGit(workDir, ['remote', 'add', 'origin', repoUrl]);
    await runGit(workDir, ['sparse-checkout', 'init', '--no-cone']);
    await runGit(workDir, ['sparse-checkout', 'set', sparsePattern]);
    await runGit(workDir, ['fetch', '--depth=1', fetchFilterFlag, 'origin', commit]);
    await runGit(workDir, ['checkout', '--quiet', 'FETCH_HEAD']);

    const checkoutPath = path.join(workDir, ...segments);
    if (params.requiredFile) {
      const rel = params.requiredFile.replace(/\\/g, '/').replace(/^\/+/, '');
      await fs.access(path.join(checkoutPath, rel));
    }

    await fs.rm(destDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(path.dirname(destDir), { recursive: true });
    await fs.cp(checkoutPath, destDir, { recursive: true });

    const fileCount = await countFilesRecursive(destDir);
    return { fileCount };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
