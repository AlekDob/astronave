// Astro's LED face, described in 0..1 visor coordinates and rasterized onto a dot grid,
// so the same face reads at hero size (dense grid) and in a 24 px sidebar circle (coarse grid).

export type AstroState = "idle" | "work" | "wait" | "done" | "error";
export type AstroMouthStyle = "sito" | "spessa" | "piccola" | "nessuna";
export type AstroReaction = "wavy" | "bigO" | "open" | "smile" | "big";

export interface AstroFaceInput {
  readonly cols: number;
  readonly rows: number;
  readonly state: AstroState;
  readonly mouth: AstroMouthStyle;
  /** Horizontal gaze step in -1..1; the face never looks up or down. */
  readonly lookX: number;
  readonly blink: boolean;
  readonly tick: number;
  readonly reaction: AstroReaction | null;
  readonly reducedMotion: boolean;
}

interface MouthShape {
  readonly w: number;
  readonly raise: number;
  readonly thick: number;
}

const MOUTH_SHAPES: Record<AstroMouthStyle, MouthShape | null> = {
  sito: { w: 0.13, raise: 2, thick: 1 },
  spessa: { w: 0.13, raise: 2, thick: 2 },
  piccola: { w: 0.07, raise: 1, thick: 1 },
  nessuna: null,
};
const DEFAULT_MOUTH: Record<Exclude<AstroState, "work">, AstroReaction | "o" | "flat"> = {
  idle: "smile",
  wait: "o",
  done: "big",
  error: "flat",
};
const EYES = [0.37, 0.63] as const;

type Pen = ReturnType<typeof createPen>;

function createPen(cols: number, rows: number) {
  const lit = new Set<number>();
  const set = (c: number, r: number) => {
    if (c >= 0 && r >= 0 && c < cols && r < rows) lit.add(r * cols + c);
  };
  const mark = (u: number, v: number) => set(Math.floor(u * cols), Math.floor(v * rows));
  const line = (u1: number, v1: number, u2: number, v2: number) => {
    const n = Math.ceil(Math.max(Math.abs(u2 - u1) * cols, Math.abs(v2 - v1) * rows) * 2) + 1;
    for (let i = 0; i <= n; i++) mark(u1 + ((u2 - u1) * i) / n, v1 + ((v2 - v1) * i) / n);
  };
  const ring = (rx: number, ry: number) => {
    let prev: readonly [number, number] = [0.5 + rx, 0.71];
    for (let i = 1; i <= 40; i++) {
      const t = (i / 40) * 2 * Math.PI;
      const next = [0.5 + rx * Math.cos(t), 0.71 + ry * Math.sin(t)] as const;
      line(prev[0], prev[1], next[0], next[1]);
      prev = next;
    }
  };
  return { lit, set, line, ring, cols, rows };
}

// Eye = LED rectangle with one-cell rounded corners.
function rect(pen: Pen, cu: number, cv: number, hw: number, hh: number, round = true) {
  const { cols, rows } = pen;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const du = Math.abs((c + 0.5) / cols - cu);
      const dv = Math.abs((r + 0.5) / rows - cv);
      if (du > hw || dv > hh) continue;
      const corner = du > hw - 1 / cols && dv > hh - 1 / rows;
      if (round && hh > 1.5 / rows && corner) continue;
      pen.set(c, r);
    }
  }
}

// "Tub" smile: flat bottom, ends stepping up one cell at a time.
function tub(pen: Pen, w: number, base: number, raise: number, thick: number) {
  const c1 = Math.round((0.5 - w) * pen.cols);
  const c2 = Math.round((0.5 + w) * pen.cols);
  const r0 = Math.floor(base * pen.rows);
  for (let c = c1; c <= c2; c++) {
    const up = Math.max(0, raise - Math.min(c - c1, c2 - c));
    for (let t = 0; t < thick; t++) pen.set(c, r0 - up + t);
  }
}

// One LED per column, so the wave never doubles up.
function wave(pen: Pen) {
  const w = 0.15;
  const c1 = Math.round((0.5 - w) * pen.cols);
  const c2 = Math.round((0.5 + w) * pen.cols);
  for (let c = c1; c <= c2; c++) {
    const x = ((c + 0.5) / pen.cols - 0.5) / w;
    pen.set(c, Math.floor((0.7 + 0.025 * Math.sin(x * 9.4)) * pen.rows));
  }
}

function drawMouth(pen: Pen, kind: AstroReaction | "o" | "flat", style: MouthShape | null) {
  if (kind === "smile") {
    if (style) tub(pen, style.w, 0.7, style.raise, style.thick);
  } else if (kind === "big") {
    tub(pen, (style?.w ?? 0.13) + 0.03, 0.69, (style?.raise ?? 2) + 1, style?.thick ?? 1);
  } else if (kind === "o") pen.ring(0.035, 0.04);
  else if (kind === "bigO") pen.ring(0.05, 0.065);
  else if (kind === "flat") pen.line(0.42, 0.7, 0.58, 0.7);
  else if (kind === "wavy") wave(pen);
  else rect(pen, 0.5, 0.71, 0.06, 0.035, false);
}

// Working: squinted eyes and a bar that scans left and right, 32 ticks per round trip.
function drawWork(pen: Pen, tick: number, reducedMotion: boolean) {
  const n = 16;
  const k = tick % (2 * n);
  const p = reducedMotion ? 0.5 : 0.36 + (0.28 * (k <= n ? k : 2 * n - k)) / n;
  for (const u of EYES) rect(pen, u + (p - 0.5) * 0.15, 0.43, 0.06, 0.03);
  pen.line(p - 0.04, 0.7, p + 0.04, 0.7);
}

function drawEyes(pen: Pen, input: AstroFaceInput) {
  const { state, reaction, blink } = input;
  const dx = input.lookX * 0.05;
  if (state === "error" && !reaction) {
    for (const u of EYES) {
      pen.line(u - 0.05, 0.35, u + 0.05, 0.47);
      pen.line(u - 0.05, 0.47, u + 0.05, 0.35);
    }
    return;
  }
  if (state === "done" && !reaction) {
    for (const u of EYES) {
      pen.line(u + dx - 0.06, 0.45, u + dx, 0.37);
      pen.line(u + dx, 0.37, u + dx + 0.06, 0.45);
    }
    return;
  }
  const wide = reaction === "bigO" || state === "wait";
  const hh = blink && !wide ? 0.008 : reaction === "wavy" ? 0.025 : wide ? 0.09 : 0.075;
  for (const u of EYES) rect(pen, u + dx, wide ? 0.38 : 0.41, wide ? 0.07 : 0.06, hh);
}

/** Lit cell indices (`row * cols + col`), clipped to the visor ellipse. */
export function rasterAstroFace(input: AstroFaceInput): number[] {
  const pen = createPen(input.cols, input.rows);
  if (input.state === "work") {
    drawWork(pen, input.tick, input.reducedMotion);
  } else {
    drawEyes(pen, input);
    drawMouth(pen, input.reaction ?? DEFAULT_MOUTH[input.state], MOUTH_SHAPES[input.mouth]);
  }
  return [...pen.lit].filter((i) => {
    const eu = ((i % input.cols) + 0.5) / input.cols - 0.5;
    const ev = (Math.floor(i / input.cols) + 0.5) / input.rows - 0.5;
    return eu * eu + ev * ev <= 0.2;
  });
}

/** Gaze step for a pointer offset from the face center, in half steps from -1 to 1. */
export function astroLookStep(offsetX: number, viewportWidth: number): number {
  const ratio = Math.max(-1, Math.min(1, offsetX / (viewportWidth / 3)));
  return Math.round(ratio * 2) / 2;
}
