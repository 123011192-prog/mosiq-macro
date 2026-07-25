#!/usr/bin/env bash
# publish.sh — 每日发布：同步快照 → 构建 → GitHub Pages（镜像）+ Cloudflare Pages（主站）
# 由 MOSIQ 每日快照 Automation 调用；凭据位于 ~/.config/mosiq/（不入库）。
set -euo pipefail

SITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT="/Users/grace/Documents/kimi/workspace/macro-risk-system/outputs/snapshot.json"
PUBLISH_DIR="$SITE_DIR/.publish-tmp"

# 本机代理（Clash 等）若在运行则走代理，否则直连
if nc -z 127.0.0.1 7890 2>/dev/null; then
  export https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890
fi

cp "$SNAPSHOT" "$SITE_DIR/public/data/snapshot.json"
cd "$SITE_DIR"
npm run build

# ── GitHub Pages（备份镜像）────────────────────────────
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
  echo "github: no changes"
else
  git -c user.name="MOSIQ Daily" -c user.email="daily@mosiq.local" \
    commit -q -m "snapshot $(date +%F)"
  echo "github: committed"
fi
GIT_TERMINAL_PROMPT=0 git push -f origin gh-pages
cd "$SITE_DIR"
git worktree remove --force "$PUBLISH_DIR"

# ── Cloudflare Pages（国内主站）────────────────────────
set -a
# shellcheck source=/dev/null
source "$HOME/.config/mosiq/cloudflare"
set +a
npx --no-install wrangler pages deploy dist \
  --project-name=mosiq-macro --branch=main --commit-dirty=true 2>&1 | tail -3

echo "publish: done"
