## System Patterns

- Client-only React app (Vite + TypeScript), Tailwind for responsive UI; Context/Zustand-like store for configuration and results.
- Pure functions for distribution logic (input config + amount → per-condo allocations) to keep them testable (Jest).
- Persistence layer: abstraction over localStorage plus JSON export/import; optional API stub documented in README.
- PNG export via html2canvas/dom-to-image-more wrapper targeting the rendered result table; preserve styling/fonts.
- Mobile-first layout: single-column, prominent buttons, conditional admin panel behind gear icon with confirmation before millesimal edits.
