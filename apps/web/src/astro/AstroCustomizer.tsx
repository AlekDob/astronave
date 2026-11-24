import { T, useGT, useMessages } from "gt-react";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";
import { cn } from "~/lib/utils";
import { AstroAvatar } from "./AstroAvatar";
import {
  ASTRO_LEDS,
  ASTRO_MOUTHS,
  ASTRO_SUITS,
  astroDisplayName,
  keysOf,
  useAstroPrefs,
} from "./astroPrefs";

/** Edits apply live: the preview and every other Astro read the same stored prefs. */
export function AstroCustomizer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const gt = useGT();
  const m = useMessages();
  const [prefs, setPrefs] = useAstroPrefs();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <T>Your Astro</T>
          </DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2">
              <AstroAvatar size="preview" interactive />
              <span className="font-medium text-lg">{astroDisplayName(prefs)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="astro-name">
                <T>Name</T>
              </Label>
              <Input
                id="astro-name"
                maxLength={16}
                value={prefs.name}
                onChange={(event) =>
                  setPrefs((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <Field label={<T>Suit</T>}>
              {keysOf(ASTRO_SUITS).map((suit) => (
                <Swatch
                  key={suit}
                  color={ASTRO_SUITS[suit].color}
                  label={m(ASTRO_SUITS[suit].label)}
                  pressed={prefs.suit === suit}
                  onClick={() => setPrefs((current) => ({ ...current, suit }))}
                />
              ))}
            </Field>
            <Field label={<T>Visor LEDs</T>}>
              {keysOf(ASTRO_LEDS).map((led) => (
                <Swatch
                  key={led}
                  color={ASTRO_LEDS[led].color}
                  label={m(ASTRO_LEDS[led].label)}
                  pressed={prefs.led === led}
                  onClick={() => setPrefs((current) => ({ ...current, led }))}
                />
              ))}
            </Field>
            <Field label={<T>Mouth</T>}>
              <ToggleGroup
                aria-label={gt("Mouth")}
                variant="segmented"
                value={[prefs.mouth]}
                onValueChange={(value) => {
                  const mouth = keysOf(ASTRO_MOUTHS).find((key) => key === value[0]);
                  if (mouth) setPrefs((current) => ({ ...current, mouth }));
                }}
              >
                {keysOf(ASTRO_MOUTHS).map((mouth) => (
                  <Toggle key={mouth} value={mouth}>
                    {m(ASTRO_MOUTHS[mouth])}
                  </Toggle>
                ))}
              </ToggleGroup>
            </Field>
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-sm">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Swatch(props: { color: string; label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.pressed}
      onClick={props.onClick}
      className={cn(
        "size-7 cursor-pointer rounded-full border border-border outline-hidden focus-visible:border-2 focus-visible:border-ring",
        props.pressed && "border-2 border-foreground ring-2 ring-background ring-inset",
      )}
      style={{ backgroundColor: props.color }}
    />
  );
}
