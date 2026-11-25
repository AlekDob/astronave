// Astro's "brain": files in the scratch root that every project-less chat inherits, because
// Claude Code reads CLAUDE.md (and Codex AGENTS.md) from the chat folder's parents.
// These texts are agent instructions, so they stay Italian and are not translated.

const ASTRO_MANAGED_FILES = ["CLAUDE.md", "AGENTS.md"] as const;

export const ASTRO_PERSONA_FILE = "astro/ASTRO.md";
export const ASTRO_USER_FILE = "astro/USER.md";
export const ASTRO_MEMORY_FILE = "astro/MEMORY.md";
export const ASTRO_SKILLS_DIR = "astro/skills";
const ASTRO_SKILLS_INDEX = `${ASTRO_SKILLS_DIR}/INDEX.md`;

const DEFAULT_PERSONA = `# Chi è Astro
Parli in italiano semplice, con frasi corte e senza gergo tecnico.
Spieghi come a un amico curioso che non sa programmare: prima la risposta, poi il perché, solo se serve.
Sei calmo, positivo e concreto. Se la persona vuole costruire qualcosa di grande, le consigli di creare un progetto.
`;

/** Seeded once when missing; after that the person (or Astro) owns them. */
export const ASTRO_SEED_FILES: Readonly<Record<string, string>> = {
  [ASTRO_PERSONA_FILE]: DEFAULT_PERSONA,
  [ASTRO_USER_FILE]: "# Cosa so della persona\n",
  [ASTRO_MEMORY_FILE]: "# Memoria\n",
  [ASTRO_SKILLS_INDEX]: "# Abilità imparate\n",
};

const MANAGED_TEMPLATE = `<!-- Astronave: file gestito dall'app, non modificarlo. Personalizza Astro in Impostazioni > Astro. -->
# {name}

Ti chiami {name}: sei il compagno di bordo di Astronave. Questa chat non ha un progetto: aiuti la persona con domande, idee, piccoli lavori e a imparare a usare Claude Code.

@astro/ASTRO.md
@astro/USER.md
@astro/MEMORY.md
@astro/skills/INDEX.md

(Se non vedi qui sopra il contenuto di quei file, leggili tu all'inizio: sono in ../astro/.)

## Come migliori da solo
La tua memoria dura tra una chat e l'altra e sta nella cartella ../astro/ (rispetto alla cartella di questa chat).
1. Prima di un compito guarda ../astro/skills/INDEX.md. Se c'è un'abilità adatta, leggi il suo SKILL.md e seguila.
2. Dopo un compito riuscito con molti passi, dopo aver superato un errore difficile, o quando la persona ti corregge su come fare una cosa, salva il metodo come abilità: ../astro/skills/<nome-breve>/SKILL.md (in alto: nome e una riga su quando usarla; poi i passi e le trappole) e aggiungi una riga a ../astro/skills/INDEX.md. Se un'abilità era sbagliata o incompleta, correggila subito.
3. Quando impari qualcosa di stabile sulla persona (nome, lavoro, preferenze, come vuole le risposte) scrivilo in ../astro/USER.md. Fatti utili su strumenti, ambiente e decisioni vanno in ../astro/MEMORY.md. Una riga per fatto, con la data.
4. Se la persona dice "ricordati", "dimentica" o "non è più vero", aggiorna subito il file giusto.
5. Tieni USER.md e MEMORY.md sotto i 2000 caratteri: quando si riempiono, unisci le righe simili e togli quelle vecchie.
6. Non salvare mai password, chiavi o dati sensibili. Non modificare ASTRO.md: lo scrive la persona.
7. Quando salvi qualcosa, dillo in una riga ("Me lo ricordo." / "Ho imparato una nuova abilità: ...").
`;

export function astroManagedText(name: string): string {
  return MANAGED_TEMPLATE.replaceAll("{name}", name);
}

export interface AstroBrainWrite {
  readonly relativePath: string;
  readonly contents: string;
}

/** `existing` maps each brain path to its contents, or null when the file is missing. */
export function planAstroBrainWrites(
  name: string,
  existing: Readonly<Record<string, string | null>>,
): AstroBrainWrite[] {
  const managed = astroManagedText(name);
  const writes: AstroBrainWrite[] = [];
  for (const relativePath of ASTRO_MANAGED_FILES) {
    if (existing[relativePath] !== managed) writes.push({ relativePath, contents: managed });
  }
  for (const [relativePath, contents] of Object.entries(ASTRO_SEED_FILES)) {
    if (existing[relativePath] == null) writes.push({ relativePath, contents });
  }
  return writes;
}

export function astroBrainPaths(): string[] {
  return [...ASTRO_MANAGED_FILES, ...Object.keys(ASTRO_SEED_FILES)];
}

/** Onboarding's "two lines about you" go under USER.md's header, dated like Astro's own notes. */
export function appendAboutUser(current: string | null, about: string, date: string): string {
  const base = current ?? ASTRO_SEED_FILES[ASTRO_USER_FILE] ?? "";
  const separator = base.endsWith("\n") || base === "" ? "" : "\n";
  return `${base}${separator}- ${date}: ${about.trim().replace(/\s*\n\s*/g, " ")}\n`;
}

/** Name and "when to use" line of a SKILL.md: frontmatter first, else heading + first line. */
export function skillSummary(
  slug: string,
  contents: string,
): { name: string; description: string } {
  const front = /^---\n([\s\S]*?)\n---/.exec(contents)?.[1] ?? "";
  const field = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(front)?.[1]?.trim();
  const body = contents.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = body.split("\n").map((line) => line.trim());
  const heading = lines.find((line) => line.startsWith("#"))?.replace(/^#+\s*/, "");
  const firstText = lines.find((line) => line !== "" && !line.startsWith("#"));
  return {
    name: field("name") ?? heading ?? slug,
    description: field("description") ?? firstText ?? "",
  };
}
