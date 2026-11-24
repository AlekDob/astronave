import {
  astroLookStep,
  rasterAstroFace,
  type AstroMouthStyle,
  type AstroReaction,
  type AstroState,
} from "./astroFace";

export interface AstroFaceOptions {
  readonly cols: number;
  readonly rows: number;
  /** Canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  readonly state: AstroState;
  readonly mouth: AstroMouthStyle;
  readonly ledColor: string;
  /** Hover, click and drag reactions on the canvas's parent element. */
  readonly interactive: boolean;
  /** Talks while the user types in the chat composer. */
  readonly talks: boolean;
}

const COMPOSER_SELECTOR = "[data-chat-composer-stack]";

function drawDots(canvas: HTMLCanvasElement, dots: number[], opts: AstroFaceOptions) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(opts.width * dpr);
  canvas.height = Math.round(opts.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0) return;
  const cw = canvas.width / opts.cols;
  const ch = canvas.height / opts.rows;
  const dot = Math.min(cw, ch) * 0.36;
  // Slight RGB fringe like the website video, only when the LEDs are big enough to show it.
  const fringe = cw / dpr >= 2.5 ? dot * 0.35 : 0;
  ctx.globalCompositeOperation = "lighter";
  for (const i of dots) {
    const x = ((i % opts.cols) + 0.5) * cw;
    const y = (Math.floor(i / opts.cols) + 0.5) * ch;
    if (fringe) drawFringe(ctx, x, y, dot, fringe);
    ctx.globalAlpha = 1;
    ctx.fillStyle = opts.ledColor;
    ctx.shadowColor = opts.ledColor;
    ctx.shadowBlur = dot * 3;
    fillDot(ctx, x, y, dot);
  }
}

function drawFringe(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, d: number) {
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#ff2a55";
  fillDot(ctx, x - d, y, r);
  ctx.fillStyle = "#2a7bff";
  fillDot(ctx, x + d, y, r);
}

function fillDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * Owns one avatar's canvas. It redraws only when something changes (gaze step, blink,
 * reaction, work tick) and never runs a frame loop; the work bar is the only interval.
 */
export function mountAstroFace(canvas: HTMLCanvasElement, opts: AstroFaceOptions): () => void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const face = { lookX: 0, blink: false, tick: 0, hover: false, drag: false, wowUntil: 0 };
  const talk = { count: 0, until: 0 };
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  const reaction = (): AstroReaction | null => {
    const now = performance.now();
    if (face.drag) return "wavy";
    if (now < face.wowUntil) return "bigO";
    if (now < talk.until) return talk.count % 2 ? "open" : "smile";
    return face.hover ? "big" : null;
  };
  const draw = () =>
    drawDots(
      canvas,
      rasterAstroFace({ ...opts, ...face, reaction: reaction(), reducedMotion }),
      opts,
    );

  const cleanups = [
    watchGaze(canvas, (lookX) => {
      if (lookX === face.lookX) return;
      face.lookX = lookX;
      draw();
    }),
  ];
  if (!reducedMotion) scheduleBlink(face, draw, later);
  if (opts.state === "work" && !reducedMotion) {
    const id = setInterval(() => {
      face.tick++;
      draw();
    }, 125);
    cleanups.push(() => clearInterval(id));
  }
  if (opts.interactive) cleanups.push(watchReactions(canvas, face, draw, later));
  if (opts.talks) cleanups.push(watchComposerTyping(talk, draw, later));
  draw();
  return () => {
    for (const id of timers) clearTimeout(id);
    for (const cleanup of cleanups) cleanup();
  };
}

type Later = (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;

function scheduleBlink(face: { blink: boolean }, draw: () => void, later: Later) {
  later(
    () => {
      face.blink = true;
      draw();
      later(() => {
        face.blink = false;
        draw();
        scheduleBlink(face, draw, later);
      }, 130);
    },
    2500 + Math.random() * 3500,
  );
}

// Eyes follow the pointer horizontally in steps, and return to center after 3 s of stillness.
function watchGaze(canvas: HTMLCanvasElement, onLook: (lookX: number) => void) {
  let frame = 0;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let pointerX: number | null = null;
  const update = () => {
    frame = 0;
    const rect = canvas.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    onLook(astroLookStep((pointerX ?? center) - center, window.innerWidth));
  };
  const onMove = (event: PointerEvent) => {
    pointerX = event.clientX;
    if (!frame) frame = requestAnimationFrame(update);
    clearTimeout(idle);
    idle = setTimeout(() => {
      pointerX = null;
      update();
    }, 3000);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    cancelAnimationFrame(frame);
    clearTimeout(idle);
  };
}

interface ReactionState {
  hover: boolean;
  drag: boolean;
  wowUntil: number;
}

function watchReactions(
  canvas: HTMLCanvasElement,
  face: ReactionState,
  draw: () => void,
  later: Later,
) {
  const stage = canvas.parentElement;
  if (!stage) return () => {};
  let press: { x: number; y: number } | null = null;
  const handlers = {
    pointerenter: () => {
      face.hover = true;
      draw();
    },
    pointerleave: () => {
      face.hover = false;
      draw();
    },
    pointerdown: (event: PointerEvent) => {
      press = { x: event.clientX, y: event.clientY };
      stage.setPointerCapture(event.pointerId);
    },
    pointermove: (event: PointerEvent) => {
      if (!press || face.drag || Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6)
        return;
      face.drag = true;
      draw();
    },
    pointerup: () => {
      if (press && !face.drag) {
        face.wowUntil = performance.now() + 900;
        later(draw, 910);
      }
      face.drag = false;
      press = null;
      draw();
    },
  };
  return listenAll(stage, handlers);
}

function listenAll(
  target: HTMLElement,
  handlers: Record<string, (event: PointerEvent) => void>,
): () => void {
  const entries = Object.entries(handlers) as [keyof HTMLElementEventMap, EventListener][];
  for (const [type, handler] of entries) target.addEventListener(type, handler);
  return () => {
    for (const [type, handler] of entries) target.removeEventListener(type, handler);
  };
}

// Each keystroke in the composer flips the mouth open/closed; it settles 350 ms after the last one.
function watchComposerTyping(
  talk: { count: number; until: number },
  draw: () => void,
  later: Later,
) {
  let settle: ReturnType<typeof setTimeout> | undefined;
  const onInput = (event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest(COMPOSER_SELECTOR)) return;
    talk.count++;
    talk.until = performance.now() + 350;
    draw();
    if (settle !== undefined) clearTimeout(settle);
    settle = later(draw, 360);
  };
  document.addEventListener("input", onInput, true);
  return () => document.removeEventListener("input", onInput, true);
}
