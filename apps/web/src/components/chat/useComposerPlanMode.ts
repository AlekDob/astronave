import type { ProviderInteractionMode, ServerProvider } from "@t3tools/contracts";

import { type ComposerThreadTarget, useComposerDraftStore } from "../../composerDraftStore";

/**
 * Astronave: plan mode for the composer. Upstream removed the client toggle (#33131) but the
 * server still honors `interactionMode: "plan"`, so this only restores the choice and Shift+Tab.
 * The draft's pick wins; otherwise the thread keeps the mode its last turn ran in.
 */
export function useComposerPlanMode(input: {
  readonly composerDraftTarget: ComposerThreadTarget;
  readonly threadInteractionMode: ProviderInteractionMode | undefined;
  readonly provider: Pick<ServerProvider, "showInteractionModeToggle"> | null | undefined;
}) {
  const draftInteractionMode = useComposerDraftStore(
    (store) => store.getComposerDraft(input.composerDraftTarget)?.interactionMode ?? null,
  );
  const setInteractionMode = useComposerDraftStore((store) => store.setInteractionMode);
  const { enabled, interactionMode } = resolveComposerPlanMode({ ...input, draftInteractionMode });
  const togglePlanMode = () => {
    if (!enabled) return;
    setInteractionMode(input.composerDraftTarget, interactionMode === "plan" ? "default" : "plan");
  };
  return { planModeEnabled: enabled, interactionMode, togglePlanMode };
}

/** Providers that report no plan support fall back to build mode, whatever the draft says. */
export function resolveComposerPlanMode(input: {
  readonly draftInteractionMode: ProviderInteractionMode | null;
  readonly threadInteractionMode: ProviderInteractionMode | undefined;
  readonly provider: Pick<ServerProvider, "showInteractionModeToggle"> | null | undefined;
}): { enabled: boolean; interactionMode: ProviderInteractionMode } {
  const enabled = input.provider != null && input.provider.showInteractionModeToggle !== false;
  const interactionMode = enabled
    ? (input.draftInteractionMode ?? input.threadInteractionMode ?? "default")
    : "default";
  return { enabled, interactionMode };
}
