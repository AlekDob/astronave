---
type: feature
date: 2026-11-23
tags: [astronave, upstream, automazione]
---

# 002: allineamento notturno a T3

| Campo | Valore |
|---|---|
| Cosa fa | Porta dentro le novità di T3 ogni notte senza perdere il brand |
| Quando | 03:30, task T3 "Astronave: allinea a T3 ogni notte" sul VPS (progetto Astronave) |
| Script | `scripts/astronave/sync-upstream.sh` |
| Passi | fetch upstream, merge (no rebase), `translate-it.mjs`, controlli i18n e typecheck, commit, push su `origin/main` |
| Conflitto | L'agente prova a risolverlo; se non è sicuro annulla, non pubblica e avvisa |
| Regole | Mai force-push, mai toccare `LICENSE` |
