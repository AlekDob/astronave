import type { EnvironmentId } from "@t3tools/contracts";
import { T, useGT } from "gt-react";
import { useEffect, useEffectEvent, useState } from "react";

import { SettingsPageContainer, SettingsSection } from "~/components/settings/settingsLayout";
import { BrainFileSection, SkillsSection } from "./AstroBrainEditors";
import { ASTRO_MEMORY_FILE, ASTRO_PERSONA_FILE, ASTRO_USER_FILE } from "./astroBrain";
import { type AstroBrainTarget, syncAstroBrain } from "./astroBrainFiles";
import { AstroCustomizerFields } from "./AstroCustomizer";
import { astroDisplayName, useAstroPrefs } from "./astroPrefs";
import { useAstroEnvironmentId } from "./useAstroEnvironmentId";

type BrainState = AstroBrainTarget | "loading" | "unavailable";

/** Opening the page refreshes the brain files, then every section reads from the same root. */
function useAstroBrainTarget(): BrainState {
  const environmentId = useAstroEnvironmentId();
  const [prefs] = useAstroPrefs();
  const name = astroDisplayName(prefs);
  const [state, setState] = useState<BrainState>("loading");
  // The name is synced on blur by the customizer; a keystroke must not reopen the brain.
  const sync = useEffectEvent((id: EnvironmentId) => syncAstroBrain(id, name));
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- syncs Astro's brain files on the server when the page opens
  useEffect(() => {
    if (environmentId === null) return;
    let current = true;
    sync(environmentId)
      .then((target) => current && setState(target))
      .catch((error: unknown) => {
        console.warn("[astro] Could not sync Astro's brain files.", error);
        if (current) setState("unavailable");
      });
    return () => {
      current = false;
    };
  }, [environmentId]);
  return environmentId === null ? "unavailable" : state;
}

export function AstroSettingsPanel() {
  const gt = useGT();
  const brain = useAstroBrainTarget();
  const target = typeof brain === "string" ? null : brain;
  return (
    <SettingsPageContainer>
      <SettingsSection title={gt("Look", { $context: "Astro's appearance" })}>
        <div className="px-4 py-4">
          <AstroCustomizerFields />
        </div>
      </SettingsSection>
      {brain === "unavailable" ? (
        <p className="px-4 text-muted-foreground text-sm">
          <T>
            Astro's memory is not available right now. Start a chat without a project, then come
            back here.
          </T>
        </p>
      ) : (
        <AstroBrainSections target={target} />
      )}
    </SettingsPageContainer>
  );
}

function AstroBrainSections({ target }: { target: AstroBrainTarget | null }) {
  const gt = useGT();
  return (
    <>
      <BrainFileSection
        target={target}
        relativePath={ASTRO_PERSONA_FILE}
        title={gt("Who Astro is")}
        help={gt("How Astro talks and behaves in chats without a project. Only you write this.")}
      />
      <BrainFileSection
        target={target}
        relativePath={ASTRO_USER_FILE}
        title={gt("What Astro knows about you")}
        help={gt("Astro adds what it learns about you. You can correct it whenever you want.")}
      />
      <BrainFileSection
        target={target}
        relativePath={ASTRO_MEMORY_FILE}
        title={gt("Memory", { $context: "Astro's notes" })}
        help={gt(
          "Astro updates it on its own when it learns something. You can correct it whenever you want.",
        )}
      />
      <SkillsSection target={target} />
    </>
  );
}
