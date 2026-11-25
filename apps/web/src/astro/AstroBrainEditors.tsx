import { T, useGT } from "gt-react";
import { ChevronRightIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { SettingsSection } from "~/components/settings/settingsLayout";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { BrainTextEditor } from "./AstroBrainEditor";
import {
  ASTRO_MEMORY_ARCHIVE,
  ASTRO_USER_ARCHIVE,
  hasArchiveContent,
  skillSummary,
} from "./astroBrain";
import {
  type AstroBrainTarget,
  type AstroSkillFile,
  listSkillFiles,
  readBrainFile,
} from "./astroBrainFiles";

/** Same footprint as a loaded editor (textarea + Save row), so the page does not jump. */
function BrainEditorSkeleton() {
  const gt = useGT();
  return (
    <div role="status" aria-label={gt("Loading Astro's memory")} className="grid gap-2">
      <Skeleton shape="card" className="h-[152px] w-full" />
      <Skeleton className="ml-auto h-8 w-16" />
    </div>
  );
}

/** undefined while loading, null when the read failed. */
function useBrainFileContents(target: AstroBrainTarget | null, relativePath: string) {
  const [contents, setContents] = useState<string | null | undefined>(undefined);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- loads the file from the server once the scratch project is ready
  useEffect(() => {
    if (target === null) return;
    let current = true;
    readBrainFile(target, relativePath)
      .then((text) => current && setContents(text ?? ""))
      .catch(() => current && setContents(null));
    return () => {
      current = false;
    };
  }, [target, relativePath]);
  return contents;
}

export function BrainFileSection(props: {
  target: AstroBrainTarget | null;
  relativePath: string;
  title: string;
  help: string;
  counter?: boolean;
  children?: ReactNode;
}) {
  const contents = useBrainFileContents(props.target, props.relativePath);
  return (
    <SettingsSection title={props.title}>
      <div className="grid gap-3 px-4 py-3">
        <p className="text-muted-foreground text-sm">{props.help}</p>
        {props.target === null || contents === undefined ? (
          <BrainEditorSkeleton />
        ) : contents === null ? (
          <ReadFailed />
        ) : (
          <BrainTextEditor
            target={props.target}
            relativePath={props.relativePath}
            initial={contents}
            label={props.title}
            counter={props.counter ?? false}
          />
        )}
        {props.children}
      </div>
    </SettingsSection>
  );
}

function ReadFailed() {
  return (
    <p className="text-destructive text-sm">
      <T>Could not read this file. Try again later.</T>
    </p>
  );
}

type SkillList = Awaited<ReturnType<typeof listSkillFiles>>;

/** undefined while loading, null when the folder could not be listed. */
function useSkillFiles(target: AstroBrainTarget) {
  const [list, setList] = useState<SkillList | null | undefined>(undefined);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- lists the skill folders on the server once the scratch project is ready
  useEffect(() => {
    let current = true;
    listSkillFiles(target)
      .then((files) => current && setList(files))
      .catch(() => current && setList(null));
    return () => {
      current = false;
    };
  }, [target]);
  return list;
}

export function SkillsSection({ target }: { target: AstroBrainTarget | null }) {
  const gt = useGT();
  // Retry remounts the body, which reloads the list.
  const [attempt, setAttempt] = useState(0);
  return (
    <SettingsSection title={gt("Learned skills")}>
      {target === null ? (
        <SkillsSkeleton />
      ) : (
        <SkillsBody key={attempt} target={target} onRetry={() => setAttempt(attempt + 1)} />
      )}
    </SettingsSection>
  );
}

function SkillsSkeleton() {
  const gt = useGT();
  return (
    <div role="status" aria-label={gt("Loading Astro's skills")} className="px-4 py-3">
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function SkillsBody(props: { target: AstroBrainTarget; onRetry: () => void }) {
  const list = useSkillFiles(props.target);
  if (list === undefined) return <SkillsSkeleton />;
  if (list === null) {
    return (
      <ReadError className="px-4 py-3" onRetry={props.onRetry}>
        <T>Could not read the skills. Try again.</T>
      </ReadError>
    );
  }
  if (list.skills.length === 0 && list.unreadable === 0) return <NoSkills />;
  return (
    <>
      <SkillRows target={props.target} skills={list.skills} />
      {list.unreadable > 0 ? <UnreadableSkills onRetry={props.onRetry} /> : null}
    </>
  );
}

function NoSkills() {
  return (
    <p className="px-4 py-3 text-muted-foreground text-sm">
      <T>No skills yet. Astro creates one when it learns to do something new.</T>
    </p>
  );
}

function SkillRows(props: { target: AstroBrainTarget; skills: readonly AstroSkillFile[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  return props.skills.map((skill) => (
    <SkillRow
      key={skill.slug}
      target={props.target}
      skill={skill}
      open={openSlug === skill.slug}
      onToggle={() => setOpenSlug(openSlug === skill.slug ? null : skill.slug)}
    />
  ));
}

function UnreadableSkills({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-muted-foreground text-sm">
      <span className="min-w-0 flex-1">
        <T>Some skills could not be read.</T>
      </span>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}

/** A failed read must never look like an empty list. */
function ReadError(props: { className?: string; children: ReactNode; onRetry: () => void }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", props.className)}>
      <span className="min-w-0 flex-1 text-destructive">{props.children}</span>
      <RetryButton onRetry={props.onRetry} />
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onRetry}>
      <T>Retry</T>
    </Button>
  );
}

function SkillRow(props: {
  target: AstroBrainTarget;
  skill: AstroSkillFile;
  open: boolean;
  onToggle: () => void;
}) {
  const { name, description } = skillSummary(props.skill.slug, props.skill.contents);
  return (
    <div>
      <button
        type="button"
        aria-expanded={props.open}
        onClick={props.onToggle}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <Chevron open={props.open} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-sm">{name}</span>
          <span className="block truncate text-muted-foreground text-xs">{description}</span>
        </span>
      </button>
      {/* Hidden, not unmounted, so a saved edit survives closing the row. */}
      <div hidden={!props.open} className="px-4 pb-3">
        <BrainTextEditor
          target={props.target}
          relativePath={props.skill.relativePath}
          initial={props.skill.contents}
          label={name}
        />
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRightIcon
      className={cn("size-4 shrink-0 text-muted-foreground", open && "rotate-90")}
    />
  );
}

/** Read-only view of both archives; loaded only when opened. */
export function ArchiveView({ target }: { target: AstroBrainTarget | null }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="grid gap-2">
      <button
        type="button"
        aria-expanded={open}
        disabled={target === null}
        onClick={() => setOpen(!open)}
        className="flex w-fit cursor-pointer items-center gap-1 rounded-sm text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <Chevron open={open} />
        <T>Archive</T>
      </button>
      {open && target !== null ? (
        <ArchiveContents key={attempt} target={target} onRetry={() => setAttempt(attempt + 1)} />
      ) : null}
    </div>
  );
}

function ArchiveContents(props: { target: AstroBrainTarget; onRetry: () => void }) {
  const user = useBrainFileContents(props.target, ASTRO_USER_ARCHIVE);
  const memory = useBrainFileContents(props.target, ASTRO_MEMORY_ARCHIVE);
  if (user === null || memory === null) {
    return (
      <ReadError onRetry={props.onRetry}>
        <T>Could not read the archive. Try again.</T>
      </ReadError>
    );
  }
  if (user === undefined || memory === undefined) return <ArchiveSkeleton />;
  return <ArchiveFiles files={[user, memory].filter((text) => hasArchiveContent(text))} />;
}

function ArchiveSkeleton() {
  const gt = useGT();
  return (
    <div role="status" aria-label={gt("Loading the archive")}>
      <Skeleton shape="card" className="h-24 w-full" />
    </div>
  );
}

function ArchiveFiles({ files }: { files: readonly string[] }) {
  if (files.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        <T>Nothing in the archive yet.</T>
      </p>
    );
  }
  return files.map((text) => (
    <pre
      key={text}
      className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 font-sans text-xs"
    >
      {text}
    </pre>
  ));
}
