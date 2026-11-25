// Astro's "brain": files in the scratch root that every project-less chat inherits, because
// Claude Code reads CLAUDE.md (and Codex AGENTS.md) from the chat folder's parents.
// These texts are agent instructions, so they stay Italian and are not translated.

const ASTRO_MANAGED_FILES = ["CLAUDE.md", "AGENTS.md"] as const;

export const ASTRO_PERSONA_FILE = "astro/ASTRO.md";
export const ASTRO_USER_FILE = "astro/USER.md";
export const ASTRO_MEMORY_FILE = "astro/MEMORY.md";
export const ASTRO_SKILLS_DIR = "astro/skills";
const ASTRO_SKILLS_INDEX = `${ASTRO_SKILLS_DIR}/INDEX.md`;
export const ASTRO_USER_ARCHIVE = "astro/archivio/USER.md";
export const ASTRO_MEMORY_ARCHIVE = "astro/archivio/MEMORY.md";

/** Short memory (USER.md, MEMORY.md) is always loaded, so it must stay small. */
export const ASTRO_SHORT_MEMORY_LIMIT = 2000;

/** Short memory file -> its append-only archive, which CLAUDE.md does not import. */
const ASTRO_ARCHIVES: Readonly<Record<string, string>> = {
  [ASTRO_USER_FILE]: ASTRO_USER_ARCHIVE,
  [ASTRO_MEMORY_FILE]: ASTRO_MEMORY_ARCHIVE,
};

/** Files whose history the app keeps in `astro/versioni/`. */
export const ASTRO_VERSIONED_FILES = [
  ASTRO_PERSONA_FILE,
  ASTRO_USER_FILE,
  ASTRO_MEMORY_FILE,
  ASTRO_SKILLS_INDEX,
] as const;

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
  [ASTRO_USER_ARCHIVE]: "# Archivio: cosa so della persona\n",
  [ASTRO_MEMORY_ARCHIVE]: "# Archivio: memoria\n",
};

const MANAGED_TEMPLATE = `<!-- Astronave: file gestito dall'app, non modificarlo. Personalizza Astro in Impostazioni > Astro. -->
# {name}

Ti chiami {name}: sei il compagno di bordo di Astronave. Questa chat non ha un progetto: aiuti la persona con domande, idee, piccoli lavori e a imparare a usare Claude Code.

{memory}

## Due livelli di memoria
- Memoria corta: ../astro/USER.md e ../astro/MEMORY.md. La leggi sempre, quindi resta sotto i ${ASTRO_SHORT_MEMORY_LIMIT} caratteri.
- Archivio: ../astro/archivio/USER.md e ../astro/archivio/MEMORY.md. Non lo leggi all'inizio: lì finiscono le righe vecchie, e non si cancella mai niente.

## Come migliori da solo
La tua memoria dura tra una chat e l'altra e sta nella cartella ../astro/ (rispetto alla cartella di questa chat).
1. Prima di un compito guarda ../astro/skills/INDEX.md. Se c'è un'abilità adatta, leggi il suo SKILL.md e seguila.
2. Dopo un compito riuscito con molti passi, dopo aver superato un errore difficile, o quando la persona ti corregge su come fare una cosa, salva il metodo come abilità: ../astro/skills/<nome-breve>/SKILL.md (in alto: nome e una riga su quando usarla; poi i passi e le trappole) e aggiungi una riga a ../astro/skills/INDEX.md. Se un'abilità era sbagliata o incompleta, correggila subito.
3. Quando impari qualcosa di stabile sulla persona (nome, lavoro, preferenze, come vuole le risposte) scrivilo in ../astro/USER.md. Fatti utili su strumenti, ambiente e decisioni vanno in ../astro/MEMORY.md. Una riga per fatto, con la data.
4. Se la persona dice "ricordati", "dimentica" o "non è più vero", aggiorna subito il file giusto.
5. Quando USER.md o MEMORY.md sono quasi pieni, unisci le righe simili e sposta quelle vecchie o meno utili in fondo al file giusto in ../astro/archivio/, invece di cancellarle. Se non lo fai tu, l'app sposta da sola le righe più vecchie.
6. Se la persona ti chiede qualcosa che non trovi nella memoria corta, cerca in ../astro/archivio/ (per esempio con grep) prima di dire che non lo sai.
7. Prima di scrivere un file della memoria, rileggilo subito prima e cambia solo le righe che servono, con modifiche mirate: non riscrivere mai tutto il file. Un'altra chat potrebbe averlo appena cambiato.
8. Non salvare mai password, chiavi o dati sensibili. Non modificare ASTRO.md: lo scrive la persona.
9. Quando salvi qualcosa, dillo in una riga ("Me lo ricordo." / "Ho imparato una nuova abilità: ...").
`;

// Claude Code reads CLAUDE.md from the parent folder and expands these imports.
const CLAUDE_MEMORY = `@astro/ASTRO.md
@astro/USER.md
@astro/MEMORY.md
@astro/skills/INDEX.md

(Se non vedi qui sopra il contenuto di quei file, leggili tu all'inizio: sono in ../astro/.)
`;

// Other agents read AGENTS.md only from the chat folder (the server copies it there when the
// chat starts) and expand no imports, so the memory is written out in full.
const AGENTS_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ["Chi sei", ASTRO_PERSONA_FILE],
  ["Cosa sai della persona", ASTRO_USER_FILE],
  ["Memoria", ASTRO_MEMORY_FILE],
  ["Abilità imparate", ASTRO_SKILLS_INDEX],
];

function agentsMemory(existing: BrainContents): string {
  const sections = AGENTS_SECTIONS.map(([title, path]) => {
    const contents = existing[path] ?? ASTRO_SEED_FILES[path] ?? "";
    return `## ${title} (../${path})\n\n${contents.trim()}\n`;
  });
  const intro =
    "Qui sotto c'è la tua memoria com'era quando è iniziata questa chat. I file veri sono in ../astro/: se li cambi, rileggili da lì.\n";
  return [intro, ...sections].join("\n");
}

function fillManagedTemplate(name: string, memory: string): string {
  // A function replacer, so `$` in the person's notes is never read as a pattern.
  return MANAGED_TEMPLATE.replaceAll("{name}", name).replace("{memory}", () => memory);
}

/** CLAUDE.md: imports the memory files. */
export function astroManagedText(name: string): string {
  return fillManagedTemplate(name, CLAUDE_MEMORY);
}

/** AGENTS.md: self-contained, with the memory files' current text inlined. */
export function astroAgentsText(name: string, existing: BrainContents): string {
  return fillManagedTemplate(name, agentsMemory(existing));
}

/** Managed files are rewritten; seeds are written only if still missing right before. */
export interface AstroBrainWrite {
  readonly kind: "managed" | "seed";
  readonly relativePath: string;
  readonly contents: string;
}

/** Move the oldest short-memory lines to the archive; planned from `expected`. */
export interface AstroOverflowMove {
  readonly kind: "overflow";
  readonly shortPath: string;
  readonly archivePath: string;
  readonly expected: string;
  readonly kept: string;
  readonly moved: readonly string[];
  readonly date: string;
}

export type AstroBrainAction = AstroBrainWrite | AstroOverflowMove;

type BrainContents = Readonly<Record<string, string | null>>;

/**
 * `existing` maps each brain path to its contents, or null when the file is missing.
 * Managed files are planned apart (planManagedWrites), after these writes, since AGENTS.md
 * inlines their result.
 */
export function planAstroBrainWrites(existing: BrainContents, date: string): AstroBrainAction[] {
  const actions: AstroBrainAction[] = [];
  for (const [relativePath, contents] of Object.entries(ASTRO_SEED_FILES)) {
    if (existing[relativePath] == null) actions.push({ kind: "seed", relativePath, contents });
  }
  for (const shortPath of Object.keys(ASTRO_ARCHIVES)) {
    const move = planOverflow(shortPath, existing[shortPath] ?? null, date);
    if (move !== null) actions.push(move);
  }
  return actions;
}

/** CLAUDE.md / AGENTS.md, each rewritten only when its generated text changed. */
export function planManagedWrites(name: string, existing: BrainContents): AstroBrainWrite[] {
  const generated: Record<(typeof ASTRO_MANAGED_FILES)[number], string> = {
    "CLAUDE.md": astroManagedText(name),
    "AGENTS.md": astroAgentsText(name, existing),
  };
  return ASTRO_MANAGED_FILES.filter((path) => existing[path] !== generated[path]).map(
    (relativePath) => ({ kind: "managed", relativePath, contents: generated[relativePath] }),
  );
}

/** What planManagedWrites needs to read: the managed files and the memory AGENTS.md inlines. */
export function astroManagedPaths(): string[] {
  return [...ASTRO_MANAGED_FILES, ...AGENTS_SECTIONS.map(([, path]) => path)];
}

function planOverflow(
  shortPath: string,
  expected: string | null,
  date: string,
): AstroOverflowMove | null {
  const split = splitOverflow(expected, ASTRO_SHORT_MEMORY_LIMIT);
  if (split === null || expected === null) return null;
  const archivePath = ASTRO_ARCHIVES[shortPath] ?? "";
  return { kind: "overflow", shortPath, archivePath, expected, ...split, date };
}

/**
 * The archive text to write for a planned move, appended to what the archive holds now.
 * Null when the short file changed since planning: skip this round, the next sync retries.
 */
export function archiveForMove(
  move: AstroOverflowMove,
  currentShort: string | null,
  currentArchive: string | null,
): string | null {
  if (currentShort !== move.expected) return null;
  // Only blank lines left the file: the archive stays as it is.
  if (move.moved.length === 0) return currentArchive ?? "";
  const base = currentArchive ?? ASTRO_SEED_FILES[move.archivePath] ?? "";
  return appendToArchive(base, move.moved, move.date);
}

/**
 * Over the limit: keeps the leading `#` header and moves the oldest lines (right after it)
 * out until the rest fits. Null when nothing needs to move.
 */
export function splitOverflow(
  contents: string | null,
  limit: number,
): { kept: string; moved: string[] } | null {
  if (contents === null || contents.length <= limit) return null;
  const lines = contents.split("\n");
  let headerEnd = 0;
  while (headerEnd < lines.length && lines[headerEnd]?.startsWith("#")) headerEnd += 1;
  const header = lines.slice(0, headerEnd);
  const body = lines.slice(headerEnd);
  const moved: string[] = [];
  // The last item is the "" after a trailing newline: it stays so the file still ends with one.
  while (body.length > 1 && [...header, ...body].join("\n").length > limit) {
    moved.push(body.shift() ?? "");
  }
  const kept = [...header, ...body].join("\n");
  return moved.length === 0 ? null : { kept, moved: moved.filter((line) => line.trim() !== "") };
}

export function appendToArchive(archive: string, moved: readonly string[], date: string): string {
  const separator = archive === "" || archive.endsWith("\n") ? "" : "\n";
  return `${archive}${separator}<!-- spostate il ${date} -->\n${moved.join("\n")}\n`;
}

/** True when an archive holds more than its header. */
export function hasArchiveContent(contents: string | null): boolean {
  return (contents ?? "").split("\n").some((line) => line.trim() !== "" && !line.startsWith("#"));
}

// Versions: one JSONL file per tracked path, trimmed so the disk use stays bounded.
export const ASTRO_VERSION_LIMIT = 30;

export interface AstroVersion {
  readonly at: string;
  readonly content: string;
}

export function astroVersionsPath(relativePath: string): string {
  return `astro/versioni/${relativePath.replaceAll("/", "__")}.jsonl`;
}

/** Oldest first; broken lines (a half-written file) are skipped, not fatal. */
export function parseVersions(text: string | null): AstroVersion[] {
  const versions: AstroVersion[] = [];
  for (const line of (text ?? "").split("\n")) {
    if (line.trim() === "") continue;
    try {
      const value: unknown = JSON.parse(line);
      if (isAstroVersion(value)) versions.push({ at: value.at, content: value.content });
    } catch {
      // Skipped on purpose: one bad line must not hide the rest of the history.
    }
  }
  return versions;
}

function isAstroVersion(value: unknown): value is AstroVersion {
  if (typeof value !== "object" || value === null) return false;
  return (
    "at" in value &&
    typeof value.at === "string" &&
    "content" in value &&
    typeof value.content === "string"
  );
}

/** Null when `content` equals the latest version, so unchanged files add nothing. */
export function addVersion(
  versions: readonly AstroVersion[],
  content: string,
  at: string,
): AstroVersion[] | null {
  if (versions.at(-1)?.content === content) return null;
  return [...versions, { at, content }].slice(-ASTRO_VERSION_LIMIT);
}

export function serializeVersions(versions: readonly AstroVersion[]): string {
  return versions.map((version) => JSON.stringify(version)).join("\n") + "\n";
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

/**
 * Runs async jobs one after another, so two brain operations of this client never interleave
 * their reads and writes. A failed job does not stop the ones queued after it.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job);
    tail = run.catch(() => undefined);
    return run;
  };
}
