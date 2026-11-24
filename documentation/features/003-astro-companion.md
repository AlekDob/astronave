---
type: feature
date: 2026-11-24
tags: [astronave, web, astro, mascotte]
---

# 003: Astro, il compagno delle chat

| Campo                     | Valore                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cosa fa                   | Astronauta con un volto LED a puntini sulla visiera: è la faccia delle chat senza progetto                                                   |
| Dove si vede              | Sopra il titolo di ogni nuova chat (grande) e accanto a "Astronave" nella barra laterale (tondo)                                             |
| Saluto                    | Nelle chat senza progetto il titolo dice "Ciao, sono {nome}. Da dove partiamo?"                                                              |
| Personalizza              | Bottone "Personalizza" sotto Astro: nome, tuta (9 colori), LED della visiera (5 colori), bocca (Come il sito, Spessa, Piccola, Nessuna)      |
| Salvataggio               | Per dispositivo, in localStorage (`astronave:astro`)                                                                                         |
| Reazioni                  | Occhi seguono il mouse solo in orizzontale; passaggio = sorriso grande; clic = "wow"; trascina = bocca ondulata; scrivere nella chat = parla |
| Stati (barra laterale)    | Lavora (barra che scorre) se una chat sta lavorando; Ti aspetta se una chat chiede approvazione o una risposta; altrimenti A riposo          |
| Clic sulla barra laterale | Apre una nuova chat senza progetto                                                                                                           |
| Prestazioni               | Ridisegna solo quando cambia qualcosa; unica animazione continua = barra "lavora" (8 passi/s); rispetta "riduci movimento"                   |
| Codice                    | `apps/web/src/astro/` (volto puro in `astroFace.ts`, canvas in `astroFaceController.ts`, foto tute in `suits/`)                              |
| File di T3 toccati        | `DraftHeroHeadline.tsx`, `SidebarChrome.tsx` (vedi `ASTRONAVE.md`)                                                                           |
