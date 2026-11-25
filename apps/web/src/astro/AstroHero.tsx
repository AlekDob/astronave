import { T, Var } from "gt-react";
import { useEffect, useState } from "react";

import { InlineButton } from "~/components/ui/button";
import { AstroAvatar } from "./AstroAvatar";
import { AstroCustomizer } from "./AstroCustomizer";
import { syncAstroBrainQuietly } from "./astroBrainFiles";
import { astroDisplayName, useAstroPrefs } from "./astroPrefs";
import { useAstroEnvironmentId } from "./useAstroEnvironmentId";

// Static, very faint dot pattern; faded at the edges so it never sits under the heading's ends.
const STARFIELD_CLASS =
  "pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10 opacity-25 dark:opacity-35 [background-image:radial-gradient(circle,var(--color-foreground)_0.6px,transparent_1.2px),radial-gradient(circle,var(--color-foreground)_0.5px,transparent_1px)] [background-position:7px_11px,23px_29px] [background-size:61px_53px,37px_43px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]";

let brainSyncedThisSession = false;

/** The first project-less chat of a session refreshes Astro's brain files in the scratch root. */
function useSyncAstroBrainOnce(scratch: boolean) {
  const environmentId = useAstroEnvironmentId();
  const [prefs] = useAstroPrefs();
  const name = astroDisplayName(prefs);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- writes Astro's brain files on the server once per app session
  useEffect(() => {
    if (!scratch || environmentId === null || brainSyncedThisSession) return;
    // Set while in flight to avoid a double sync; a failure lets the next scratch chat retry.
    brainSyncedThisSession = true;
    void syncAstroBrainQuietly(environmentId, name).then((ok) => {
      brainSyncedThisSession = ok;
    });
  }, [scratch, environmentId, name]);
}

/** Astro above the new-thread heading, with the way into its customizer. */
export function AstroHero({ scratch }: { scratch: boolean }) {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  useSyncAstroBrainOnce(scratch);
  return (
    <>
      <div aria-hidden="true" className={STARFIELD_CLASS} />
      <div className="pointer-events-auto mb-3 flex flex-col items-center gap-1">
        <div className="relative isolate">
          <AstroOrbit />
          <AstroAvatar size="hero" interactive talks />
        </div>
        <InlineButton tone="muted" onClick={() => setCustomizerOpen(true)}>
          <T>Customize</T>
        </InlineButton>
      </div>
      <AstroCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />
    </>
  );
}

/** A still, tilted orbit with one small planet, passing behind Astro. */
function AstroOrbit() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 80"
      className="pointer-events-none absolute top-1/2 left-1/2 -z-10 w-60 -translate-x-1/2 -translate-y-1/4 -rotate-12 text-foreground"
    >
      <ellipse
        cx="120"
        cy="40"
        rx="116"
        ry="26"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
      <circle cx="28" cy="55" r="3.5" fill="currentColor" fillOpacity="0.45" />
      <circle cx="221" cy="27" r="1.5" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

/** The no-project heading: Astro introduces itself. */
export function AstroGreeting() {
  const [prefs] = useAstroPrefs();
  return (
    <T>
      Hi, I'm <Var>{astroDisplayName(prefs)}</Var>. Where do we start?
    </T>
  );
}
