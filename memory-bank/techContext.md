## Tech Context

- Tooling: Vite + React + TypeScript, Tailwind CSS, html2canvas/dom-to-image-more for PNG export.
- State: React context or lightweight store for config and computed results.
- Testing: Jest for unit tests of distribution logic.
- Formatting: Intl.NumberFormat `it-IT` for euro output; custom parsing to tolerate `,` and `.`.
- Deployment: static build suitable for GitHub Pages / Vercel / Netlify; optional backend stub described but not required by default.
