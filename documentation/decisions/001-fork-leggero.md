---
type: decision
date: 2026-11-23
tags: [astronave, strategia, upstream]
---

# 001: fork leggero, non prodotto pesante

**Scelta.** Astronave è T3 con nome, tema, icona e italiano. Il codice di T3 si tocca il meno possibile e ogni notte si allinea a upstream.

**Perché.** L'obiettivo di Alek è avere contatti e influenza in Italia, che portano clienti a Studio Futuro, non mantenere un editor. T3 cambia più di 100 volte a settimana: ogni riga toccata è un conflitto futuro.

**Scartate.**
- Fork profondo con funzioni nuove (missioni, diario, plancia alla Woday): troppo costo di manutenzione prima di sapere cosa serve davvero.
- Rinominare anche i nomi interni (`@t3tools/*`, `T3CODE_*`): migliaia di righe che nessuno vede, e il sync si romperebbe ogni notte.

**Regola.** Le aggiunte stanno in file nuovi (`scripts/astronave/`, `assets/astronave/`, `documentation/`). Ogni file upstream toccato va elencato in `ASTRONAVE.md`.
