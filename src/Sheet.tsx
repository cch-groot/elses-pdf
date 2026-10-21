import type { ReactNode, Ref } from "react";
import { HEIGHT_TOLERANCE_MM, type Geometry } from "./pageSizes";
import type { PageInfo, Slot } from "./types";
import { resolveSlot } from "./utils";

interface SheetProps extends Geometry {
  info: PageInfo;
  footer?: Slot;
  bodyRef?: Ref<HTMLDivElement>;
  continuationNoticeRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/**
 * One paper sheet. A flex column that fills the page, with the continuation
 * notice (when needed) immediately above the footer. Internal: `Page` creates these.
 */
export function Sheet({
  width,
  height,
  margin,
  info,
  footer,
  bodyRef,
  continuationNoticeRef,
  children,
}: SheetProps) {
  const footerNode = resolveSlot(footer, info);

  return (
    <div
      className="elses-pdf-page"
      style={{
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        background: "#fff",
        width: `${width}mm`,
        minWidth: `${width}mm`,
        height: `${height - HEIGHT_TOLERANCE_MM}mm`,
        minHeight: `${height - HEIGHT_TOLERANCE_MM}mm`,
        padding: `${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm`,
      }}
    >
      <div
        ref={bodyRef}
        data-elses-pdf-body=""
        style={{ flex: "1 1 0%", minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {children}
      </div>
      {info.page < info.pages ? (
        <div
          ref={continuationNoticeRef}
          data-elses-continuation-notice=""
          style={{
            flexShrink: 0,
            textAlign: "right",
            color: "#7a6f58",
            fontStyle: "italic",
            fontSize: "9pt",
            lineHeight: 1.2,
            marginBottom: "1mm",
          }}
        >
          (Document continued to next page)
        </div>
      ) : null}
      {footerNode ? <div style={{ flexShrink: 0 }}>{footerNode}</div> : null}
    </div>
  );
}
