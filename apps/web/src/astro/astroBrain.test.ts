import { describe, expect, it } from "vite-plus/test";

import {
  addVersion,
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

const DATE = "2026-11-25";
const missing = () => Object.fromEntries(astroBrainPaths().map((path) => [path, null]));

describe("planAstroBrainWrites", () => {
  it("writes every file on a fresh scratch root, with the name filled in", () => {
    const writes = planAstroBrainWrites("Luna", missing(), DATE);
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
      { relativePath: "AGENTS.md", contents: astroManagedText("Luna") },
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
      { relativePath: ASTRO_PERSONA_FILE, contents: ASTRO_SEED_FILES[ASTRO_PERSONA_FILE] },
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

  it("writes the archive before shortening the memory, appending in order", () => {
    const existing = {
      ...Object.fromEntries(astroBrainPaths().map((path) => [path, "x"])),
      "CLAUDE.md": astroManagedText("Astro"),
      "AGENTS.md": astroManagedText("Astro"),
      [ASTRO_MEMORY_FILE]: memory,
      [ASTRO_MEMORY_ARCHIVE]: "# Archivio\n- vecchio\n",
    };
    const writes = planAstroBrainWrites("Astro", existing, DATE);
    expect(writes.map((write) => write.relativePath)).toEqual([
      ASTRO_MEMORY_ARCHIVE,
      ASTRO_MEMORY_FILE,
    ]);
    const archive = writes[0]?.contents ?? "";
    expect(archive.startsWith("# Archivio\n- vecchio\n<!-- spostate il 2026-11-25 -->\n")).toBe(
      true,
    );
    expect(contentLines(archive).length + contentLines(writes[1]?.contents ?? "").length).toBe(
      contentLines(memory).length + 2,
    );
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
