import { T, useGT } from "gt-react";
import { type ReactNode, useState } from "react";

import { Button } from "~/components/ui/button";
import { EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { syncAstroBrainQuietly } from "./astroBrainFiles";
import { AstroCustomizerFields } from "./AstroCustomizer";
import { type AstroPrefs, astroDisplayName, isAstroOnboarded, useAstroPrefs } from "./astroPrefs";
import { useAstroEnvironmentId } from "./useAstroEnvironmentId";

/** First launch meets Astro before the welcome; afterwards it renders the welcome as is. */
export function AstroOnboardingGate({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [prefs] = useAstroPrefs();
  return (
    <div className={className}>{isAstroOnboarded(prefs) ? children : <AstroOnboarding />}</div>
  );
}

function AstroOnboarding() {
  const [prefs, setPrefs] = useAstroPrefs();
  const environmentId = useAstroEnvironmentId();
  const [about, setAbout] = useState("");
  // The text is queued in the prefs first, so it survives a server that is not reachable yet:
  // whichever sync succeeds next appends it to USER.md.
  const finish = () => {
    setPrefs((current) => queueAbout({ ...current, onboarded: true }, about));
    void syncAstroBrainQuietly(environmentId, astroDisplayName(prefs));
  };
  return (
    <div className="flex flex-col items-center gap-6">
      <OnboardingHeader />
      <div className="flex w-full flex-col gap-5 text-left">
        <AstroCustomizerFields avatarSize="hero" syncNameOnBlur={false} />
        <AboutField value={about} onChange={setAbout} />
      </div>
      <Button size="sm" onClick={finish}>
        <T>Next</T>
      </Button>
    </div>
  );
}

function AboutField(props: { value: string; onChange: (value: string) => void }) {
  const gt = useGT();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="astro-about">
        <T>Two lines about you (optional)</T>
      </Label>
      <Textarea
        id="astro-about"
        rows={2}
        maxLength={500}
        placeholder={gt("E.g. I'm a teacher and I want to make a website for my class.")}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function queueAbout(prefs: AstroPrefs, about: string): AstroPrefs {
  const pendingAbout = about.trim();
  return pendingAbout === "" ? prefs : { ...prefs, pendingAbout };
}

function OnboardingHeader() {
  return (
    <EmptyHeader className="max-w-none">
      <EmptyTitle>
        <T>Create your Astro</T>
      </EmptyTitle>
      <EmptyDescription>
        <T>Your companion for chats without a project. You can change it later in Settings.</T>
      </EmptyDescription>
    </EmptyHeader>
  );
}
