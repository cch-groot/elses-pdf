import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { PageElement } from "./PageElement";
import { Sheet } from "./Sheet";
import { computeFlow, type FlowResult, type Region } from "./flow";
import { getPageCss, resolveGeometry } from "./pageSizes";
import { collectBreakRects, collectKeepTogetherRects, snapCut } from "./snap";
import type { PageElementProps, PageInfo, PageProps } from "./types";
import { resolveSlot, whenAssetsReady } from "./utils";

// flow-root keeps child margins inside the measured height
const BOX: CSSProperties = { display: "flow-root", flexShrink: 0 };
const COLUMN: CSSProperties = { display: "flex", flexDirection: "column" };

const MEASURE_ROOT: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  visibility: "hidden",
  pointerEvents: "none",
};

// representative page info used while measuring
const FIRST: PageInfo = { page: 1, pages: 2 };
// Model a non-final continuation page so its notice is included in measurement.
const LATER: PageInfo = { page: 2, pages: 3 };
const LAST: PageInfo = { page: 2, pages: 2 };
const ONLY: PageInfo = { page: 1, pages: 1 };

type Entry =
  | { kind: "block"; node: ReactNode }
  | { kind: "element"; header: ReactNode; element: ReactElement };

function toEntries(children: ReactNode): Entry[] {
  return Children.toArray(children).map((child): Entry => {
    if (isValidElement(child) && child.type === PageElement) {
      const { element, header } = child.props as PageElementProps;
      return { kind: "element", header, element };
    }
    return { kind: "block", node: child };
  });
}

interface Measured {
  props: PageProps;
  flow: FlowResult;
  /** Entry index of every region, in the same order as the regions. */
  regionEntries: number[];
}

/**
 * A multi-page document. Put your content inside as children, top to bottom.
 *
 * All the content is laid out as one tall column, and each page shows the
 * next slice of it, so content flows from page to page and can be cut almost
 * anywhere. Cuts fall between lines of text, not through them.
 * Wrap content in `<PageElement header={...}>` to repeat a header on every
 * page that continues it.
 */
export function Page(props: PageProps): ReactElement {
  const { header, continuationHeader, footer, onReady, children } = props;

  const geo = resolveGeometry(props);
  const entries = toEntries(children);

  const [measured, setMeasured] = useState<Measured | null>(null);
  const current = measured && measured.props === props ? measured : null;

  const measureRootRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const continuationNoticeRef = useRef<HTMLDivElement>(null);
  const firstHeadRef = useRef<HTMLDivElement>(null);
  const contHeadRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const regionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const regionHeadRefs = useRef<(HTMLDivElement | null)[]>([]);
  const styleRef = useRef<HTMLStyleElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Pass 1: measure everything, then work out the pages.
  // Runs again whenever the props change (a new render from the parent).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const root = measureRootRef.current;
      if (!root) return;
      await whenAssetsReady(root);
      const column = columnRef.current;
      if (cancelled || !column) return;

      const h = (el: HTMLElement | null) =>
        el?.getBoundingClientRect().height ?? 0;
      const columnTop = column.getBoundingClientRect().top;

      // Measure the usable area without the notice, while keeping footer variants conservative.
      const continuationNoticeHeight = h(continuationNoticeRef.current);
      const bodyHeight = Math.min(
        ...bodyRefs.current.map((el, i) => {
          const measuredHeight = el ? h(el) : Infinity;
          // The first and middle-page samples include the notice; restore that space here.
          return i < 2
            ? measuredHeight + continuationNoticeHeight
            : measuredHeight;
        }),
      );

      const regions: Region[] = [];
      const regionEntries: number[] = [];
      entries.forEach((entry, i) => {
        const el = regionRefs.current[i];
        if (entry.kind !== "element" || !el) return;
        const r = el.getBoundingClientRect();
        regions.push({
          top: r.top - columnTop,
          bottom: r.bottom - columnTop,
          head: h(regionHeadRefs.current[i] ?? null),
        });
        regionEntries.push(i);
      });

      const rects = collectBreakRects(column);
      const keepTogetherRects = collectKeepTogetherRects(column);

      setMeasured({
        props,
        regionEntries,
        flow: computeFlow({
          contentHeight: h(column),
          bodyHeight,
          continuationNoticeHeight,
          firstHead: h(firstHeadRef.current),
          contHead: h(contHeadRef.current),
          regions,
          snap: (cut, start, cap) => snapCut(cut, start, cap, rects, keepTogetherRects),
        }),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [props]);

  // Pass 2 rendered: tell the caller it is safe to print.
  // Uses the animation frame of the window the document lives in, because
  // it may be a pop-up rather than the main window.
  useEffect(() => {
    if (!current) return;
    const win = styleRef.current?.ownerDocument.defaultView ?? window;
    const id = win.requestAnimationFrame(() => onReadyRef.current?.());
    return () => win.cancelAnimationFrame(id);
  }, [current]);

  /* ---------------------- Pass 1: hidden measuring ----------------------- */
  if (!current) {
    return (
      <div ref={measureRootRef} aria-hidden style={MEASURE_ROOT}>
        <Sheet
          {...geo}
          info={FIRST}
          footer={footer}
          continuationNoticeRef={continuationNoticeRef}
          bodyRef={(el) => {
            bodyRefs.current[0] = el;
          }}
        >
          <div ref={firstHeadRef} style={BOX}>
            {resolveSlot(header, FIRST)}
          </div>
          <div ref={contHeadRef} style={BOX}>
            {resolveSlot(continuationHeader, LATER)}
          </div>

          <div ref={columnRef} style={COLUMN}>
            {entries.map((entry, i) =>
              entry.kind === "block" ? (
                <Fragment key={i}>{entry.node}</Fragment>
              ) : (
                <div
                  key={i}
                  ref={(el) => {
                    regionRefs.current[i] = el;
                  }}
                  style={BOX}
                >
                  <div
                    ref={(el) => {
                      regionHeadRefs.current[i] = el;
                    }}
                    style={BOX}
                  >
                    {entry.header}
                  </div>
                  {entry.element}
                </div>
              ),
            )}
          </div>
        </Sheet>

        {/* empty sheets, only to read the body height with the other footer states */}
        <Sheet
          {...geo}
          info={LATER}
          footer={footer}
          bodyRef={(el) => {
            bodyRefs.current[1] = el;
          }}
        />
        <Sheet
          {...geo}
          info={LAST}
          footer={footer}
          bodyRef={(el) => {
            bodyRefs.current[2] = el;
          }}
        />
        <Sheet
          {...geo}
          info={ONLY}
          footer={footer}
          bodyRef={(el) => {
            bodyRefs.current[3] = el;
          }}
        />
      </div>
    );
  }

  /* ----------------------- Pass 2: real pages ---------------------------- */
  const { flow, regionEntries } = current;
  const total = flow.pages.length;

  return (
    <>
      <style ref={styleRef}>{getPageCss(geo.width, geo.height)}</style>
      {flow.pages.map((pg, p) => {
        const info: PageInfo = { page: p + 1, pages: total };
        const openEntry =
          pg.open >= 0
            ? (entries[regionEntries[pg.open] as number] as Entry)
            : null;

        return (
          <Sheet key={p} {...geo} info={info} footer={footer}>
            {resolveSlot(p === 0 ? header : continuationHeader, info)}

            {openEntry && openEntry.kind === "element" ? (
              <div style={BOX}>{openEntry.header}</div>
            ) : null}

            {/* this page's window onto the tall column */}
            <div
              data-elses-window=""
              style={{
                height: pg.end - pg.start,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  ...COLUMN,
                  minHeight: flow.total,
                  transform: `translateY(${-pg.start}px)`,
                }}
              >
                {entries.map((entry, i) =>
                  entry.kind === "block" ? (
                    <Fragment key={i}>{entry.node}</Fragment>
                  ) : (
                    <div key={i} style={BOX}>
                      <div style={BOX}>{entry.header}</div>
                      {entry.element}
                    </div>
                  ),
                )}
              </div>
            </div>
          </Sheet>
        );
      })}
    </>
  );
}
