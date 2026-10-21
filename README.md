# elses-pdf

[![npm version](https://img.shields.io/npm/v/elses-pdf.svg)](https://www.npmjs.com/package/elses-pdf)
[![license](https://img.shields.io/npm/l/elses-pdf.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/elses-pdf.svg)](https://www.npmjs.com/package/elses-pdf)

**React documents that flow across pages and print with your CSS.**

`elses-pdf` helps React developers make invoices, reports, receipts, and other long documents without rebuilding their UI as PDF drawing commands. Compose the document from React components, style it with CSS, preview its page breaks, then use the browser's native print dialog to print or save as PDF.

## Why use it

- Keep document layout in React and CSS, including your fonts, colors, and existing components.
- Let content flow across page boundaries instead of manually placing every item on a page.
- Add first-page, continuation, and footer content without implementing pagination by hand.
- Use the same document components in your app preview and print workflow.

## When to use it

Use `elses-pdf` when your document already belongs in a React app and you want browser-rendered printing or **Save as PDF**, with automatic pagination and room to style the page yourself.

It is a good fit for invoices, receipts, reports, statements, forms, and similar documents. Use a direct PDF-generation library instead when you need to create PDF files programmatically, run generation on a server, or control low-level PDF features. These are different workflows; `elses-pdf` is for React-and-CSS-first documents.

## Install

```bash
npm install elses-pdf
```

Requires `react` and `react-dom` 18 or newer.

## Basic example

```tsx
import { Page, PageElement, printDocument } from "elses-pdf";

type Item = { id: string; name: string; amount: string };

export function Invoice({ items, total }: { items: Item[]; total: string }) {
  function printInvoice() {
    printDocument({
      title: "Invoice",
      render: (onReady) => (
        <Page
          header={<header>Acme · Invoice</header>}
          continuationHeader={<header>Acme · Invoice (continued)</header>}
          footer={({ page, pages }) => (
            <small>
              Page {page} of {pages}
            </small>
          )}
          onReady={onReady}
        >
          <h1>Invoice</h1>

          <PageElement
            header={
              <div className="row">
                <strong>Item</strong>
                <strong>Amount</strong>
              </div>
            }
            element={
              <div>
                {items.map((item) => (
                  <div className="row" key={item.id}>
                    <span>{item.name}</span>
                    <span>{item.amount}</span>
                  </div>
                ))}
              </div>
            }
          />

          <strong className="mt-auto">Total: {total}</strong>
        </Page>
      ),
    });
  }

  return <button onClick={printInvoice}>Print invoice</button>;
}
```

### The three exports

- **`Page`** defines the paper size, margins, page headers and footer, and the flowing document content.
- **`PageElement`** pairs content with a header that repeats only on pages where that content continues—for example, table column labels.
- **`printDocument`** opens a print window, brings over the page's styles, and opens the browser print dialog after pagination is ready.

## Pagination and styling

The document is measured as one continuous column. Pages display successive slices of that column, so content can continue across page boundaries whether it is a direct child of `Page` or inside a `PageElement`. Cuts move between text lines where possible; a very tall element can still be split.

Each non-final page automatically displays an italic **“(Document continued to next page)”** notice above the footer. `header` appears on the first page, `continuationHeader` on later pages, and `footer` on every page. These areas take up page space.

Style the content you pass in with your regular CSS, CSS modules, or utility classes. `Page` supports A3, A4, A5, and custom paper sizes, portrait or landscape orientation, and margins in millimetres. A final child with `margin-top: auto` (Tailwind `mt-auto`) can sit at the bottom of the last page.

For an in-app preview, render `<Page>` directly. Call `printDocument` when the user chooses to print or save the document.

## Important notes

- Page breaks are based on layout, not React component boundaries. A card, summary, or table row may split; there is no keep-together option yet.
- Browser print output can vary. For a clean result, ask users to disable the browser's own print headers and footers.
- Keep the footer height consistent between pages. Give images explicit dimensions so their space is reserved while the document is measured.
- `PageElement` must be a direct child of `Page`.

## Source and experimentation

This is an experimental project, and its source is included in the npm package. The published package includes `src/`, tests, and TypeScript/build configuration so curious users can inspect, modify, and try the implementation themselves.

## More from elses

[`elses`](https://www.npmjs.com/package/elses) is a React UI library from the same project family.

## License

MIT © Groot
