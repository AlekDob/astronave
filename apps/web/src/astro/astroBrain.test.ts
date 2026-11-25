import { describe, expect, it } from "vite-plus/test";

import {
  appendAboutUser,
  ASTRO_PERSONA_FILE,
  ASTRO_SEED_FILES,
  ASTRO_USER_FILE,
  astroBrainPaths,
  astroManagedText,
  planAstroBrainWrites,
  skillSummary,
} from "./astroBrain";

const missing = () => Object.fromEntries(astroBrainPaths().map((path) => [path, null]));

describe("planAstroBrainWrites", () => {
  it("writes every file on a fresh scratch root, with the name filled in", () => {
    const writes = planAstroBrainWrites("Luna", missing());
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
    expect(planAstroBrainWrites("Luna", existing)).toEqual([
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
    expect(planAstroBrainWrites("Astro", existing)).toEqual([
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
