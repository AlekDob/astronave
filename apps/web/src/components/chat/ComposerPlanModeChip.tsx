import { ClipboardListIcon } from "lucide-react";
import { T, useGT } from "gt-react";

import { Kbd } from "../ui/kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ComposerControl, ComposerControlIcon } from "./ComposerControl";

/**
 * Astronave: shows only while plan mode is on, like the permissions chip off its default.
 * `data-composer-plan-mode` also tints the composer outline (see ComposerSurface.Shell).
 */
export function ComposerPlanModeChip(props: { size: "sm" | "xs"; onToggle: () => void }) {
  const gt = useGT();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ComposerControl
            data-composer-plan-mode
            size={props.size}
            // One-shot springy entrance; the overshoot curve mimics a soft bounce.
            className="shrink-0 rounded-full ps-2 pe-2.5 text-info-foreground ring-1 ring-info/25 ring-inset aria-pressed:bg-info/10 aria-pressed:text-info-foreground aria-pressed:hover:bg-info/15 dark:text-info motion-safe:animate-[step-in_240ms_cubic-bezier(0.34,1.56,0.64,1)] dark:aria-pressed:text-info"
            aria-pressed
            type="button"
            onClick={props.onToggle}
            aria-label={gt("Plan mode is on. Click to return to build mode.")}
          />
        }
      >
        <ComposerControlIcon icon={ClipboardListIcon} size={props.size} className="text-current" />
        <span data-composer-control-label className={props.size === "xs" ? "sr-only" : undefined}>
          {gt("Plan", { $context: "composer mode: the agent only plans" })}
        </span>
      </TooltipTrigger>
      <TooltipPopup side="top">
        <div className="flex flex-col gap-1 py-0.5">
          <span className="font-medium">{gt("Plan mode")}</span>
          <span className="text-muted-foreground">
            {gt("The agent proposes a plan without editing files.")}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <T>
              <Kbd variant="outline">⇧ Tab</Kbd> returns to build mode
            </T>
          </span>
        </div>
      </TooltipPopup>
    </Tooltip>
  );
}
