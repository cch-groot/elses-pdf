# Changelog

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
