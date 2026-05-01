import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadGitFolder } from '../git/download-git-folder.js';

const GITHUB_API = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

export type FetchExtensionParams = {
  /** 如 `raycast/extensions` */
  repoFullName: string;
  commit: string;
  /** 仓库内根相对路径，如 `extensions/0x0` */
  sourcePath: string;
  destDir: string;
};

const parseRepoFullName = (full: string): { owner: string; repo: string } => {
  const s = full.trim();
  const i = s.indexOf('/');
  if (i <= 0 || i === s.length - 1) {
    throw new Error(`无效 repo: ${full}，期望 owner/repo`);
  }
  return { owner: s.slice(0, i), repo: s.slice(i + 1) };
};

const githubHeaders = (): Record<string, string> => {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'public-tauri-raycast-store',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

async function githubGetJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub API ${res.status}: ${t.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

type GitTreeEntry = { path?: string; mode: string; type: 'blob' | 'tree' | 'commit'; sha: string; size?: number; url?: string };
type GitTreeResponse = { sha: string; tree: GitTreeEntry[]; truncated?: boolean };
type CommitResponse = { commit: { tree: { sha: string } } };

/**
 * 自根 tree 起按路径段进入子 tree，得到扩展目录对应 tree sha（仅 3～4 次 API，不拉全仓 tree）。
 */
async function resolveTreeShaForPath(
  owner: string,
  repo: string,
  commitSha: string,
  segments: string[],
): Promise<string> {
  const commit = await githubGetJson<CommitResponse>(`${GITHUB_API}/repos/${owner}/${repo}/commits/${commitSha}`);
  let treeSha = commit.commit.tree.sha;
  for (const name of segments) {
    const { tree } = await githubGetJson<GitTreeResponse>(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}`);
    const next = tree.find((e) => e.type === 'tree' && e.path === name);
    if (!next) {
      throw new Error(`路径中无目录: ${name}`);
    }
    treeSha = next.sha;
  }
  return treeSha;
}

async function listAllBlobsUnderTree(owner: string, repo: string, treeSha: string): Promise<GitTreeEntry[]> {
  const data = await githubGetJson<GitTreeResponse>(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
  );
  if (data.truncated) {
    throw new Error('GitHub tree 响应被截断，扩展目录过大');
  }
  return data.tree.filter((e) => e.type === 'blob' && e.path);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx]!;
      results[idx] = await fn(item, idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 仅下载某一扩展目录（如 extensions/foo），不克隆整仓。
 * 文件内容走 raw.githubusercontent.com，不走 GitHub Contents API 逐文件配额。
 */
export async function fetchRaycastExtensionDirectory(params: FetchExtensionParams): Promise<{ fileCount: number }> {
  const { owner, repo } = parseRepoFullName(params.repoFullName);
  const commit = params.commit.trim();
  const sourcePath = params.sourcePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const destDir = path.resolve(params.destDir);
  const segments = sourcePath.split('/').filter(Boolean);

  if (!commit || !segments.length) {
    throw new Error('commit 与 sourcePath 不能为空');
  }

  await fs.mkdir(destDir, { recursive: true });

  const subtreeSha = await resolveTreeShaForPath(owner, repo, commit, segments);
  const blobs = await listAllBlobsUnderTree(owner, repo, subtreeSha);

  await mapLimit(blobs, 8, async (entry) => {
    const fullPathInRepo = entry.path!;
    const posixRel = path.posix.relative(sourcePath, fullPathInRepo);
    if (!posixRel || posixRel.startsWith('../') || path.posix.isAbsolute(posixRel)) {
      throw new Error(`异常路径: ${fullPathInRepo}`);
    }

    const rawUrl = `${RAW_BASE}/${owner}/${repo}/${commit}/${fullPathInRepo.split('/').map(encodeURIComponent).join('/')}`;
    let attempt = 0;
    let res: Response | undefined;
    while (attempt < 3) {
      res = await fetch(rawUrl);
      if (res.ok) break;
      if (res.status === 429 || res.status >= 500) {
        attempt++;
        await sleep(400 * attempt);
        continue;
      }
      break;
    }
    if (!res!.ok) {
      throw new Error(`下载失败 ${fullPathInRepo}: HTTP ${res!.status}`);
    }

    const buf = Buffer.from(await res!.arrayBuffer());
    const outPath = path.join(destDir, ...posixRel.split('/'));
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, buf);
  });

  return { fileCount: blobs.length };
}

/**
 * 优先 GitHub API（trees + raw）；失败时再尝试与 scripts/test-raycast-download.sh 一致的 git sparse。
 */
export async function fetchRaycastExtensionApiFirstWithSparseFallback(
  params: FetchExtensionParams,
): Promise<{ fileCount: number; method: 'github-api' | 'git-sparse' }> {
  const destDir = path.resolve(params.destDir);
  const merged = { ...params, destDir };
  let apiMessage = '';
  try {
    const { fileCount } = await fetchRaycastExtensionDirectory(merged);
    return { fileCount, method: 'github-api' };
  } catch (e) {
    apiMessage = e instanceof Error ? e.message : String(e);
  }
  try {
    const { owner, repo } = parseRepoFullName(merged.repoFullName);
    const pathInRepo = merged.sourcePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const { fileCount } = await downloadGitFolder({
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      commit: merged.commit.trim(),
      pathInRepo,
      destDir: merged.destDir,
      requiredFile: 'package.json',
    });
    return { fileCount, method: 'git-sparse' };
  } catch (sparseErr) {
    const sparseMessage = sparseErr instanceof Error ? sparseErr.message : String(sparseErr);
    throw new Error(`GitHub API: ${apiMessage}；git sparse: ${sparseMessage}`);
  }
}
