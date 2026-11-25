import { T, useGT } from "gt-react";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { SettingsSection } from "~/components/settings/settingsLayout";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { skillSummary } from "./astroBrain";
import {
  type AstroBrainTarget,
  type AstroSkillFile,
  listSkillFiles,
  readBrainFile,
  writeBrainFile,
} from "./astroBrainFiles";

const EDITOR_ROWS = 6;

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

function BrainTextEditor(props: {
  target: AstroBrainTarget;
  relativePath: string;
  initial: string;
  label: string;
}) {
  const gt = useGT();
  const [saved, setSaved] = useState(props.initial);
  const [draft, setDraft] = useState(props.initial);
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    writeBrainFile(props.target, props.relativePath, draft)
      .then(() => setSaved(draft))
      .catch(() => toastManager.add({ type: "error", title: gt("Could not save") }))
      .finally(() => setSaving(false));
  };
  return (
    <div className="grid gap-2">
      <Textarea
        aria-label={props.label}
        rows={EDITOR_ROWS}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button size="sm" className="ml-auto" disabled={draft === saved || saving} onClick={save}>
        <T>Save</T>
      </Button>
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
          />
        )}
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

function useSkillFiles(target: AstroBrainTarget | null) {
  const [skills, setSkills] = useState<AstroSkillFile[] | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- lists the skill folders on the server once the scratch project is ready
  useEffect(() => {
    if (target === null) return;
    let current = true;
    listSkillFiles(target)
      .then((files) => current && setSkills(files))
      .catch(() => current && setSkills([]));
    return () => {
      current = false;
    };
  }, [target]);
  return skills;
}

export function SkillsSection({ target }: { target: AstroBrainTarget | null }) {
  const gt = useGT();
  const skills = useSkillFiles(target);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  return (
    <SettingsSection title={gt("Learned skills")}>
      {target === null || skills === null ? (
        <div role="status" aria-label={gt("Loading Astro's skills")} className="px-4 py-3">
          <Skeleton className="h-10 w-full" />
        </div>
      ) : skills.length === 0 ? (
        <p className="px-4 py-3 text-muted-foreground text-sm">
          <T>No skills yet. Astro creates one when it learns to do something new.</T>
        </p>
      ) : (
        skills.map((skill) => (
          <SkillRow
            key={skill.slug}
            target={target}
            skill={skill}
            open={openSlug === skill.slug}
            onToggle={() => setOpenSlug(openSlug === skill.slug ? null : skill.slug)}
          />
        ))
      )}
    </SettingsSection>
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
        <ChevronRightIcon
          className={cn("size-4 shrink-0 text-muted-foreground", props.open && "rotate-90")}
        />
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
