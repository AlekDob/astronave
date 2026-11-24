import { describe, expect, it } from "vite-plus/test";

import { astroLookStep, rasterAstroFace, type AstroFaceInput } from "./astroFace";

const BASE: AstroFaceInput = {
  cols: 48,
  rows: 42,
  state: "idle",
  mouth: "sito",
  lookX: 0,
  blink: false,
  tick: 0,
  reaction: null,
  reducedMotion: false,
};

const colsOf = (dots: number[]) => dots.map((i) => i % BASE.cols);

describe("rasterAstroFace", () => {
  it("keeps every dot inside the visor ellipse", () => {
    for (const i of rasterAstroFace(BASE)) {
      const eu = ((i % 48) + 0.5) / 48 - 0.5;
      const ev = (Math.floor(i / 48) + 0.5) / 42 - 0.5;
      expect(eu * eu + ev * ev).toBeLessThanOrEqual(0.2);
    }
  });

  it("blinking and the no-mouth style light fewer dots", () => {
    const idle = rasterAstroFace(BASE).length;
    expect(rasterAstroFace({ ...BASE, blink: true }).length).toBeLessThan(idle);
    expect(rasterAstroFace({ ...BASE, mouth: "nessuna" }).length).toBeLessThan(idle);
  });

  it("looking right shifts the eyes but not the mouth", () => {
    const center = rasterAstroFace({ ...BASE, mouth: "nessuna" });
    const right = rasterAstroFace({ ...BASE, mouth: "nessuna", lookX: 1 });
    expect(Math.min(...colsOf(right))).toBeGreaterThan(Math.min(...colsOf(center)));
    const mouthOnly = (lookX: number) =>
      rasterAstroFace({ ...BASE, lookX }).filter((i) => Math.floor(i / 48) >= 26);
    expect(mouthOnly(1)).toEqual(mouthOnly(0));
  });

  it("the work bar moves with the tick, and stays put with reduced motion", () => {
    const work = { ...BASE, state: "work" } as const;
    expect(rasterAstroFace({ ...work, tick: 4 })).not.toEqual(rasterAstroFace(work));
    const still = { ...work, reducedMotion: true };
    expect(rasterAstroFace({ ...still, tick: 4 })).toEqual(rasterAstroFace(still));
  });

  it("draws a readable face on the small grid", () => {
    expect(rasterAstroFace({ ...BASE, cols: 15, rows: 13 }).length).toBeGreaterThan(6);
  });
});

describe("astroLookStep", () => {
  it("steps in halves and clamps", () => {
    expect(astroLookStep(0, 900)).toBe(0);
    expect(astroLookStep(80, 900)).toBe(0.5);
    expect(astroLookStep(-5000, 900)).toBe(-1);
  });
});
