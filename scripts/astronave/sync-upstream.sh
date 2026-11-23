#!/usr/bin/env bash
# Nightly sync: merge pingdotgg/t3code into Astronave, refill Italian strings, check, push.
# Merge (not rebase) so origin/main history is never rewritten and the nightly push stays a fast-forward.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Refuse to run on a dirty tree: a failed merge abort must not eat local work.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "sync-upstream: working tree is not clean, aborting." >&2
  exit 1
fi

git checkout main
git pull --ff-only origin main
git fetch upstream main

if ! git merge --no-edit upstream/main; then
  echo "sync-upstream: merge conflicts in:" >&2
  git diff --name-only --diff-filter=U >&2
  git merge --abort
  exit 1
fi

# The lockfile may have moved upstream; the shared pnpm store keeps this cheap.
pnpm install --frozen-lockfile

# Fill Italian keys for any new English strings upstream added.
node scripts/astronave/translate-it.mjs

# Cheapest checks that catch a broken merge: catalogs in sync, and typecheck of the packages we patch.
pnpm run i18n:check
for pkg in packages/shared apps/web apps/desktop apps/server; do
  (cd "$pkg" && pnpm exec vp run typecheck)
done

if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "chore(i18n): fill Italian translations after upstream sync"
fi

git push origin main
