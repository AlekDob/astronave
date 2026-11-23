---
type: decision
date: 2026-11-23
tags: [astronave, plan-mode, composer, upstream]
---

# 002: plan mode minimo, senza annullare il commit di T3

**Scelta.** Rimettiamo solo la scelta della modalità (bozza → `interactionMode` all'invio), `Shift+Tab` e un chip "Piano". Niente bottone "Implementa", niente `/plan`.

**Perché.** T3 ha tolto il plan mode il 2026-11-08 (PR #33131, commit `521ac7c218`) perché l'interfaccia creava bug, ma il server lo supporta ancora. Il codice nuovo sta in file nostri (`useComposerPlanMode.ts`, `ComposerPlanModeChip.tsx`); nei file di T3 ci sono solo pochi agganci, così il sync notturno dà meno conflitti.

**Scartato.** Annullare il commit di T3: rimette circa 1.900 righe nel composer, che T3 cambia spesso, e quindi conflitti a ogni sync.

**Per uscire dal piano.** `Shift+Tab` o clic sul chip, poi il messaggio parte in modalità normale.
