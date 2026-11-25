---
type: feature
date: 2026-11-24
tags: [astronave, web, astro, mascotte]
---

# 003: Astro, il compagno delle chat

| Campo                | Valore                                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cosa fa              | Astronauta con un volto LED a puntini sulla visiera: è la faccia delle chat senza progetto                                                                                                                      |
| Dove si vede         | Sopra il titolo di ogni nuova chat (grande). Nella barra laterale accanto a "Astronave" c'è il logo a razzo (`AstronaveLogo`), non cliccabile                                                                   |
| Saluto               | Nelle chat senza progetto il titolo dice "Ciao, sono {nome}. Da dove partiamo?"                                                                                                                                 |
| Personalizza         | Bottone "Personalizza" sotto Astro, oppure Impostazioni > Astro: nome, tuta (9 colori), LED della visiera (5 colori), bocca                                                                                     |
| Salvataggio          | Per dispositivo, in localStorage (`astronave:astro`), con `onboarded` (manca nei dati vecchi = già fatto)                                                                                                       |
| Reazioni             | Occhi seguono il mouse solo in orizzontale; passaggio = sorriso grande; clic = "wow"; trascina = bocca ondulata; scrivere nella chat = parla                                                                    |
| Prestazioni          | Ridisegna solo quando cambia qualcosa; rispetta "riduci movimento"                                                                                                                                              |
| Codice               | `apps/web/src/astro/` (cervello puro in `astroBrain.ts`, RPC in `astroBrainFiles.ts`, volto puro in `astroFace.ts`, canvas in `astroFaceController.ts`, foto tute in `suits/`)                                  |
| Primo avvio          | Prima della schermata "Su cosa lavoriamo?": "Crea il tuo Astro" (aspetto + "Due righe su di te", che finiscono in `astro/USER.md`), poi "Avanti"                                                                |
| Impostazioni > Astro | Aspetto; "Chi è Astro" (ASTRO.md), "Cosa sa di te" (USER.md), "Memoria" (MEMORY.md) con Salva; "Abilità imparate" (lista apribile e modificabile)                                                               |
| Cervello di Astro    | Nella cartella `scratch` (madre di ogni chat senza progetto): `CLAUDE.md` e `AGENTS.md` gestiti dall'app (nome da prefs), `astro/ASTRO.md`, `USER.md`, `MEMORY.md`, `skills/INDEX.md`, `skills/<nome>/SKILL.md` |
| Come impara          | Le istruzioni in `CLAUDE.md` dicono ad Astro di salvare abilità, fatti sulla persona e memoria in `../astro/`. I file della persona non vengono mai sovrascritti                                                |
| Quando si aggiorna   | `syncAstroBrain()`: prima chat senza progetto della sessione, apertura di Impostazioni > Astro, fine del primo avvio, cambio nome. Errori solo nei log                                                          |
| File di T3 toccati   | `DraftHeroHeadline.tsx`, `SidebarChrome.tsx`, `NoProjectsHero.tsx`, nav delle impostazioni (vedi `ASTRONAVE.md`)                                                                                                |
