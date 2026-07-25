#!/usr/bin/env bash
# publish.sh — 每日发布：同步快照 → 构建 → 推送 dist/ 到 gh-pages 分支
# 由 MOSIQ 每日快照 Automation 调用；需 github.com 推送凭据（osxkeychain）。
set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT="/Users/grace/Documents/kimi/workspace/macro-risk-system/outputs/snapshot.json"
PUBLISH_DIR="$SITE_DIR/.publish-tmp"

cp "$SNAPSHOT" "$SITE_DIR/public/data/snapshot.json"
cd "$SITE_DIR"
npm run build

rm -rf "$PUBLISH_DIR"
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add --force "$PUBLISH_DIR" gh-pages >/dev/null
else
  git worktree add --force --detach "$PUBLISH_DIR" >/dev/null
  (cd "$PUBLISH_DIR" && git checkout --orphan gh-pages && git rm -rf . >/dev/null 2>&1 || true)
fi

rsync -a --delete --exclude ".git" "$SITE_DIR/dist/" "$PUBLISH_DIR/"
cd "$PUBLISH_DIR"
git add -A
if git diff --cached --quiet; then
  echo "publish: no changes"
else
  git -c user.name="MOSIQ Daily" -c user.email="daily@mosiq.local" \
    commit -q -m "snapshot $(date +%F)"
  echo "publish: committed"
fi
GIT_TERMINAL_PROMPT=0 git push -f origin gh-pages
cd "$SITE_DIR"
git worktree remove --force "$PUBLISH_DIR"
echo "publish: done"
