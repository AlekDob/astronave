import { describe, expect, it } from "vite-plus/test";

import {
  addVersion,
  archiveForMove,
  createSerialQueue,
  appendAboutUser,
  appendToArchive,
  ASTRO_MEMORY_ARCHIVE,
  ASTRO_MEMORY_FILE,
  ASTRO_SHORT_MEMORY_LIMIT,
  ASTRO_VERSION_LIMIT,
  astroVersionsPath,
  parseVersions,
  serializeVersions,
  splitOverflow,
  ASTRO_PERSONA_FILE,
  ASTRO_SEED_FILES,
  ASTRO_USER_FILE,
  astroBrainPaths,
  astroAgentsText,
  astroManagedText,
  planManagedWrites,
  planAstroBrainWrites,
  skillSummary,
} from "./astroBrain";
import { withoutPendingAbout } from "./astroPrefs";

const DATE = "2026-11-25";
const missing = () => Object.fromEntries(astroBrainPaths().map((path) => [path, null]));

describe("planAstroBrainWrites", () => {
  it("seeds every user file on a fresh scratch root", () => {
    const writes = planAstroBrainWrites(missing(), DATE).filter(
      (action) => action.kind !== "overflow",
    );
    expect(writes.map((write) => write.relativePath).toSorted()).toEqual(
      Object.keys(ASTRO_SEED_FILES).toSorted(),
    );
  });

  it("seeds only the missing user file", () => {
    const existing = {
      ...Object.fromEntries(astroBrainPaths().map((path) => [path, "x"])),
      "CLAUDE.md": astroManagedText("Astro"),
      "AGENTS.md": astroManagedText("Astro"),
      [ASTRO_PERSONA_FILE]: null,
    };
    expect(planAstroBrainWrites(existing, DATE)).toEqual([
      {
        kind: "seed",
        relativePath: ASTRO_PERSONA_FILE,
        contents: ASTRO_SEED_FILES[ASTRO_PERSONA_FILE],
      },
    ]);
  });
});

describe("planManagedWrites", () => {
  const memory = {
    [ASTRO_PERSONA_FILE]: "# Chi è Astro\nParla piano.\n",
    [ASTRO_USER_FILE]: "# Persona\n- ama il $ e i {name}\n",
  };

  it("fills the name in CLAUDE.md, which imports the memory", () => {
    const claude = astroManagedText("Luna");
    expect(claude.startsWith("<!-- Astronave:")).toBe(true);
    expect(claude).toContain("# Luna\n");
    expect(claude).toContain("Ti chiami Luna:");
    expect(claude).toContain("@astro/USER.md");
    expect(claude).not.toContain("{name}");
  });

  it("makes AGENTS.md self-contained: memory inlined, no imports, paths for the chat folder", () => {
    const agents = astroAgentsText("Luna", memory);
    expect(agents).toContain("Ti chiami Luna:");
    expect(agents).toContain("## Chi sei (../astro/ASTRO.md)\n\n# Chi è Astro\nParla piano.\n");
    expect(agents).toContain("- ama il $ e i {name}");
    expect(agents).toContain(ASTRO_SEED_FILES[ASTRO_MEMORY_FILE]?.trim() ?? "");
    expect(agents).not.toContain("@astro/");
    expect(agents).toContain("../astro/skills/INDEX.md");
  });

  it("rewrites a managed file only when its generated text changed", () => {
    const current = {
      ...memory,
      "CLAUDE.md": astroManagedText("Luna"),
      "AGENTS.md": astroAgentsText("Luna", memory),
    };
    expect(planManagedWrites("Luna", current)).toEqual([]);
    const edited = { ...current, [ASTRO_USER_FILE]: "# Persona\n- nuovo\n" };
    expect(planManagedWrites("Luna", edited)).toEqual([
      { kind: "managed", relativePath: "AGENTS.md", contents: astroAgentsText("Luna", edited) },
    ]);
    expect(planManagedWrites("Sole", current).map((write) => write.relativePath)).toEqual([
      "CLAUDE.md",
      "AGENTS.md",
    ]);
  });
});

describe("appendAboutUser", () => {
  it("adds one dated line under the header", () => {
    expect(appendAboutUser(null, "Faccio la maestra.\nAmo i gatti.", "2026-11-25")).toBe(
      `${ASTRO_SEED_FILES[ASTRO_USER_FILE]}- 2026-11-25: Faccio la maestra. Amo i gatti.\n`,
    );
    expect(appendAboutUser("# Note", "Ciao", "2026-11-25")).toBe("# Note\n- 2026-11-25: Ciao\n");
  });
});

describe("skillSummary", () => {
  it("reads frontmatter, then heading and first line, then the slug", () => {
    expect(skillSummary("a", "---\nname: Mail\ndescription: Per scrivere mail\n---\n# X")).toEqual({
      name: "Mail",
      description: "Per scrivere mail",
    });
    expect(skillSummary("a", "# Foto\nQuando servono foto.\n\n1. passo")).toEqual({
      name: "Foto",
      description: "Quando servono foto.",
    });
    expect(skillSummary("slug", "")).toEqual({ name: "slug", description: "" });
  });
});

const contentLines = (text: string) =>
  text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("<!--"));

describe("splitOverflow", () => {
  const memory = `# Memoria\n${Array.from({ length: 80 }, (_, i) => `- fatto numero ${i} da ricordare`).join("\n")}\n`;

  it("keeps the header, moves the oldest lines and loses none", () => {
    const split = splitOverflow(memory, ASTRO_SHORT_MEMORY_LIMIT);
    expect(split).not.toBeNull();
    if (split === null) return;
    expect(split.kept.length).toBeLessThanOrEqual(ASTRO_SHORT_MEMORY_LIMIT);
    expect(split.kept.startsWith("# Memoria\n- fatto numero ")).toBe(true);
    expect(split.kept.endsWith("\n")).toBe(true);
    expect(split.moved[0]).toBe("- fatto numero 0 da ricordare");
    expect([...split.moved, ...contentLines(split.kept)].toSorted()).toEqual(
      contentLines(memory).toSorted(),
    );
  });

  it("does nothing under the limit", () => {
    expect(splitOverflow("# Memoria\n- uno\n", ASTRO_SHORT_MEMORY_LIMIT)).toBeNull();
    expect(splitOverflow(null, ASTRO_SHORT_MEMORY_LIMIT)).toBeNull();
  });

  it("plans a move that appends to the current archive and loses no line", () => {
    const existing = {
      ...Object.fromEntries(astroBrainPaths().map((path) => [path, "x"])),
      "CLAUDE.md": astroManagedText("Astro"),
      "AGENTS.md": astroManagedText("Astro"),
      [ASTRO_MEMORY_FILE]: memory,
    };
    const [move] = planAstroBrainWrites(existing, DATE);
    if (move?.kind !== "overflow") throw new Error("expected an overflow move");
    expect(move.archivePath).toBe(ASTRO_MEMORY_ARCHIVE);
    // The archive is re-read right before writing: a line Astro added meanwhile is kept.
    const archive = archiveForMove(move, memory, "# Archivio\n- vecchio\n- nuovo\n") ?? "";
    expect(
      archive.startsWith("# Archivio\n- vecchio\n- nuovo\n<!-- spostate il 2026-11-25 -->\n"),
    ).toBe(true);
    expect(contentLines(archive).length + contentLines(move.kept).length).toBe(
      contentLines(memory).length + 3,
    );
  });

  it("skips the move when the memory changed since planning", () => {
    const move = planAstroBrainWrites({ [ASTRO_MEMORY_FILE]: memory }, DATE).find(
      (action) => action.kind === "overflow",
    );
    if (move?.kind !== "overflow") throw new Error("expected an overflow move");
    expect(archiveForMove(move, `${memory}- appena scritto\n`, null)).toBeNull();
  });

  it("appendToArchive adds a dated block", () => {
    expect(appendToArchive("# A", ["- uno", "- due"], DATE)).toBe(
      "# A\n<!-- spostate il 2026-11-25 -->\n- uno\n- due\n",
    );
  });
});

describe("versions", () => {
  it("records only changes and keeps the last 30", () => {
    expect(addVersion([], "a", "t0")).toEqual([{ at: "t0", content: "a" }]);
    expect(addVersion([{ at: "t0", content: "a" }], "a", "t1")).toBeNull();
    const many = Array.from({ length: ASTRO_VERSION_LIMIT }, (_, i) => ({
      at: `t${i}`,
      content: `v${i}`,
    }));
    const next = addVersion(many, "new", "tn") ?? [];
    expect(next).toHaveLength(ASTRO_VERSION_LIMIT);
    expect(next[0]?.content).toBe("v1");
    expect(next.at(-1)).toEqual({ at: "tn", content: "new" });
  });

  it("round-trips JSONL and skips broken lines", () => {
    const versions = [{ at: "t0", content: 'riga\n"due"' }];
    expect(parseVersions(`${serializeVersions(versions)}{broken\n`)).toEqual(versions);
    expect(parseVersions(null)).toEqual([]);
    expect(astroVersionsPath("astro/skills/x/SKILL.md")).toBe(
      "astro/versioni/astro__skills__x__SKILL.md.jsonl",
    );
  });
});

describe("createSerialQueue", () => {
  it("runs jobs one at a time, in order, even after a failure", async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    let markStarted = () => {};
    const started = new Promise<void>((resolve) => (markStarted = resolve));
    const first = enqueue(async () => {
      log.push("a:start");
      markStarted();
      await gate;
      log.push("a:end");
      throw new Error("boom");
    });
    const second = enqueue(async () => {
      log.push("b");
      return 2;
    });
    await started;
    expect(log).toEqual(["a:start"]);
    release();
    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe(2);
    expect(log).toEqual(["a:start", "a:end", "b"]);
  });
});

describe("withoutPendingAbout", () => {
  const base = { name: "Astro", suit: "blu", led: "ciano", mouth: "sito" } as const;
  it("clears the queued text only when it is the one appended", () => {
    expect(withoutPendingAbout({ ...base, pendingAbout: "ciao" }, "ciao")).toEqual(base);
    const newer = { ...base, pendingAbout: "altro" };
    expect(withoutPendingAbout(newer, "ciao")).toBe(newer);
  });
});
