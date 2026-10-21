/** A `PageElement` as laid out in the continuous column. Numbers are px. */
export interface Region {
  /** Top of the region (its header, then the element). */
  top: number;
  bottom: number;
  /** Height of the region's header. */
  head: number;
}

export interface FlowInput {
  /** Total height of the content when laid out as one tall column. */
  contentHeight: number;
  /** Usable height of one page before the continuation notice takes space. */
  bodyHeight: number;
  /** Height reserved for the notice on pages that continue. */
  continuationNoticeHeight?: number;
  /** Height of the header on page 1. */
  firstHead: number;
  /** Height of the continuation header on later pages. */
  contHead: number;
  regions: readonly Region[];
  /**
   * Moves a nominal cut position to a nicer one (for example above a line of
   * text it would slice). Receives the cut, the page start and the page capacity.
   */
  snap?: (cut: number, start: number, cap: number) => number;
}

export interface FlowPage {
  /** Where this page's slice of the content column starts. */
  start: number;
  /** Where it ends. */
  end: number;
  /** Height available for content on this page. */
  cap: number;
  /** Index of the region whose header repeats at the top of this page, or -1. */
  open: number;
}

export interface FlowResult {
  pages: FlowPage[];
  /** Combined content height of all pages. The column is at least this tall. */
  total: number;
}

const EPS = 0.5;
const MIN_CAP = 20;
const MAX_PAGES = 2000;
/** A region header needs at least this much content under it on its page. */
const KEEP_WITH_HEADER = 24;
/** A cut may not leave a page emptier than this fraction of its capacity. */
export const MIN_FILL = 0.2;

/**
 * Cuts one tall column into pages.
 *
 * Every page shows the next slice of the column. A page gets less room when
 * it has to carry the continuation header, and when it begins inside a
 * `PageElement`, the element's header too. Non-final pages also reserve
 * continuation-notice space; the final page keeps the full available height.
 */
export function computeFlow({
  contentHeight,
  bodyHeight,
  continuationNoticeHeight = 0,
  firstHead,
  contHead,
  regions,
  snap = (cut) => cut,
}: FlowInput): FlowResult {
  const pages: FlowPage[] = [];
  let start = 0;

  for (let k = 0; k < MAX_PAGES; k++) {
    const open =
      k === 0
        ? -1
        : regions.findIndex((r) => r.top + r.head <= start + EPS && start < r.bottom - EPS);
    const extra = (k === 0 ? firstHead : contHead) + (open >= 0 ? (regions[open] as Region).head : 0);
    const fullCap = Math.max(bodyHeight - extra, MIN_CAP);
    const lastPage = start + fullCap >= contentHeight - EPS;
    const cap = lastPage ? fullCap : Math.max(fullCap - continuationNoticeHeight, MIN_CAP);
    const nominal = start + cap;

    if (lastPage) {
      pages.push({ start, end: nominal, cap, open });
      break;
    }

    let end = snap(nominal, start, cap);

    // never leave a region header alone at the bottom of a page
    const lonely = regions.find(
      (r) => r.head > 0 && r.top > start + EPS && r.top < end && end < r.top + r.head + KEEP_WITH_HEADER,
    );
    if (lonely && lonely.top - start >= cap * MIN_FILL) end = lonely.top;

    if (end <= start + EPS) end = nominal;

    pages.push({ start, end, cap, open });
    start = end;
  }

  const last = pages[pages.length - 1] as FlowPage;
  return { pages, total: last.start + last.cap };
}
