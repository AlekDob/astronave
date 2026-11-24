---
type: gotcha
date: 2026-11-24
tags: [astronave, sync, git]
---

# 003: il sync fallisce con "not our ref" / "could not fetch ... from promisor remote"

**Sintomo.** `sync-upstream.sh` si ferma al merge con `upload-pack: not our ref` e dice "merge conflicts in:" senza elencare file. Può lasciare un file cancellato a metà.

**Causa.** Il checkout sul VPS è un clone parziale (`blob:none`): i file mancanti li chiede solo a `origin` (AlekDob/astronave), che non ha ancora i file nuovi di T3.

**Soluzione.** Una volta per checkout:
`git config remote.upstream.promisor true && git config remote.upstream.partialclonefilter blob:none`.
Poi `git checkout -- .` per ripristinare i file toccati e rilanciare lo script.

**Altra trappola, conflitti risolti a mano.** Il commit si rompe se il messaggio arriva vuoto (`--no-edit` dopo che l'hook pre-commit ha girato): lo stato di merge sparisce e nasce un commit con un solo genitore. Usa sempre `git commit -m "..."` e controlla con `git log -1 --format=%P` che i genitori siano due.
