// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Page, PageElement } from "./index";

/*
 * jsdom has no layout engine, so this file simulates a tiny one:
 * - an element's height is data-h, or data-lines x data-lh, or the sum of its children
 * - children stack vertically
 * - the page body is `bodyH` tall
 * - text nodes inside a data-lines element produce one rect per line
 * That is enough to test the whole wiring: measuring, cutting, windows, headers.
 */
let bodyH = 500;

function heightOf(el: Element): number {
  if (el.hasAttribute("data-elses-pdf-body")) return bodyH;
  const h = el.getAttribute("data-h");
  if (h) return Number(h);
  const n = el.getAttribute("data-lines");
  if (n) return Number(n) * Number(el.getAttribute("data-lh"));
  return Array.from(el.children).reduce((s, c) => s + heightOf(c), 0);
}

function topOf(el: Element): number {
  let top = 0;
  let node: Element | null = el;
  while (node && node.parentElement) {
    for (const sib of Array.from(node.parentElement.children)) {
      if (sib === node) break;
      top += heightOf(sib);
    }
    node = node.parentElement;
  }
  return top;
}

const rect = (top: number, height: number) =>
  ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
  }) as DOMRect;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  Element.prototype.getBoundingClientRect = function (this: Element) {
    return rect(topOf(this), heightOf(this));
  };

  Range.prototype.getClientRects = function (this: Range) {
    const el = (this.startContainer as Node).parentElement;
    const n = Number(el?.getAttribute("data-lines") ?? 0);
    const lh = Number(el?.getAttribute("data-lh") ?? 0);
    if (!el || !n) return [] as unknown as DOMRectList;
    const top = topOf(el);
    return Array.from({ length: n }, (_, i) =>
      rect(top + i * lh, lh),
    ) as unknown as DOMRectList;
  };
});

let root: Root | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  bodyH = 500;
});

async function mount(ui: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(ui);
    await new Promise((r) => setTimeout(r, 20));
  });
  return host;
}

const sheets = (h: HTMLElement) =>
  Array.from(h.querySelectorAll(".elses-pdf-page"));
const windowOf = (sheet: Element) =>
  sheet.querySelector("[data-elses-window]") as HTMLElement;
const offsetOf = (sheet: Element) =>
  Number(
    /translateY\(-?([\d.]+)px\)/.exec(
      (windowOf(sheet).firstElementChild as HTMLElement).style.transform,
    )![1],
  );
const heightPx = (sheet: Element) => parseFloat(windowOf(sheet).style.height);
const offsets = (h: HTMLElement) => sheets(h).map(offsetOf);

/** a block of text lines: n lines, each lh px tall */
const Lines = ({
  n,
  lh = 10,
  tag = "",
}: {
  n: number;
  lh?: number;
  tag?: string;
}) => (
  <div data-lines={n} data-lh={lh} data-tag={tag}>
    text
  </div>
);

describe("<Page> flow", () => {
  it("renders a single page for small content", async () => {
    const h = await mount(
      <Page>
        <div data-h="100" />
      </Page>,
    );
    expect(sheets(h)).toHaveLength(1);
    expect(
      sheets(h)[0]?.querySelector("[data-elses-continuation-notice]"),
    ).toBeNull();
  });

  it("renders a single page with no content", async () => {
    const h = await mount(<Page />);
    expect(sheets(h)).toHaveLength(1);
  });

  it("cuts a component made of 4 children x 25 lines on a 48 line page after line 48", async () => {
    bodyH = 480;
    const Card = () => (
      <div>
        <Lines n={25} tag="a" />
        <Lines n={25} tag="b" />
        <Lines n={25} tag="c" />
        <Lines n={25} tag="d" />
      </div>
    );
    const h = await mount(
      <Page>
        <Card />
      </Page>,
    );
    // 100 lines of 10px = 1000px. 48 lines per page: cuts at 480, 960
    expect(offsets(h)).toEqual([0, 480, 960]);
    expect(heightPx(sheets(h)[0]!)).toBe(480); // 25 lines of "a" + 23 lines of "b"
  });

  it("cuts between lines, not through one", async () => {
    const h = await mount(
      <Page>
        <Lines n={100} lh={12} />
      </Page>,
    );
    // 500 is inside the line that spans 492..504, so the cut moves up to 492
    expect(offsets(h).slice(0, 2)).toEqual([0, 492]);
    expect(heightPx(sheets(h)[0]!)).toBe(492);
  });

  it("slices a single line taller than a page instead of looping", async () => {
    const h = await mount(
      <Page>
        <Lines n={1} lh={900} />
      </Page>,
    );
    expect(offsets(h)).toEqual([0, 500]);
  });

  it("slices content that has no lines (like a plain tall block)", async () => {
    const h = await mount(
      <Page>
        <div data-h="900" />
      </Page>,
    );
    expect(offsets(h)).toEqual([0, 500]);
  });

  it("gives pages less room for the header and the continuation header", async () => {
    const h = await mount(
      <Page
        header={<div data-h="50" />}
        continuationHeader={<div data-h="30" />}
      >
        <Lines n={150} />
      </Page>,
    );
    expect(offsets(h)).toEqual([0, 450, 920, 1390]);
  });

  it("shows header on page 1 only, continuationHeader on the rest, footer on all", async () => {
    const h = await mount(
      <Page
        header={<div data-h="50" data-test="first" />}
        continuationHeader={<div data-h="30" data-test="cont" />}
        footer={({ page, pages }) => (
          <span data-test="footer">{`${page}/${pages}`}</span>
        )}
      >
        <Lines n={100} />
      </Page>,
    );
    const all = sheets(h);
    expect(all).toHaveLength(3);
    expect(all[0]!.querySelector('[data-test="first"]')).not.toBeNull();
    expect(all[1]!.querySelector('[data-test="first"]')).toBeNull();
    expect(all[1]!.querySelector('[data-test="cont"]')).not.toBeNull();
    expect(
      all.map((s) => s.querySelector('[data-test="footer"]')?.textContent),
    ).toEqual(["1/3", "2/3", "3/3"]);
  });

  it("shows the continuation notice on every non-final page above the footer", async () => {
    const h = await mount(
      <Page footer={<span data-test="footer">Footer</span>}>
        <Lines n={150} />
      </Page>,
    );
    const all = sheets(h);
    expect(all).toHaveLength(3);

    all.slice(0, -1).forEach((sheet) => {
      const notice = sheet.querySelector<HTMLElement>(
        "[data-elses-continuation-notice]",
      );
      const footer = sheet.querySelector('[data-test="footer"]');
      expect(notice?.textContent).toBe("(Document continued to next page)");
      expect(notice?.style.color).toBe("rgb(122, 111, 88)");
      expect(notice?.style.fontStyle).toBe("italic");
      expect(notice).not.toBeNull();
      expect(footer).not.toBeNull();
      expect(
        notice!.compareDocumentPosition(footer!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    expect(
      all[all.length - 1]?.querySelector("[data-elses-continuation-notice]"),
    ).toBeNull();
  });

  it("keeps the whole column at least as tall as all pages (for mt-auto)", async () => {
    const h = await mount(
      <Page>
        <div data-h="100" />
      </Page>,
    );
    const column = windowOf(sheets(h)[0]!).firstElementChild as HTMLElement;
    expect(column.style.minHeight).toBe("500px");
    expect(column.style.display).toBe("flex");
  });
});

describe("<Page> with <PageElement>", () => {
  const repeated = (sheet: Element) =>
    Array.from(sheet.querySelectorAll('[data-test="th"]')).filter(
      (e) => !e.closest("[data-elses-window]"),
    ).length;

  it("repeats the element header only on pages that continue the element", async () => {
    const h = await mount(
      <Page>
        <div data-h="100" />
        <PageElement
          element={<Lines n={60} />}
          header={<div data-h="20" data-test="th" />}
        />
        <div data-h="100" />
      </Page>,
    );
    const all = sheets(h);
    expect(all).toHaveLength(2);
    expect(all.map(repeated)).toEqual([0, 1]);
    expect(heightPx(all[1]!)).toBe(480); // 500 minus the repeated header
  });

  it("does not repeat the header on pages after the element has ended", async () => {
    const h = await mount(
      <Page>
        <PageElement
          element={<div data-h="300" />}
          header={<div data-h="20" data-test="th" />}
        />
        <div data-h="900" />
      </Page>,
    );
    const all = sheets(h);
    expect(all.length).toBeGreaterThan(2);
    expect(all.map(repeated)).toEqual(all.map(() => 0));
  });

  it("repeats on every page of an element that spans three pages", async () => {
    const h = await mount(
      <Page>
        <PageElement
          element={<Lines n={140} />}
          header={<div data-h="20" data-test="th" />}
        />
      </Page>,
    );
    const all = sheets(h);
    expect(all).toHaveLength(3);
    expect(all.map(repeated)).toEqual([0, 1, 1]);
  });

  it("cuts before the header instead of leaving it alone at the page bottom", async () => {
    const h = await mount(
      <Page>
        <div data-h="470" />
        <PageElement
          element={<Lines n={50} />}
          header={<div data-h="40" data-test="th" />}
        />
      </Page>,
    );
    const all = sheets(h);
    expect(offsetOf(all[1]!)).toBe(470);
    expect(repeated(all[1]!)).toBe(0); // the header itself starts page 2
  });

  it("works with a real table and a repeated thead-like header", async () => {
    const table = (
      <table>
        <tbody>
          {Array.from({ length: 80 }, (_, i) => (
            <tr key={i} data-h="25">
              <td>row {i}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
    const h = await mount(
      <Page>
        <PageElement
          element={table}
          header={<div data-h="20" data-test="th" />}
        />
      </Page>,
    );
    const all = sheets(h);
    expect(all.length).toBeGreaterThan(1);
    expect(all.slice(1).every((s) => repeated(s) === 1)).toBe(true);
  });
});

describe("<Page> misc", () => {
  it("injects the @page rule that matches the size", async () => {
    const h = await mount(
      <Page size="custom" width={100} height={140}>
        <div data-h="10" />
      </Page>,
    );
    expect(h.querySelector("style")?.textContent).toContain(
      "size: 100mm 140mm",
    );
  });

  it("calls onReady once after the real pages render", async () => {
    const onReady = vi.fn();
    await mount(
      <Page onReady={onReady}>
        <div data-h="10" />
      </Page>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
