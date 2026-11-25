---
type: gotcha
date: 2026-11-25
tags: [astronave, dev, t3-home]
---

# 004: `vp run dev` in this checkout uses the real `~/.t3`

**Symptom.** The dev runner logs `baseDir=/home/ubuntu/.t3`. The test app shows real threads, and scratch files land in the live T3 home.

**Cause.** This repo is the main checkout, not a worktree, so the dev runner has no worktree `.t3` to fall back on and uses the default home. Pointing `T3CODE_HOME` at `<repo>/.t3` does not help either: scratch (project-less) chats turn off when the T3 home is inside a Git repo.

**Fix.** Always start dev with a home outside the repo, and without auto-adding the repo as a project when testing first-launch screens:

```
T3CODE_HOME=<scratchpad>/t3home node scripts/dev-runner.ts dev --auto-bootstrap-project-from-cwd=false
```

Check the `baseDir=` line before opening the preview.
