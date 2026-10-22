import { MIN_FILL } from "./flow";

/** A piece of content that should not be sliced. Positions are px in the content column. */
export interface BreakRect {
  top: number;
  bottom: number;
}

export interface KeepTogetherRect {
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

const px = (value: string | null | undefined): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

function isCompactHorizontalRow(el: HTMLElement, style: CSSStyleDeclaration, rect: DOMRect): boolean {
  const flexRow =
    (style.display === "flex" || style.display === "inline-flex") &&
    (style.flexDirection === "row" || style.flexDirection === "row-reverse");
  const grid = style.display === "grid" || style.display === "inline-grid";
  if (!flexRow && !grid) return false;

  const children = Array.from(el.children) as HTMLElement[];
  if (children.length < 2) return false;

  const rects = children.map((child) => child.getBoundingClientRect()).filter((r) => r.height > 0);
  if (rects.length < 2) return false;

  // The children must share a vertical band. This rejects wrapped flex/grid
  // collections and column layouts while accepting aligned cells.
  const commonTop = Math.max(...rects.map((r) => r.top));
  const commonBottom = Math.min(...rects.map((r) => r.bottom));
  const overlap = Math.max(0, commonBottom - commonTop);
  const shortestChild = Math.min(...rects.map((r) => r.height));
  if (overlap < shortestChild * 0.35) return false;

  // Keep compact rows, not large flex/grid cards. Ordinary paragraphs are
  // block content, so they remain eligible for line-by-line cuts.
  const lineHeight = px(style.lineHeight) || px(style.fontSize) * 1.2 || 19.2;
  const verticalBoxSpace =
    px(style.paddingTop) +
    px(style.paddingBottom) +
    px(style.borderTopWidth) +
    px(style.borderBottomWidth);
  const contentHeight = Math.max(0, rect.height - verticalBoxSpace);
  return contentHeight <= lineHeight * 4;
}

/**
 * Finds semantic table rows and compact horizontal rows that can be moved as
 * a unit. `getBoundingClientRect()` includes their padding and border.
 *
 * Custom blocks can opt in with `data-elses-keep-together`. Ordinary block
 * text is intentionally not kept together, so paragraphs can flow by line.
 */
export function collectKeepTogetherRects(root: HTMLElement): KeepTogetherRect[] {
  const base = root.getBoundingClientRect().top;
  const view = root.ownerDocument.defaultView;
  if (!view) return [];

  const out: KeepTogetherRect[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;

    const style = view.getComputedStyle(el);
    const isTableRow = el.tagName.toLowerCase() === "tr" || style.display === "table-row";
    const isExplicit = el.hasAttribute("data-elses-keep-together");
    if (!isTableRow && !isExplicit && !isCompactHorizontalRow(el, style, rect)) return;

    const marginTop = px(style.marginTop);
    const marginBottom = px(style.marginBottom);
    out.push({
      top: rect.top - base - marginTop,
      bottom: rect.bottom - base + marginBottom,
    });
  });

  return out;
}

/**
 * Moves a cut above a fitting row first, then above any text line or image it
 * would slice. Oversized rows and near-empty-page moves fall back to line flow.
 */
export function snapCut(
  cut: number,
  start: number,
  cap: number,
  rects: readonly BreakRect[],
  keepTogether: readonly KeepTogetherRect[] = [],
): number {
  let y = cut;

  for (let i = 0; i <= keepTogether.length; i++) {
    const candidate = keepTogether
      .filter(
        (r) =>
          r.top < y - EPS &&
          r.bottom > y + EPS &&
          r.bottom - r.top <= cap + EPS &&
          r.top - start >= cap * MIN_FILL,
      )
      .sort((a, b) => b.top - a.top || a.bottom - b.bottom)[0];
    if (!candidate) break;
    y = candidate.top;
  }

  for (let i = 0; i <= rects.length; i++) {
    const crossing = rects.filter((r) => r.top < y - EPS && r.bottom > y + EPS);
    if (crossing.length === 0) break;
    y = Math.min(...crossing.map((r) => r.top));
  }

  return y - start >= cap * MIN_FILL ? y : cut;
}
