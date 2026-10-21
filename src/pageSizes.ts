import type { PageProps } from "./types";

/** Paper sizes in millimetres (portrait). */
export const PAGE_SIZES = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
} as const;

/** Default margins in millimetres. */
export const DEFAULT_MARGIN = { top: 15, right: 15, bottom: 8, left: 15 } as const;

/**
 * Sheets are drawn this much shorter than the paper. A sheet that is exactly
 * paper height often causes a blank trailing page because of rounding.
 */
export const HEIGHT_TOLERANCE_MM = 1;

export interface Geometry {
  /** Paper width in mm, after orientation. */
  width: number;
  /** Paper height in mm, after orientation. */
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

/** Turns the page props into final width, height and margins (mm). */
export function resolveGeometry(p: PageProps): Geometry {
  let base: { width: number; height: number } = PAGE_SIZES.A4;

  if (p.size === "custom") {
    if (p.width > 0 && p.height > 0) {
      base = { width: p.width, height: p.height };
    } else if (typeof console !== "undefined") {
      console.warn('elses-pdf: size="custom" needs a positive width and height. Using A4.');
    }
  } else if (p.size && PAGE_SIZES[p.size]) {
    base = PAGE_SIZES[p.size];
  }

  const landscape = p.orientation === "landscape";

  return {
    width: landscape ? base.height : base.width,
    height: landscape ? base.width : base.height,
    margin: {
      top: p.mt ?? p.my ?? p.m ?? DEFAULT_MARGIN.top,
      right: p.mr ?? p.mx ?? p.m ?? DEFAULT_MARGIN.right,
      bottom: p.mb ?? p.my ?? p.m ?? DEFAULT_MARGIN.bottom,
      left: p.ml ?? p.mx ?? p.m ?? DEFAULT_MARGIN.left,
    },
  };
}

/** CSS for printing: the `@page` size and the page break rules. */
export function getPageCss(width: number, height: number): string {
  return [
    `@page { size: ${width}mm ${height}mm; margin: 0; }`,
    `.elses-pdf-page { break-after: page; page-break-after: always; }`,
    `.elses-pdf-page:last-child { break-after: auto; page-break-after: auto; }`,
    `@media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`,
  ].join("\n");
}
