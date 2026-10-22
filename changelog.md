# Changelog

## [1.2.1] - 2026-10-22

### Added

- Added support for explicitly marking elements with `data-elses-keep-together`.
- Added automatic detection of compact horizontal Flexbox and Grid layouts for keep-together handling.

### Improved

- Improved page-break placement to avoid splitting text lines and visual elements where possible.
- Improved pagination around table rows and eligible compact horizontal layouts.
- Refined smart break handling to reduce unwanted splitting across page boundaries.

### Compatibility

- Preserved browser-based layout and the native print workflow.
- Continued supporting normal React and CSS layouts within fixed document layouts.

## [1.2.0] - 2026-10-21

### Added

- Added a built-in print toolbar with a manual **Print** button.
- Added screen-only toolbar styling for a cleaner document preview.
- Added automatic toolbar hiding when printing.

### Improved

- Added a 500ms delay before automatic printing when `onReady` is used, improving rendering readiness.

### Compatibility

- Preserved the existing `onReady` auto-print workflow.
- Continued using the browser's native print dialog for printing and saving as PDF.
