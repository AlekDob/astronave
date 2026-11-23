---
type: gotcha
date: 2026-11-23
tags: [astronave, icone, macos]
---

# 002: le icone si generano solo su Mac

**Sintomo.** `pnpm icons:export` fallisce sul VPS e anche sul Mac.

**Causa.** Lo script usa Icon Composer (solo macOS) e vuole la versione 2.x (Xcode 27). Sul MacBook c'è la 1.6 (Xcode 26.6).

**Soluzione.** Sul MacBook l'export usa la 1.6 tramite un wrapper temporaneo, non committato. `icons:check` segnala come diverse 18 icone dev/nightly: è normale, non le tocchiamo. La sorgente dell'icona è `assets/astronave/icon-source-1024.png`, quadrata con il fondo fino ai bordi: gli angoli li applica macOS.
