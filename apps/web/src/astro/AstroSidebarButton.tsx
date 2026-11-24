import { useGT } from "gt-react";

import { resolveSidebarThreadStatus } from "~/components/Sidebar.logic";
import { useScratchProject } from "~/hooks/useScratchProject";
import { useThreadShells } from "~/state/entities";
import type { AstroState } from "./astroFace";
import { AstroAvatar } from "./AstroAvatar";
import { astroDisplayName, useAstroPrefs } from "./astroPrefs";

/** Waiting on the user beats working, so a pending question is never hidden by a busy thread. */
function useAstroActivity(): AstroState {
  let state: AstroState = "idle";
  for (const thread of useThreadShells()) {
    if (thread.archivedAt !== null) continue;
    const status = resolveSidebarThreadStatus(thread);
    if (status === "approval" || status === "input") return "wait";
    if (status === "working" || status === "preparing") state = "work";
  }
  return state;
}

/** Astro next to the app name: opens a new chat without a project. */
export function AstroSidebarButton() {
  const gt = useGT();
  const [prefs] = useAstroPrefs();
  const state = useAstroActivity();
  const { scratchEnvironmentId, startScratchThread } = useScratchProject();
  const environmentId = scratchEnvironmentId(null);
  return (
    <button
      type="button"
      aria-label={gt("New chat with {name}", { name: astroDisplayName(prefs) })}
      disabled={environmentId === null}
      onClick={() => {
        if (environmentId !== null) void startScratchThread(environmentId);
      }}
      className="relative z-10 flex shrink-0 cursor-pointer rounded-full p-0.5 outline-hidden ring-ring focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-default [-webkit-app-region:no-drag]"
    >
      <AstroAvatar size="row" state={state} />
    </button>
  );
}
