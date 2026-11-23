import { describe, expect, it } from "vite-plus/test";

import { resolveComposerPlanMode } from "./useComposerPlanMode";

describe("resolveComposerPlanMode", () => {
  it("prefers the draft pick over the thread's last mode", () => {
    expect(
      resolveComposerPlanMode({
        draftInteractionMode: "default",
        threadInteractionMode: "plan",
        provider: { showInteractionModeToggle: true },
      }),
    ).toEqual({ enabled: true, interactionMode: "default" });
  });

  it("keeps the thread in plan mode when the draft has no pick", () => {
    expect(
      resolveComposerPlanMode({
        draftInteractionMode: null,
        threadInteractionMode: "plan",
        provider: {},
      }).interactionMode,
    ).toBe("plan");
  });

  it("forces build mode for providers without plan support", () => {
    expect(
      resolveComposerPlanMode({
        draftInteractionMode: "plan",
        threadInteractionMode: "plan",
        provider: { showInteractionModeToggle: false },
      }),
    ).toEqual({ enabled: false, interactionMode: "default" });
  });
});
