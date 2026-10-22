// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { collectKeepTogetherRects } from "./snap";

function setRect(
  element: HTMLElement,
  { top, bottom, left = 0, right = 100 }: { top: number; bottom: number; left?: number; right?: number },
) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({
        top,
        bottom,
        left,
        right,
        height: bottom - top,
        width: right - left,
        x: left,
        y: top,
      }) as DOMRect,
  });
}

describe("collectKeepTogetherRects", () => {
  it("recognizes a compact horizontal flex row and includes its padding box", () => {
    const root = document.createElement("div");
    const row = document.createElement("div");
    row.style.cssText = "display:flex; flex-direction:row; padding:8px";
    const name = document.createElement("span");
    const quantity = document.createElement("span");
    row.append(name, quantity);
    root.append(row);

    setRect(root, { top: 100, bottom: 700 });
    setRect(row, { top: 120, bottom: 176 });
    setRect(name, { top: 138, bottom: 158, left: 10, right: 70 });
    setRect(quantity, { top: 138, bottom: 158, left: 180, right: 210 });

    expect(collectKeepTogetherRects(root)).toEqual([{ top: 20, bottom: 76 }]);
  });

  it("does not mark a normal paragraph as keep-together", () => {
    const root = document.createElement("div");
    const paragraph = document.createElement("p");
    paragraph.textContent = "A paragraph with several lines should still flow.";
    root.append(paragraph);
    setRect(root, { top: 100, bottom: 400 });
    setRect(paragraph, { top: 130, bottom: 250 });

    expect(collectKeepTogetherRects(root)).toEqual([]);
  });
});
