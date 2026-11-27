---
type: gotcha
date: 2026-11-27
tags: [astronave, sync, git, i18n]
---

# 005: centinaia di conflitti su file che Astronave non tocca

**Sintomo.** Il sync si ferma con molti conflitti (191 il 27/11) anche su file mai toccati da noi, compresi "deleted in HEAD and modified in upstream".

**Causa.** Un merge precedente (`ddc32c2b9c`, 24/11) aveva due genitori ma il contenuto quasi tutto "nostro": 318 commit di T3 risultavano uniti ma i loro file erano tornati vecchi (probabile effetto del clone parziale, gotcha 003). Git li considera già uniti, quindi non li rimette mai e ogni merge dopo va in conflitto.

**Come accorgersene.** `git diff --stat $(git merge-base HEAD upstream/main) HEAD -- . ':!documentation'` deve mostrare solo i file di ASTRONAVE.md. Se sono centinaia, il merge precedente ha perso upstream.

**Soluzione.** Worktree da `upstream/main`, `git cherry-pick -x` dei nostri commit (`git log --first-parent --no-merges <merge-base>..main`), poi su main un merge con quell'albero: `git commit-tree <tree> -p main -p upstream/main` + `git merge --ff-only`. Niente force-push.

**Trappola i18n.** `gt generate` riempie le chiavi nuove di `it.json` col testo inglese, così `translate-it.mjs` non le vede. Dopo la generazione togli da `it.json` le chiavi nuove uguali all'inglese e rilancia lo script.
