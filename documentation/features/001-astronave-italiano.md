---
type: feature
date: 2026-11-23
tags: [astronave, i18n]
---

# 001: Astronave in italiano

| Campo | Valore |
|---|---|
| Cosa fa | Interfaccia in italiano per i nuovi utenti, "Astronave" al posto di "T3 Code" |
| Cataloghi | `apps/web/src/i18n/translations/it.json`, `apps/desktop/src/i18n/translations/it.json` |
| Script | `scripts/astronave/translate-it.mjs` (traduce solo le chiavi mancanti) |
| Predefinito | `packages/contracts/src/settings.ts` (`language: "it"`), lingue del bundle macOS |
| Selettore lingua | `packages/client-runtime/src/locales.ts` (`it: "Italiano"`) |
| Aggiornamento | Ogni notte `sync-upstream.sh` traduce le chiavi nuove di T3 |
| Stile | "Tu", frasi semplici, termini tecnici noti in inglese (commit, branch, prompt) |
