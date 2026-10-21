import { MIN_FILL } from "./flow";

/** A piece of content that should not be sliced. Positions are px in the content column. */
export interface BreakRect {
  top: number;
  bottom: number;
}

const EPS = 0.5;
const SHOW_TEXT = 4;

/**
 * Finds every line of text and every image-like element inside `root`,
 * with its position measured from the top of `root`.
 */
export function collectBreakRects(root: HTMLElement): BreakRect[] {
  const base = root.getBoundingClientRect().top;
  const doc = root.ownerDocument;
  const out: BreakRect[] = [];

  const add = (r: { top: number; bottom: number; height: number }) => {
    if (r.height > 0) out.push({ top: r.top - base, bottom: r.bottom - base });
  };

  const walker = doc.createTreeWalker(root, doc.defaultView?.NodeFilter?.SHOW_TEXT ?? SHOW_TEXT);
  const range = doc.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    range.selectNodeContents(node);
    if (typeof range.getClientRects !== "function") break;
    Array.from(range.getClientRects()).forEach(add);
  }

  root
    .querySelectorAll("img, svg, canvas, video, iframe, input, textarea, select")
    .forEach((el) => add(el.getBoundingClientRect()));

  return out;
}

/**
 * Moves a cut up so it does not slice through a line of text or an image.
 * If that would leave the page almost empty (for example one huge image),
 * the original cut is kept and the thing is sliced.
 */
export function snapCut(cut: number, start: number, cap: number, rects: readonly BreakRect[]): number {
  let y = cut;

  for (let i = 0; i <= rects.length; i++) {
    const crossing = rects.filter((r) => r.top < y - EPS && r.bottom > y + EPS);
    if (crossing.length === 0) break;
    y = Math.min(...crossing.map((r) => r.top));
  }

  return y - start >= cap * MIN_FILL ? y : cut;
}
