import { T, useGT } from "gt-react";
import { type ReactNode, useState } from "react";

import { Button } from "~/components/ui/button";
import { EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { finishAstroOnboarding } from "./astroBrainFiles";
import { AstroCustomizerFields } from "./AstroCustomizer";
import { astroDisplayName, isAstroOnboarded, useAstroPrefs } from "./astroPrefs";
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
  const gt = useGT();
  const [prefs, setPrefs] = useAstroPrefs();
  const environmentId = useAstroEnvironmentId();
  const [about, setAbout] = useState("");
  const finish = () => {
    setPrefs((current) => ({ ...current, onboarded: true }));
    finishAstroOnboarding(environmentId, astroDisplayName(prefs), about);
  };
  return (
    <div className="flex flex-col items-center gap-6">
      <EmptyHeader className="max-w-none">
        <EmptyTitle>
          <T>Create your Astro</T>
        </EmptyTitle>
        <EmptyDescription>
          <T>Your companion for chats without a project. You can change it later in Settings.</T>
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex w-full flex-col gap-5 text-left">
        <AstroCustomizerFields avatarSize="hero" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="astro-about">
            <T>Two lines about you (optional)</T>
          </Label>
          <Textarea
            id="astro-about"
            rows={2}
            maxLength={500}
            placeholder={gt("E.g. I'm a teacher and I want to make a website for my class.")}
            value={about}
            onChange={(event) => setAbout(event.target.value)}
          />
        </div>
      </div>
      <Button size="sm" onClick={finish}>
        <T>Next</T>
      </Button>
    </div>
  );
}
