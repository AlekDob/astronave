---
type: gotcha
date: 2026-11-23
tags: [astronave, desktop, macos, electron]
---

# 001: Astronave eredita cose da T3 installato

Sul Mac di Alek, dove T3 è installato, la prima build di Astronave aveva tre problemi.

| Sintomo | Causa | Soluzione |
|---|---|---|
| Interfaccia in inglese anche con il Mac in italiano | Al primo avvio importa le impostazioni dal profilo di T3 (`~/Library/Application Support/t3code`), compresa la lingua `en` | Import del profilo T3 disattivato per Astronave |
| Ancora inglese | La build conteneva solo `en.lproj`, quindi macOS diceva all'app "inglese" | Aggiunto `it` alle lingue del bundle macOS |
| Richiesta della password del portachiavi "t3code Safe Storage" | Electron prende il nome del portachiavi dal `name` del package.json della build (`t3code`), e `app.setName` arriva troppo tardi | `name` della build = `astronave` |
| Dati condivisi con T3 | La cartella dati predefinita era `~/.t3` | `~/.astronave` (desktop, in `DesktopStatePaths.ts`) |

Anche la lingua predefinita nelle impostazioni era `en`: ora è `it` (`packages/contracts/src/settings.ts`).

**Verifica.** Primo avvio pulito: 0 file aperti in `~/.t3`, server sulla porta 3774 (T3 usa la 3773).
