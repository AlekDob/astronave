import { useEffect, useRef } from "react";

import { cn } from "~/lib/utils";
import type { AstroState } from "./astroFace";
import { mountAstroFace } from "./astroFaceController";
import { ASTRO_LEDS, ASTRO_SUITS, useAstroPrefs } from "./astroPrefs";

const IMAGE_SIZE = 1024;
const BIG = { crop: { x: 0, y: 0, s: IMAGE_SIZE }, cols: 48, rows: 42 } as const;
// The round avatar crops to the helmet so the visor stays readable at 24 px.
const SMALL = { crop: { x: 200, y: 20, s: 620 }, cols: 15, rows: 13 } as const;

const SIZES = {
  preview: { px: 224, grid: BIG, className: "size-56 rounded-xl" },
  hero: { px: 120, grid: BIG, className: "size-30 rounded-xl" },
  row: { px: 24, grid: SMALL, className: "size-6 rounded-full" },
} as const;

export type AstroAvatarSize = keyof typeof SIZES;

export function AstroAvatar({
  size,
  state = "idle",
  interactive = false,
  talks = false,
  className,
}: {
  size: AstroAvatarSize;
  state?: AstroState;
  interactive?: boolean;
  talks?: boolean;
  className?: string;
}) {
  const [prefs] = useAstroPrefs();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { px, grid } = SIZES[size];
  const k = px / grid.crop.s;
  const [vx, vy, vw, vh] = ASTRO_SUITS[prefs.suit].visor;
  const ledColor = ASTRO_LEDS[prefs.led].color;
  const width = vw * k;
  const height = vh * k;
  const mouth = prefs.mouth;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- keeps the LED canvas, its timers and pointer listeners in step with the face settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return mountAstroFace(canvas, {
      ...grid,
      width,
      height,
      state,
      mouth,
      ledColor,
      interactive,
      talks,
    });
  }, [grid, width, height, state, mouth, ledColor, interactive, talks]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative isolate shrink-0 select-none overflow-hidden bg-black",
        SIZES[size].className,
        interactive && "cursor-grab touch-none",
        className,
      )}
    >
      <img
        alt=""
        draggable={false}
        src={ASTRO_SUITS[prefs.suit].src}
        className="pointer-events-none absolute block max-w-none"
        style={{ width: IMAGE_SIZE * k, left: -grid.crop.x * k, top: -grid.crop.y * k }}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute"
        style={{
          left: (vx - grid.crop.x) * k,
          top: (vy - grid.crop.y) * k,
          width,
          height,
        }}
      />
    </div>
  );
}
