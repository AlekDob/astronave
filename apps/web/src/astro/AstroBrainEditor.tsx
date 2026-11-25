import { T, useGT, useLocale, Var } from "gt-react";
import { HistoryIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { ASTRO_SHORT_MEMORY_LIMIT, type AstroVersion } from "./astroBrain";
import { type AstroBrainTarget, listBrainVersions, saveBrainFile } from "./astroBrainFiles";

const EDITOR_ROWS = 6;

interface BrainEditorProps {
  readonly target: AstroBrainTarget;
  readonly relativePath: string;
  readonly initial: string;
  readonly label: string;
  /** Short memory files show how close they are to the limit. */
  readonly counter?: boolean;
}

/** `loaded` is what the file held when we last read or wrote it: the base for conflict checks. */
function useBrainEditor(props: BrainEditorProps) {
  const gt = useGT();
  const [loaded, setLoaded] = useState(props.initial);
  const [draft, setDraft] = useState(props.initial);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const run = (expected: string) => {
    setSaving(true);
    saveBrainFile(props.target, props.relativePath, draft, expected)
      .then((current) => {
        setConflict(current);
        if (current === null) setLoaded(draft);
      })
      .catch(() => toastManager.add({ type: "error", title: gt("Could not save") }))
      .finally(() => setSaving(false));
  };
  const reload = (current: string) => {
    setLoaded(current);
    setDraft(current);
    setConflict(null);
  };
  return { draft, setDraft, saving, conflict, dirty: draft !== loaded, run, loaded, reload };
}

export function BrainTextEditor(props: BrainEditorProps) {
  const editor = useBrainEditor(props);
  return (
    <div className="grid gap-2">
      <Textarea
        aria-label={props.label}
        rows={EDITOR_ROWS}
        value={editor.draft}
        onChange={(event) => editor.setDraft(event.target.value)}
      />
      {props.counter ? <ShortMemoryCounter length={editor.draft.length} /> : null}
      {editor.conflict === null ? null : (
        <ConflictNotice
          disabled={editor.saving}
          onReload={() => editor.reload(editor.conflict ?? "")}
          onOverwrite={() => editor.run(editor.conflict ?? "")}
        />
      )}
      <div className="flex items-center justify-end gap-2">
        <VersionsMenu
          target={props.target}
          relativePath={props.relativePath}
          onPick={editor.setDraft}
        />
        <Button
          size="sm"
          disabled={!editor.dirty || editor.saving}
          onClick={() => editor.run(editor.loaded)}
        >
          <T>Save</T>
        </Button>
      </div>
    </div>
  );
}

// "2.000", not "2000": it-IT skips the separator below 10.000 unless forced.
const groupThousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function ShortMemoryCounter({ length }: { length: number }) {
  return (
    <p className="text-muted-foreground text-xs">
      <T>
        <Var>{groupThousands(length)}</Var> / <Var>{groupThousands(ASTRO_SHORT_MEMORY_LIMIT)}</Var>{" "}
        characters. Older lines move to the archive on their own.
      </T>
    </p>
  );
}

function ConflictNotice(props: {
  disabled: boolean;
  onReload: () => void;
  onOverwrite: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">
        <T>Astro changed this file while you were editing it.</T>
      </span>
      <Button size="sm" variant="outline" disabled={props.disabled} onClick={props.onReload}>
        <T>Reload</T>
      </Button>
      <Button size="sm" variant="outline" disabled={props.disabled} onClick={props.onOverwrite}>
        <T>Overwrite anyway</T>
      </Button>
    </div>
  );
}

/** Lists the file's history on open; picking one loads it as an unsaved edit. */
function VersionsMenu(props: {
  target: AstroBrainTarget;
  relativePath: string;
  onPick: (content: string) => void;
}) {
  const [versions, setVersions] = useState<AstroVersion[] | null>(null);
  const load = (open: boolean) => {
    if (!open) return;
    setVersions(null);
    listBrainVersions(props.target, props.relativePath)
      .then(setVersions)
      .catch(() => setVersions([]));
  };
  return (
    <Menu onOpenChange={load}>
      <MenuTrigger render={<Button type="button" size="sm" variant="ghost-muted" />}>
        <HistoryIcon className="size-4" />
        <T>Versions</T>
      </MenuTrigger>
      <MenuPopup align="end">
        <VersionItems versions={versions} onPick={props.onPick} />
      </MenuPopup>
    </Menu>
  );
}

function VersionItems(props: {
  versions: AstroVersion[] | null;
  onPick: (content: string) => void;
}) {
  const gt = useGT();
  const label = useVersionLabel();
  if (props.versions === null) {
    return (
      <div role="status" aria-label={gt("Loading versions")} className="grid gap-1 p-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-32" />
      </div>
    );
  }
  if (props.versions.length === 0) {
    return (
      <MenuItem disabled>
        <T>No saved versions</T>
      </MenuItem>
    );
  }
  return props.versions.map((version) => (
    <MenuItem key={version.at} onClick={() => props.onPick(version.content)}>
      {label(version.at)}
    </MenuItem>
  ));
}

/** "today 10:42" for today, "24 Nov 18:10" otherwise, in the UI language. */
function useVersionLabel() {
  const gt = useGT();
  const locale = useLocale();
  return (at: string) => {
    const date = new Date(at);
    const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === new Date().toDateString()) return gt("today {time}", { time });
    return `${date.toLocaleDateString(locale, { day: "numeric", month: "short" })} ${time}`;
  };
}
