---
type: index
date: 2026-11-23
tags: [astronave, index]
---

# Astronave: mappa

Questa mappa copre solo il livello Astronave. Per il codice di T3 parti da `AGENTS.md`, `CLAUDE.md` e `docs/` alla radice (sono di upstream: non modificarli).

| Dove | Cosa | Note |
|---|---|---|
| `ASTRONAVE.md` | Regole del fork, elenco dei file upstream toccati e perché | Aggiornalo a ogni file upstream che tocchi |
| `scripts/astronave/translate-it.mjs` | Traduce in italiano le chiavi mancanti di web e desktop con `claude -p` | `--all`, `--app web\|desktop`, `--check [--fix]` |
| `scripts/astronave/sync-upstream.sh` | Merge notturno di `upstream/main`, traduzioni, controlli, push | Lanciato dal task T3 "Astronave: allinea a T3 ogni notte" (03:30, VPS) |
| `apps/web/src/i18n/translations/it.json` | Catalogo italiano web (~10.200 chiavi) | Generato, non scrivere a mano |
| `apps/desktop/src/i18n/translations/it.json` | Catalogo italiano desktop | Generato |
| `packages/contracts/src/settings.ts` | Lingua predefinita `it` | Una riga |
| `packages/shared/src/themePalettes.ts` | Tema `ASTRONAVE_THEME` (accento `#2433FF`) | |
| `assets/astronave/icon-source-1024.png` | Sorgente dell'icona (razzo 3D, Higgsfield) | Le icone finali si generano su Mac (Icon Composer) |
| `documentation/` | Memoria del progetto (metodo Quack) | diario, decisioni, trappole, feature |

## Dove lavora cosa

| Macchina | Ruolo |
|---|---|
| VPS `~/projects/astronave` | Sync notturno, traduzioni, modifiche al codice |
| MacBook `~/Desktop/Dev/Personal/astronave` | Icone (Icon Composer), build firmata e notarizzata `.dmg` |
| iMac Omarchy (`ssh alek@omarchy`) | Build Linux (AppImage), da fare |
