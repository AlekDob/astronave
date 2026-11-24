import { T, Var } from "gt-react";
import { useState } from "react";

import { InlineButton } from "~/components/ui/button";
import { AstroAvatar } from "./AstroAvatar";
import { AstroCustomizer } from "./AstroCustomizer";
import { astroDisplayName, useAstroPrefs } from "./astroPrefs";

// Static, very faint dot pattern; faded at the edges so it never sits under the heading's ends.
const STARFIELD_CLASS =
  "pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10 opacity-10 dark:opacity-20 [background-image:radial-gradient(circle,var(--color-foreground)_0.6px,transparent_1.2px),radial-gradient(circle,var(--color-foreground)_0.5px,transparent_1px)] [background-position:7px_11px,23px_29px] [background-size:61px_53px,37px_43px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]";

/** Astro above the new-thread heading, with the way into its customizer. */
export function AstroHero() {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  return (
    <>
      <div aria-hidden="true" className={STARFIELD_CLASS} />
      <div className="pointer-events-auto mb-3 flex flex-col items-center gap-1">
        <AstroAvatar size="hero" interactive talks />
        <InlineButton tone="muted" onClick={() => setCustomizerOpen(true)}>
          <T>Customize</T>
        </InlineButton>
      </div>
      <AstroCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />
    </>
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
