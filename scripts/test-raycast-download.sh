#!/bin/bash
# --- 由调用方传入（示例） ---
REPO_URL="https://github.com/raycast/extensions.git"
COMMIT="2345b99cc63cd67f506a5b9dc29e81bb0cb80e78"
SPARSE_PATH="extensions/1-click-confetti"
WORKDIR="$(mktemp -d)"
cd "$WORKDIR" || exit 1
echo "Working directory: $WORKDIR"
export GIT_TERMINAL_PROMPT=0
git init --quiet
git remote add origin "$REPO_URL"
# 稀疏检出：不要用 cone。cone 会在 sparse-checkout 里写入「/*」规则，强制检出仓库根下所有文件（README.md 等）。
# 使用非 cone + 单一路径，根目录文件仅在索引里标记 skip-worktree，不会落到工作区。
SPARSE_PATTERN="/${SPARSE_PATH#/}"
SPARSE_PATTERN="${SPARSE_PATTERN%/}/"
git sparse-checkout init --no-cone
git sparse-checkout set "$SPARSE_PATTERN"
# 只取指定提交的一层深度（不克隆整仓历史）
git fetch --depth=1 --filter=tree:0 origin "$COMMIT"
# FETCH_HEAD 即刚拉下来的那一个提交
git checkout --quiet FETCH_HEAD