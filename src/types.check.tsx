import { Page, PageElement } from "./index";
import { it } from "vitest";

// These are compile-time checks. `npm run typecheck` fails if any
// `@ts-expect-error` line stops being an error, or any plain line starts to error.
function typeChecks() {
  // valid
  <Page />;
  <Page size="A3" orientation="landscape" m={10} mx={12} mt={5} />;
  <Page size="custom" width={100} height={140} />;
  <Page footer={({ page, pages }) => `${page}/${pages}`} />;
  <PageElement element={<div />} header={<div />} />;

  // @ts-expect-error custom needs width and height
  <Page size="custom" />;
  // @ts-expect-error width is only for size="custom"
  <Page size="A4" width={100} />;
  // @ts-expect-error unknown size
  <Page size="B7" />;
  // @ts-expect-error Page has no className
  <Page className="x" />;
  // @ts-expect-error PageElement has no className
  <PageElement element={<div />} className="x" />;
  // @ts-expect-error PageElement needs an element
  <PageElement />;
  // @ts-expect-error margins are numbers (mm)
  <Page m="10mm" />;
}

it("type checks compile", () => {
  void typeChecks;
});
