import { executeAtomQuery, runAtomCommand } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";

import { appAtomRegistry } from "~/rpc/atomRegistry";
import { projectEnvironment } from "~/state/projects";
import {
  appendAboutUser,
  ASTRO_SKILLS_DIR,
  ASTRO_USER_FILE,
  astroBrainPaths,
  planAstroBrainWrites,
} from "./astroBrain";

/** The scratch project: its root is the parent of every project-less chat folder. */
export interface AstroBrainTarget {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
}

export interface AstroSkillFile {
  readonly slug: string;
  readonly relativePath: string;
  readonly contents: string;
}

// Writes need a known workspace, so the scratch project must exist before we touch its root.
async function openAstroBrain(environmentId: EnvironmentId): Promise<AstroBrainTarget> {
  const result = await runAtomCommand(
    appAtomRegistry,
    projectEnvironment.openScratch,
    { environmentId, input: {} },
    { label: "Open Astro brain" },
  );
  if (result._tag === "Failure") throw new Error("Could not open the scratch project.");
  return { environmentId, cwd: result.value.workspaceRoot };
}

/** Null when the file is missing; throws when the read itself fails, so nothing gets overwritten. */
export async function readBrainFile(
  target: AstroBrainTarget,
  relativePath: string,
): Promise<string | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    projectEnvironment.readFile({
      environmentId: target.environmentId,
      input: { cwd: target.cwd, relativePath, allowMissing: true },
    }),
    { label: "Read Astro brain file", refresh: true },
  );
  if (result._tag === "Failure") throw new Error(`Could not read ${relativePath}.`);
  return result.value.exists === false ? null : result.value.contents;
}

export async function writeBrainFile(
  target: AstroBrainTarget,
  relativePath: string,
  contents: string,
): Promise<void> {
  const result = await runAtomCommand(
    appAtomRegistry,
    projectEnvironment.writeFile,
    { environmentId: target.environmentId, input: { cwd: target.cwd, relativePath, contents } },
    { label: "Write Astro brain file" },
  );
  if (result._tag === "Failure") throw new Error(`Could not write ${relativePath}.`);
}

/** Every `astro/skills/<slug>/SKILL.md`; an empty list when the folder does not exist yet. */
export async function listSkillFiles(target: AstroBrainTarget): Promise<AstroSkillFile[]> {
  const listed = await executeAtomQuery(
    appAtomRegistry,
    projectEnvironment.listEntries({
      environmentId: target.environmentId,
      input: { cwd: target.cwd, directoryPath: ASTRO_SKILLS_DIR },
    }),
    { label: "List Astro skills", refresh: true, reportFailure: false },
  );
  if (listed._tag === "Failure") return [];
  const folders = listed.value.entries.filter((entry) => entry.kind === "directory");
  const skills = await Promise.all(
    folders.map(async (folder) => {
      const relativePath = `${folder.path}/SKILL.md`;
      const contents = await readBrainFile(target, relativePath);
      const slug = folder.path.slice(ASTRO_SKILLS_DIR.length + 1);
      return contents === null ? null : { slug, relativePath, contents };
    }),
  );
  return skills.filter((skill) => skill !== null).toSorted((a, b) => a.slug.localeCompare(b.slug));
}

/** Rewrites the app-managed files and seeds the missing ones; never touches what the user wrote. */
export async function syncAstroBrain(
  environmentId: EnvironmentId,
  name: string,
): Promise<AstroBrainTarget> {
  const target = await openAstroBrain(environmentId);
  const paths = astroBrainPaths();
  const contents = await Promise.all(paths.map((path) => readBrainFile(target, path)));
  const existing = Object.fromEntries(paths.map((path, index) => [path, contents[index] ?? null]));
  for (const write of planAstroBrainWrites(name, existing)) {
    await writeBrainFile(target, write.relativePath, write.contents);
  }
  return target;
}

/** Astro's memory must never block a chat: failures are only logged. */
export function syncAstroBrainQuietly(environmentId: EnvironmentId | null, name: string): void {
  if (environmentId === null) return;
  syncAstroBrain(environmentId, name).catch((error: unknown) =>
    console.warn("[astro] Could not sync Astro's brain files.", error),
  );
}

/** End of onboarding: create the brain, then keep the person's own words in USER.md. */
export function finishAstroOnboarding(
  environmentId: EnvironmentId | null,
  name: string,
  about: string,
): void {
  if (environmentId === null) return;
  const run = async () => {
    const target = await syncAstroBrain(environmentId, name);
    if (about.trim() === "") return;
    const current = await readBrainFile(target, ASTRO_USER_FILE);
    const today = new Date().toISOString().slice(0, 10);
    await writeBrainFile(target, ASTRO_USER_FILE, appendAboutUser(current, about, today));
  };
  run().catch((error: unknown) =>
    console.warn("[astro] Could not finish Astro's onboarding files.", error),
  );
}
