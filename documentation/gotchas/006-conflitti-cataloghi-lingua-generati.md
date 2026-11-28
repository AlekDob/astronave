---
type: gotcha
date: 2026-11-28
tags: [astronave, sync, i18n]
---

# 006: il sync va in conflitto sui cataloghi lingua (en, de, es...)

**Sintomo.** Il sync si ferma con conflitti solo in `apps/web/src/i18n/translations/*.json` (tutte le lingue tranne `it`).

**Causa.** Quei file sono generati da `gt generate`. Il commit di fine sync li aveva rigenerati con le nostre chiavi (plan mode, Astro...), e upstream li ha toccati lo stesso giorno.

**Soluzione.** Rifai il merge, poi per ogni file in conflitto `git checkout --theirs <file>` e `git add`. Commit del merge, poi `pnpm install --frozen-lockfile`, `vp run i18n:generate` in `apps/web` (rimette le nostre chiavi), togli da `it.json` le chiavi nuove uguali all'inglese (gotcha 005), `node scripts/astronave/translate-it.mjs`, `pnpm run i18n:check` e typecheck. Mai a mano: sono file generati.
