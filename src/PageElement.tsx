import type { ReactElement } from "react";
import type { PageElementProps } from "./types";

/**
 * Marks content that has a header to repeat. The content flows across pages
 * like everything else in a `Page`; the difference is that `header` is drawn
 * again at the top of every page that continues the element, and only those.
 *
 * It must be a direct child of `<Page>`. Page reads its props and draws it.
 */
export function PageElement({ element, header }: PageElementProps): ReactElement {
  // Page draws PageElement itself. This only runs if it is used outside a Page.
  return (
    <>
      {header}
      {element}
    </>
  );
}
