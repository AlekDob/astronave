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
  astroManagedText,
  planAstroBrainWrites,
  skillSummary,
} from "./astroBrain";
import { withoutPendingAbout } from "./astroPrefs";

const DATE = "2026-11-25";
const missing = () => Object.fromEntries(astroBrainPaths().map((path) => [path, null]));

describe("planAstroBrainWrites", () => {
  it("writes every file on a fresh scratch root, with the name filled in", () => {
    const writes = planAstroBrainWrites("Luna", missing(), DATE).filter(
      (action) => action.kind !== "overflow",
    );
    expect(writes.map((write) => write.relativePath).toSorted()).toEqual(
      astroBrainPaths().toSorted(),
    );
    const claude = writes.find((write) => write.relativePath === "CLAUDE.md")?.contents ?? "";
    expect(claude).toContain("# Luna\n");
    expect(claude).toContain("Ti chiami Luna:");
    expect(claude).not.toContain("{name}");
    expect(claude.startsWith("<!-- Astronave:")).toBe(true);
  });

  it("rewrites managed files only when they differ, and never touches existing user files", () => {
    const existing = {
      ...Object.fromEntries(Object.keys(ASTRO_SEED_FILES).map((path) => [path, "mine"])),
      "CLAUDE.md": astroManagedText("Luna"),
      "AGENTS.md": "edited by hand",
    };
    expect(planAstroBrainWrites("Luna", existing, DATE)).toEqual([
      { kind: "managed", relativePath: "AGENTS.md", contents: astroManagedText("Luna") },
    ]);
  });

  it("seeds only the missing user file", () => {
    const existing = {
      ...Object.fromEntries(astroBrainPaths().map((path) => [path, "x"])),
      "CLAUDE.md": astroManagedText("Astro"),
      "AGENTS.md": astroManagedText("Astro"),
      [ASTRO_PERSONA_FILE]: null,
    };
    expect(planAstroBrainWrites("Astro", existing, DATE)).toEqual([
      {
        kind: "seed",
        relativePath: ASTRO_PERSONA_FILE,
        contents: ASTRO_SEED_FILES[ASTRO_PERSONA_FILE],
      },
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
    const [move] = planAstroBrainWrites("Astro", existing, DATE);
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
    const move = planAstroBrainWrites("Astro", { [ASTRO_MEMORY_FILE]: memory }, DATE).find(
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
