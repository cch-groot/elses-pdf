import { describe, expect, it } from "vitest";
import { computeFlow } from "./flow";
import { snapCut } from "./snap";
import { getPageCss, resolveGeometry } from "./pageSizes";

const base = { bodyHeight: 500, firstHead: 0, contHead: 0, regions: [] };

describe("computeFlow", () => {
  it("uses one page when the content fits", () => {
    const r = computeFlow({ ...base, contentHeight: 300 });
    expect(r.pages).toHaveLength(1);
  });

  it("cuts one tall column into equal windows", () => {
    const r = computeFlow({ ...base, contentHeight: 1200 });
    expect(r.pages.map((p) => p.start)).toEqual([0, 500, 1000]);
  });

  it("reserves continuation-notice space only on non-final pages", () => {
    const r = computeFlow({
      ...base,
      contentHeight: 970,
      continuationNoticeHeight: 20,
    });
    expect(r.pages.map((p) => [p.start, p.cap])).toEqual([
      [0, 480],
      [480, 500],
    ]);
  });

  it("gives pages less room when they carry headers", () => {
    const r = computeFlow({ ...base, contentHeight: 1500, firstHead: 50, contHead: 30 });
    expect(r.pages.map((p) => [p.start, p.cap])).toEqual([
      [0, 450],
      [450, 470],
      [920, 470],
      [1390, 470],
    ]);
  });

  it("repeats a region header only on pages that continue the region", () => {
    // region 100..720 with a 20px header; content ends at 820
    const r = computeFlow({
      ...base,
      contentHeight: 820,
      regions: [{ top: 100, bottom: 720, head: 20 }],
    });
    expect(r.pages.map((p) => p.open)).toEqual([-1, 0]);
    expect(r.pages[1]!.cap).toBe(480); // 500 minus the repeated header
  });

  it("does not repeat the header after the region has ended", () => {
    const r = computeFlow({
      ...base,
      contentHeight: 1220,
      regions: [{ top: 0, bottom: 320, head: 20 }],
    });
    expect(r.pages.map((p) => p.open)).toEqual([-1, -1, -1]);
  });

  it("does not leave a region header alone at the bottom of a page", () => {
    // header zone 470..510, nominal cut at 500 sits inside it
    const r = computeFlow({
      ...base,
      contentHeight: 1000,
      regions: [{ top: 470, bottom: 1000, head: 40 }],
    });
    expect(r.pages[1]!.start).toBe(470);
  });

  it("makes the column at least as tall as all the pages together", () => {
    const r = computeFlow({ ...base, contentHeight: 1200 });
    expect(r.total).toBe(1500); // 3 pages of 500
  });

  it("applies the snap function to every cut", () => {
    const r = computeFlow({ ...base, contentHeight: 1200, snap: (cut) => cut - 8 });
    expect(r.pages[0]!.end).toBe(492);
    expect(r.pages[1]!.start).toBe(492);
  });
});

describe("snapCut", () => {
  const lines = Array.from({ length: 100 }, (_, i) => ({ top: i * 12, bottom: (i + 1) * 12 }));

  it("moves the cut above a line it would slice", () => {
    expect(snapCut(500, 0, 500, lines)).toBe(492);
  });

  it("leaves a cut that falls between lines", () => {
    expect(snapCut(492, 0, 500, lines)).toBe(492);
  });

  it("slices after all when snapping would leave the page almost empty", () => {
    expect(snapCut(500, 0, 500, [{ top: 0, bottom: 900 }])).toBe(500);
  });

  it("keeps moving up past several overlapping lines", () => {
    const side = [
      { top: 480, bottom: 505 },
      { top: 470, bottom: 485 },
    ];
    expect(snapCut(500, 0, 500, side)).toBe(470);
  });
});

describe("page geometry", () => {
  it("defaults to A4 portrait with the default margins", () => {
    expect(resolveGeometry({})).toEqual({
      width: 210,
      height: 297,
      margin: { top: 15, right: 15, bottom: 8, left: 15 },
    });
  });

  it("swaps width and height in landscape", () => {
    const g = resolveGeometry({ size: "A5", orientation: "landscape" });
    expect([g.width, g.height]).toEqual([210, 148]);
  });

  it("accepts a custom size in millimetres", () => {
    const g = resolveGeometry({ size: "custom", width: 100, height: 140 });
    expect([g.width, g.height]).toEqual([100, 140]);
  });

  it("applies margins like Tailwind: side beats axis, axis beats m", () => {
    expect(resolveGeometry({ m: 10, mx: 20, mt: 5 }).margin).toEqual({
      top: 5,
      right: 20,
      bottom: 10,
      left: 20,
    });
    expect(resolveGeometry({ my: 12 }).margin).toEqual({
      top: 12,
      right: 15,
      bottom: 12,
      left: 15,
    });
  });

  it("writes the @page rule from the same size", () => {
    expect(getPageCss(210, 297)).toContain("size: 210mm 297mm");
  });
});
