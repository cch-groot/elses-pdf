import type { ReactElement, ReactNode } from "react";

/** Information about the page being rendered. */
export interface PageInfo {
  /** 1-based page number. */
  page: number;
  /** Total number of pages. */
  pages: number;
}

/**
 * Content for a slot. Either plain React content, or a function that
 * receives the current page info (handy for "Page 2 of 3" text).
 */
export type Slot = ReactNode | ((info: PageInfo) => ReactNode);

export type Orientation = "portrait" | "landscape";

/** Page margins in millimetres. Tailwind style: side beats axis, axis beats `m`. */
export interface MarginProps {
  /** All four sides. */
  m?: number;
  /** Left and right. */
  mx?: number;
  /** Top and bottom. */
  my?: number;
  mt?: number;
  mr?: number;
  mb?: number;
  ml?: number;
}

/**
 * Paper size. Use a named size, or `size="custom"` together with
 * `width` and `height` in millimetres.
 */
export type PageSizeProps =
  | {
      /** @default "A4" */
      size?: "A3" | "A4" | "A5";
      width?: never;
      height?: never;
    }
  | {
      size: "custom";
      /** Width in millimetres. */
      width: number;
      /** Height in millimetres. */
      height: number;
    };

export type PageProps = PageSizeProps &
  MarginProps & {
    /**
     * @default "portrait"
     */
    orientation?: Orientation;
    /** Shown at the top of the first page only. */
    header?: Slot;
    /** Shown at the top of every page after the first. */
    continuationHeader?: Slot;
    /**
     * Shown at the bottom of every page. Pass a function to get the page
     * number: `footer={({ page, pages }) => ...}`.
     * Keep its height the same on every page.
     */
    footer?: Slot;
    /** Called once the real pages are rendered. Pass it from `printDocument`. */
    onReady?: () => void;
    /**
     * The content, top to bottom. It flows from page to page and can be cut
     * almost anywhere (between lines of text). Wrap content in
     * `<PageElement>` to repeat a header on every page that continues it.
     */
    children?: ReactNode;
  };

export interface PageElementProps {
  /** The content this header belongs to, such as a table or a list. */
  element: ReactElement;
  /**
   * Shown with the element, then drawn again at the top of every page that
   * continues it (column titles, for example). It never appears on pages
   * where the element is not present.
   */
  header?: ReactNode;
}

export interface PrintDocumentOptions {
  /** Window title. Browsers use it as the default PDF file name. */
  title?: string;
  /**
   * Returns the element to print. It receives `onReady`; pass it to
   * `<Page onReady={onReady} />` so printing waits for pagination.
   */
  render: (onReady: () => void) => ReactElement;
}
