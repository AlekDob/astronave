import { executeAtomQuery, runAtomCommand } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";

import { appAtomRegistry } from "~/rpc/atomRegistry";
import { projectEnvironment } from "~/state/projects";
import {
  addVersion,
  appendAboutUser,
  archiveForMove,
  ASTRO_SKILLS_DIR,
  ASTRO_USER_FILE,
  ASTRO_VERSIONED_FILES,
  type AstroBrainAction,
  type AstroOverflowMove,
  type AstroVersion,
  astroBrainPaths,
  astroManagedPaths,
  astroVersionsPath,
  createSerialQueue,
  parseVersions,
  planAstroBrainWrites,
  planManagedWrites,
  serializeVersions,
} from "./astroBrain";
import {
  astroDisplayName,
  readAstroPrefs,
  updateAstroPrefs,
  withoutPendingAbout,
} from "./astroPrefs";

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

// Background work: our callers log or show errors themselves, so the RPC layer stays quiet.
const QUIET = { reportFailure: false } as const;

/** Every brain operation of this client runs through here, so none interleave. */
const enqueueBrainOp = createSerialQueue();

/** Name last written into CLAUDE.md / AGENTS.md by this client. */
let lastSyncedName: string | null = null;

const today = () => new Date().toISOString().slice(0, 10);

// Writes need a known workspace, so the scratch project must exist before we touch its root.
// Not useScratchProject's openScratchProject: that one toasts, and this runs in the background.
async function openAstroBrain(environmentId: EnvironmentId): Promise<AstroBrainTarget> {
  const result = await runAtomCommand(
    appAtomRegistry,
    projectEnvironment.openScratch,
    { environmentId, input: {} },
    { label: "Open Astro brain", ...QUIET },
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
    { label: "Read Astro brain file", refresh: true, ...QUIET },
  );
  if (result._tag === "Failure") throw new Error(`Could not read ${relativePath}.`);
  return result.value.exists === false ? null : result.value.contents;
}

async function writeBrainFile(
  target: AstroBrainTarget,
  relativePath: string,
  contents: string,
): Promise<void> {
  const result = await runAtomCommand(
    appAtomRegistry,
    projectEnvironment.writeFile,
    { environmentId: target.environmentId, input: { cwd: target.cwd, relativePath, contents } },
    { label: "Write Astro brain file", ...QUIET },
  );
  if (result._tag === "Failure") throw new Error(`Could not write ${relativePath}.`);
}

/**
 * Every readable `astro/skills/<slug>/SKILL.md`, plus how many could not be read.
 * Throws when the folder itself cannot be listed, so an error never looks like "no skills".
 */
export async function listSkillFiles(
  target: AstroBrainTarget,
): Promise<{ skills: AstroSkillFile[]; unreadable: number }> {
  const listed = await executeAtomQuery(
    appAtomRegistry,
    projectEnvironment.listEntries({
      environmentId: target.environmentId,
      input: { cwd: target.cwd, directoryPath: ASTRO_SKILLS_DIR },
    }),
    { label: "List Astro skills", refresh: true, ...QUIET },
  );
  if (listed._tag === "Failure") throw new Error("Could not list Astro's skills.");
  const folders = listed.value.entries.filter((entry) => entry.kind === "directory");
  const results = await Promise.allSettled(folders.map((folder) => readSkill(target, folder.path)));
  const skills = results.flatMap((result) =>
    result.status === "fulfilled" && result.value !== null ? [result.value] : [],
  );
  const unreadable = results.filter((result) => result.status === "rejected").length;
  return { skills: skills.toSorted((a, b) => a.slug.localeCompare(b.slug)), unreadable };
}

async function readSkill(target: AstroBrainTarget, folder: string): Promise<AstroSkillFile | null> {
  const relativePath = `${folder}/SKILL.md`;
  const contents = await readBrainFile(target, relativePath);
  const slug = folder.slice(ASTRO_SKILLS_DIR.length + 1);
  return contents === null ? null : { slug, relativePath, contents };
}

/** Keeps `content` in the path's history unless it is already the latest version. */
async function snapshotBrainFile(
  target: AstroBrainTarget,
  relativePath: string,
  content: string | null,
): Promise<void> {
  if (content === null) return;
  const versionsPath = astroVersionsPath(relativePath);
  const versions = parseVersions(await readBrainFile(target, versionsPath));
  const next = addVersion(versions, content, new Date().toISOString());
  if (next !== null) await writeBrainFile(target, versionsPath, serializeVersions(next));
}

/** Newest first. */
export async function listBrainVersions(
  target: AstroBrainTarget,
  relativePath: string,
): Promise<AstroVersion[]> {
  const text = await readBrainFile(target, astroVersionsPath(relativePath));
  return parseVersions(text).toReversed();
}

/**
 * Saves only if the file still holds `expected` (Astro may have edited it meanwhile).
 * Returns the file's current text on a conflict, null once saved.
 */
export function saveBrainFile(
  target: AstroBrainTarget,
  relativePath: string,
  contents: string,
  expected: string,
): Promise<string | null> {
  return enqueueBrainOp(async () => {
    const current = await readBrainFile(target, relativePath);
    if ((current ?? "") !== expected) return current ?? "";
    await snapshotBrainFile(target, relativePath, current);
    await writeBrainFile(target, relativePath, contents);
    // The save itself succeeded; a stale AGENTS.md is refreshed again by the next sync.
    await syncManagedFiles(target, astroDisplayName(readAstroPrefs())).catch((error: unknown) =>
      console.warn("[astro] Could not refresh AGENTS.md after a save.", error),
    );
    return null;
  });
}

async function readBrainContents(
  target: AstroBrainTarget,
  paths: readonly string[],
): Promise<Record<string, string | null>> {
  const contents = await Promise.all(paths.map((path) => readBrainFile(target, path)));
  return Object.fromEntries(paths.map((path, index) => [path, contents[index] ?? null]));
}

async function applyBrainAction(target: AstroBrainTarget, action: AstroBrainAction) {
  if (action.kind === "overflow") return applyOverflowMove(target, action);
  // A seed never replaces a file that appeared since the planning read.
  if (action.kind === "seed" && (await readBrainFile(target, action.relativePath)) !== null) return;
  await writeBrainFile(target, action.relativePath, action.contents);
}

/** Archive first, then shorten; each step re-reads, so a concurrent edit skips the round. */
async function applyOverflowMove(target: AstroBrainTarget, move: AstroOverflowMove) {
  const archive = await readBrainFile(target, move.archivePath);
  const nextArchive = archiveForMove(move, await readBrainFile(target, move.shortPath), archive);
  if (nextArchive === null) return;
  if (nextArchive !== archive) await writeBrainFile(target, move.archivePath, nextArchive);
  // Changed in between: the lines stay in both files until the next sync. A copy, never a loss.
  if ((await readBrainFile(target, move.shortPath)) !== move.expected) return;
  await writeBrainFile(target, move.shortPath, move.kept);
}

/** Onboarding's "two lines about you" wait in the prefs until they reach USER.md. */
async function appendPendingAbout(target: AstroBrainTarget) {
  const pending = readAstroPrefs().pendingAbout;
  if (pending === undefined) return;
  if (pending.trim() !== "") {
    const current = await readBrainFile(target, ASTRO_USER_FILE);
    await snapshotBrainFile(target, ASTRO_USER_FILE, current);
    await writeBrainFile(target, ASTRO_USER_FILE, appendAboutUser(current, pending, today()));
  }
  updateAstroPrefs((prefs) => withoutPendingAbout(prefs, pending));
}

/**
 * Rewrites the app-managed files, seeds the missing ones, moves short-memory overflow to the
 * archive and appends a queued onboarding text. Snapshots first, so Astro's own edits since
 * last time land in the history.
 */
async function syncAstroBrainNow(environmentId: EnvironmentId, name: string) {
  const target = await openAstroBrain(environmentId);
  const existing = await readBrainContents(target, astroBrainPaths());
  for (const path of ASTRO_VERSIONED_FILES) {
    await snapshotBrainFile(target, path, existing[path] ?? null);
  }
  for (const action of planAstroBrainWrites(existing, today())) {
    await applyBrainAction(target, action);
  }
  await appendPendingAbout(target);
  await syncManagedFiles(target, name);
  return target;
}

/** Last step of every brain change: AGENTS.md inlines the memory, so it is re-read fresh. */
async function syncManagedFiles(target: AstroBrainTarget, name: string) {
  const existing = await readBrainContents(target, astroManagedPaths());
  for (const write of planManagedWrites(name, existing)) await applyBrainAction(target, write);
  lastSyncedName = name;
}

export function syncAstroBrain(
  environmentId: EnvironmentId,
  name: string,
): Promise<AstroBrainTarget> {
  return enqueueBrainOp(() => syncAstroBrainNow(environmentId, name));
}

/** Astro's memory must never block a chat: failures are only logged. Resolves to success. */
export function syncAstroBrainQuietly(
  environmentId: EnvironmentId | null,
  name: string,
): Promise<boolean> {
  if (environmentId === null) return Promise.resolve(false);
  return syncAstroBrain(environmentId, name).then(
    () => true,
    (error: unknown) => {
      console.warn("[astro] Could not sync Astro's brain files.", error);
      return false;
    },
  );
}

/** After a rename only CLAUDE.md / AGENTS.md carry the name; skipped when it did not change. */
export function syncAstroNameQuietly(environmentId: EnvironmentId | null, name: string): void {
  if (environmentId === null || name === lastSyncedName) return;
  enqueueBrainOp(async () => {
    await syncManagedFiles(await openAstroBrain(environmentId), name);
  }).catch((error: unknown) => console.warn("[astro] Could not rename Astro.", error));
}
