import * as Schema from "effect/Schema";
import { msg } from "gt-react";

import { useLocalStorage } from "~/hooks/useLocalStorage";
import suitArancio from "./suits/suit-arancio.webp";
import suitBianco from "./suits/suit-bianco.webp";
import suitBlu from "./suits/suit-blu.webp";
import suitGiallo from "./suits/suit-giallo.webp";
import suitNero from "./suits/suit-nero.webp";
import suitRosa from "./suits/suit-rosa.webp";
import suitRosso from "./suits/suit-rosso.webp";
import suitVerde from "./suits/suit-verde.webp";
import suitViola from "./suits/suit-viola.webp";

/** Visor boxes are measured on each 1024 px suit photo. */
export const ASTRO_SUITS = {
  bianco: { label: msg("White"), color: "#F2F2F2", src: suitBianco, visor: [258, 117, 511, 446] },
  blu: { label: msg("Blue"), color: "#2433FF", src: suitBlu, visor: [257, 106, 512, 457] },
  arancio: {
    label: msg("Orange"),
    color: "#FF7A1A",
    src: suitArancio,
    visor: [257, 116, 511, 447],
  },
  rosso: { label: msg("Red"), color: "#E01E2B", src: suitRosso, visor: [257, 105, 512, 459] },
  verde: { label: msg("Green"), color: "#0F8F4A", src: suitVerde, visor: [252, 107, 518, 456] },
  giallo: { label: msg("Yellow"), color: "#FFC61A", src: suitGiallo, visor: [257, 116, 511, 446] },
  viola: { label: msg("Purple"), color: "#7A2BE2", src: suitViola, visor: [252, 107, 518, 456] },
  rosa: { label: msg("Pink"), color: "#FF2E93", src: suitRosa, visor: [257, 107, 513, 456] },
  nero: { label: msg("Black"), color: "#2B2B2E", src: suitNero, visor: [251, 106, 518, 457] },
} as const;

export const ASTRO_LEDS = {
  "bianco-blu": { label: msg("Blue white"), color: "#DDE8FF" },
  ciano: { label: msg("Cyan"), color: "#5CF2FF" },
  verde: { label: msg("Green"), color: "#6CFFA8" },
  ambra: { label: msg("Amber"), color: "#FFB547" },
  rosa: { label: msg("Pink"), color: "#FF7AC6" },
} as const;

export const ASTRO_MOUTHS = {
  sito: msg("Like the website"),
  spessa: msg("Thick", { $context: "mouth style" }),
  piccola: msg("Small", { $context: "mouth style" }),
  nessuna: msg("None", { $context: "mouth style" }),
} as const;

export const keysOf = <K extends string>(record: Record<K, unknown>) => Object.keys(record) as K[];

const AstroPrefsSchema = Schema.Struct({
  name: Schema.String,
  suit: Schema.Literals(keysOf(ASTRO_SUITS)),
  led: Schema.Literals(keysOf(ASTRO_LEDS)),
  mouth: Schema.Literals(keysOf(ASTRO_MOUTHS)),
});
export type AstroPrefs = typeof AstroPrefsSchema.Type;

const DEFAULT_NAME = "Astro";
const DEFAULT_PREFS: AstroPrefs = {
  name: DEFAULT_NAME,
  suit: "blu",
  led: "bianco-blu",
  mouth: "sito",
};

/** Per device, like the theme: Astro's look is a personal taste, not account data. */
export function useAstroPrefs() {
  return useLocalStorage("astronave:astro", DEFAULT_PREFS, AstroPrefsSchema);
}

export function astroDisplayName(prefs: AstroPrefs): string {
  return prefs.name.trim() || DEFAULT_NAME;
}
