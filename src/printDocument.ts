import { createRoot } from "react-dom/client";
import type { PrintDocumentOptions } from "./types";

const LOAD_TIMEOUT_MS = 5000;

/**
 * Opens a print window, copies your app styles into it, renders the document
 * and opens the print dialog once pagination is finished.
 *
 * ```tsx
 * printDocument({
 *   title: data.number,
 *   render: (onReady) => <Page onReady={onReady}>...</Page>,
 * });
 * ```
 */
export async function printDocument({ title = "Document", render }: PrintDocumentOptions): Promise<void> {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups to print the document.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title></title>
    <style>
      html, body { margin: 0; padding: 0; }
      @media screen {
        body { background: #e5e7eb; }
        .elses-pdf-page { margin: 0 auto 12px; }
      }
    </style>
  </head>
  <body><div id="print-root"></div></body>
</html>`);
  printWindow.document.close();
  printWindow.document.title = title;

  // Copy app styles (Tailwind etc.) and wait until linked sheets are loaded,
  // otherwise measuring would use the wrong CSS.
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    printWindow.document.head.appendChild(node.cloneNode(true));
  });

  const links = Array.from(
    printWindow.document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
  );
  await Promise.race([
    Promise.all(
      links.map(
        (link) =>
          new Promise<void>((resolve) => {
            link.onload = link.onerror = () => resolve();
          }),
      ),
    ),
    new Promise<void>((resolve) => setTimeout(resolve, LOAD_TIMEOUT_MS)),
  ]);

  const container = printWindow.document.getElementById("print-root") as HTMLElement;
  const root = createRoot(container);
  let printed = false;

  const onReady = () => {
    if (printed) return;
    printed = true;

    printWindow.onafterprint = () => {
      root.unmount();
      printWindow.close();
    };

    printWindow.focus();
    printWindow.print();
  };

  root.render(render(onReady));
}
